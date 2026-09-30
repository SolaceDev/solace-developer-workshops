# Publish and subscribe

Acme Air publishes flight, baggage and booking events. Four subscribers
listen. Each receives only what it is authorised for, and every one of them
runs the same code with the same client profile, so every difference you see
comes from broker configuration.

Press **Play**.

## Anatomy of a topic

Every event is published to a complete, specific topic. Nothing is addressed
to a queue or to a consumer.

```
acme/air/flight/departed/v1/AC8763
 |    |     |        |     |    |
 org  domain object  action version key
```

Read it left to right, most constant to most variable. The convention used
throughout this workshop is:

```
{org}/{domain}/{object}/{action}/{version}/{context...}/{id}
```

Some rules that save pain later:

- **Past tense for events.** `departed`, not `depart`. An event states
  something that already happened.
- **Version in the middle.** A `v2` can be published alongside `v1` without
  disturbing anyone subscribed to `v1`.
- **Only what routes.** A field belongs in the topic if someone might filter
  on it. A trace ID does not.
- **No environment names.** `dev` and `prod` belong to different brokers, not
  different topic levels.

## Two kinds of wildcard

Look at the four subscriber panes together.

Flight ops, baggage and booking each take one domain with `>`, which matches
everything from that level down:

```
acme/air/baggage/>
```

Audit takes a different shape:

```
acme/air/*/*/v1/AC8763
```

`*` matches exactly one level. So this reads as every domain and every
action, but only for flight AC8763. Watch its pane: it receives the flight
and baggage events, and never the booking, because the booking's last level
is a record locator rather than a flight number.

## Break it

With Play running, scroll to **Break it**. Each failure mode is one thing
going wrong on purpose. Press **Break it**, read what the card tells you to
look for, then press **Reset** before trying the next one. The diagram marks
the node each failure is about while it is in effect.

### 1. Subscribe outside the ACL

The baggage user asks for `acme/air/flight/>`. It connects, because the
client profile permits that. The subscription is refused with a 403, because
the ACL profile does not. Capability and topic authority are separate
decisions, and this is what that separation looks like when it is enforced.

The same thing from a terminal:

```bash
bash cockpit/apps/run.sh pubsub subscribe \
  --role baggage --user svc-acme-air-baggage --sub "acme/air/flight/>"
```

### 2. A subscriber goes offline

The baggage subscriber stops while the publisher keeps going. Leave it down
for a round or two, then reset. It resumes from the next message published.
The ones it missed are gone: no queue was involved, so nothing was stored.

This is why the Play sequence starts the subscribers before the publisher.

## Try this

- Give the audit subscriber `acme/air/*/*/v1/>` instead. Predict what changes
  before you run it.
- Check **Connected Clients** under **On the broker** while everything runs, and watch the
  message counts diverge between the four subscribers.

Next: [Fan-out](30-fan-out.md).
