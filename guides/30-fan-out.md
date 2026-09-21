# Fan-out

An order flips to shipped and five teams want to know. In a synchronous
design, each one is a change to the order system. Here the order service
publishes once and knows about none of them.

Press **Play**. Four consumers, one publisher.

## One publish, four deliveries

The publisher sends one message per order to a topic like:

```
schwarz/grocery/order/placed/v1/online/store0887/o100002
```

It names no consumer. Each consumer expresses its own interest:

| Consumer | Subscription | Sees |
| --- | --- | --- |
| Finance | `schwarz/grocery/order/placed/v1/>` | Every placement, both channels |
| Warehouse | `schwarz/grocery/order/placed/v1/online/>` | Online placements only |
| Loyalty | `schwarz/grocery/order/*/v1/>` | Placements **and** cancellations |
| Analytics | `schwarz/grocery/>` | Everything, from a queue |

Every fifth order is a cancellation rather than a placement. Only loyalty and
analytics see those, because only their subscriptions wildcard the action
level. Compare the message counts in the four panes after a minute.

## Quality of service is the consumer's choice

Finance and warehouse subscribe **directly**: cheap, and they see only what
is published while they are connected.

Loyalty and analytics read from **queues**: the broker spools their copy
whether or not they are running.

That is one publish, delivered four times, at two different qualities of
service, with no coordination from the publisher.

## Add a consumer to a running system

Analytics is deliberately not in the Play sequence. While everything else
runs, look at `q.fanout.analytics` in Inspect: `msgSpoolUsage` is climbing,
because its queue has been collecting since you pressed Play.

Now start **Start analytics consumer (late)**. It drains the backlog from the
first order onward, and nothing about the publisher changed to allow it.

This is the pattern's real claim. Adding a consumer costs a subscription, not
a release.

## Try this

- Stop finance, wait, and start it again. Compare what it missed with what
  analytics missed over the same period.
- Work out which pane a subscription to `schwarz/grocery/order/*/v1/inStore/>`
  would match, then add it and check.

Next: [Shock absorber](40-shock-absorber.md).
