// Package arrival implements the Surviving the Arrival capstone.
//
// At a hub airport a bank of flights lands inside the same twenty minutes and
// every bag on every aircraft scans at once. Without a queue in the middle,
// baggage routing and the passenger app both consume at whatever rate the
// scanners produce; at peak the routing system falls behind, back-pressure
// spreads, and the app telling passengers where their bag is goes down
// exactly when they are all looking at it.
//
// Three patterns compose here, which is the point of a capstone:
//
//	shock absorber       a queue turns the arrival surge into a backlog
//	partitioned queue    each belt keeps its own order while belts run in parallel
//	fan-out              a second queue feeds the passenger app independently,
//	                     so saturating routing cannot take it down
package arrival

import (
	"encoding/json"
	"flag"
	"fmt"
	"math/rand"
	"os"
	"sync"
	"time"

	"solace-workshop/apps/internal/solace"
	"solace.dev/go/messaging/pkg/solace/message"
)

// belts are the partition keys.
//
// Twelve for three partitions. Keys are hashed onto partitions rather than
// dealt out, so a handful of keys can land on one partition and leave a
// second consumer idle. Twelve spreads reliably enough that both routing
// apps always have work.
var belts = []string{
	"A1", "A2", "A3", "A4",
	"B1", "B2", "B3", "B4",
	"C1", "C2", "C3", "C4",
}

type scan struct {
	BagTag string `json:"bagTag"`
	Belt   string `json:"belt"`
	PNR    string `json:"pnr"`
	Flight string `json:"flight"`
	Seq    int    `json:"seq"`
	At     string `json:"at"`
}

var flights = []string{"AC8763", "AC1140", "AC0022", "AC9915"}

// Scanner publishes the arrival surge.
func Scanner(args []string) {
	fs := flag.NewFlagSet("arrival scanner", flag.ExitOnError)
	user := fs.String("user", "svc-arrival-scanner", "client username to connect as")
	role := fs.String("role", "scanners", "label for log lines")
	burst := fs.Int("burst", 500, "bags scanned per arrival bank")
	every := fs.Duration("every", 30*time.Second, "pause between arrival banks")
	fs.Parse(args)

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	pub := solace.StartPersistentPublisher(*role, *user, svc)
	defer solace.Terminate(pub)

	solace.Logf(*role, "a bank of flights lands every %s: %d bags scanned as fast as they come.", *every, *burst)
	solace.Logf(*role, "watch the passenger app keep its pace while routing falls behind.")
	fmt.Println()

	stop := make(chan struct{})
	go func() { solace.WaitForStop(); close(stop) }()

	seq := map[string]int{}

	for bank := 1; ; bank++ {
		fmt.Printf("--- arrival bank %d: %d bags ---\n", bank, *burst)
		sent := 0
		for i := 0; i < *burst; i++ {
			belt := belts[i%len(belts)]
			seq[belt]++
			s := scan{
				BagTag: fmt.Sprintf("AC%06d", rand.Intn(999999)),
				Belt:   belt,
				PNR:    fmt.Sprintf("PNR-%05d", rand.Intn(99999)),
				Flight: flights[rand.Intn(len(flights))],
				Seq:    seq[belt],
				At:     time.Now().UTC().Format(time.RFC3339Nano),
			}
			body, _ := json.Marshal(s)
			topic := fmt.Sprintf("acme/air/baggage/scanned/v1/%s/%s", belt, s.BagTag)

			// The belt is the partition key, so everything on one belt is
			// routed by one consumer in the order it was scanned.
			if err := solace.PublishKeyed(svc, pub, topic, string(body), belt); err != nil {
				solace.Errf(*role, "publish failed: %s", err)
			} else {
				sent++
			}

			select {
			case <-stop:
				solace.Logf(*role, "stopping after %d bag(s).", sent)
				return
			default:
			}
		}
		fmt.Printf("bank %d done: %d bags on the belts\n\n", bank, sent)

		select {
		case <-stop:
			solace.Logf(*role, "stopping after bank %d.", bank)
			return
		case <-time.After(*every):
		}
	}
}

// Routing consumes the partitioned queue and does the slow work.
//
// It publishes a status event per bag as it goes, which is what the passenger
// app consumes. Routing being saturated therefore slows how quickly statuses
// appear, but cannot stop the passenger app from serving what it already has.
func Routing(args []string) {
	fs := flag.NewFlagSet("arrival routing", flag.ExitOnError)
	role := fs.String("role", "", "label for log lines, e.g. routing-1")
	user := fs.String("user", "svc-arrival-routing", "client username to connect as")
	queue := fs.String("queue", "q.arrival.scans", "partitioned queue to consume from")
	work := fs.Duration("work", 120*time.Millisecond, "time to route one bag")
	fs.Parse(args)

	if *role == "" {
		fmt.Fprintln(os.Stderr, "usage: workshop arrival routing --role <routing-1|routing-2>")
		os.Exit(2)
	}

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	pub := solace.StartPersistentPublisher(*role, *user, svc)
	defer solace.Terminate(pub)

	rcv := solace.BindQueue(*role, *user, svc, *queue, solace.QueueOpts{ClientAck: true, Shared: true})
	defer solace.Terminate(rcv)

	solace.Logf(*role, "routing bags at roughly %s each.", *work)
	solace.Logf(*role, "the belts this instance owns are assigned by the broker, not configured here.")
	fmt.Println()

	var mu sync.Mutex
	handled := 0
	lastSeq := map[string]int{}
	outOfOrder := 0

	if err := rcv.ReceiveAsync(func(msg message.InboundMessage) {
		var s scan
		if err := json.Unmarshal([]byte(solace.PayloadOf(msg)), &s); err != nil {
			_ = rcv.Ack(msg)
			return
		}

		time.Sleep(*work)

		mu.Lock()
		handled++
		n := handled
		if s.Seq > lastSeq[s.Belt] {
			lastSeq[s.Belt] = s.Seq
		} else {
			outOfOrder++
		}
		mu.Unlock()

		// The status stream is separate from the routing work, which is what
		// keeps the passenger app independent of how far behind routing is.
		status := fmt.Sprintf("acme/air/baggage/status/v1/%s/%s", s.PNR, s.BagTag)
		body := fmt.Sprintf(`{"bagTag":"%s","pnr":"%s","belt":"%s","flight":"%s","status":"on belt %s","at":"%s"}`,
			s.BagTag, s.PNR, s.Belt, s.Flight, s.Belt, time.Now().UTC().Format(time.RFC3339))
		if err := solace.PublishKeyed(svc, pub, status, body, ""); err != nil {
			solace.Errf(*role, "could not publish bag status, leaving the scan on the queue: %s", err)
			return
		}

		if n%10 == 1 {
			mu.Lock()
			belts := len(lastSeq)
			mu.Unlock()
			fmt.Printf("[%s] %d bags routed across %d belt(s)\n", *role, n, belts)
		}

		if err := rcv.Ack(msg); err != nil {
			solace.Errf(*role, "could not acknowledge a scan: %s", err)
		}
	}); err != nil {
		solace.Errf(*role, "could not register the message handler: %s", err)
		os.Exit(1)
	}

	solace.WaitForStop()
	mu.Lock()
	defer mu.Unlock()
	fmt.Println()
	solace.Logf(*role, "stopped after routing %d bag(s) across %d belt(s).", handled, len(lastSeq))
	solace.Logf(*role, "belts handled: %v", lastSeq)
	if outOfOrder == 0 {
		solace.Logf(*role, "every belt stayed in scan order, while the other belts were routed in parallel.")
	} else {
		solace.Errf(*role, "%d scans arrived out of order, which should not happen on a partitioned queue.", outOfOrder)
	}
}

// Passenger serves bag status to passengers.
//
// It reads its own queue at a steady rate no matter how large the arrival
// bank is. That is the outcome the whole scenario is arranged to produce:
// the surge is absorbed upstream, so the passenger-facing service never
// degrades when passengers most need it.
func Passenger(args []string) {
	fs := flag.NewFlagSet("arrival passenger", flag.ExitOnError)
	role := fs.String("role", "passenger-app", "label for log lines")
	user := fs.String("user", "svc-arrival-passenger", "client username to connect as")
	queue := fs.String("queue", "q.arrival.status", "queue to consume from")
	pace := fs.Duration("pace", 50*time.Millisecond, "steady time to serve one lookup")
	fs.Parse(args)

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	rcv := solace.BindQueue(*role, *user, svc, *queue, solace.QueueOpts{ClientAck: true})
	defer solace.Terminate(rcv)

	solace.Logf(*role, "serving bag status at a steady %s per lookup, whatever the arrival bank looks like.", *pace)
	fmt.Println()

	var mu sync.Mutex
	served := 0
	start := time.Now()

	if err := rcv.ReceiveAsync(func(msg message.InboundMessage) {
		time.Sleep(*pace)

		mu.Lock()
		served++
		n := served
		elapsed := time.Since(start).Seconds()
		mu.Unlock()

		if n%20 == 1 {
			rate := float64(n) / elapsed
			fmt.Printf("[%s] %d bags tracked, %.1f per second, still responsive\n", *role, n, rate)
		}

		if err := rcv.Ack(msg); err != nil {
			solace.Errf(*role, "could not acknowledge a status update: %s", err)
		}
	}); err != nil {
		solace.Errf(*role, "could not register the message handler: %s", err)
		os.Exit(1)
	}

	solace.WaitForStop()
	mu.Lock()
	defer mu.Unlock()
	fmt.Println()
	solace.Logf(*role, "stopped after tracking %d bag(s) at a steady pace throughout.", served)
}
