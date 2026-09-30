# Capstone: Surviving the Arrival

At a hub airport a bank of flights lands inside the same twenty minutes and
every bag on every aircraft scans at once.

Where it breaks: baggage routing and the passenger app both consume scans at
whatever rate they arrive. At peak, routing falls behind, back-pressure
spreads, and the service telling passengers where their bag is goes down
exactly when every passenger is looking at it.

Three patterns compose to fix it. None of them is enough alone.

Press **Play**, then wait about ten seconds before the surge lands so the
broker can assign partitions between the two routing instances.

## What each pattern contributes

**Shock absorber.** The scan queue holds the surge. Five hundred bags arrive
faster than routing can process them, and the queue is where that difference
waits. Watch `msgSpoolUsage` on `q.arrival.scans` climb into the tens of
thousands of bytes during a bank.

**Partitioned queue.** Bags are partitioned by belt, so each belt is routed
by one instance in scan order while the other belts are routed in parallel.
Order where it matters, parallelism everywhere else. When you stop the
routing instances they print which belts they handled: the sets are disjoint
and cover all twelve.

**Fan-out.** Bag statuses go to `q.arrival.status`, a separate queue with its
own consumer. This is the part that saves the passenger app.

## The thing to actually watch

Keep the passenger app's pane open during a surge. It reports its rate as it
goes, and that rate does not move when 500 bags land. Meanwhile the scan
queue is deep in backlog and routing is minutes behind.

The passenger app is slow in absolute terms, deliberately: 50ms per lookup.
The point is not that it is fast, but that its performance is determined by
its own consumption and not by how overwhelmed the system beside it is.

Compare the two queues in Inspect during a bank. `q.arrival.scans` carries a
large backlog; `q.arrival.status` stays near zero. The surge is held where it
does no harm.

## Why not one queue

Suppose both consumers read one queue. Routing takes 120ms per bag, the
passenger app 50ms. On a shared queue they compete for the same messages, and
the passenger app's throughput becomes a function of how much of the queue
routing is holding. A backlog in front of routing becomes a backlog in front
of the passenger app.

Two queues, each fed by its own subscription, means the slow consumer's
problems stay with the slow consumer.

## Break it

With Play running, scroll to **Break it** in the cockpit. Each card causes one
failure on purpose. Press **Break it**, read the app's output and what the
card tells you to look for, then press **Reset**. The card stays open after
the reset so you can see the recovery, and **Why this breaks** explains the
cause and where you would meet it in production.

1. **A routing instance fails.** Baggage routing 1 stops. Routing 2 is left to
   handle every belt.
2. **The passenger app goes offline.** The passenger app stops while bags keep
   being routed.

## Try this

- Stop routing entirely during a surge. Bag statuses stop being produced, but
  the passenger app keeps serving what it already has, and recovers when
  routing restarts.
- Start a third routing instance mid-surge and watch the broker rebalance
  partitions.
- Work out what would change if the status queue were partitioned by PNR.

Next: [Smart Shelf Pricing](90-capstone-smart-shelf.md).
