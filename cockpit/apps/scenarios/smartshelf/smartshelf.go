// Package smartshelf implements the Smart Shelf Pricing capstone.
//
// A grocery chain wants electronic shelf labels that reprice through the day,
// and the polling approach fails twice over. A timed job reads the pricing
// database for the whole estate and pushes the current price to every label,
// changed or not. The constant full-estate reads overwhelm the database, and
// the redundant writes drain shelf tag batteries across hundreds of stores.
//
// The fix composes two patterns. Scans, stock counts and footfall are
// published as they happen (streaming), and a pricing engine maintains a
// read-optimised view instead of anyone polling the system of record (the
// query side of command and query). Because the engine holds current state,
// it can tell whether a price actually changed, and emits only when it did.
//
// That last part is the measurable outcome, so the engine reports it: how
// many inputs it evaluated against how many updates it emitted. The gap is
// the battery life and the database load that polling would have spent.
package smartshelf

import (
	"encoding/json"
	"flag"
	"fmt"
	"math"
	"math/rand"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"solace-workshop/apps/internal/solace"
	"solace.dev/go/messaging/pkg/solace/message"
)

var stores = []string{"store1421", "store0887"}

// skus are the products on the shelf. Each has a base price the engine
// adjusts from.
var skus = map[string]float64{
	"sku-milk-2l":    2.49,
	"sku-bread-rye":  3.19,
	"sku-eggs-12":    4.05,
	"sku-coffee-1kg": 12.75,
	"sku-butter-250": 2.89,
	"sku-bananas-kg": 1.35,
}

// Sensors publishes the three input streams.
func Sensors(args []string) {
	fs := flag.NewFlagSet("smartshelf sensors", flag.ExitOnError)
	user := fs.String("user", "svc-shelf-sensors", "client username to connect as")
	role := fs.String("role", "sensors", "label for log lines")
	rate := fs.Duration("interval", 300*time.Millisecond, "pause between readings")
	fs.Parse(args)

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	pub := solace.StartPersistentPublisher(*role, *user, svc)
	defer solace.Terminate(pub)

	names := make([]string, 0, len(skus))
	for s := range skus {
		names = append(names, s)
	}
	sort.Strings(names)

	solace.Logf(*role, "publishing scans, stock counts and footfall every %s.", *rate)
	solace.Logf(*role, "most readings will not move a price. That is the point.")
	fmt.Println()

	stop := make(chan struct{})
	go func() { solace.WaitForStop(); close(stop) }()

	// Current stock per store and SKU, so counts drift from where they were
	// rather than being redrawn at random each time.
	stock := map[string]int{}
	footfall := map[string]int{}

	for n := 1; ; n++ {
		store := stores[rand.Intn(len(stores))]
		sku := names[rand.Intn(len(names))]

		var topic, payload string
		switch n % 3 {
		case 0:
			topic = fmt.Sprintf("schwarz/grocery/shelf/scanned/v1/%s/%s", store, sku)
			payload = fmt.Sprintf(`{"store":"%s","sku":"%s","units":%d}`, store, sku, 1+rand.Intn(3))
		case 1:
			// Stock drifts rather than jumping. A uniformly random count
			// would swing across the pricing thresholds on almost every
			// reading, so prices would oscillate and the suppression figure
			// would understate what a real shelf looks like.
			key := store + "/" + sku
			onHand, ok := stock[key]
			if !ok {
				onHand = 25 + rand.Intn(15)
			}
			// Biased downwards, like a shelf selling through the day, with
			// an occasional restock. Stock therefore crosses the pricing
			// thresholds a few times in a session: often enough to see
			// prices move, rarely enough that most readings change nothing.
			if rand.Intn(25) == 0 {
				onHand = 95 + rand.Intn(25)
			} else {
				onHand += rand.Intn(9) - 6
			}
			if onHand < 0 {
				onHand = 0
			}
			if onHand > 120 {
				onHand = 120
			}
			stock[key] = onHand
			topic = fmt.Sprintf("schwarz/grocery/stock/updated/v1/%s/%s", store, sku)
			payload = fmt.Sprintf(`{"store":"%s","sku":"%s","onHand":%d}`, store, sku, onHand)
		default:
			shoppersNow, ok := footfall[store]
			if !ok {
				shoppersNow = 20 + rand.Intn(20)
			}
			shoppersNow += rand.Intn(9) - 4
			if shoppersNow < 2 {
				shoppersNow = 2
			}
			if shoppersNow > 70 {
				shoppersNow = 70
			}
			footfall[store] = shoppersNow
			topic = fmt.Sprintf("schwarz/grocery/footfall/measured/v1/%s", store)
			payload = fmt.Sprintf(`{"store":"%s","shoppers":%d}`, store, shoppersNow)
		}

		if err := solace.PublishKeyed(svc, pub, topic, payload, ""); err != nil {
			solace.Errf(*role, "publish failed: %s", err)
		} else if n%20 == 1 {
			fmt.Printf("[%s] %d readings published\n", *role, n)
		}

		select {
		case <-stop:
			solace.Logf(*role, "stopping after %d reading(s).", n)
			return
		case <-time.After(*rate):
		}
	}
}

// shelf is the read model for one product in one store.
type shelf struct {
	OnHand   int
	Shoppers int
	Price    float64
}

// Pricing is the read model and the change filter.
//
// It keeps current state per store and SKU, recomputes a price on every
// input, and publishes only when the result differs from what the label is
// already showing. Without the state there would be nothing to compare
// against, and every reading would produce a write.
func Pricing(args []string) {
	fs := flag.NewFlagSet("smartshelf pricing", flag.ExitOnError)
	user := fs.String("user", "svc-shelf-pricing", "client username to connect as")
	role := fs.String("role", "pricing", "label for log lines")
	queue := fs.String("queue", "q.shelf.pricing", "queue to consume from")
	report := fs.Duration("report", 5*time.Second, "how often to report the emitted-versus-evaluated figures")
	fs.Parse(args)

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	pub := solace.StartPersistentPublisher(*role, *user, svc)
	defer solace.Terminate(pub)

	rcv := solace.BindQueue(*role, *user, svc, *queue, solace.QueueOpts{ClientAck: true})
	defer solace.Terminate(rcv)

	solace.Logf(*role, "holding a price view per store and SKU, and emitting only on a real change.")
	fmt.Println()

	var mu sync.Mutex
	view := map[string]*shelf{}
	shoppers := map[string]int{}
	evaluated, emitted := 0, 0

	if err := rcv.ReceiveAsync(func(msg message.InboundMessage) {
		var body struct {
			Store    string `json:"store"`
			SKU      string `json:"sku"`
			OnHand   *int   `json:"onHand"`
			Shoppers *int   `json:"shoppers"`
			Units    *int   `json:"units"`
		}
		if err := json.Unmarshal([]byte(solace.PayloadOf(msg)), &body); err != nil || body.Store == "" {
			_ = rcv.Ack(msg)
			return
		}

		mu.Lock()

		// Footfall is per store, so it can move the price of everything in
		// that store rather than one product.
		if body.Shoppers != nil {
			shoppers[body.Store] = *body.Shoppers
		}

		affected := []string{}
		if body.SKU != "" {
			affected = append(affected, body.SKU)
		} else {
			for sku := range skus {
				affected = append(affected, sku)
			}
			sort.Strings(affected)
		}

		type change struct {
			sku      string
			from, to float64
		}
		changes := []change{}

		for _, sku := range affected {
			key := body.Store + "/" + sku
			st, ok := view[key]
			if !ok {
				st = &shelf{OnHand: 50, Price: skus[sku]}
				view[key] = st
			}
			if body.OnHand != nil {
				st.OnHand = *body.OnHand
			}
			if body.Units != nil && st.OnHand >= *body.Units {
				st.OnHand -= *body.Units
			}
			st.Shoppers = shoppers[body.Store]

			evaluated++
			next := priceFor(skus[sku], st)
			if math.Abs(next-st.Price) >= 0.01 {
				changes = append(changes, change{sku, st.Price, next})
				st.Price = next
			}
		}

		ev := evaluated
		mu.Unlock()

		for _, c := range changes {
			out := fmt.Sprintf("schwarz/grocery/price/updated/v1/%s/%s", body.Store, c.sku)
			payload := fmt.Sprintf(`{"store":"%s","sku":"%s","priceEur":%.2f,"previousEur":%.2f,"at":"%s"}`,
				body.Store, c.sku, c.to, c.from, time.Now().UTC().Format(time.RFC3339))
			if err := solace.PublishKeyed(svc, pub, out, payload, ""); err != nil {
				// Leave the input unacknowledged so the change is not lost.
				solace.Errf(*role, "could not publish a price update, leaving the reading on the queue: %s", err)
				return
			}
			mu.Lock()
			emitted++
			mu.Unlock()
			fmt.Printf("[%s] %s %s  %.2f -> %.2f\n", *role, body.Store, c.sku, c.from, c.to)
		}

		if ev%50 == 0 {
			mu.Lock()
			e, em := evaluated, emitted
			mu.Unlock()
			fmt.Printf("[%s] evaluated %d, emitted %d, suppressed %d\n", *role, e, em, e-em)
		}

		if err := rcv.Ack(msg); err != nil {
			solace.Errf(*role, "could not acknowledge a reading: %s", err)
		}
	}); err != nil {
		solace.Errf(*role, "could not register the message handler: %s", err)
		os.Exit(1)
	}

	// A steady report, so the figures are on screen even when prices are
	// quiet and nothing else is being printed.
	stop := make(chan struct{})
	go func() { solace.WaitForStop(); close(stop) }()
	ticker := time.NewTicker(*report)
	defer ticker.Stop()

	for {
		select {
		case <-stop:
			mu.Lock()
			e, em := evaluated, emitted
			mu.Unlock()
			fmt.Println()
			solace.Logf(*role, "stopped after evaluating %d reading(s) and emitting %d update(s).", e, em)
			if e > 0 {
				solace.Logf(*role, "%d writes to shelf labels were avoided, which is %d%% of what polling would have sent.",
					e-em, (e-em)*100/e)
			}
			return
		case <-ticker.C:
			mu.Lock()
			e, em := evaluated, emitted
			mu.Unlock()
			if e > 0 {
				fmt.Printf("[%s] evaluated %d, emitted %d, suppressed %d (%d%%)\n", *role, e, em, e-em, (e-em)*100/e)
			}
		}
	}
}

// priceFor is a deliberately simple rule: scarcity and a busy store nudge the
// price up, plenty of stock nudges it down. Rounded to the nearest cent,
// which is also what makes most readings produce no change at all.
func priceFor(base float64, st *shelf) float64 {
	p := base
	switch {
	case st.OnHand < 10:
		p *= 1.08
	case st.OnHand < 30:
		p *= 1.03
	case st.OnHand > 90:
		p *= 0.96
	}
	if st.Shoppers > 40 {
		p *= 1.02
	}
	return math.Round(p*100) / 100
}

// Labels is the shelf tag fleet.
//
// Every message it receives is a write to a physical tag, so the count in
// this pane is the battery cost of the whole design.
func Labels(args []string) {
	fs := flag.NewFlagSet("smartshelf labels", flag.ExitOnError)
	user := fs.String("user", "svc-shelf-labels", "client username to connect as")
	role := fs.String("role", "labels", "label for log lines")
	queue := fs.String("queue", "q.shelf.labels", "queue to consume from")
	fs.Parse(args)

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	rcv := solace.BindQueue(*role, *user, svc, *queue, solace.QueueOpts{ClientAck: true})
	defer solace.Terminate(rcv)

	solace.Logf(*role, "every line below is one physical tag being rewritten.")
	fmt.Println()

	var mu sync.Mutex
	written := 0

	if err := rcv.ReceiveAsync(func(msg message.InboundMessage) {
		var body struct {
			Store    string  `json:"store"`
			SKU      string  `json:"sku"`
			PriceEur float64 `json:"priceEur"`
		}
		_ = json.Unmarshal([]byte(solace.PayloadOf(msg)), &body)

		mu.Lock()
		written++
		n := written
		mu.Unlock()

		fmt.Printf("[%s] #%d %s %-16s now %.2f EUR\n", *role, n,
			body.Store, strings.TrimPrefix(body.SKU, "sku-"), body.PriceEur)

		if err := rcv.Ack(msg); err != nil {
			solace.Errf(*role, "could not acknowledge a price update: %s", err)
		}
	}); err != nil {
		solace.Errf(*role, "could not register the message handler: %s", err)
		os.Exit(1)
	}

	solace.WaitForStop()
	mu.Lock()
	defer mu.Unlock()
	fmt.Println()
	solace.Logf(*role, "stopped after %d tag write(s). Polling would have written one per reading.", written)
}
