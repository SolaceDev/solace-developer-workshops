# Getting started

Everything in this workshop runs inside this container. There is a Solace
broker in Docker, the Solace Workshop Dashboard on port 3000, and a set of
small Go applications the dashboard runs for you.

This first section is a practice run. One app says hello every three seconds
and another listens. The messaging is as simple as it gets, so you can learn
the controls here and spend every later section on the ideas instead.

## Open the dashboard

It opens in a browser tab by itself the first time the container starts. If
you closed it, open the **Ports** tab in VS Code and click the globe next to
**Solace Workshop Dashboard** (port 3000). In a local devcontainer it is at
<http://localhost:3000>. If nothing is listening, start it by hand:

```bash
bash cockpit/start_cockpit.sh
```

The broker takes thirty to sixty seconds to come up the first time. The
**Event broker** box in the bottom left of the sidebar turns green when it is
ready. Wait for green before pressing anything.

Then click **Using the Dashboard** at the top of the sidebar.

## 1. Run it

Every section page is laid out in the same four numbered parts. The first,
**Run it**, has three buttons and a diagram.

Press **Play**. It runs the section's steps in order: apply the broker
configuration, build the apps, start the listener, then start the greeter.
The first build takes a little while; later sections reuse it.

Watch the diagram while it runs.

- Each box's dot shows whether its app is running.
- Moving dots between the boxes mean events are flowing. Notice that both
  arrows go through the broker. In this workshop apps never talk to each
  other directly.
- Click the **Listener** box. A panel opens with its status, a checklist of
  the broker objects it needs (a tick means the object exists on the broker
  right now), a **Start** or **Stop** button, and **View logs**. Open the logs:
  you should see a new greeting every three seconds, each with a number.

Now press **Pause**. The apps stop and the dots go grey, but the broker
configuration stays. Press **Play** again to bring it back. Play is always
safe to press again: it restarts the apps and re-applies configuration that
is already there without changing it, so you end up in the same place.

## 2. Step through it

This part shows every step Play and Cleanup run, as a flowchart, plus any
optional steps. Click a step to run it on its own or read its output.

- Click **Preview changes**. It asks terraform what it would change on the
  broker. Since everything is already applied, the answer is "No changes".
- Click **Start the greeter** if it is not running, and compare its log with
  the listener's. The numbers line up.

A step that is running, finished, or failed is coloured to match. A failed
step is not always a broken workshop: open its log first, because the reason
is usually right there.

**Reset this scenario** in this part is stronger than Pause: it stops
everything and makes terraform forget what it created, while leaving the
configuration on the broker. Run **Reconcile with broker** afterwards, or
**Remove configuration** first if you want the broker clean too.

## 3. Break it

Every section has cards that cause one failure on purpose. The loop is always
the same: press **Break it**, read what the card says to watch, look at the
diagram and the log in the card, then press **Reset**. The card stays open
after the reset so you can see the recovery. **Why it breaks** and **In the
real world** are closed shades with the background, and each card links to
the Go API and broker documentation.

Try all three here.

1. **Stop the listener.** The listener goes grey while the greeter keeps
   sending. After Reset, look at the numbers in the listener's log: the ones
   sent while it was down never arrive. That gap is the subject of the
   messaging sections.
2. **Listen where you are not allowed.** An app connects and asks for a topic
   its ACL profile does not allow. The broker refuses with a 403, and the
   step shows as failed. This is what a real error looks like in the
   dashboard: the app prints exactly what the Solace API returned.
3. **Terraform loses its state.** Apply fails with ALREADY_EXISTS for every
   object, and Reset fixes it with **Reconcile with broker**. Remember this
   one, because it is the fix whenever any section's Play fails with "already
   exists".

## 4. On the broker

These views read the broker directly, so they show what is really there
rather than what the dashboard thinks should be. Each one is closed until you
click it, and **Refresh** reads it again.

Open **Connected Clients** while the scenario is running. You should see one
client for the greeter and one for the listener, with their message counts
going up each time you refresh. Each view also says where to find the same
thing in Solace Broker Manager.

## Solace Broker Manager

Solace Broker Manager is the broker's own web interface. Open it with **Open
Solace Broker Manager** under the Event broker box, or from port 8080 in the
**Ports** tab. Sign in with username `admin`, password `admin`.

Find the two clients there too: open the **default** message VPN, then
**Clients**. Then look under **Access Control** for `svc-hello-greeter`,
`acl-hello` and `cp-hello`. Everything the dashboard creates is ordinary
broker configuration that you can inspect, and checking one against the other
is a good habit for the rest of the workshop.

## Cleanup

Press **Cleanup** in **Run it**. It stops the apps and removes this section's
configuration from the broker. Sections never share broker objects, so
cleaning one up never affects another. You do not have to clean up between
sections, but it keeps Broker Manager easier to read.

## Running an app yourself

The dashboard runs the same commands you can run in a terminal. Every app
lives in one binary. With the configuration applied, try:

```bash
bash cockpit/apps/run.sh hello listen
```

That is a second listener, connected as the same client username. Press
**Ctrl+C** to stop it. The connection details come from the environment, so
an app run this way talks to the same broker the dashboard does. Some later
exercises ask you to do exactly this with different flags.

## If something goes wrong

- **A step fails with "already exists".** The broker has objects terraform
  does not know about. Run **Reconcile with broker**, then Play again.
- **An app cannot connect.** The broker is probably still starting. Wait for
  the Event broker box to go green.
- **Nothing arrives at a subscriber.** Check it started before the publisher.
  Direct messaging has no replay, so anything sent before it connected is
  gone.
- **Everything is confusing.** **Stop everything** in the top bar stops every
  running app across all sections, which is usually the fastest way back to
  a known state. **Clear broker config** goes further: it also deletes every
  object any section created, so the next Play starts from scratch.
- **The dashboard or broker is gone after a break.** A Codespace stops after
  a while without activity. Reopening it restarts the broker and the
  dashboard, with your configuration still there, but apps that were running
  are not. Press Play again.

## Try this

- Stop the greeter from its box in the diagram, wait, and start it again. Its
  numbers start over at 1, because each run is a new app.
- Press **Clear broker config** in the top bar, then Play here again. It works
  from an empty broker, which is true of every section.

Next: [Tour the broker](10-broker-tour.md).
