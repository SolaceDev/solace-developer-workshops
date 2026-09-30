# Contributing

This guide explains how the workshop works behind the scenes, how a scenario
is defined and run, and how to add, reorder, rename or remove scenarios to
build a workshop for a particular audience. If you use Claude Code, the
[CLAUDE.md](CLAUDE.md) in the repo root gives it the same map.

## The moving parts

```
Codespace / devcontainer
 |
 +-- Solace broker            Docker container solace_10.8.1 (SEMP 8080, SMF 55555)
 |
 +-- Solace Workshop Dashboard  FastAPI on port 3000, cockpit/
 |     |
 |     +-- scenario registry   reads cockpit/scenarios/*/scenario.yaml at startup
 |     +-- process manager     runs terraform and the Go apps as subprocesses
 |     +-- SEMP proxy          reads the broker for status, diagrams and tables
 |     +-- static UI           plain HTML, CSS and JS, no build step
 |
 +-- terraform                 one tf/ folder per scenario, Solace provider
 +-- Go apps                   one binary, cockpit/apps/, every scenario role
 +-- guides/                   the markdown attendees read beside the dashboard
```

The dashboard's code lives in `cockpit/`. The folder kept its original name,
so paths, the `cockpit.app` Python module and the `COCKPIT_*` environment
variables all say "cockpit". Attendees only ever see "Solace Workshop
Dashboard".

### What happens when a Codespace starts

`.devcontainer/devcontainer.json` runs these in order:

| Hook | Script | What it does |
| --- | --- | --- |
| `onCreateCommand` | `.devcontainer/onCreate.sh` | Installs the C toolchain the Solace Go API needs (cgo). Included in prebuilds. |
| `updateContentCommand` | `cockpit/apps/build.sh` | Builds the Go workshop binary into `cockpit/.state/bin/`. Included in prebuilds. |
| `postCreateCommand` | `configureEnv.sh`, `start_cockpit.sh` | Pulls submodules, registers the Codespace, starts the broker, starts the dashboard. |
| `postStartCommand` | `setup_broker.sh` | Restarts the broker when a stopped Codespace resumes. |
| `postAttachCommand` | `start_cockpit.sh` | Starts the dashboard if it is not already running. |

Every one of these scripts is safe to run again. Port 3000 opens in a browser
tab automatically, and port 8080 is Solace Broker Manager (`admin` / `admin`).

### How the dashboard runs things

A scenario is a list of **actions**. Each action is either:

- **terraform:** `apply`, `plan` or `destroy` in the scenario's `tf/` folder.
  State is written to `cockpit/.state/<scenario-id>/`, never beside the `.tf`
  files, so the repo stays clean and resetting a scenario is a directory
  delete. `terraform init` runs on first use.
- **process:** any command, usually `bash ../../apps/run.sh <scenario> <role>
  [flags]`, which runs one role of the Go binary. `long_running: true` means
  it keeps running until stopped (a consumer, a publisher loop).

Every subprocess gets the broker connection details in its environment
(`SOLACE_HOST`, `SOLACE_SMF_PORT`, `SOLACE_SEMP_URL`, `SOLACE_CLIENT_PASSWORD`,
the `TF_VAR_*` values, and so on), so terraform, the Go apps and helper scripts
always target the same broker. The values come from `cockpit/app/config.py`.

**Play** runs the scenario's `run:` list in order. A long-running step gets a
few seconds to connect, then Play moves on. **Pause** stops the scenario's
processes. **Cleanup** stops them and runs the `cleanup:` list (by default,
the destroy action).

The UI polls the dashboard, which polls the broker over SEMP. Every node in a
diagram shows its real process state and how many of the broker objects it
depends on exist right now.

### How a scenario page is laid out

1. **Run it:** Play, Pause, Cleanup, and the live diagram.
2. **Step through it:** every action as a flowchart (Play's steps, Cleanup's
   steps, then anything optional). Each step can be run on its own.
3. **Break it:** one card per failure mode, with Break it and Reset.
4. **On the broker:** read-only SEMP tables, each a closed shade.

## Anatomy of a scenario

```
cockpit/scenarios/<id>/
  scenario.yaml        everything the dashboard shows and runs
  tf/
    versions.tf        provider block, copied as is
    variables.tf       solace_url, solace_username, solace_password, msg_vpn, client_password
    *.tf               the broker objects this scenario owns
    outputs.tf         optional
    imports.tsv        every object it owns, for Reconcile and Clear broker config
cockpit/apps/scenarios/<pkg>/<pkg>.go   the Go roles, if the scenario runs apps
guides/<NN>-<id>.md                     the attendee guide
```

Copy an existing scenario that looks like yours rather than starting blank:
`pub-sub` for direct messaging, `shock-absorber` for queues, `processor` for
consume and republish, `broker-tour` for configuration only.

### scenario.yaml

```yaml
id: my-scenario               # must match the folder name
order: 45                     # sidebar position, lowest first, ties sorted by title
eyebrow: Patterns             # small label above the title
title: My Scenario            # sidebar and page title
summary: >
  One paragraph on what this section shows.
objectives:
  - What the attendee should understand by the end

run: [apply, build, consumer, publisher]   # Play, in order: consumers before publishers
cleanup: [destroy]                          # optional, defaults to destructive actions

diagram: { ... }              # see below
actions: [ ... ]              # see below
failure_modes: [ ... ]        # see below
inspect: [ ... ]              # see below
```

### Actions

```yaml
actions:
  - id: apply
    label: Apply configuration
    kind: terraform
    command: apply            # apply | plan | destroy
    tf_dir: tf
    variant: primary          # primary | secondary | danger
    description: What it creates.

  - id: build
    label: Build the apps
    kind: process
    cmd: [bash, ../../apps/run.sh, build]
    cwd: .                    # relative to the scenario folder
    variant: secondary

  - id: consumer
    label: Start the consumer
    kind: process
    cmd: [bash, ../../apps/run.sh, mypkg, consume, --queue, q.my.orders]
    cwd: .
    long_running: true
    variant: secondary

  - id: reconcile             # recommended for every scenario with a tf/ folder
    label: Reconcile with broker
    kind: process
    cmd: [bash, ../../scripts/reconcile.sh, my-scenario]
    cwd: .
    variant: secondary

  - id: destroy
    label: Remove configuration
    kind: terraform
    command: destroy
    tf_dir: tf
    variant: danger
```

Other fields: `confirm:` (a prompt shown before running) and
`failure_only: true` (hidden from the flowchart, used only by a failure mode).

### Diagram

```yaml
diagram:
  caption: What the picture shows.
  duration: 2.6               # seconds for a packet to cross
  liveWhen: pub               # packets move only while this node's action runs
  nodes:
    - id: pub
      label: Order Service
      sublabel: svc-my-publisher
      kind: app               # app | broker | config
      col: 0                  # column, left to right; nodes in a column stack
      action: publisher       # clicking starts or stops it, and opens its log
      requires:               # broker objects this node needs, checked live
        - label: svc-my-publisher
          semp: /msgVpns/{vpn}/clientUsernames/svc-my-publisher
    - id: broker
      label: Solace Broker
      kind: broker
      col: 1
      action: apply
      contains:               # dotted boxes drawn inside the broker
        - id: queues
          label: Queues
      provides:               # objects it holds; group puts one in a box
        - label: q.my.orders
          group: queues
          semp: /msgVpns/{vpn}/queues/q.my.orders
    - id: enrich
      label: Enricher
      kind: app
      shape: processor        # hexagon: consumes at the top, publishes from the bottom
      col: 2
      action: enrich
  flows:
    - { from: pub, to: broker, label: orders, delay: 0 }
    - { from: broker, to: enrich, delay: 0.6 }
    - { from: enrich, to: broker, label: enriched, delay: 1.2 }
```

Rules the checker enforces, because they are what the workshop teaches:

- Exactly **one** `kind: broker` node per diagram.
- Every flow starts or ends at the broker. Apps never talk to each other
  directly. An app that consumes and publishes has a flow in from the broker
  and a flow back to it, and should be drawn with `shape: processor`.

`{vpn}` in any `semp:` path is replaced with the message VPN.

### Failure modes

Each entry becomes a card under **Break it**. Aim for two per scenario, each
showing a real error from the Go API or the broker.

```yaml
failure_modes:
  - id: consumer-offline
    title: The consumer goes offline
    needs: running            # running (default) or applied (config-only scenarios)
    breaks: One line on what goes wrong.
    watch: What to look for once it has.
    why: Why it breaks. Shown in a closed shade.
    real_world: Where you meet this in production. Same shade.
    docs:                     # https links, Go API page first, then broker docs
      - label: "Go API: consuming guaranteed messages"
        url: https://docs.solace.com/API/API-Developer-Guide-Go/Go-PM-Subscribe.htm
    node: consumer            # diagram node marked while it is in effect
    logs: consumer            # action whose output is streamed into the card
    trigger:                  # start: and stop: return at once, run: waits for it to finish
      - stop: consumer
    reset:
      - start: consumer
```

Let the app print the Go API's error as it is. Do not wrap it in your own
explanation: the card's `watch`, `why` and `real_world` text is where the
explanation goes.

### Inspect views

```yaml
inspect:
  - label: Queues
    kind: semp
    api: monitor              # config (default) for objects, monitor for live counters
    path: /msgVpns/{vpn}/queues?count=100
    columns: [queueName, msgSpoolUsage, lastSpooledMsgId, highestAckedMsgId]
    ui_hint: Manager → Queues # where to find the same thing in Broker Manager
```

For a live backlog use `msgSpoolUsage`, not `spooledMsgCount`, which is
cumulative and never falls.

### Terraform and imports.tsv

Name every broker object with a prefix unique to the scenario (`q.my.`,
`svc-my-`, `acl-my-`, `cp-my-`). Scenarios must not share objects: Cleanup on
one would break another.

`tf/imports.tsv` lists every object the scenario owns, one per line, the
terraform address and the import id separated by a **tab**:

```
solacebroker_msg_vpn_queue.orders	{vpn}/q.my.orders
solacebroker_msg_vpn_client_username.publisher	{vpn}/svc-my-publisher
```

It drives two things: **Reconcile with broker** (imports existing objects
back into state after state is lost) and **Clear broker config** (deletes every
queue, client username, ACL profile and client profile any scenario lists).
An object missing from the file is invisible to both.

### Go apps

All roles compile into one binary so attendees wait for one build.

1. Add a package under `cockpit/apps/scenarios/<pkg>/`.
2. Write each role as `func Role(args []string)` that parses its own flags.
3. Register it in `cockpit/apps/cmd/workshop/main.go` as `"<pkg> <role>"`.
4. Use the helpers in `cockpit/apps/internal/solace/`: `Connect`,
   `StartDirectPublisher`, `StartDirectReceiver`, `Subscribe`,
   `StartPersistentPublisher`, `BindQueue`, `PublishKeyed`, `Logf`, `Errf`,
   `Eventf`, `WaitForStop`. They read connection details from the environment
   and keep log output consistent across scenarios.

`run.sh` rebuilds the binary automatically when any `.go` file is newer than
it. To build by hand inside the container:

```bash
bash cockpit/apps/build.sh
```

### The guide

Add `guides/<NN>-<id>.md`, where `NN` matches the scenario's `order`. Follow
the existing guides: what the scenario shows, what to look at while it runs,
a **Break it** section matching the failure modes, a short "Try this" list,
and a `Next:` link to the following guide. Add a row to the sections table in
the root `README.md`.

## Checking your work

```bash
python3 cockpit/scripts/check_scenarios.py
```

It checks that `run`, `cleanup`, diagram and failure mode references name real
actions and nodes, that each diagram has one broker and no flow bypasses it,
that scripts and terraform folders exist, and that a scenario with Reconcile
has an `imports.tsv`. Run it before every commit.

The dashboard reads `scenario.yaml` only at startup. After changing one,
restart it inside the container:

```bash
pkill -TERM -f "[u]vicorn cockpit.app"; sleep 4; bash cockpit/start_cockpit.sh
```

Static files (`cockpit/static/`) are served uncached, so a browser reload
picks those up. Then test the scenario by hand: Play, each Break it and Reset,
Cleanup, and Play again from a clean broker (**Clear broker config** gets you
there).

## Building a workshop for a particular audience

The sidebar is whatever folders are in `cockpit/scenarios/`, sorted by
`order`. That makes a branch per workshop the simplest model: keep every
scenario on the main branch, and let each workshop branch trim and reshape it.

Name workshop branches so they are easy to find, for example
`workshop/<event-or-customer>`, and share the Codespaces link for that branch:

```
https://codespaces.new/<owner>/<repo>/tree/<branch>?quickstart=1
```

Update the badge link in `README.md` on that branch to match.

### Remove a scenario

Delete `cockpit/scenarios/<id>/` and `guides/<NN>-<id>.md`, remove its row from
`README.md`, and fix the `Next:` link in the guide before it. Leave its Go
package in place: it costs nothing and keeps merges from main simple.

### Reorder scenarios

Change `order:` in each `scenario.yaml`. The numbers only need to sort, so
leave gaps (10, 20, 30) to make room. Keep the guide file prefixes, the
README table and the `Next:` links in the same order. Renaming guide files is
optional but keeps the folder readable.

### Rename a scenario

- **Display name only:** change `title:`, `eyebrow:` and `summary:`, plus the
  guide's heading and the README row. This is the usual case and the safest,
  because nothing else refers to them.
- **The id as well:** rename the folder, change `id:`, and update every place
  the id appears as a string: `reconcile.sh <id>` and `forget_state.sh <id>`
  arguments in its actions, the guide file name and links, and the README.
  Search for the old id before committing:

  ```bash
  grep -rn "old-id" cockpit guides README.md
  ```

  Terraform state lives under `cockpit/.state/<id>/`, so anyone with the
  scenario already applied should run Cleanup before switching to the
  renamed version, or use Reconcile afterwards.

### Change the story

A workshop for a retail audience might keep the patterns and swap Acme Air
for a store. The story lives in three places: the text in `scenario.yaml`,
the topic names and payloads in the Go package, and the object names in
`tf/`. Change all three together, and update `imports.tsv` for any object you
rename.

### Keeping workshop branches current

Make fixes to shared code (`cockpit/app/`, `cockpit/static/`,
`cockpit/apps/internal/`, `.devcontainer/`) on the main branch and merge them
into workshop branches. Keep workshop branches to scenario folders, guides
and the README, so those merges stay clean.

## Writing style

- Plain, direct sentences, written for someone new to event-driven design.
- No em dashes or double hyphens in anything attendees read. Use commas,
  colons or parentheses, or split the sentence.
- Write "Solace Agent Mesh" in full, never an abbreviation.
- Say "Solace Broker Manager" for the broker UI and "Solace Workshop
  Dashboard" (or "the dashboard") for the control surface.

## Before opening a pull request

- `python3 cockpit/scripts/check_scenarios.py` passes.
- Play, every Break it and Reset, and Cleanup work in a fresh devcontainer or
  Codespace.
- No credentials beyond the local broker's `admin` / `admin` and the shared
  workshop client password.
- The guide, the README table and the `Next:` links match the sidebar.
