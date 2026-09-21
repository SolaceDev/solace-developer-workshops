// Package pubsub implements the publish-and-subscribe scenario.
//
// Acme Air publishes flight, baggage and booking events to three topics.
// Several subscribers listen, each connecting as its own client username with
// its own ACL profile, and each receives only the domain it is authorised for.
// Every client shares one client profile, so any difference in what they see
// comes from access control rather than from application code. The publisher
// and the subscriber below are deliberately unremarkable: the scenario is
// carried by broker configuration, and the code should make that obvious.
package pubsub

import (
	"flag"
	"fmt"
	"os"
	"time"

	"solace-workshop/apps/internal/solace"
	"solace.dev/go/messaging/pkg/solace/message"
	"solace.dev/go/messaging/pkg/solace/resource"
)

// interval is the pause between rounds. One round publishes all three events.
const interval = 5 * time.Second

// gap separates the three events within a round so they land as distinct lines
// in each subscriber's pane rather than as one indistinguishable burst.
const gap = 500 * time.Millisecond

// event is one {topic, payload} pair.
//
// Topics follow acme/air/{domain}/{action}/{version}/{key}. The hierarchy is
// what lets a subscriber ask for one domain and not the others, and putting a
// version in the middle leaves room to publish a v2 alongside v1 without
// disturbing existing subscribers.
type event struct {
	topic   string
	payload string
}

var events = []event{
	{
		"acme/air/flight/departed/v1/AC8763",
		`{"flightNumber":"AC8763","origin":"YYZ","destination":"SFO",` +
			`"scheduledDeparture":"2026-08-26T14:05:00Z",` +
			`"actualDeparture":"2026-08-26T14:23:00Z","delayMinutes":18,` +
			`"gate":"D28","aircraft":"A220-300"}`,
	},
	{
		"acme/air/baggage/loaded/v1/AC8763",
		`{"flightNumber":"AC8763","bagTag":"AC441982",` +
			`"passengerRef":"PNR-7QX2LM","loadedAt":"2026-08-26T13:47:00Z",` +
			`"holdPosition":"FWD-2","weightKg":23.4}`,
	},
	{
		"acme/air/booking/confirmed/v1/7QX2LM",
		`{"recordLocator":"7QX2LM","passenger":"J. Okonkwo",` +
			`"flightNumber":"AC8763","cabin":"economy","seat":"14C",` +
			`"fareCad":412.75,"confirmedAt":"2026-08-24T09:12:00Z"}`,
	},
}

// Publish runs the Acme Air publisher until it is stopped.
func Publish(args []string) {
	fs := flag.NewFlagSet("pubsub publish", flag.ExitOnError)
	user := fs.String("user", "svc-acme-air-publisher", "client username to connect as")
	role := fs.String("role", "publisher", "label for log lines")
	fs.Parse(args)

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	pub := solace.StartDirectPublisher(*role, *user, svc)
	defer pub.Terminate(time.Second)

	solace.Logf(*role, "publishing every %s. Press Stop to end.", interval)
	fmt.Println()

	// Repeats rather than sending once, so a subscriber started late still
	// sees traffic. Direct messaging has no replay, so without a loop an
	// attendee who starts a subscriber after the publish sees an empty pane
	// and no obvious reason why.
	stop := make(chan struct{})
	go func() {
		solace.WaitForStop()
		close(stop)
	}()

	for round := 1; ; round++ {
		fmt.Printf("--- round %d ---\n", round)
		for _, e := range events {
			if err := pub.PublishString(e.payload, resource.TopicOf(e.topic)); err != nil {
				solace.Errf(*role, "publish to %s failed: %s", e.topic, err)
			} else {
				fmt.Printf("Published -> %s\n", e.topic)
				fmt.Printf("            %s\n", e.payload)
			}
			select {
			case <-stop:
				solace.Logf(*role, "stopping after %d round(s).", round)
				return
			case <-time.After(gap):
			}
		}
		fmt.Println()
		// Measured from the end of the burst, so each round starts a
		// predictable interval after the last one finished.
		select {
		case <-stop:
			solace.Logf(*role, "stopping after %d round(s).", round)
			return
		case <-time.After(interval - time.Duration(len(events))*gap):
		}
	}
}

// Subscribe runs one Acme Air subscriber until it is stopped.
//
// One function serves every subscriber role; which role it plays is decided
// entirely by the flags the scenario passes in. Same code, same client
// profile, different ACL profiles.
func Subscribe(args []string) {
	fs := flag.NewFlagSet("pubsub subscribe", flag.ExitOnError)
	role := fs.String("role", "", "label for log lines, e.g. baggage")
	user := fs.String("user", "", "client username to connect as")
	sub := fs.String("sub", "", "topic subscription")
	fs.Parse(args)

	if *role == "" || *user == "" || *sub == "" {
		fmt.Fprintln(os.Stderr, "usage: workshop pubsub subscribe --role <role> --user <username> --sub <topic>")
		os.Exit(2)
	}

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	rcv := solace.StartDirectReceiver(*role, svc)
	defer rcv.Terminate(time.Second)

	received := 0
	// The callback is registered before the subscription is added so no
	// message can arrive before there is something to hand it to.
	if err := rcv.ReceiveAsync(func(msg message.InboundMessage) {
		received++
		solace.Eventf(*role, received, msg.GetDestinationName(), solace.PayloadOf(msg))
	}); err != nil {
		solace.Errf(*role, "could not register the message handler: %s", err)
		os.Exit(1)
	}

	solace.Subscribe(*role, *user, rcv, *sub)
	solace.Logf(*role, "listening. Direct messaging: only what is published from now on will arrive.")

	solace.WaitForStop()
	fmt.Println()
	solace.Logf(*role, "shutting down after %d message(s).", received)
}
