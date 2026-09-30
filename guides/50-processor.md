# Processor

Raw events arrive in a shape nobody downstream can use, so every consuming
team writes the same parsing and enrichment. Change the format once and all
of them break together.

A processor is an application that is both consumer and producer: it takes an
event in one state and publishes a modified version on a different topic.

Press **Play**. An assembly line, an enricher, and a subscriber for one
region.

## Follow one vehicle

The line publishes:

```
daimler/manufacturing/assembly/started/v1/bremen/vin880001
```

The enricher consumes that from its own queue, adds the model and shift, and
publishes:

```
daimler/manufacturing/assembly/enriched/v1/bremen/vin880001
```

Same vehicle, more information, different verb. Both ends go through the
broker, which is what makes the stages independent of each other.

## Acknowledge last

The enricher acknowledges its input **after** the broker has accepted its
output. The order matters. Acknowledging first would mean a crash in between
leaves a message the pipeline has forgotten but never passed on. Acknowledging
last means the same crash causes a redelivery, and the vehicle is processed
twice rather than lost.

At-least-once is usually the trade you want, and it is why downstream
consumers should tolerate a repeat.

## Add a stage to a running pipeline

The router is not in the Play sequence. Its queue has been subscribed to the
enriched topic since you pressed Apply, so look at `q.processor.router` in
Inspect: it has a backlog.

Start **Start the router (late)**. It drains that backlog, then keeps pace.
Neither the enricher nor the sink was restarted or reconfigured.

The router maps the plant to a region and writes it into the topic:

```
daimler/manufacturing/assembly/routed/v1/emea/vin880001
```

## Routing becomes a subscription

The sink subscribes to `daimler/manufacturing/assembly/routed/v1/emea/>`.
Vehicles from the Michigan plant are routed to `namer` and never reach it.

The sink contains no filtering logic. A routing decision became a topic level,
and selecting on it became someone else's subscription. Adding a `namer`
consumer requires no change to the router.

## Break it

With Play running, scroll to **Break it** in the cockpit. Each card causes one
failure on purpose. Press **Break it**, read the app's output and what the
card tells you to look for, then press **Reset**. The card stays open after
the reset so you can see the recovery, and **Why this breaks** explains the
cause and where you would meet it in production.

1. **A queued stage goes down.** With the router running, the enricher stops
   while the assembly line keeps publishing.
2. **The direct subscriber at the end goes down.** With the router running,
   EMEA fulfilment stops. It is the one stage that subscribes directly instead
   of reading from a queue.

## Try this

- Stop the enricher for thirty seconds. Watch `q.processor.assembly` hold the
  vehicles, then drain when it restarts. Each stage has its own shock
  absorber.
- Change the sink's subscription to `namer` and confirm it sees exactly the
  vehicles it did not before.

Next: [Command and query](60-cqrs.md).
