// Package fanout implements the fan-out scenario.
//
// One publisher emits grocery order events. Several consumers each receive
// their own copy, and the publisher knows about none of them. Adding a
// consumer is a subscription on the broker, not a change to the producer,
// which is the whole point: the cost of a new consumer does not land on the
// team that owns the event.
//
// Two of the consumers take their copy directly and two take it through a
// queue. Same single publish, different quality of service per consumer: the
// direct ones are cheap and see only what is published while they are
// connected, and the queued ones are spooled and catch up on whatever they
// missed.
package fanout

import (
	"flag"
	"fmt"
	"math/rand"
	"os"
	"time"

	"solace-workshop/apps/internal/solace"
	"solace.dev/go/messaging/pkg/solace/message"
)

// interval is the pause between orders. Slow enough to read a pane, fast
// enough that a late-started consumer has a visible backlog to drain.
const interval = 2 * time.Second

var (
	stores   = []string{"store1421", "store0887", "store2290"}
	channels = []string{"online", "inStore"}
)

// Publish emits grocery order events until stopped.
//
// Topics follow the workshop convention:
//
//	{org}/{domain}/{object}/{action}/{version}/{context...}/{id}
//
// Read left to right, most constant to most variable. Every consumer's
// subscription below is a prefix of this shape with wildcards, which is what
// makes one publish serve four different interests.
func Publish(args []string) {
	fs := flag.NewFlagSet("fanout publish", flag.ExitOnError)
	user := fs.String("user", "svc-fanout-publisher", "client username to connect as")
	role := fs.String("role", "orders", "label for log lines")
	fs.Parse(args)

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	pub := solace.StartPersistentPublisher(*role, *user, svc)
	defer solace.Terminate(pub)

	solace.Logf(*role, "publishing an order every %s. Press Stop to end.", interval)
	fmt.Println()

	stop := make(chan struct{})
	go func() { solace.WaitForStop(); close(stop) }()

	for n := 1; ; n++ {
		channel := channels[n%len(channels)]
		store := stores[rand.Intn(len(stores))]
		orderID := fmt.Sprintf("o%06d", 100000+n)

		// Every fifth order is cancelled rather than placed. Only the
		// subscriptions that wildcard the action see these, which is how an
		// attendee can tell at a glance which pane subscribed to what.
		action := "placed"
		if n%5 == 0 {
			action = "cancelled"
		}

		topic := fmt.Sprintf("schwarz/grocery/order/%s/v1/%s/%s/%s", action, channel, store, orderID)
		payload := fmt.Sprintf(
			`{"orderId":"%s","store":"%s","channel":"%s","action":"%s","totalEur":%.2f,"at":"%s"}`,
			orderID, store, channel, action, 10+rand.Float64()*90, time.Now().UTC().Format(time.RFC3339))

		if err := solace.PublishKeyed(svc, pub, topic, payload, ""); err != nil {
			solace.Errf(*role, "publish to %s failed: %s", topic, err)
		} else {
			fmt.Printf("#%d -> %s\n", n, topic)
		}

		select {
		case <-stop:
			solace.Logf(*role, "stopping after %d order(s).", n)
			return
		case <-time.After(interval):
		}
	}
}

// Consume runs one fan-out consumer.
//
// Passing --sub takes a direct copy; passing --queue takes a spooled one. The
// same function serves both so the difference on screen comes from the flag,
// not from two different implementations that might differ for other reasons.
func Consume(args []string) {
	fs := flag.NewFlagSet("fanout consume", flag.ExitOnError)
	role := fs.String("role", "", "label for log lines, e.g. finance")
	user := fs.String("user", "", "client username to connect as")
	sub := fs.String("sub", "", "topic subscription for a direct consumer")
	queue := fs.String("queue", "", "queue name for a guaranteed consumer")
	fs.Parse(args)

	if *role == "" || *user == "" || (*sub == "" && *queue == "") {
		fmt.Fprintln(os.Stderr, "usage: workshop fanout consume --role <role> --user <username> (--sub <topic> | --queue <queue>)")
		os.Exit(2)
	}

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	received := 0
	handle := func(msg message.InboundMessage) {
		received++
		solace.Eventf(*role, received, msg.GetDestinationName(), solace.PayloadOf(msg))
	}

	if *queue != "" {
		rcv := solace.BindQueue(*role, *user, svc, *queue, solace.QueueOpts{})
		defer solace.Terminate(rcv)
		if err := rcv.ReceiveAsync(handle); err != nil {
			solace.Errf(*role, "could not register the message handler: %s", err)
			os.Exit(1)
		}
		solace.Logf(*role, "consuming from the queue. Anything published while this was stopped is still waiting.")
	} else {
		rcv := solace.StartDirectReceiver(*role, svc)
		defer solace.Terminate(rcv)
		if err := rcv.ReceiveAsync(handle); err != nil {
			solace.Errf(*role, "could not register the message handler: %s", err)
			os.Exit(1)
		}
		solace.Subscribe(*role, *user, rcv, *sub)
		solace.Logf(*role, "listening directly. Only what is published from now on will arrive.")
	}

	solace.WaitForStop()
	fmt.Println()
	solace.Logf(*role, "shutting down after %d message(s).", received)
}
