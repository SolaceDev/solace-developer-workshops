# Capstone: Smart Shelf Pricing

A grocery chain wants electronic shelf labels that reprice through the day.
The polling approach fails twice over.

A timed job reads the pricing database for the whole estate and pushes the
current price to every label, changed or not. The constant full-estate reads
overwhelm the database, and the redundant writes drain the battery in every
shelf tag across hundreds of stores.

Press **Play**.

## What changes

Scans, stock counts and footfall are published as they happen. A pricing
engine consumes all three and maintains a read-optimised view of the current
price per shelf, so nobody polls the system of record.

Because the engine holds current state, it can tell whether a price actually
changed. It publishes only when one did.

That is two patterns working together: streaming supplies the inputs
continuously, and the read model from command and query is what makes
suppression possible. Without the state there is nothing to compare against,
and every reading becomes a write.

## The number that matters

The pricing engine reports every five seconds:

```
[pricing] evaluated 175, emitted 29, suppressed 146 (83%)
```

After a minute or so, suppression settles around 80 to 90 percent. Those
suppressed updates are the writes a polling design would have sent: the
database reads it would have made and the tag batteries it would have spent.

Confirm it independently in Inspect. Compare `lastSpooledMsgId` on
`q.shelf.pricing` (every reading) with `q.shelf.labels` (only real changes).
The gap is the same story from the broker's side.

The labels pane shows each tag write as it happens. Prices do move, several
times a minute. Most readings simply do not move them.

## Three streams, one queue

Look at **What feeds the pricing engine** in Inspect. One queue carries three
subscriptions: scans, stock counts and footfall.

One queue rather than three because the engine needs all of them to decide a
price, and a single ordered inbox is simpler than correlating three. A
footfall reading affects every product in that store; a stock count affects
one.

## Why the queue is exclusive

`q.shelf.pricing` is exclusive, unlike most queues in this workshop.

The price view is state held by one consumer. A second instance would hold a
different half of it, and both would decide prices from an incomplete
picture, which is the same problem the streaming section raises about running
two fraud rules. If this needed to scale, the answer would be partitioning by
store, so each instance owns a complete view of the shelves it prices.

## Try this

- Stop the pricing engine for a minute, then restart it. It rebuilds its view
  from the backlog. Watch whether the first few updates after a restart are
  ones you would consider correct, and think about what the tags were showing
  in the meantime.
- Change the rule so it emits only when a price moves by more than five
  cents, and see what that does to the suppression figure and to how current
  the labels are.

That is the last section. [Cleanup](99-cleanup.md) when you are done.
