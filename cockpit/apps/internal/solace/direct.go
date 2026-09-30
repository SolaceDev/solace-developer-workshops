package solace

import (
	"os"

	"solace.dev/go/messaging/pkg/solace"
	"solace.dev/go/messaging/pkg/solace/message"
	"solace.dev/go/messaging/pkg/solace/resource"
)

// StartDirectReceiver builds and starts a direct receiver with no subscriptions.
//
// Subscriptions are added afterwards, by Subscribe, rather than passed to the
// builder. Building WithSubscriptions folds a denied subscription into the
// Start error, which would report an ACL refusal as "could not start the
// receiver" and lose the distinction this scenario exists to teach: the client
// connects perfectly well, and it is the subscription that is refused.
func StartDirectReceiver(role string, svc solace.MessagingService) solace.DirectMessageReceiver {
	rcv, err := svc.CreateDirectMessageReceiverBuilder().Build()
	if err != nil {
		Errf(role, "could not build the receiver: %s", err)
		os.Exit(1)
	}
	if err := rcv.Start(); err != nil {
		Errf(role, "could not start the receiver: %s", err)
		os.Exit(1)
	}
	return rcv
}

// Subscribe adds one topic subscription, and exits on a refusal.
//
// An ACL refusal is an expected outcome in this workshop, not a crash: the
// pub-sub scenario invites attendees to point a subscriber at a topic it is
// not authorised for and see what the broker does. AddSubscription is
// synchronous and returns the broker's error directly, so the refusal is
// caught here at the moment it happens. It is printed exactly as the API
// returns it, with nothing added: reading the broker's own answer is the
// point, and the cockpit's failure card carries the explanation.
func Subscribe(role, username string, rcv solace.DirectMessageReceiver, topic string) {
	if err := rcv.AddSubscription(resource.TopicSubscriptionOf(topic)); err != nil {
		Errf(role, "%s", err)
		os.Exit(1)
	}
	Logf(role, "subscribed to %s", topic)
}

// StartDirectPublisher builds and starts a direct publisher.
//
// A direct publisher reports a rejected publish asynchronously rather than
// returning an error from Publish, so the failure listener is wired up here.
// Without it an ACL-denied publish is silently dropped and the scenario looks
// like it is working while nothing arrives.
func StartDirectPublisher(role, username string, svc solace.MessagingService) solace.DirectMessagePublisher {
	pub, err := svc.CreateDirectMessagePublisherBuilder().Build()
	if err != nil {
		Errf(role, "could not build the publisher: %s", err)
		os.Exit(1)
	}
	pub.SetPublishFailureListener(func(fail solace.FailedPublishEvent) {
		topic := ""
		if d := fail.GetDestination(); d != nil {
			topic = d.GetName()
		}
		Errf(role, "publish to %s failed: %s", topic, fail.GetError())
		if why := Explain(fail.GetError(), username, topic); why != "" {
			Errf(role, "%s", why)
		}
	})
	if err := pub.Start(); err != nil {
		Errf(role, "could not start the publisher: %s", err)
		os.Exit(1)
	}
	return pub
}

// PayloadOf returns a message's payload as a string, falling back to a note
// for the binary case so a log line never silently renders as empty.
func PayloadOf(msg message.InboundMessage) string {
	if s, ok := msg.GetPayloadAsString(); ok {
		return s
	}
	if b, ok := msg.GetPayloadAsBytes(); ok && len(b) > 0 {
		return string(b)
	}
	return "(empty payload)"
}
