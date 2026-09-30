# CLAUDE.md

A hands-on Solace event-driven architecture workshop. Attendees open it in a
Codespace, read `guides/`, and drive scenarios from the **Solace Workshop
Dashboard** on port 3000. Each scenario is a working system on a local Solace
broker that they run, break and inspect.

[CONTRIBUTING.md](CONTRIBUTING.md) is the full reference for how everything
fits together and for the `scenario.yaml` schema. Read it before making a
structural change. This file is the short version plus the rules to follow.

## Layout

| Path | What it is |
| --- | --- |
| `cockpit/scenarios/<id>/scenario.yaml` | One scenario: page text, actions, diagram, failure modes, inspect views |
| `cockpit/scenarios/<id>/tf/` | Terraform for the broker objects that scenario owns, plus `imports.tsv` |
| `cockpit/apps/scenarios/<pkg>/` | Go roles for that scenario's apps |
| `cockpit/apps/cmd/workshop/main.go` | Registers every role as `"<pkg> <role>"` in one binary |
| `cockpit/apps/internal/solace/` | Shared Go helpers: connect, publish, subscribe, bind queue, logging |
| `cockpit/app/` | FastAPI dashboard backend (registry, process manager, SEMP proxy) |
| `cockpit/static/` | Dashboard UI, plain JS and CSS, no build step |
| `cockpit/scripts/` | `check_scenarios.py`, `reconcile.sh`, failure mode helpers |
| `guides/NN-<id>.md` | Attendee guide per scenario, `NN` matches `order:` |
| `.devcontainer/`, `setup_broker.sh` | Codespace setup and the broker container |

The `cockpit/` folder name, the `cockpit.app` module and `COCKPIT_*` variables
are internal names. Attendee-facing text always says "Solace Workshop
Dashboard" or "the dashboard".

## Commands

Run these inside the devcontainer or Codespace, from the repo root.

```bash
python3 cockpit/scripts/check_scenarios.py        # validate every scenario.yaml; run after any change
bash cockpit/apps/build.sh                        # rebuild the Go binary (run.sh also rebuilds when stale)
pkill -TERM -f "[u]vicorn cockpit.app"; sleep 4; bash cockpit/start_cockpit.sh   # restart after yaml changes
bash cockpit/apps/run.sh <pkg> <role> [flags]     # run one app by hand
tail -f cockpit/.state/cockpit.log                # dashboard log
```

The dashboard loads `scenario.yaml` only at startup, so restart it after every
yaml change. Static files are uncached; a browser reload picks them up.

Driving a scenario without the browser (dashboard on localhost:3000):

```bash
curl -X POST localhost:3000/api/scenarios/<id>/run       # Play
curl -X POST localhost:3000/api/scenarios/<id>/pause
curl -X POST localhost:3000/api/scenarios/<id>/cleanup
curl localhost:3000/api/runs                               # state of every action
curl -X POST localhost:3000/api/broker/clear               # delete every scenario's broker objects
```

If Claude is running on a host machine rather than in the container, wrap the
commands in `docker exec -u vscode <container> bash -c 'cd /workspaces/<repo> && ...'`.

## Rules that must hold

These are what the workshop teaches, and `check_scenarios.py` enforces most
of them.

- **One broker per diagram, and every flow goes through it.** Apps never
  connect to each other. An app that consumes and publishes gets a flow in
  from the broker, a flow back to it, and `shape: processor` (a hexagon).
- **Scenarios never share broker objects.** Prefix every name with something
  unique to the scenario (`q.<scenario>.`, `svc-<scenario>-`, `acl-`, `cp-`).
- **`tf/imports.tsv` lists every object the scenario owns**, terraform address
  and import id separated by a tab, `{vpn}` for the VPN. Reconcile and Clear
  broker config depend on it; a missing line means that object is never cleaned
  up.
- **`run:` starts consumers before publishers.** Direct messaging keeps
  nothing for a subscriber that is not connected yet.
- **Every scenario offers apply, build (if it has apps), reconcile and
  destroy actions**, following the shapes in existing scenarios.
- **Failure modes show real errors.** Apps print the Go API's error as it is,
  with `solace.Errf(role, "%s", err)`. Explanations belong in the card's
  `watch`, `why` and `real_world` text, not in the app's output. Each mode has
  `docs` links: the Go API page first, then the broker documentation. Only use
  URLs you have confirmed exist.
- **An action used only by a failure mode** is marked `failure_only: true`.
- **Credentials stay local**: the broker's `admin` / `admin` and the shared
  client password from `cockpit/app/config.py`. Never add real secrets.

## Common tasks

**Add a scenario.** Copy the closest existing one (`pub-sub` direct,
`shock-absorber` queues, `processor` consume and republish, `broker-tour`
config only). Then: rename the folder and `id:`, pick an `order:`, rewrite the
text, change the terraform object names and `imports.tsv`, write the Go
package and register its roles in `main.go`, add two failure modes, write
`guides/NN-<id>.md`, add a README row, and fix the `Next:` links in the guides
either side. Check, restart, then Play, Break it and Reset each mode, Cleanup.

**Remove a scenario from a workshop.** Delete its scenario folder and guide,
remove its README row, fix the neighbouring `Next:` link. Leave the Go package.

**Reorder.** Change `order:` values (keep gaps of 10). Keep guide prefixes,
the README table and `Next:` links in the same order.

**Rename.** Prefer changing only `title:`, `eyebrow:`, `summary:`, the guide
heading and the README row. Changing the id means renaming the folder and
every string use of the id (`reconcile.sh <id>`, `forget_state.sh <id>`, guide
names and links); `grep -rn "<old-id>" cockpit guides README.md` finds them.

**Retell the story for another audience.** The story is in three places that
must change together: `scenario.yaml` text, topics and payloads in the Go
package, and object names in `tf/` (plus `imports.tsv`).

**Workshop branches.** Each workshop is a branch (`workshop/<name>`) that
trims and reshapes scenarios. Shared code changes go on the main branch and
get merged in. The Codespaces link for a branch is
`https://codespaces.new/<owner>/<repo>/tree/<branch>?quickstart=1`; update the
README badge on that branch.

## Verifying a change

1. `python3 cockpit/scripts/check_scenarios.py` reports 0 problems.
2. Restart the dashboard.
3. Play the scenario and confirm every action reaches `running` or
   `succeeded` (`curl localhost:3000/api/runs`).
4. Trigger each failure mode and Reset it; the card should show the real error
   and then recovery.
5. Cleanup, then Clear broker config, then Play again to prove it works from an
   empty broker.
6. Look at the page in a browser. The diagram, the flowchart and the Break it
   cards are the product; a passing check is not the same as a page that reads
   well.

## Writing style

Attendee-facing text is `scenario.yaml` text fields, `guides/`, the README and
UI strings.

- Short, plain sentences for someone new to event-driven design. Say what
  happens and why, then what to look at.
- Never use em dashes or double hyphens. Use commas, colons, parentheses, or
  split the sentence.
- Write "Solace Agent Mesh" in full, never abbreviated.
- "Solace Broker Manager" for the broker UI, "Solace Workshop Dashboard" or
  "the dashboard" for this app.
- Match the existing comment density in code: comments explain why, not what.
