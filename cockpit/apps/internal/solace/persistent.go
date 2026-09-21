package solace

import (
	"os"
	"time"

	"solace.dev/go/messaging/pkg/solace"
	"solace.dev/go/messaging/pkg/solace/config"
	"solace.dev/go/messaging/pkg/solace/message"
	"solace.dev/go/messaging/pkg/solace/resource"
)

// QueueOpts configures a persistent receiver.
type QueueOpts struct {
	// ClientAck leaves acknowledgement to the application. A scenario that
	// wants to show redelivery after a crash needs this: with automatic
	// acknowledgement the API acks before the app has finished, so killing
	// the consumer proves nothing.
	ClientAck bool

	// Outcomes are the settlement outcomes this receiver may use. FAILED
	// returns a message for redelivery, REJECTED sends it to the dead message
	// queue. The broker has to be told up front which ones to expect.
	Outcomes []config.MessageSettlementOutcome

	// Shared binds the queue as non-exclusive, so several instances of the
	// same app each take a share of the messages. This has to match how the
	// queue was provisioned: binding exclusively to a non-exclusive queue
	// gets one consumer the messages and leaves the rest idle, which looks
	// like a broken app rather than a configuration mismatch.
	Shared bool
}

// BindQueue starts a persistent receiver bound to an existing durable queue.
//
// Missing resources are never created. The queues in this workshop are
// terraform's job, and an app that quietly creates its own on a typo would
// hide the mistake and leave an object terraform does not know about. Failing
// with "run Apply first" is the more useful outcome.
func BindQueue(role, username string, svc solace.MessagingService, queue string, opts QueueOpts) solace.PersistentMessageReceiver {
	b := svc.CreatePersistentMessageReceiverBuilder().
		WithMissingResourcesCreationStrategy(config.PersistentReceiverDoNotCreateMissingResources)

	if opts.ClientAck {
		b = b.WithMessageClientAcknowledgement()
	} else {
		b = b.WithMessageAutoAcknowledgement()
	}
	if len(opts.Outcomes) > 0 {
		b = b.WithRequiredMessageOutcomeSupport(opts.Outcomes...)
	}

	endpoint := resource.QueueDurableExclusive(queue)
	if opts.Shared {
		endpoint = resource.QueueDurableNonExclusive(queue)
	}

	rcv, err := b.Build(endpoint)
	if err != nil {
		Errf(role, "could not build a receiver for queue %s: %s", queue, err)
		os.Exit(1)
	}

	if err := rcv.Start(); err != nil {
		Errf(role, "could not bind to queue %s:", queue)
		Errf(role, "  %s", err)
		if why := Explain(err, username, queue); why != "" {
			Errf(role, "")
			Errf(role, "%s", why)
		}
		os.Exit(1)
	}

	if opts.Shared {
		Logf(role, "bound to queue %s (shared with other instances)", queue)
	} else {
		Logf(role, "bound to queue %s", queue)
	}
	return rcv
}

// StartPersistentPublisher starts a publisher for guaranteed messages.
//
// The receipt listener is what distinguishes guaranteed from direct: the
// broker confirms it has taken responsibility for each message, and a failure
// here means the message was not spooled. Printing acks would bury the log in
// a burst scenario, so only failures are reported.
func StartPersistentPublisher(role, username string, svc solace.MessagingService) solace.PersistentMessagePublisher {
	pub, err := svc.CreatePersistentMessagePublisherBuilder().
		// Wait rather than error when the internal buffer fills. A burst
		// publisher is meant to outrun its consumers; it should not fall over
		// because of its own send buffer.
		OnBackPressureWait(1000).
		Build()
	if err != nil {
		Errf(role, "could not build the publisher: %s", err)
		os.Exit(1)
	}

	pub.SetMessagePublishReceiptListener(func(receipt solace.PublishReceipt) {
		if receipt.GetError() != nil {
			Errf(role, "the broker did not accept a message: %s", receipt.GetError())
			if why := Explain(receipt.GetError(), username, ""); why != "" {
				Errf(role, "%s", why)
			}
		}
	})

	if err := pub.Start(); err != nil {
		Errf(role, "could not start the publisher: %s", err)
		os.Exit(1)
	}
	return pub
}

// PublishKeyed publishes a persistent message, optionally with a partition key.
//
// The partition key is an ordinary message property. The application decides
// what the key means (a belt, a customer, a device) and the broker guarantees
// that everything sharing a key goes to the same partition, and so to the same
// consumer in order. Passing an empty key publishes without one.
func PublishKeyed(svc solace.MessagingService, pub solace.PersistentMessagePublisher, topic, payload, key string) error {
	b := svc.MessageBuilder()
	if key != "" {
		b = b.WithProperty(config.QueuePartitionKey, key)
	}
	msg, err := b.BuildWithStringPayload(payload)
	if err != nil {
		return err
	}
	return pub.Publish(msg, resource.TopicOf(topic), nil, nil)
}

// Terminate shuts a lifecycle component down with a short grace period, used
// via defer so an app leaves the broker cleanly when the cockpit stops it.
func Terminate(c interface{ Terminate(time.Duration) error }) {
	_ = c.Terminate(2 * time.Second)
}

// MessageKey returns a message's partition key, and whether it had one.
func MessageKey(msg message.InboundMessage) (string, bool) {
	v, ok := msg.GetProperty(config.QueuePartitionKey)
	if !ok {
		return "", false
	}
	s, ok := v.(string)
	return s, ok
}
