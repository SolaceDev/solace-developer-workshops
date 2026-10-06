// Package sonepar implements the four queue scenarios of the Sonepar workshop.
//
// Each scenario is one kind of queue doing one job in an electrical
// distributor: an exclusive queue feeding orders to the ERP in order, a
// non-exclusive queue sharing pick tasks between warehouse pickers, a
// partitioned queue keeping stock movements in order per SKU, and a dead
// message queue catching supplier price updates that cannot be used.
//
// The four share two roles, a publisher and a consumer, because the code is
// not what differs between them. What differs is how the queue is configured
// in terraform, and the flags below only switch on what each lesson needs to
// show (an order check, a partition key, a poison message, a failing
// dependency).
package sonepar

import (
	"encoding/json"
	"flag"
	"fmt"
	"math/rand"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"solace-workshop/apps/internal/solace"
	sol "solace.dev/go/messaging/pkg/solace"
	"solace.dev/go/messaging/pkg/solace/config"
	"solace.dev/go/messaging/pkg/solace/message"
	"solace.dev/go/messaging/pkg/solace/resource"
)

var (
	branches  = []string{"lyon-03", "paris-11", "lille-02", "nantes-05"}
	dcs       = []string{"dc-fr-north", "dc-fr-south"}
	suppliers = []string{"schneider", "legrand", "abb", "hager"}

	// Twelve SKUs for a queue with three partitions. Keys are hashed onto
	// partitions, so a handful of keys can land on one partition and leave a
	// consumer idle; twelve spread reliably enough that every consumer gets
	// work, which is what the scenario needs to show.
	skus = []string{
		"CBL-H07RNF-3G2.5", "MCB-C16-1P", "RCD-40A-30MA", "SKT-2P-E-WHT",
		"LED-PNL-600-40W", "CND-ICTA-20", "BOX-IP55-100", "SW-1G-2W-WHT",
		"MCB-C32-3P", "CBL-U1000-5G6", "TRY-PERF-300", "EVC-7KW-T2",
	}
)

// feed builds one event: its topic, its payload and its partition key.
// n counts every event the publisher has sent, seq counts per key.
type feed func(n int, seq map[string]int) (topic, payload, key string)

// Every feed has its own topic tree, so each scenario's queue subscription
// only ever catches its own scenario's events.
var feeds = map[string]feed{
	// Orders from the webshop, bound for the ERP. The sequence number is
	// global because the ERP must book them in the order they were placed.
	"orders": func(n int, seq map[string]int) (string, string, string) {
		branch := branches[rand.Intn(len(branches))]
		id := fmt.Sprintf("SO-%06d", 100000+n)
		return fmt.Sprintf("sonepar/order/placed/v1/%s/%s", branch, id),
			fmt.Sprintf(`{"orderId":"%s","seq":%d,"branch":"%s","customer":"C-%05d","lines":%d,"totalEur":%.2f}`,
				id, n, branch, rand.Intn(99999), 1+rand.Intn(12), 20+rand.Float64()*2000),
			""
	},
	// Pick tasks for the warehouse. Order does not matter, throughput does.
	"picks": func(n int, seq map[string]int) (string, string, string) {
		dc := dcs[n%len(dcs)]
		id := fmt.Sprintf("SO-%06d", 200000+n)
		return fmt.Sprintf("sonepar/warehouse/pick/requested/v1/%s/%s", dc, id),
			fmt.Sprintf(`{"orderId":"%s","dc":"%s","sku":"%s","qty":%d,"bin":"%c%02d-%d"}`,
				id, dc, skus[rand.Intn(len(skus))], 1+rand.Intn(50), 'A'+rand.Intn(8), rand.Intn(40), rand.Intn(5)),
			""
	},
	// Stock movements. The SKU is the partition key: every movement for one
	// SKU must be applied in order, but different SKUs are independent.
	"stock": func(n int, seq map[string]int) (string, string, string) {
		sku := skus[n%len(skus)]
		dc := dcs[(n/len(skus))%len(dcs)]
		seq[sku]++
		delta := rand.Intn(40) - 20
		if delta == 0 {
			delta = 5
		}
		return fmt.Sprintf("sonepar/inventory/stock/adjusted/v1/%s/%s", dc, sku),
			fmt.Sprintf(`{"sku":"%s","dc":"%s","seq":%d,"delta":%d}`, sku, dc, seq[sku], delta),
			sku
	},
	// Supplier price updates. The poison variant is built in Publish.
	"prices": func(n int, seq map[string]int) (string, string, string) {
		supplier := suppliers[n%len(suppliers)]
		sku := skus[rand.Intn(len(skus))]
		return fmt.Sprintf("sonepar/catalog/price/updated/v1/%s/%s", supplier, sku),
			fmt.Sprintf(`{"supplier":"%s","sku":"%s","seq":%d,"priceEur":%.2f}`, supplier, sku, n, 1+rand.Float64()*300),
			""
	},
}

// Publish sends guaranteed events from one feed until stopped, or until
// --count events have gone.
func Publish(args []string) {
	fs := flag.NewFlagSet("sonepar publish", flag.ExitOnError)
	user := fs.String("user", "", "client username to connect as")
	role := fs.String("role", "publisher", "label for log lines")
	feedName := fs.String("feed", "", "orders, picks, stock or prices")
	burst := fs.Int("burst", 1, "events per round")
	every := fs.Duration("every", time.Second, "pause between rounds")
	count := fs.Int("count", 0, "stop after this many events (0 runs until stopped)")
	ttl := fs.Duration("ttl", 0, "time to live on each event (0 never expires)")
	poisonEvery := fs.Int("poison-every", 0, "make every Nth price update unreadable")
	quiet := fs.Bool("quiet", false, "print one line per round instead of one per event")
	fs.Parse(args)

	next, ok := feeds[*feedName]
	if !ok || *user == "" {
		fmt.Fprintln(os.Stderr, "usage: workshop sonepar publish --user <user> --feed orders|picks|stock|prices [--burst N] [--every D] [--count N] [--ttl D] [--poison-every N]")
		os.Exit(2)
	}

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()
	pub, refused := startPublisher(*role, svc)
	defer solace.Terminate(pub)

	if *count > 0 {
		solace.Logf(*role, "publishing %d %s events, %d at a time.", *count, *feedName, *burst)
	} else {
		solace.Logf(*role, "publishing %d %s event(s) every %s. Press Stop to end.", *burst, *feedName, *every)
	}
	if *ttl > 0 {
		solace.Logf(*role, "each event expires %s after it is published.", *ttl)
	}
	fmt.Println()

	stop := make(chan struct{})
	go func() { solace.WaitForStop(); close(stop) }()

	seq := map[string]int{}
	n := 0
	for round := 1; ; round++ {
		for i := 0; i < *burst; i++ {
			n++
			topic, payload, key := next(n, seq)
			note := ""
			if *poisonEvery > 0 && n%*poisonEvery == 0 {
				// A supplier sends the price as text in its own locale. It is
				// valid JSON, so nothing upstream notices; only the consumer
				// that needs a number can tell.
				const field = `"priceEur":`
				if i := strings.Index(payload, field); i >= 0 {
					price := payload[i+len(field) : len(payload)-1]
					payload = payload[:i+len(field)] + `"` + strings.Replace(price, ".", ",", 1) + ` EUR"}`
					note = "  (unreadable price)"
				}
			}
			if err := publish(svc, pub, topic, payload, key, *ttl); err != nil {
				solace.Errf(*role, "%s", err)
			} else if !*quiet {
				fmt.Printf("[%s] #%d sent -> %s%s\n", *role, n, topic, note)
			}
			if *count > 0 && n >= *count {
				// Give outstanding receipts a moment to come back, so a
				// refusal from the broker is printed before the step ends.
				time.Sleep(2 * time.Second)
				solace.Logf(*role, "done: %d event(s) sent, %d refused by the broker.", n, refused())
				return
			}
			select {
			case <-stop:
				solace.Logf(*role, "stopping after %d event(s).", n)
				return
			default:
			}
		}
		if *quiet {
			fmt.Printf("[%s] round %d: %d events sent, %d in total\n", *role, round, *burst, n)
		}
		select {
		case <-stop:
			solace.Logf(*role, "stopping after %d event(s).", n)
			return
		case <-time.After(*every):
		}
	}
}

// startPublisher starts a guaranteed publisher that reports refusals without
// flooding the log. When a queue is full the broker refuses every message
// after it, and one line per refusal would bury the error worth reading.
func startPublisher(role string, svc sol.MessagingService) (sol.PersistentMessagePublisher, func() int) {
	pub, err := svc.CreatePersistentMessagePublisherBuilder().
		OnBackPressureWait(1000).
		Build()
	if err != nil {
		solace.Errf(role, "%s", err)
		os.Exit(1)
	}

	var mu sync.Mutex
	refused := 0
	pub.SetMessagePublishReceiptListener(func(r sol.PublishReceipt) {
		if r.GetError() == nil {
			return
		}
		mu.Lock()
		refused++
		n := refused
		mu.Unlock()
		if n == 1 || n%500 == 0 {
			solace.Errf(role, "the broker refused message %d: %s", n, r.GetError())
		}
	})

	if err := pub.Start(); err != nil {
		solace.Errf(role, "%s", err)
		os.Exit(1)
	}
	return pub, func() int {
		mu.Lock()
		defer mu.Unlock()
		return refused
	}
}

func publish(svc sol.MessagingService, pub sol.PersistentMessagePublisher, topic, payload, key string, ttl time.Duration) error {
	b := svc.MessageBuilder()
	if key != "" {
		b = b.WithProperty(config.QueuePartitionKey, key)
	}
	if ttl > 0 {
		b = b.WithProperty(config.MessagePropertyPersistentTimeToLive, ttl.Milliseconds())
	}
	msg, err := b.BuildWithStringPayload(payload)
	if err != nil {
		return err
	}
	return pub.Publish(msg, resource.TopicOf(topic), nil, nil)
}

// Consume reads one queue and settles every message, until stopped.
func Consume(args []string) {
	fs := flag.NewFlagSet("sonepar consume", flag.ExitOnError)
	user := fs.String("user", "", "client username to connect as")
	role := fs.String("role", "consumer", "label for log lines")
	queue := fs.String("queue", "", "queue to consume from")
	exclusive := fs.Bool("exclusive", false, "bind as an exclusive consumer and report active or standby")
	ackDelay := fs.Duration("ack-delay", 200*time.Millisecond, "simulated work per message")
	checkOrder := fs.Bool("check-order", false, "report any event that arrives out of sequence")
	showPayload := fs.Bool("payload", false, "print each payload")
	validate := fs.Bool("validate", false, "settle a price update REJECTED when its price is unreadable")
	failAll := fs.Bool("fail-all", false, "settle every message FAILED, as if a dependency were down")
	idleExit := fs.Duration("idle-exit", 0, "exit once no message has arrived for this long")
	quiet := fs.Bool("quiet", false, "print a line every 250 messages instead of every message")
	fs.Parse(args)

	if *user == "" || *queue == "" {
		fmt.Fprintln(os.Stderr, "usage: workshop sonepar consume --user <user> --queue <queue> [--exclusive] [--ack-delay D] [--check-order] [--validate] [--fail-all]")
		os.Exit(2)
	}

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	opts := solace.QueueOpts{
		// Client acknowledgement, so a consumer stopped mid-message really
		// does leave unsettled work for the broker to hand on.
		ClientAck: true,
		Shared:    !*exclusive,
		Outcomes: []config.MessageSettlementOutcome{
			config.PersistentReceiverAcceptedOutcome,
			config.PersistentReceiverFailedOutcome,
			config.PersistentReceiverRejectedOutcome,
		},
	}
	var active atomic.Bool
	if *exclusive {
		opts.OnStateChange = func(_, state sol.ReceiverState, _ time.Time) {
			active.Store(state == sol.ReceiverActive)
			if state == sol.ReceiverActive {
				solace.Logf(*role, "ACTIVE: the broker is now delivering this queue to me.")
			} else {
				solace.Logf(*role, "STANDBY: another consumer holds this queue. Waiting to take over.")
			}
		}
	}
	rcv := solace.BindQueue(*role, *user, svc, *queue, opts)
	defer solace.Terminate(rcv)

	if *exclusive {
		// The broker only reports a change of state. A consumer that binds
		// while another is active is never told it is passive, so say so
		// here, or a standby would look like an app that has hung.
		go func() {
			time.Sleep(time.Second)
			if !active.Load() {
				solace.Logf(*role, "STANDBY: another consumer holds this queue. Waiting to take over.")
			}
		}()
	}
	solace.Logf(*role, "working at roughly %s per message.", *ackDelay)
	if *failAll {
		solace.Logf(*role, "the price database is unreachable, so every message will be settled FAILED.")
	}
	fmt.Println()

	var mu sync.Mutex
	handled, redelivered, failed, rejected := 0, 0, 0, 0
	last := map[string]int{}
	lastAt := time.Now()

	if err := rcv.ReceiveAsync(func(msg message.InboundMessage) {
		// Work happens before settlement, so a message in flight really is
		// unsettled if this consumer stops now.
		time.Sleep(*ackDelay)
		payload := solace.PayloadOf(msg)

		mu.Lock()
		handled++
		n := handled
		lastAt = time.Now()
		redelivery := msg.IsRedelivered()
		if redelivery {
			redelivered++
		}
		key, hasKey := solace.MessageKey(msg)
		orderNote := ""
		if *checkOrder {
			if !hasKey {
				key = "all"
			}
			if s, ok := seqOf(payload); ok {
				if s > last[key] {
					last[key] = s
				} else if !redelivery {
					orderNote = fmt.Sprintf("  OUT OF ORDER (%s: %d after %d)", key, s, last[key])
				}
			}
		}
		mu.Unlock()

		outcome := config.PersistentReceiverAcceptedOutcome
		note := ""
		if *failAll {
			outcome, note = config.PersistentReceiverFailedOutcome, "  FAILED -> back on the queue"
		} else if *validate {
			var p struct {
				PriceEur float64 `json:"priceEur"`
			}
			if err := json.Unmarshal([]byte(payload), &p); err != nil {
				outcome, note = config.PersistentReceiverRejectedOutcome, "  REJECTED -> dead message queue: "+err.Error()
			}
		}

		mu.Lock()
		switch outcome {
		case config.PersistentReceiverFailedOutcome:
			failed++
		case config.PersistentReceiverRejectedOutcome:
			rejected++
		}
		mu.Unlock()

		if !*quiet || n%250 == 0 || outcome != config.PersistentReceiverAcceptedOutcome {
			line := fmt.Sprintf("[%s] #%d %s", *role, n, msg.GetDestinationName())
			if *checkOrder && hasKey {
				if s, ok := seqOf(payload); ok {
					line += fmt.Sprintf("  key=%s seq=%d", key, s)
				}
			} else if *checkOrder {
				if s, ok := seqOf(payload); ok {
					line += fmt.Sprintf("  seq=%d", s)
				}
			}
			if redelivery {
				line += "  (redelivered)"
			}
			fmt.Println(line + note + orderNote)
			if *showPayload {
				fmt.Printf("[%s]    %s\n", *role, payload)
			}
		}

		if err := rcv.Settle(msg, outcome); err != nil {
			solace.Errf(*role, "%s", err)
		}
	}); err != nil {
		solace.Errf(*role, "%s", err)
		os.Exit(1)
	}

	if *idleExit > 0 {
		for {
			time.Sleep(time.Second)
			mu.Lock()
			idle := time.Since(lastAt)
			mu.Unlock()
			if idle >= *idleExit {
				break
			}
		}
	} else {
		solace.WaitForStop()
	}

	mu.Lock()
	defer mu.Unlock()
	fmt.Println()
	solace.Logf(*role, "stopped after %d message(s): %d redelivered, %d failed, %d rejected.",
		handled, redelivered, failed, rejected)
	if *checkOrder && len(last) > 1 {
		solace.Logf(*role, "highest sequence seen per key: %v", last)
	}
}

// seqOf pulls the "seq" field out of a payload without a full JSON parse.
func seqOf(payload string) (int, bool) {
	const key = `"seq":`
	i := strings.Index(payload, key)
	if i < 0 {
		return 0, false
	}
	n, found := 0, false
	for _, c := range payload[i+len(key):] {
		if c < '0' || c > '9' {
			break
		}
		n = n*10 + int(c-'0')
		found = true
	}
	return n, found
}
