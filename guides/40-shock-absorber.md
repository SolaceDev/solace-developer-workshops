# Shock absorber

A flash sale floods checkout. A bank of flights lands and every bag scans at
once. Without something in the middle, the slowest consumer sets the pace for
everyone and back-pressure spreads upstream until something falls over.

A queue between them turns the spike into a backlog that drains.

Press **Play**. One publisher sending bursts of 200, one worker that takes
about 300ms per bag.

## Watch the backlog form and drain

Open **Queues** in Inspect during a burst. On `q.shock.scans`:

- `msgSpoolUsage` climbs as the burst lands and falls as the worker catches
  up. This is the live backlog.
- The gap between `lastSpooledMsgId` and `highestAckedMsgId` is roughly how
  many messages are still waiting.

`spooledMsgCount` is not in these views on purpose: on this broker it counts
cumulatively and never falls, so it looks like a backlog that never clears.

The publisher is never slowed down. That is the whole idea: the producer runs
at the rate its work arrives, and the queue holds the difference.

## Add workers

Start **worker 2** and **worker 3**. All three bind the same non-exclusive
queue, the broker shares messages between them, and the backlog drains about
three times faster. No configuration changed and the publisher did not
notice.

Open **Workers on the shared queue** in Inspect to see the three consumers
and how many each has acknowledged.

## Stop one mid-flight

With a burst in progress, stop worker 2 from its diagram node.

Each worker is allowed ten unacknowledged messages at a time
(`max_delivered_unacked_msgs_per_flow`). Those ten were taken but never
acknowledged, so the broker gives them to another worker. Watch workers 1 and
3 print lines marked `(redelivered)`.

Nothing was lost. A consumer crashing is a redelivery, not a gap.

## When a message cannot be processed

Start **Start failing worker**. It settles every seventh message `FAILED`,
which puts it back on the queue to be tried again, and every thirteenth
`REJECTED`, which sends it straight to `q.shock.dmq`.

Watch the dead message queue grow in Inspect. A message that can never
succeed moves aside rather than blocking the queue behind it, and it is kept
rather than dropped so someone can look at it.

## Ordering, and getting it back

Competing consumers give up ordering. Two workers can process two scans from
the same belt at the same time, in either order.

Stop the workers and start **partition worker 1** and **partition worker 2**
together. Wait about ten seconds for the broker to assign partitions, then
start the scanner.

These read `q.shock.scans.partitioned`, which has three partitions. Every
scan carries its belt as a partition key, so all scans for one belt go to one
partition, and therefore to one consumer, in order.

Compare the two panes:

- No belt appears in both.
- Within a belt, the sequence numbers only increase.
- The split is uneven, because keys are hashed onto partitions rather than
  dealt out one each.

That last point is worth sitting with. Partitioning buys ordering per key and
parallelism across keys, but not an even distribution of work.

## Break it

With Play running, scroll to **Break it** in the cockpit. Each card causes one
failure on purpose. Press **Break it**, read the app's output and what the
card tells you to look for, then press **Reset**. The card stays open after
the reset so you can see the recovery, and **Why this breaks** explains the
cause and where you would meet it in production.

1. **A worker dies holding messages.** Worker 2 joins, then worker 1 is
   stopped while it has scans it has taken but not yet acknowledged.
2. **Poison messages go to the DMQ.** A failing worker joins that settles some
   scans FAILED and some REJECTED.

## Try this

- Start a third partition worker and watch the broker rebalance.
- Set a burst larger than the 50MB quota and see what the broker does when a
  queue fills.

Next: [Processor](50-processor.md).
