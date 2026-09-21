// Package streaming implements the streaming scenario.
//
// Fraud caught in tonight's batch run is fraud caught hours after the money
// left. The intervention window closed while the data sat waiting to be
// queried. Streaming treats events as a continuous flow and applies the rule
// while the transaction is still in motion, when declining it still means
// something.
//
// The rule here is deliberately simple and stateful: more than a threshold
// number of authorizations on one card inside a short window. Simple because
// the point is where the logic runs, not how clever it is; stateful because
// that is what distinguishes stream processing from filtering one message at
// a time.
package streaming

import (
	"encoding/json"
	"flag"
	"fmt"
	"math/rand"
	"os"
	"strings"
	"sync"
	"time"

	"solace-workshop/apps/internal/solace"
	"solace.dev/go/messaging/pkg/solace/message"
)

var regions = []string{"us", "eu", "apac"}

// cards are ordinary cards, spread wide on purpose.
//
// With only a handful, ordinary traffic crosses the threshold as often as the
// suspicious card does and every card ends up flagged, which makes the rule
// look arbitrary rather than discriminating. Forty cards at this rate means a
// normal card is authorized roughly once per window and the hot card stands
// out on its own.
var cards = func() []string {
	c := make([]string, 40)
	for i := range c {
		c[i] = fmt.Sprintf("c%04d", 1001+i)
	}
	return c
}()

const hotCard = "c9999"

type auth struct {
	TxnID  string  `json:"txnId"`
	Card   string  `json:"card"`
	Region string  `json:"region"`
	Amount float64 `json:"amountEur"`
	At     string  `json:"at"`
}

// Gateway publishes a continuous stream of payment authorizations.
func Gateway(args []string) {
	fs := flag.NewFlagSet("streaming gateway", flag.ExitOnError)
	user := fs.String("user", "svc-streaming-gateway", "client username to connect as")
	role := fs.String("role", "gateway", "label for log lines")
	rate := fs.Duration("interval", 400*time.Millisecond, "pause between authorizations")
	fs.Parse(args)

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	pub := solace.StartPersistentPublisher(*role, *user, svc)
	defer solace.Terminate(pub)

	solace.Logf(*role, "authorizing a payment every %s. Press Stop to end.", *rate)
	solace.Logf(*role, "one card is used far more often than the rest, so the rule has something to catch.")
	fmt.Println()

	stop := make(chan struct{})
	go func() { solace.WaitForStop(); close(stop) }()

	for n := 1; ; n++ {
		// Every fourth authorization is the hot card, which crosses the
		// threshold inside the window and gets flagged.
		card := cards[rand.Intn(len(cards))]
		if n%4 == 0 {
			card = hotCard
		}
		region := regions[rand.Intn(len(regions))]

		a := auth{
			TxnID:  fmt.Sprintf("t%08d", 10000000+n),
			Card:   card,
			Region: region,
			Amount: 5 + rand.Float64()*400,
			At:     time.Now().UTC().Format(time.RFC3339Nano),
		}
		topic := fmt.Sprintf("united/booking/payment/authorized/v1/%s/%s/%s", region, card, a.TxnID)
		body, _ := json.Marshal(a)

		if err := solace.PublishKeyed(svc, pub, topic, string(body), ""); err != nil {
			solace.Errf(*role, "publish failed: %s", err)
		} else if n%10 == 1 {
			// One line every ten, because the pane is not the interesting
			// part of this scenario and a wall of text would bury the others.
			fmt.Printf("[%s] #%d %s %s %.2f EUR\n", *role, n, region, card, a.Amount)
		}

		select {
		case <-stop:
			solace.Logf(*role, "stopping after %d authorization(s).", n)
			return
		case <-time.After(*rate):
		}
	}
}

// Fraud applies a rolling-window rule to the stream.
//
// State lives here, in memory, keyed by card. That is the difference between
// this and a filter: the decision depends on what else has happened recently,
// not just on the message in hand.
func Fraud(args []string) {
	fs := flag.NewFlagSet("streaming fraud", flag.ExitOnError)
	user := fs.String("user", "svc-streaming-fraud", "client username to connect as")
	role := fs.String("role", "fraud", "label for log lines")
	queue := fs.String("queue", "q.streaming.fraud", "queue to consume from")
	window := fs.Duration("window", 10*time.Second, "how far back the rule looks")
	threshold := fs.Int("threshold", 3, "authorizations within the window before flagging")
	fs.Parse(args)

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	pub := solace.StartPersistentPublisher(*role, *user, svc)
	defer solace.Terminate(pub)

	rcv := solace.BindQueue(*role, *user, svc, *queue, solace.QueueOpts{ClientAck: true, Shared: true})
	defer solace.Terminate(rcv)

	solace.Logf(*role, "flagging any card authorized more than %d times within %s.", *threshold, *window)
	fmt.Println()

	var mu sync.Mutex
	// Authorization times per card, trimmed to the window on each message.
	seen := map[string][]time.Time{}
	checked, flagged := 0, 0

	if err := rcv.ReceiveAsync(func(msg message.InboundMessage) {
		var a auth
		if err := json.Unmarshal([]byte(solace.PayloadOf(msg)), &a); err != nil || a.Card == "" {
			_ = rcv.Ack(msg)
			return
		}

		now := time.Now()
		mu.Lock()
		checked++
		// Drop anything that has fallen out of the window, then add this one.
		// The window slides with the stream rather than resetting on a clock
		// boundary, so a burst spanning two minutes is still caught.
		kept := seen[a.Card][:0]
		for _, t := range seen[a.Card] {
			if now.Sub(t) <= *window {
				kept = append(kept, t)
			}
		}
		kept = append(kept, now)
		seen[a.Card] = kept
		count := len(kept)
		shouldFlag := count > *threshold
		if shouldFlag {
			flagged++
		}
		n, f := checked, flagged
		mu.Unlock()

		if shouldFlag {
			topic := fmt.Sprintf("united/booking/payment/flagged/v1/%s/%s/%s", a.Region, a.Card, a.TxnID)
			body := fmt.Sprintf(`{"txnId":"%s","card":"%s","region":"%s","reason":"%d authorizations in %s","at":"%s"}`,
				a.TxnID, a.Card, a.Region, count, *window, time.Now().UTC().Format(time.RFC3339))
			if err := solace.PublishKeyed(svc, pub, topic, body, ""); err != nil {
				// Leave it unacknowledged: a flag that was never published
				// should be retried, not quietly dropped.
				solace.Errf(*role, "could not publish a flag, leaving the message on the queue: %s", err)
				return
			}
			fmt.Printf("[%s] FLAG %s card=%s %d in %s -> %s\n", *role, a.TxnID, a.Card, count, *window, topic)
		}

		if n%25 == 0 {
			fmt.Printf("[%s] %d checked, %d flagged\n", *role, n, f)
		}

		if err := rcv.Ack(msg); err != nil {
			solace.Errf(*role, "could not acknowledge a message: %s", err)
		}
	}); err != nil {
		solace.Errf(*role, "could not register the message handler: %s", err)
		os.Exit(1)
	}

	solace.WaitForStop()
	mu.Lock()
	defer mu.Unlock()
	fmt.Println()
	solace.Logf(*role, "stopped after %d authorization(s), %d flagged.", checked, flagged)
	solace.Logf(*role, "the window lived in memory: restarting this rebuilds it from the stream, not from a database.")
}

// Watch subscribes to one slice of the stream.
//
// The subscription selects a region, so this app never sees the others. Data
// residency becomes a subscription rather than a filter the application has
// to be trusted to apply.
func Watch(args []string) {
	fs := flag.NewFlagSet("streaming watch", flag.ExitOnError)
	role := fs.String("role", "us-desk", "label for log lines")
	user := fs.String("user", "svc-streaming-watch", "client username to connect as")
	sub := fs.String("sub", "united/booking/payment/*/v1/us/>", "topic subscription")
	fs.Parse(args)

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	rcv := solace.StartDirectReceiver(*role, svc)
	defer solace.Terminate(rcv)

	var mu sync.Mutex
	authorized, flagged := 0, 0

	if err := rcv.ReceiveAsync(func(msg message.InboundMessage) {
		topic := msg.GetDestinationName()
		mu.Lock()
		if strings.Contains(topic, "/flagged/") {
			flagged++
			fmt.Printf("[%s] FLAGGED  %s\n", *role, topic)
		} else {
			authorized++
			if authorized%10 == 1 {
				fmt.Printf("[%s] %d authorized, %d flagged (this region only)\n", *role, authorized, flagged)
			}
		}
		mu.Unlock()
	}); err != nil {
		solace.Errf(*role, "could not register the message handler: %s", err)
		os.Exit(1)
	}

	solace.Subscribe(*role, *user, rcv, *sub)
	solace.Logf(*role, "one wildcard covers both authorized and flagged, and the region level pins it to us.")

	solace.WaitForStop()
	mu.Lock()
	defer mu.Unlock()
	fmt.Println()
	solace.Logf(*role, "stopped after %d authorized and %d flagged, all from one region.", authorized, flagged)
}
