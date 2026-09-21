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

**Reset this scenario** stops that scenario's processes and deletes its
terraform state. It does **not** remove what is already on the broker, so
run the scenario's Cleanup first if you want the broker clean. Resetting
without destroying is the usual way to end up needing **Reconcile with
broker** later.

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

Nine sections: a configuration tour, publish and subscribe, the five patterns
from the Real Time Data Deep Dives series, and two capstones that compose
them.

The patterns are worth more than the scenarios. Pick one painful integration
in your own stack, name its events in business language, and work out which
of these shapes it wants. Most real problems need more than one, which is
what the capstones are there to show.
