// Package processor implements the processor scenario.
//
// A processor is an app that is both consumer and producer: it takes an event
// in one state and publishes a modified version on a different topic. Raw
// events arrive in a shape nobody downstream can use, and without a processor
// every consuming team reimplements the same parsing and enrichment, so a
// change to the format breaks all of them at once.
//
// Both ends go through the broker, which is what makes stages independent.
// A new stage can be spliced into a running flow without redeploying the
// producer or the consumers, and because each processor reads from its own
// queue it gets its own shock absorber and scales on its own.
package processor

import (
	"encoding/json"
	"flag"
	"fmt"
	"math/rand"
	"os"
	"strings"
	"time"

	"solace-workshop/apps/internal/solace"
	"solace.dev/go/messaging/pkg/solace/message"
)

// interval is the pause between vehicles starting assembly.
const interval = 2 * time.Second

var (
	plants  = []string{"michigan", "bremen"}
	regions = map[string]string{"michigan": "namer", "bremen": "emea"}
	models  = []string{"EQS", "GLC", "Sprinter"}
	shifts  = []string{"early", "late", "night"}
)

// vehicle is the event payload as it travels the pipeline. Each stage adds
// fields rather than replacing the message, so an attendee can read one
// payload and see which stages have touched it.
type vehicle struct {
	VIN     string `json:"vin"`
	Plant   string `json:"plant"`
	Started string `json:"started"`

	// Added by the enricher.
	Model string `json:"model,omitempty"`
	Shift string `json:"shift,omitempty"`

	// Added by the router.
	Region string `json:"region,omitempty"`
}

// Line publishes assembly-started events.
func Line(args []string) {
	fs := flag.NewFlagSet("processor line", flag.ExitOnError)
	user := fs.String("user", "svc-processor-line", "client username to connect as")
	role := fs.String("role", "line", "label for log lines")
	fs.Parse(args)

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	pub := solace.StartPersistentPublisher(*role, *user, svc)
	defer solace.Terminate(pub)

	solace.Logf(*role, "starting a vehicle every %s. Press Stop to end.", interval)
	fmt.Println()

	stop := make(chan struct{})
	go func() { solace.WaitForStop(); close(stop) }()

	for n := 1; ; n++ {
		plant := plants[n%len(plants)]
		v := vehicle{
			VIN:     fmt.Sprintf("vin%06d", 880000+n),
			Plant:   plant,
			Started: time.Now().UTC().Format(time.RFC3339),
		}
		topic := fmt.Sprintf("daimler/manufacturing/assembly/started/v1/%s/%s", plant, v.VIN)
		body, _ := json.Marshal(v)

		if err := solace.PublishKeyed(svc, pub, topic, string(body), ""); err != nil {
			solace.Errf(*role, "publish failed: %s", err)
		} else {
			fmt.Printf("#%d started -> %s\n", n, topic)
		}

		select {
		case <-stop:
			solace.Logf(*role, "stopping after %d vehicle(s).", n)
			return
		case <-time.After(interval):
		}
	}
}

// Enrich is the first stage: it adds what downstream needs and republishes.
func Enrich(args []string) {
	runStage(args, stage{
		name:     "enrich",
		user:     "svc-processor-enricher",
		queue:    "q.processor.assembly",
		fromVerb: "started",
		toVerb:   "enriched",
		apply: func(v *vehicle) string {
			v.Model = models[rand.Intn(len(models))]
			v.Shift = shifts[rand.Intn(len(shifts))]
			return fmt.Sprintf("model=%s shift=%s", v.Model, v.Shift)
		},
	})
}

// Route is the second stage, and the one to start late.
//
// Its queue is subscribed to the enriched topic from the moment Apply runs,
// so it collects everything published while it was not running. Starting it
// mid-flow shows a backlog drain and a new stage joining a live pipeline with
// no change to the stages either side.
func Route(args []string) {
	runStage(args, stage{
		name:     "route",
		user:     "svc-processor-router",
		queue:    "q.processor.router",
		fromVerb: "enriched",
		toVerb:   "routed",
		apply: func(v *vehicle) string {
			// Routing becomes a subscription decision downstream rather than
			// a branch in anyone's code: the region goes in the topic, and
			// consumers subscribe to the region they care about.
			v.Region = regions[v.Plant]
			if v.Region == "" {
				v.Region = "unknown"
			}
			return "region=" + v.Region
		},
	})
}

// stage describes one processor: which queue it reads, which verb it
// republishes under, and what it changes.
type stage struct {
	name     string
	user     string
	queue    string
	fromVerb string
	toVerb   string
	apply    func(*vehicle) string
}

// runStage is the processor shape itself: consume, transform, publish, ack.
//
// The acknowledgement comes last, after the outbound publish has been
// accepted. Acking first would be a message the pipeline has forgotten but
// never passed on, which is the failure mode this ordering exists to avoid.
func runStage(args []string, st stage) {
	fs := flag.NewFlagSet("processor "+st.name, flag.ExitOnError)
	role := fs.String("role", st.name, "label for log lines")
	user := fs.String("user", st.user, "client username to connect as")
	queue := fs.String("queue", st.queue, "queue to consume from")
	fs.Parse(args)

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	pub := solace.StartPersistentPublisher(*role, *user, svc)
	defer solace.Terminate(pub)

	rcv := solace.BindQueue(*role, *user, svc, *queue, solace.QueueOpts{ClientAck: true})
	defer solace.Terminate(rcv)

	solace.Logf(*role, "consuming %s events and republishing them as %s.", st.fromVerb, st.toVerb)
	fmt.Println()

	handled := 0
	if err := rcv.ReceiveAsync(func(msg message.InboundMessage) {
		in := msg.GetDestinationName()
		payload := solace.PayloadOf(msg)

		var v vehicle
		if err := json.Unmarshal([]byte(payload), &v); err != nil {
			// Malformed input is a dead end for this stage. Acknowledge it so
			// it does not block the queue, and say so rather than failing
			// silently.
			solace.Errf(*role, "could not read a message from %s, skipping it: %s", in, err)
			_ = rcv.Ack(msg)
			return
		}

		note := st.apply(&v)
		out := strings.Replace(in, "/"+st.fromVerb+"/", "/"+st.toVerb+"/", 1)
		if st.toVerb == "routed" {
			// The router rewrites the topic's context levels as well as the
			// verb, so the region it just decided is addressable downstream.
			out = fmt.Sprintf("daimler/manufacturing/assembly/routed/v1/%s/%s", v.Region, v.VIN)
		}
		body, _ := json.Marshal(v)

		if err := solace.PublishKeyed(svc, pub, out, string(body), ""); err != nil {
			// Do not acknowledge: the message stays on the queue and is
			// redelivered rather than lost between stages.
			solace.Errf(*role, "could not republish to %s, leaving the message on the queue: %s", out, err)
			return
		}

		handled++
		fmt.Printf("[%s] #%d %s\n", *role, handled, in)
		fmt.Printf("[%s]    -> %s  (%s)\n", *role, out, note)

		if err := rcv.Ack(msg); err != nil {
			solace.Errf(*role, "could not acknowledge a message: %s", err)
		}
	}); err != nil {
		solace.Errf(*role, "could not register the message handler: %s", err)
		os.Exit(1)
	}

	solace.WaitForStop()
	fmt.Println()
	solace.Logf(*role, "stopped after processing %d message(s).", handled)
}

// Sink is the end of the pipeline: a plain subscriber on the routed topic.
func Sink(args []string) {
	fs := flag.NewFlagSet("processor sink", flag.ExitOnError)
	role := fs.String("role", "sink", "label for log lines")
	user := fs.String("user", "svc-processor-sink", "client username to connect as")
	sub := fs.String("sub", "daimler/manufacturing/assembly/routed/v1/emea/>", "topic subscription")
	fs.Parse(args)

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	rcv := solace.StartDirectReceiver(*role, svc)
	defer solace.Terminate(rcv)

	received := 0
	if err := rcv.ReceiveAsync(func(msg message.InboundMessage) {
		received++
		solace.Eventf(*role, received, msg.GetDestinationName(), solace.PayloadOf(msg))
	}); err != nil {
		solace.Errf(*role, "could not register the message handler: %s", err)
		os.Exit(1)
	}

	solace.Subscribe(*role, *user, rcv, *sub)
	solace.Logf(*role, "this subscription selects one region. Vehicles from the other plant never arrive here.")

	solace.WaitForStop()
	fmt.Println()
	solace.Logf(*role, "shutting down after %d message(s).", received)
}
