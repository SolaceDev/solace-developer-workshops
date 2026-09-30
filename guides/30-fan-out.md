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
| Analytics | `schwarz/grocery/>` | Everything |

Every fifth order is a cancellation rather than a placement. Only loyalty and
analytics see those, because only their subscriptions wildcard the action
level. Compare the message counts in the four panes after a minute.

## Every consumer is direct

All four consumers subscribe **directly**. There is no queue: the broker
matches each publish against every subscription and sends a copy to each
consumer that matches, right away.

That is one publish, delivered up to four times, with no coordination from the
publisher. The flip side of direct delivery is that a consumer only receives
what is published while it is connected. Nothing is held for it.

## Add a consumer to a running system

Analytics is deliberately not in the Play sequence. Let everything else run
for a while, then start **Start analytics consumer (late)**. It starts
receiving on the next publish, and nothing about the publisher changed to
allow it. It does not see anything published before it connected.

This is the pattern's real claim. Adding a consumer costs a subscription, not
a release.

## Break it

With Play running, scroll to **Break it** in the cockpit. Each card causes one
failure on purpose. Press **Break it**, read the app's output and what the
card tells you to look for, then press **Reset**. The card stays open after
the reset so you can see the recovery, and **Why this breaks** explains the
cause and where you would meet it in production.

1. **A consumer goes offline.** Finance stops while the order service keeps
   publishing.
2. **A subscription with a typo.** A new warehouse consumer subscribes to
   schwarz/grocery/order/placed/online/>, leaving out the v1 level.

## Try this

- Stop finance, wait, and start it again. The orders published while it was
  stopped never arrive: direct delivery holds nothing for a consumer that is
  not connected.
- Work out which pane a subscription to `schwarz/grocery/order/*/v1/inStore/>`
  would match, then add it and check.

Next: [Shock absorber](40-shock-absorber.md).
