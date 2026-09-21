// Package shock implements the shock absorber scenario.
//
// A bank of flights lands inside the same twenty minutes and every bag on
// every aircraft scans at once. Without a queue in the middle, the slowest
// consumer sets the pace for everyone and back-pressure spreads upstream
// until something falls over. With one, the surge becomes a backlog that
// drains, and the consumers work at whatever rate they can sustain.
//
// Three things are worth watching here, and each has its own role below:
// a queue absorbing a burst, several workers sharing one queue, and a
// partitioned queue keeping per-key order while still working in parallel.
package shock

import (
	"flag"
	"fmt"
	"math/rand"
	"os"
	"strings"
	"sync"
	"time"

	"solace-workshop/apps/internal/solace"
	"solace.dev/go/messaging/pkg/solace/config"
	"solace.dev/go/messaging/pkg/solace/message"
)

// belts are the partition keys. Everything scanned on one belt shares a key,
// so the broker sends it all to the same consumer, in order.
//
// Twelve of them, for a queue with three partitions. Keys are hashed onto
// partitions, so a handful of keys can easily land on one partition and leave
// a second consumer idle: true to how partitioning works, but it reads as a
// broken scenario. Twelve keys spread reliably enough that two consumers each
// get work every time, which is what the scenario needs to demonstrate.
var belts = []string{
	"A1", "A2", "A3", "A4",
	"B1", "B2", "B3", "B4",
	"C1", "C2", "C3", "C4",
}

// Scan publishes bursts of bag scan events.
//
// The burst is the point: it publishes far faster than the workers can
// consume, so queue depth climbs visibly and then drains once the burst ends.
// A steady trickle would show nothing.
func Scan(args []string) {
	fs := flag.NewFlagSet("shock scan", flag.ExitOnError)
	user := fs.String("user", "svc-shock-scanner", "client username to connect as")
	role := fs.String("role", "scanner", "label for log lines")
	burst := fs.Int("burst", 200, "messages per burst")
	every := fs.Duration("every", 15*time.Second, "pause between bursts")
	fs.Parse(args)

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	pub := solace.StartPersistentPublisher(*role, *user, svc)
	defer solace.Terminate(pub)

	solace.Logf(*role, "publishing bursts of %d scans every %s. Press Stop to end.", *burst, *every)
	solace.Logf(*role, "watch the queue depth in Inspect: it should climb during a burst and drain after it.")
	fmt.Println()

	stop := make(chan struct{})
	go func() { solace.WaitForStop(); close(stop) }()

	// Per-belt sequence numbers. A worker on a partitioned queue should see
	// these strictly increasing for its own belts, which is how per-key
	// ordering is demonstrated rather than asserted.
	seq := map[string]int{}

	for round := 1; ; round++ {
		fmt.Printf("--- burst %d: %d scans ---\n", round, *burst)
		sent := 0
		for i := 0; i < *burst; i++ {
			belt := belts[i%len(belts)]
			seq[belt]++
			bagTag := fmt.Sprintf("AC%06d", rand.Intn(999999))
			topic := fmt.Sprintf("acme/air/baggage/scanned/v1/%s/%s", belt, bagTag)
			payload := fmt.Sprintf(`{"bagTag":"%s","belt":"%s","seq":%d,"flight":"AC8763","at":"%s"}`,
				bagTag, belt, seq[belt], time.Now().UTC().Format(time.RFC3339Nano))

			// The belt is the partition key. The application decides what the
			// key means; the broker guarantees same key, same partition, same
			// consumer, in order.
			if err := solace.PublishKeyed(svc, pub, topic, payload, belt); err != nil {
				solace.Errf(*role, "publish failed: %s", err)
			} else {
				sent++
			}

			select {
			case <-stop:
				solace.Logf(*role, "stopping after %d scan(s).", sent)
				return
			default:
			}
		}
		fmt.Printf("burst %d done: %d scans published in one go\n\n", round, sent)

		select {
		case <-stop:
			solace.Logf(*role, "stopping after burst %d.", round)
			return
		case <-time.After(*every):
		}
	}
}

// Work consumes from a queue at a deliberately limited rate.
//
// The ack delay stands in for real work. Without it the consumer would keep
// up with any burst and there would be no backlog to see, which would make
// the queue look pointless rather than load-bearing.
func Work(args []string) {
	fs := flag.NewFlagSet("shock work", flag.ExitOnError)
	role := fs.String("role", "", "label for log lines, e.g. worker-1")
	user := fs.String("user", "svc-shock-worker", "client username to connect as")
	queue := fs.String("queue", "q.shock.scans", "queue to consume from")
	ackDelay := fs.Duration("ack-delay", 300*time.Millisecond, "simulated work per message")
	showKey := fs.Bool("show-key", false, "print the partition key and per-belt sequence")
	failEvery := fs.Int("fail-every", 0, "settle every Nth message FAILED, so it is redelivered")
	rejectEvery := fs.Int("reject-every", 0, "settle every Nth message REJECTED, so it goes to the DMQ")
	fs.Parse(args)

	if *role == "" {
		fmt.Fprintln(os.Stderr, "usage: workshop shock work --role <role> [--queue q] [--ack-delay 300ms] [--fail-every N] [--reject-every N]")
		os.Exit(2)
	}

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	// Client acknowledgement, always. With automatic acks the API settles the
	// message before the handler has finished, so stopping a worker mid-burst
	// would lose nothing and the redelivery lesson would not work.
	rcv := solace.BindQueue(*role, *user, svc, *queue, solace.QueueOpts{
		ClientAck: true,
		Shared:    true,
		Outcomes: []config.MessageSettlementOutcome{
			config.PersistentReceiverAcceptedOutcome,
			config.PersistentReceiverFailedOutcome,
			config.PersistentReceiverRejectedOutcome,
		},
	})
	defer solace.Terminate(rcv)

	solace.Logf(*role, "working at roughly %s per message.", *ackDelay)
	if *failEvery > 0 {
		solace.Logf(*role, "every %d messages one will be settled FAILED, so the broker redelivers it.", *failEvery)
	}
	if *rejectEvery > 0 {
		solace.Logf(*role, "every %d messages one will be settled REJECTED, so it moves to the dead message queue.", *rejectEvery)
	}
	fmt.Println()

	var mu sync.Mutex
	handled, failed, rejected, redelivered := 0, 0, 0, 0
	// Highest sequence seen per belt, used to prove ordering holds per key.
	lastSeq := map[string]int{}

	if err := rcv.ReceiveAsync(func(msg message.InboundMessage) {
		// The delay is before settlement, so an unacked message really is
		// in flight and really does come back if this worker is stopped.
		time.Sleep(*ackDelay)

		mu.Lock()
		handled++
		n := handled
		redelivery := msg.IsRedelivered()
		if redelivery {
			redelivered++
		}
		key, hasKey := solace.MessageKey(msg)
		var orderNote string
		if *showKey && hasKey {
			if s, ok := seqOf(solace.PayloadOf(msg)); ok {
				if s > lastSeq[key] {
					lastSeq[key] = s
				} else {
					// Out of order within a key would mean the partition
					// guarantee was not holding, so say so loudly.
					orderNote = fmt.Sprintf("  OUT OF ORDER for belt %s (saw %d after %d)", key, s, lastSeq[key])
				}
			}
		}
		mu.Unlock()

		outcome := config.PersistentReceiverAcceptedOutcome
		note := ""
		if *rejectEvery > 0 && n%*rejectEvery == 0 {
			outcome, note = config.PersistentReceiverRejectedOutcome, "  REJECTED -> dead message queue"
			mu.Lock()
			rejected++
			mu.Unlock()
		} else if *failEvery > 0 && n%*failEvery == 0 {
			outcome, note = config.PersistentReceiverFailedOutcome, "  FAILED -> back on the queue for redelivery"
			mu.Lock()
			failed++
			mu.Unlock()
		}

		line := fmt.Sprintf("[%s] #%d %s", *role, n, msg.GetDestinationName())
		if *showKey && hasKey {
			line += fmt.Sprintf("  belt=%s", key)
		}
		if redelivery {
			line += "  (redelivered)"
		}
		fmt.Println(line + note + orderNote)

		if err := rcv.Settle(msg, outcome); err != nil {
			solace.Errf(*role, "could not settle a message: %s", err)
		}
	}); err != nil {
		solace.Errf(*role, "could not register the message handler: %s", err)
		os.Exit(1)
	}

	solace.WaitForStop()
	mu.Lock()
	defer mu.Unlock()
	fmt.Println()
	solace.Logf(*role, "stopped after %d message(s): %d redelivered, %d failed, %d rejected.",
		handled, redelivered, failed, rejected)
	if *showKey && len(lastSeq) > 0 {
		solace.Logf(*role, "highest sequence seen per belt: %v", lastSeq)
	}
	solace.Logf(*role, "anything still unacknowledged goes back on the queue for another consumer.")
}

// seqOf pulls the "seq" field out of a scan payload without a full JSON parse,
// which keeps the hot path cheap during a burst.
func seqOf(payload string) (int, bool) {
	const key = `"seq":`
	i := strings.Index(payload, key)
	if i < 0 {
		return 0, false
	}
	n := 0
	found := false
	for _, c := range payload[i+len(key):] {
		if c < '0' || c > '9' {
			break
		}
		n = n*10 + int(c-'0')
		found = true
	}
	return n, found
}
