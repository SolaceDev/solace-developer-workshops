// Package cqrs implements the command and query scenario.
//
// Someone asks what the whole fleet is doing right now. The only answer
// without this pattern is to poll every device, which melts the network and
// gets slower as the fleet grows.
//
// The split is between the side that changes state and the side that reads
// it. Devices publish what happened; a read model consumes that stream and
// keeps the current picture, so a query costs one lookup and no device is
// disturbed. Commands travel the other way, addressed to one device, and
// because they are guaranteed the broker holds them until a device that was
// offline reconnects.
//
// The naming carries the distinction, and it is worth reading the topics
// closely: an event states a fact that already happened, so its verb is past
// tense (rebooted, reported). A command asks for something and is aimed at
// one target, so its verb is imperative (reboot).
package cqrs

import (
	"encoding/json"
	"flag"
	"fmt"
	"math/rand"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"solace-workshop/apps/internal/solace"
	"solace.dev/go/messaging/pkg/solace/message"
)

// telemetryInterval is how often a running device reports.
const telemetryInterval = 3 * time.Second

// Command sends one command to one gateway and exits.
//
// Guaranteed, not direct. If the device is offline the broker spools the
// command on its queue and delivers it on reconnect, which is what makes
// control reliable over links that are not.
func Command(args []string) {
	fs := flag.NewFlagSet("cqrs command", flag.ExitOnError)
	user := fs.String("user", "svc-cqrs-operator", "client username to connect as")
	role := fs.String("role", "operator", "label for log lines")
	gateway := fs.String("gateway", "gw4471", "gateway to address")
	action := fs.String("action", "reboot", "imperative verb: what the device should do")
	fs.Parse(args)

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	pub := solace.StartPersistentPublisher(*role, *user, svc)
	defer solace.Terminate(pub)

	// Imperative verb, addressed to exactly one gateway. Compare this with
	// the event the device publishes in reply, which is past tense and
	// carries the region: a command names its target, an event describes
	// something that already happened.
	topic := fmt.Sprintf("daimler/connectedVehicle/gateway/%s/v1/%s", *action, *gateway)
	payload := fmt.Sprintf(`{"command":"%s","gateway":"%s","issuedAt":"%s"}`,
		*action, *gateway, time.Now().UTC().Format(time.RFC3339))

	if err := solace.PublishKeyed(svc, pub, topic, payload, ""); err != nil {
		solace.Errf(*role, "could not send the command: %s", err)
		os.Exit(1)
	}

	solace.Logf(*role, "sent %s to %s", *action, *gateway)
	solace.Logf(*role, "  topic %s", topic)
	solace.Logf(*role, "")
	solace.Logf(*role, "If that gateway is not running, the command is spooled on its queue")
	solace.Logf(*role, "and delivered when it reconnects. Nothing is lost and nothing retries.")

	// Persistent publishing is asynchronous; give the broker a moment to
	// confirm before the process exits and the receipt listener goes away.
	time.Sleep(500 * time.Millisecond)
}

// Device runs one gateway: it obeys commands and reports telemetry.
func Device(args []string) {
	fs := flag.NewFlagSet("cqrs device", flag.ExitOnError)
	user := fs.String("user", "svc-cqrs-device", "client username to connect as")
	role := fs.String("role", "gw4471", "label for log lines")
	gateway := fs.String("gateway", "gw4471", "this gateway's id")
	region := fs.String("region", "michigan", "where this gateway is")
	queue := fs.String("queue", "q.cqrs.gw4471.commands", "queue holding this gateway's commands")
	fs.Parse(args)

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	pub := solace.StartPersistentPublisher(*role, *user, svc)
	defer solace.Terminate(pub)

	rcv := solace.BindQueue(*role, *user, svc, *queue, solace.QueueOpts{ClientAck: true})
	defer solace.Terminate(rcv)

	solace.Logf(*role, "online in %s, reporting every %s.", *region, telemetryInterval)
	solace.Logf(*role, "any command issued while this was stopped arrives now.")
	fmt.Println()

	battery := 80 + rand.Intn(20)

	if err := rcv.ReceiveAsync(func(msg message.InboundMessage) {
		in := msg.GetDestinationName()

		// The imperative verb is the fifth level of the command topic.
		verb := "unknown"
		if parts := strings.Split(in, "/"); len(parts) > 3 {
			verb = parts[3]
		}

		fmt.Printf("[%s] command received: %s\n", *role, verb)
		fmt.Printf("[%s]   via %s\n", *role, in)

		// Doing the work takes a moment, and the event is only published
		// afterwards, because the event asserts that it happened.
		time.Sleep(500 * time.Millisecond)

		past := pastTense(verb)
		out := fmt.Sprintf("daimler/connectedVehicle/gateway/%s/v1/%s/%s", past, *region, *gateway)
		body := fmt.Sprintf(`{"gateway":"%s","region":"%s","event":"%s","at":"%s"}`,
			*gateway, *region, past, time.Now().UTC().Format(time.RFC3339))

		if err := solace.PublishKeyed(svc, pub, out, body, ""); err != nil {
			solace.Errf(*role, "could not publish the %s event, leaving the command on the queue: %s", past, err)
			return
		}
		fmt.Printf("[%s]   -> %s\n", *role, out)

		if err := rcv.Ack(msg); err != nil {
			solace.Errf(*role, "could not acknowledge the command: %s", err)
		}
	}); err != nil {
		solace.Errf(*role, "could not register the command handler: %s", err)
		os.Exit(1)
	}

	stop := make(chan struct{})
	go func() { solace.WaitForStop(); close(stop) }()

	for {
		select {
		case <-stop:
			fmt.Println()
			solace.Logf(*role, "going offline. Commands sent from now on wait on the queue.")
			return
		case <-time.After(telemetryInterval):
		}

		if battery > 5 {
			battery--
		}
		topic := fmt.Sprintf("daimler/connectedVehicle/battery/reported/v1/%s/%s", *region, *gateway)
		body := fmt.Sprintf(`{"gateway":"%s","region":"%s","batteryPct":%d,"at":"%s"}`,
			*gateway, *region, battery, time.Now().UTC().Format(time.RFC3339))
		if err := solace.PublishKeyed(svc, pub, topic, body, ""); err != nil {
			solace.Errf(*role, "telemetry publish failed: %s", err)
		} else {
			fmt.Printf("[%s] battery %d%% -> %s\n", *role, battery, topic)
		}
	}
}

// pastTense turns a command verb into the event verb that reports it done.
func pastTense(verb string) string {
	switch verb {
	case "reboot":
		return "rebooted"
	case "update":
		return "updated"
	case "lock":
		return "locked"
	default:
		return verb + "ed"
	}
}

// twinState is what the read model knows about one gateway.
type twinState struct {
	Gateway    string
	Region     string
	Battery    int
	LastEvent  string
	LastSeen   time.Time
	EventCount int
}

// Twin is the read model: the query side.
//
// It subscribes to everything the devices publish and keeps the current
// picture in memory. A question about the fleet is answered from here, so it
// costs one lookup and reaches no device at all. The table is reprinted
// whenever something changes, which stands in for the query API a real
// deployment would put in front of it.
func Twin(args []string) {
	fs := flag.NewFlagSet("cqrs twin", flag.ExitOnError)
	user := fs.String("user", "svc-cqrs-twin", "client username to connect as")
	role := fs.String("role", "twin", "label for log lines")
	sub := fs.String("sub", "daimler/connectedVehicle/*/*/v1/>", "what the read model listens to")
	fs.Parse(args)

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	rcv := solace.StartDirectReceiver(*role, svc)
	defer solace.Terminate(rcv)

	var mu sync.Mutex
	fleet := map[string]*twinState{}

	if err := rcv.ReceiveAsync(func(msg message.InboundMessage) {
		topic := msg.GetDestinationName()

		// Only events update the read model. A command is a request, not a
		// fact, so acting on one here would record something that has not
		// happened yet. The subscription is wide enough to see both, which
		// makes the filter worth stating rather than assuming.
		if isCommand(topic) {
			return
		}

		var body struct {
			Gateway    string `json:"gateway"`
			Region     string `json:"region"`
			BatteryPct *int   `json:"batteryPct"`
			Event      string `json:"event"`
		}
		if err := json.Unmarshal([]byte(solace.PayloadOf(msg)), &body); err != nil || body.Gateway == "" {
			return
		}

		mu.Lock()
		st, ok := fleet[body.Gateway]
		if !ok {
			st = &twinState{Gateway: body.Gateway, Battery: -1}
			fleet[body.Gateway] = st
		}
		st.Region = body.Region
		st.LastSeen = time.Now()
		st.EventCount++
		if body.BatteryPct != nil {
			st.Battery = *body.BatteryPct
			st.LastEvent = "battery reported"
		}
		if body.Event != "" {
			st.LastEvent = body.Event
		}
		snapshot := render(fleet)
		mu.Unlock()

		fmt.Print(snapshot)
	}); err != nil {
		solace.Errf(*role, "could not register the message handler: %s", err)
		os.Exit(1)
	}

	solace.Subscribe(*role, *user, rcv, *sub)
	solace.Logf(*role, "read model running. Ask it what the fleet is doing; it never asks a device.")

	solace.WaitForStop()
	fmt.Println()
	solace.Logf(*role, "read model stopped. Rebuilding it means replaying the events, not polling the fleet.")
}

// isCommand reports whether a topic is a command rather than an event.
//
// Commands use an imperative verb and address one device; events use a past
// participle. Matching on the verb keeps the rule in one place instead of
// scattering topic string comparisons through the handler.
func isCommand(topic string) bool {
	parts := strings.Split(topic, "/")
	if len(parts) < 4 {
		return false
	}
	switch parts[3] {
	case "reboot", "update", "lock":
		return true
	}
	return false
}

// render draws the current fleet picture.
func render(fleet map[string]*twinState) string {
	ids := make([]string, 0, len(fleet))
	for id := range fleet {
		ids = append(ids, id)
	}
	sort.Strings(ids)

	var b strings.Builder
	fmt.Fprintf(&b, "\n  fleet read model  (%s)\n", time.Now().Format(solace.Clock))
	fmt.Fprintf(&b, "  %-10s %-10s %-9s %-18s %s\n", "GATEWAY", "REGION", "BATTERY", "LAST EVENT", "EVENTS")
	for _, id := range ids {
		st := fleet[id]
		battery := "  -"
		if st.Battery >= 0 {
			battery = fmt.Sprintf("%3d%%", st.Battery)
		}
		fmt.Fprintf(&b, "  %-10s %-10s %-9s %-18s %d\n", st.Gateway, st.Region, battery, st.LastEvent, st.EventCount)
	}
	return b.String()
}
