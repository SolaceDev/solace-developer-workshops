# Solace Workshop Dashboard

The control surface attendees use to drive the workshop. It applies broker
configuration, runs sample applications, streams their output back live, and
shows what actually landed on the broker.

## Architecture

```
Browser (port 3000)          static HTML/CSS/JS, no build step
     |
     |  REST (control)  +  WebSocket (log streams)
     v
FastAPI dashboard            one uvicorn process
     |
     +-- ProcessManager       asyncio subprocesses, one per action
     +-- SEMP client          httpx, proxies broker reads
     +-- Scenario registry    YAML descriptors under scenarios/
     |
     v
terraform / sample apps  -->  Solace broker (docker, SEMP 8080)
```

Three decisions shape everything else:

**Subprocesses, not threads.** Terraform is a binary and a Java sample app is a
JVM, so both have to be subprocesses regardless. Treating a Python publisher the
same way means one code path for every language, real cancellation via signals,
and crash isolation, so a hung consumer can never take the dashboard down with it.

**No frontend framework.** The dashboard is cards, forms, and log panes. A build
step would cost container boot time and add a failure mode during a live
workshop without buying anything. Attendees who open devtools see the code we
wrote.

**Scenarios are data.** Adding a workshop module means dropping in a folder with
a `scenario.yaml`. The UI, process wiring, and teardown come for free.

## Running it

In the devcontainer this starts automatically on attach. To run it by hand:

```bash
bash cockpit/start_cockpit.sh
```

Then open http://localhost:3000. The script is idempotent, so running it twice
is harmless.

Configuration comes from the environment, with defaults matching
`setup_broker.sh`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `COCKPIT_PORT` | `3000` | Port the dashboard listens on |
| `SOLACE_HOST` | `localhost` | Broker host |
| `SOLACE_SEMP_PORT` | `8080` | SEMP / Manager port |
| `SOLACE_SEMP_USER` | `admin` | Management username |
| `SOLACE_SEMP_PASSWORD` | `admin` | Management password |
| `SOLACE_MSG_VPN` | `default` | Message VPN to configure |
| `COCKPIT_STATE_DIR` | `cockpit/.state` | Terraform state and logs |

## Adding a scenario

Create `cockpit/scenarios/<id>/scenario.yaml`:

```yaml
id: my-scenario
order: 20                 # position in the sidebar
eyebrow: Foundations      # Space Mono kicker above the title
title: My Scenario
summary: One paragraph on what this section covers.

objectives:
  - What the attendee should understand by the end

actions:
  - id: apply
    label: Apply configuration
    kind: terraform       # runs terraform in tf_dir
    command: apply        # apply | plan | destroy
    tf_dir: tf
    variant: primary      # primary | secondary | danger

  - id: publish
    label: Publish 100 messages
    kind: process         # runs an arbitrary command
    cmd: [python, apps/publisher.py, --count, "100"]
    cwd: .                # relative to the scenario folder
    long_running: false

run:                      # what the "Run scenario" button does, in order
  - apply
  - publish

inspect:                  # read-only SEMP views, {vpn} is substituted
  - label: Queues
    kind: semp
    path: /msgVpns/{vpn}/queues?count=100
    columns: [queueName, accessType, permission]
    ui_hint: Manager -> Queues
```

### The diagram is the interface

A scenario with a `diagram:` block renders it as the main surface, below the
transport controls. Nodes are not illustrations: each carries live status, a
checklist of the configuration it depends on, and a way into its own logs.

- **Status dot** -- idle, running, done, failed, or missing configuration.
  Driven by the real process state and by SEMP, not by a timer.
- **`3/5` badge** -- how much of that node's configuration actually exists on
  the broker right now.
- **`logs` button** -- opens that node's log stream in the side panel.
- **Click the node** -- apps start or stop; every node opens its detail panel.
- **Packets** -- animate only while the process named by `liveWhen` is running,
  so a stopped publisher cannot leave the picture implying traffic. They are
  representative rather than per-message.

```yaml
diagram:
  caption: What the picture shows.
  duration: 2.6                    # seconds for a packet to cross
  liveWhen: pub                    # packets move only while this node runs
  nodes:
    - id: baggage
      label: Baggage
      sublabel: svc-acme-air-baggage
      kind: app                    # app | broker | config
      col: 2                       # column, left to right
      action: sub-baggage          # what a click toggles, and whose logs open
      requires:                    # checked against SEMP every poll
        - label: svc-acme-air-baggage
          semp: /msgVpns/{vpn}/clientUsernames/svc-acme-air-baggage
    - id: broker
      label: Solace Broker
      kind: broker
      col: 1
      action: apply
      provides:                    # same checks, phrased as what it creates
        - label: cp-acme-air-direct
          semp: /msgVpns/{vpn}/clientProfiles/cp-acme-air-direct
  flows:
    - from: pub
      to: broker
      label: 3 events
      delay: 0                     # stagger a burst or a fan-out
```

Nodes sharing a `col` stack and centre against each other, so one broker sits
level with three subscribers. `kind` picks the treatment: `broker` is filled
green (the subject of the workshop), `config` is dashed (broker state rather
than a running process), `app` is the default.

`{vpn}` in a `semp:` path is substituted with the configured message VPN. A
missing object is reported by SEMP as HTTP 400 with `NOT_FOUND`, which the
dashboard reads as absent rather than as an error.

Logs live in the node panel rather than in a section further down the page: every
action's output is reachable from the thing that produces it.

### Play, Pause and Cleanup

Every scenario is driven by three buttons, with the steps behind each listed
beneath them so nothing is a mystery box:

- **Play** runs the scenario's `run:` sequence in order.
- **Pause** stops this scenario's processes and leaves broker configuration
  alone, so Play can start them again without re-applying anything.
- **Cleanup** stops everything, then runs the `cleanup:` sequence to remove the
  configuration from the broker. It asks for confirmation first.

Below the diagram, the Actions section draws every action as a flowchart: the
`run:` sequence under Play, the `cleanup:` sequence under Cleanup, and anything
in neither under Optional. Each step's dot shows its run state. Clicking a step
opens its description with Run and Stop for that step alone.

```yaml
run:                      # Play, in order
  - apply
  - publish

cleanup:                  # Cleanup, in order. Defaults to the destructive
  - destroy               # actions, which is usually just the destroy step.
```

Order cannot be inferred -- `pub-sub` has to start its subscribers before it
publishes -- so it is stated explicitly. Without a `run:` block the default is
every non-destructive action in declaration order.

A `long_running` step is given a few seconds to connect and then left running
while the sequence moves on, since a consumer never exits on its own. Play stops
long-running steps before restarting them, so a second press produces the same
end state as the first rather than publishing into subscribers left over from a
previous run. A step that fails stops the sequence and the reason is shown next
to the buttons, rather than the controls silently returning to rest.

Cleanup stops processes before its teardown steps so terraform is not deleting
configuration out from under a live client, and it continues past a failing step
rather than leaving a scenario half removed.

Terraform state is written to `COCKPIT_STATE_DIR/<scenario-id>/` rather than
beside the `.tf` files, so resetting a scenario is a directory delete and the
repo stays clean for the next attendee. `terraform init` runs automatically
before the first apply.

### Failure modes

A scenario page is laid out in numbered parts: **Run it** (the transport and
diagram), **Step through it** (the Actions flowchart), **Break it**, and **On the
broker** (the Inspect views, each a closed shade until opened).

**Break it** holds one card per entry in `failure_modes:`. A card is locked until
the scenario is running, or until its configuration is applied for a mode marked
`needs: applied`. **Break it** runs the `trigger` steps, marks the diagram node,
and streams the `logs` step's output into the card and behind that node's logs
button. **Reset** runs the `reset` steps and leaves the card open on the
restarted app's log, so the recovery can be watched too. One failure is in effect
at a time.

```yaml
failure_modes:
  - id: subscriber-offline
    title: A subscriber goes offline
    breaks: One line on what goes wrong.
    watch: What to look for once it has.
    why: Why it breaks. Shown in a closed shade on the card.
    real_world: Where you would meet this in production. Same shade.
    docs:                          # links at the bottom of the card
      - label: "Go API: consuming direct messages"
        url: https://docs.solace.com/API/API-Developer-Guide-Go/Go-DM-Subscribe.htm
    node: baggage                  # diagram node to mark while in effect
    logs: sub-baggage              # action whose output tells the story
    needs: running                 # or applied, for a scenario with no apps
    trigger:                       # start: and stop: return at once;
      - stop: sub-baggage          # run: waits for the step to finish
    reset:
      - start: sub-baggage
```

A start of a step that is already running is skipped, so a trigger can make sure
something is up first. An action that exists only to cause a failure is marked
`failure_only: true`, which keeps it out of the Actions flowchart.
`scripts/check_scenarios.py` checks that every step, node, `logs` action and docs
link in a failure mode is valid.

## Scenarios

### `broker-tour`

Applies a realistic slice of configuration to an empty broker so there is
something to explore in Solace Broker Manager: four queues with contrasting access
types and quotas, topic subscriptions using both `>` and `*` wildcards, a dead
message queue, three client profiles, two ACL profiles, and four client
usernames that join them together. One username is deliberately disabled.

No publishers or subscribers: this scenario is purely about configuration.

### `pub-sub`

Acme Air publishes flight, baggage and booking events to three topics; three
JCSMP subscribers each receive only the domain they are authorised for. All four
clients share one client profile and differ only in their ACL profile, so every
difference in what they see comes from access control rather than application code.

The publisher repeats all three events every five seconds until stopped, so a
subscriber started late still sees traffic -- it simply misses everything sent
while it was away, since direct messaging has no replay. Stop one subscriber,
restart it, and compare message counts to see that plainly. Point a subscriber at
another domain's topic and the broker refuses the subscription with a 403.

Like `broker-tour`, it ships a **Reconcile with broker** action for the case where
terraform's state is lost while the broker keeps the objects.

The Java apps build into a single jar on first run (Maven, JCSMP 10.27.2). The
"Build the apps" action is only needed to rebuild after a change -- and avoid
pressing it while subscribers are running, since replacing the jar underneath a
live JVM is not something the JVM enjoys.

## When state and broker drift apart

Deleting a queue by hand is not a problem: terraform compares the broker against
its state file and recreates whatever is missing on the next apply. That is the
demonstration, not the failure mode.

The failure mode is terraform losing its **state file** while the broker keeps
the objects, which happens on a fresh Codespace pointed at an already-configured
broker, or after `reset` is used without destroying first. Apply then fails with
`ALREADY_EXISTS`, because it tries to create things that are already there.

`broker-tour` ships a **Reconcile with broker** action for that: it imports the
existing objects back into state and leaves the broker untouched. Run it, then
apply again. It is safe to run repeatedly.

A scenario with its own resources should ship its own `reconcile.sh` following
the same shape, or document destroy-then-apply as the recovery path.

## Teardown

Attendees jump between sections out of order, and a stale process from an
earlier section is the most confusing failure mode in a workshop like this.
Three escape hatches exist:

- **Stop everything** in the top bar terminates every running process and
  cancels any Play still working through its steps.
- **Clear broker config** in the top bar stops everything, then deletes every
  queue, client profile, ACL profile and client username that any scenario
  lists in its `tf/imports.tsv`, and removes every scenario's terraform state.
  It works whether or not terraform still has its state, and leaves broker
  defaults and anything created by hand alone. Pressing Play on a scenario sets
  it up again from scratch.
- **Reset this scenario** stops that scenario's processes and deletes its
  terraform state. It does not remove configuration already on the broker; run
  the scenario's destroy action first if you want a clean broker.
