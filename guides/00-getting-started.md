# Getting started

Everything in this workshop runs inside this container. There is a Solace
broker in Docker, the Solace Workshop Dashboard on port 3000, and a
set of small Go applications the dashboard runs for you.

## Open the dashboard

It opens in a browser tab by itself the first time the container starts. If
you closed it, open the **Ports** tab in VS Code and click the globe next to
**Solace Workshop Dashboard** (port 3000). In a local devcontainer it is at
<http://localhost:3000>. If nothing is listening, start it by hand:

```bash
bash cockpit/start_cockpit.sh
```

The broker takes thirty to sixty seconds to come up the first time. The
dashboard tells you while it waits: the **Event broker** box in the bottom
left turns green when it is ready.

## How a section works

Each section on the left is a scenario, laid out in numbered parts.

1. **Run it** has three buttons and a diagram.
   - **Play** runs the scenario's steps in order: apply the broker
     configuration, build the apps, start the consumers, then start the
     publisher. Consumers come first because a subscriber that is not
     connected yet misses what is published.
   - **Pause** stops the running apps and leaves the broker configuration
     alone.
   - **Cleanup** stops everything and removes the configuration from the
     broker.

   The diagram is not a picture. Each node shows whether its app is running
   and how much of its configuration exists on the broker right now. Click a
   node to start or stop it and read its log.
2. **Step through it** shows every step Play and Cleanup run as a flowchart.
   Click a step to run it on its own or read its output.
3. **Break it** causes one failure at a time on purpose. Press **Break it**,
   read what the card tells you to watch, then press **Reset**.
4. **On the broker** shows what is actually on the broker, read live:
   queues, subscriptions, connected clients and message counts. Each view is
   closed until you click it.

## The broker's own UI

Solace Broker Manager opens from **Open Solace Broker Manager** under the
Event broker box, or from port 8080 in the **Ports** tab. Sign in with
username `admin`, password `admin`. Every **On the broker** view names where
to find the same thing there, so you can check the dashboard against the real
interface whenever you want to.

## If something goes wrong

- **A step fails with "already exists".** The broker has objects terraform
  does not know about. Run **Reconcile with broker**, then Play again.
- **An app cannot connect.** The broker is probably still starting. Wait for
  the dashboard's broker indicator to go green.
- **Nothing arrives at a subscriber.** Check it started before the publisher.
  Direct messaging has no replay, so anything sent before it connected is
  gone. This is the subject of the first messaging section.
- **Everything is confusing.** **Stop everything** in the top bar kills every
  running process across all scenarios, which is usually the fastest way back
  to a known state. **Clear broker config** goes further: it also deletes
  every object any scenario created, so the next Play starts from scratch.
- **The dashboard or broker is gone after a break.** A Codespace stops after
  a while without activity. Reopening it restarts the broker and the
  dashboard, with your configuration still there, but apps that were running
  are not. Press Play again.

## Running an app yourself

The dashboard runs the same commands you can run in a terminal. Every app lives
in one binary:

```bash
bash cockpit/apps/run.sh pubsub subscribe \
  --role baggage --user svc-acme-air-baggage --sub "acme/air/baggage/>"
```

The connection details come from the environment, so an app run this way
talks to the same broker the dashboard does. This matters for the exercises
that ask you to point an app somewhere it is not allowed to go.

Next: [Tour the broker](10-broker-tour.md).
