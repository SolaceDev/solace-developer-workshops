# Command and query

Someone asks what the whole fleet is doing right now. Without this pattern
the only answer is to poll every device, which melts the network and gets
worse as the fleet grows.

The split is between the side that changes state and the side that reads it.

Press **Play**. A read model and one gateway.

## Commands and events are not the same thing

Read the two topics next to each other.

```
daimler/connectedVehicle/gateway/reboot/v1/gw4471
daimler/connectedVehicle/gateway/rebooted/v1/michigan/gw4471
```

The first is a **command**. Imperative verb, addressed to exactly one
gateway. It asks for something that has not happened yet, and it can be
refused or fail.

The second is an **event**. Past tense, and it carries the region because it
describes something that happened somewhere. It cannot be refused: it is
already true.

Getting this distinction into your topic names is the cleanest way to keep
the two sides of the pattern apart, and it is why the read model ignores
commands even though its subscription is wide enough to see them.

## The read model

The twin subscribes to `daimler/connectedVehicle/*/*/v1/>` and keeps a table
of the current state per gateway, reprinting it whenever something changes.
Telemetry arrives every three seconds and updates the battery figure.

A question about the fleet is answered from this table. It costs one lookup,
reaches no device, and does not get slower as the fleet grows. This is the
query side.

It is **eventually consistent**: the table reflects the last event that
arrived, usually milliseconds old. For fleet status that is fine. For
anything where you must not act on a stale value, it is not, and that is a
real trade rather than a detail.

## A command to a device that is not there

Stop the gateway from its diagram node.

Now run **Send a reboot command**. The command is published to a queue, so
look at `q.cqrs.gw4471.commands` in Inspect: `msgSpoolUsage` is no longer
zero. The command is waiting.

Start the gateway again. It binds its queue, receives the command it missed,
performs the reboot, and publishes the `rebooted` event. The twin updates.

Nothing retried, nothing polled, nothing was lost. Guaranteed delivery is
what makes control reliable over links that are not.

## Why the queue subscribes to verbs by name

Look at **What the queue accepts** in Inspect. The command queue subscribes
to `reboot` and `update` explicitly rather than wildcarding the verb.

If it wildcarded, the `rebooted` event the device publishes in reply would
match its own inbox, and the gateway would receive its own event as a
command. Naming the imperative verbs keeps the two directions apart.

## Break it

With Play running, scroll to **Break it** in the cockpit. Each card causes one
failure on purpose. Press **Break it**, read the app's output and what the
card tells you to look for, then press **Reset**. The card stays open after
the reset so you can see the recovery, and **Why this breaks** explains the
cause and where you would meet it in production.

1. **The gateway goes offline.** Gateway gw4471 disconnects, and then the
   operator sends it a reboot command.
2. **The read model goes offline.** The fleet read model stops while the
   gateway keeps reporting battery levels.

## Try this

- Send several commands with the gateway stopped, then start it. They arrive
  in order.
- Kill the read model and start it again. It rebuilds from the telemetry
  stream within a few seconds, with no device involved and no database to
  restore.

Next: [Streaming](70-streaming.md).
