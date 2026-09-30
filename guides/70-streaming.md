# Streaming

Fraud caught in tonight's batch run is caught hours after the money left. The
intervention window closed while the data sat waiting to be queried.

Streaming means applying the rule while the data is still moving, when the
decision still changes the outcome.

Press **Play**. A payment gateway, a fraud rule, and a regional desk.

## A rule with memory

The gateway authorizes a payment every 400ms across forty cards and three
regions. One card is used far more often than the rest.

The fraud rule keeps a rolling ten-second window per card and flags any card
authorized more than three times inside it. Watch its pane: it flags the busy
card and leaves the other forty alone.

The state is what makes this stream processing rather than filtering. A
filter decides about one message on its own. This rule's decision depends on
what else happened recently, so it holds a window in memory and slides it
forward as the stream moves.

Because the window slides rather than resetting on a clock boundary, a burst
that straddles two minutes is still caught. Fixed windows miss exactly the
cases someone trying to stay under a threshold would use.

## Selecting a slice of a stream

The US desk subscribes to:

```
united/booking/payment/*/v1/us/>
```

One `*` at the action level covers both `authorized` and `flagged`, and the
`us` level pins it to one region. Payments in `eu` and `apac` never arrive at
this application.

It applies no filter of its own. Data residency became a subscription, which
the broker enforces, rather than a rule each application has to be trusted to
implement.

## What a second instance would cost

The fraud rule's queue is non-exclusive, so you can start a second instance.
Try it, and think about what happens.

Each instance gets roughly half the stream and keeps its own window. Neither
sees all the authorizations for a given card, so a card doing four in ten
seconds may look like two and two, and go unflagged.

This is the honest limit of scaling a stateful processor by adding instances.
The fix is the partitioned queue from the shock absorber section: partition
by card, and every authorization for one card reaches the same instance.

## Break it

With Play running, scroll to **Break it** in the dashboard. Each card causes one
failure on purpose. Press **Break it**, read the app's output and what the
card tells you to look for, then press **Reset**. The card stays open after
the reset so you can see the recovery, and **Why this breaks** explains the
cause and where you would meet it in production.

1. **The fraud rule goes down.** The fraud rule stops while the payment
   gateway keeps authorizing.
2. **The US desk goes offline.** The US desk stops while authorizations and
   flags keep flowing.

## Try this

- Lower the threshold to 2 and watch the false positives appear. Rules like
  this are a tuning exercise, not a truth.
- Start a second fraud rule and confirm the flag count drops rather than
  doubling.

Next: [Surviving the Arrival](80-capstone-arrival.md).
