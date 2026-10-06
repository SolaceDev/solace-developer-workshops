# Non-exclusive queue

Every morning the overnight orders become pick tasks in the distribution
centres, all at once. One picker cannot keep up. More pickers can, as long as
each task goes to exactly one of them.

That is a **non-exclusive** queue: every consumer bound to it takes a share.

Press **Play**. The order wave publishes 100 pick tasks at once every twenty
seconds. One picker works them at about 300ms each.

## Watch the backlog form and drain

Open **Queues** under **On the broker** during a wave and press **Refresh**
a few times. On `q.shared.pick-tasks`:

- `msgSpoolUsage` climbs as the wave lands and falls as the picker catches
  up. This is the live backlog, in bytes.
- The gap between `lastSpooledMsgId` and `highestAckedMsgId` is roughly how
  many tasks are still waiting.

The order wave is never slowed down. The queue holds the difference.

## Add pickers

Start **picker 2** and **picker 3**. All three are the same app, bound to the
same queue, and the broker shares the tasks between them, so the backlog
drains about three times faster. No configuration changed and the order wave
did not notice.

Open **Pickers bound to the queue** under **On the broker**: three
`active-consumer` flows, each with its own acknowledged count. Compare that
with the exclusive queue, where only one flow was ever active.

What you give up is order. Two pickers work two tasks at the same time, and
either can finish first. For pick tasks that does not matter. When it does,
the next section has the answer.

## Break it

1. **A picker stops mid-wave.** Picker 2 joins, then picker 1 stops holding
   tasks it has not acknowledged. They appear in picker 2's log marked
   `(redelivered)`. Nothing is lost.
2. **The queue fills up.** Picker 1 stops and 15,000 tasks arrive at once.
   The queue's quota is 1 MB, so the broker accepts tasks until it is full
   and then refuses the rest. Read the refusal in the flood's log: that is
   the error a real publisher receives.

## Try this

- With the wave running, stop and start pickers from the diagram and watch
  `msgSpoolUsage` respond.
- Each picker may hold ten unacknowledged tasks at once
  (`max_delivered_unacked_msgs_per_flow`). Find that setting in Solace Broker
  Manager under **Queues**, `q.shared.pick-tasks`.

Next: [Partitioned queue](50-partitioned-queue.md).
