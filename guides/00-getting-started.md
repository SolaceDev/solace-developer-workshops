# Getting started

Everything in this workshop runs inside this container. There is a Solace
broker in Docker, a control surface called the cockpit on port 3000, and a
set of small Go applications the cockpit runs for you.

## Open the cockpit

It starts automatically when you attach. If you closed it, open
<http://localhost:3000>, or start it by hand:

```bash
bash cockpit/start_cockpit.sh
```

The broker takes thirty to sixty seconds to come up the first time. The
cockpit tells you while it waits.

## How a section works

Each section on the left is a scenario. A scenario gives you three buttons
and a diagram.

- **Play** runs the scenario's steps in order: apply the broker
  configuration, build the apps, start the consumers, then start the
  publisher. Consumers come first because a subscriber that is not connected
  yet misses what is published.
- **Pause** stops the running apps and leaves the broker configuration alone.
- **Cleanup** stops everything and removes the configuration from the broker.

The diagram is not a picture. Each node shows whether its app is running, how
much of its configuration exists on the broker right now, and a button that
opens that app's log. Click a node to start or stop it.

Below the diagram, **Inspect** shows what is actually on the broker: queues,
subscriptions, connected clients and message counts, read live.

## The broker's own UI

PubSub+ Manager is at <http://localhost:8080>, username `admin`, password
`admin`. Every Inspect view names where to find the same thing there, so you
can check the cockpit against the real interface whenever you want to.

## If something goes wrong

- **A step fails with "already exists".** The broker has objects terraform
  does not know about. Run **Reconcile with broker**, then Play again.
- **An app cannot connect.** The broker is probably still starting. Wait for
  the cockpit's broker indicator to go green.
- **Nothing arrives at a subscriber.** Check it started before the publisher.
  Direct messaging has no replay, so anything sent before it connected is
  gone. This is the subject of the first messaging section.
- **Everything is confusing.** **Stop everything** in the top bar kills every
  running process across all scenarios, which is usually the fastest way back
  to a known state.

## Running an app yourself

The cockpit runs the same commands you can run in a terminal. Every app lives
in one binary:

```bash
bash cockpit/apps/run.sh pubsub subscribe \
  --role baggage --user svc-acme-air-baggage --sub "acme/air/baggage/>"
```

The connection details come from the environment, so an app run this way
talks to the same broker the cockpit does. This matters for the exercises
that ask you to point an app somewhere it is not allowed to go.

Next: [Tour the broker](10-broker-tour.md).
