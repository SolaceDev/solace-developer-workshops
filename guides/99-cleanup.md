# Cleanup

Nothing here is required if you are throwing the container away, which in a
Codespace you usually are. It matters if you are sharing a broker or coming
back to a clean slate.

## Per scenario

Each scenario's **Cleanup** button stops its apps and removes its broker
configuration. It asks first, because it deletes queues and anything still
spooled on them.

Work through the sections you ran, or just the ones you want gone. Scenarios
do not share configuration, so cleaning one up never affects another.

## Everything at once

**Stop everything** in the top bar terminates every running process across
all scenarios without touching broker configuration. This is the one to reach
for when you have lost track of what is running.

**Clear broker config**, next to it, stops everything and then deletes every
queue, profile and username that any scenario creates, along with every
scenario's terraform state. Broker defaults and anything you made by hand
are left alone.

**Reset this scenario**, under Step through it, stops that scenario's
processes and deletes its terraform state. It does **not** remove what is
already on the broker, so run the scenario's Cleanup first if you want the
broker clean. Resetting without destroying is the usual way to end up
needing **Reconcile with broker** later.

## Starting over completely

```bash
docker rm -f solace_10.8.1
bash setup_broker.sh
rm -rf cockpit/.state
```

That is a new broker with nothing on it and no terraform state. The next Play
in any scenario creates everything from scratch, including rebuilding the Go
binary.

## What you built

Six sections: a configuration tour, direct publish and subscribe, and four
kinds of queue.

| You need | Use |
| --- | --- |
| The latest value, fast, and a missed one does not matter | Direct messaging |
| Every message, in order, with a standby ready to take over | Exclusive queue |
| Every message, worked in parallel, order not important | Non-exclusive queue |
| Every message, in order per key, worked in parallel | Partitioned queue |
| Somewhere for the messages that cannot be processed | Dead message queue |

Pick one integration in your own landscape, an order flow, a stock feed or a
supplier interface, name its events in business language, and work out which
row it belongs in. Most real systems use more than one.
