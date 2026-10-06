// Package hello implements the getting-started scenario.
//
// One greeter publishes a numbered greeting every few seconds and one listener
// prints what arrives. The messaging is deliberately the least interesting
// part of the workshop: this scenario exists to give attendees something real
// to press Play, Pause, Break it and Reset on before any pattern is introduced.
// The running number in each greeting is what makes the tooling legible: a
// gap in the listener's numbers is a gap in delivery, visible at a glance.
package hello

import (
	"flag"
	"fmt"
	"time"

	"solace-workshop/apps/internal/solace"
	"solace.dev/go/messaging/pkg/solace/message"
	"solace.dev/go/messaging/pkg/solace/resource"
)

// topic follows the same {area}/{domain}/{event}/{version} shape the later
// scenarios use, so the first topic an attendee reads already looks like the
// rest of the workshop.
const topic = "workshop/hello/greeting/v1"

const interval = 3 * time.Second

// Greet publishes a numbered greeting until it is stopped.
func Greet(args []string) {
	fs := flag.NewFlagSet("hello greet", flag.ExitOnError)
	user := fs.String("user", "svc-hello-greeter", "client username to connect as")
	role := fs.String("role", "greeter", "label for log lines")
	fs.Parse(args)

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	pub := solace.StartDirectPublisher(*role, *user, svc)
	defer pub.Terminate(time.Second)

	solace.Logf(*role, "publishing to %s every %s. Press Stop to end.", topic, interval)

	stop := make(chan struct{})
	go func() {
		solace.WaitForStop()
		close(stop)
	}()

	for n := 1; ; n++ {
		payload := fmt.Sprintf(`{"greeting":"hello","number":%d,"sentAt":"%s"}`,
			n, time.Now().UTC().Format(time.RFC3339))
		if err := pub.PublishString(payload, resource.TopicOf(topic)); err != nil {
			solace.Errf(*role, "%s", err)
		} else {
			solace.Logf(*role, "#%d sent -> %s", n, topic)
		}
		select {
		case <-stop:
			solace.Logf(*role, "stopping after %d greeting(s).", n)
			return
		case <-time.After(interval):
		}
	}
}

// Listen prints every greeting that arrives until it is stopped.
//
// The subscription is a flag so the same role can be pointed at a topic its
// ACL profile does not allow, which is how the scenario shows a failed step.
func Listen(args []string) {
	fs := flag.NewFlagSet("hello listen", flag.ExitOnError)
	user := fs.String("user", "svc-hello-listener", "client username to connect as")
	role := fs.String("role", "listener", "label for log lines")
	sub := fs.String("sub", "workshop/hello/>", "topic subscription")
	fs.Parse(args)

	svc := solace.Connect(*role, *user)
	defer svc.Disconnect()

	rcv := solace.StartDirectReceiver(*role, svc)
	defer rcv.Terminate(time.Second)

	received := 0
	if err := rcv.ReceiveAsync(func(msg message.InboundMessage) {
		received++
		solace.Eventf(*role, received, msg.GetDestinationName(), solace.PayloadOf(msg))
	}); err != nil {
		solace.Errf(*role, "%s", err)
		return
	}

	solace.Subscribe(*role, *user, rcv, *sub)
	solace.Logf(*role, "listening. Only greetings published from now on will arrive.")

	solace.WaitForStop()
	fmt.Println()
	solace.Logf(*role, "shutting down after %d message(s).", received)
}
