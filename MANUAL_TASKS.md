# What you need to do manually

Everything here needs either a running Codespace, a decision only you can make,
or a person in a room. Ordered by what blocks the most.

Three commits are on `sam-go-v2`: the data model and scoring toolset, the eight
rebuilt guides, and the product catalog MCP server.

---

## Blockers: the workshop does not run without these

### 1. Settle the broker topology

**Why it is first:** guide 600 is the payoff of the whole rebuild, and it does
not exist if an external client cannot publish a message that Solace Agent Mesh
sees. I could not test this without a container.

`devcontainer.json` runs `sam run --embedded /etc/sam/configs`, which reads
configs baked into the image rather than this repo's `configs/`. Meanwhile
`setup_broker.sh` sits at the repo root, works, is idempotent, and is invoked by
nothing.

**Do this:**

1. Open a Codespace on `sam-go-v2`.
2. Run `setup_broker.sh` by hand and confirm the broker comes up on 8080.
3. Open the Solace Try-Me extension, connect to `ws://localhost:8008`, and
   publish to any topic.
4. Check whether Solace Agent Mesh sees it.

**Then pick one:**

- **Option A (preferred).** Drop `--embedded` and point Solace Agent Mesh at the
  software broker. The config files already read `${SOLACE_BROKER_URL, ...}` and
  friends, so no config edits are needed if the env vars are set.
- **Option B (fallback).** Keep `--embedded` and give the entrypoint its own
  broker block. Smaller blast radius, but attendees see two brokers and will ask
  why.

`INFRA_TODO.md` section 1 has the exact `devcontainer.json` diff for each.

### 2. Decide: shared broker or one per attendee

If attendees share a broker, every topic needs a per-attendee prefix or
attendee A's published event triggers attendee B's workflow. Suggested shape
`{githubUser}/retail/order/exception/...`, with the prefix from `$GITHUB_USER`
(already available; `util/register.sh` uses it).

**This changes the entrypoint YAML and the guide 600 text**, so settle it before
anyone rehearses.

### 3. Write `util/seed_retail_db.sh`

The schema and seed are committed and tested. The script that applies them in a
container is not written.

Requirements are in `INFRA_TODO.md` section 2, including the exact row counts it
should assert. The important one: **exit non-zero on a partial seed.** A silent
half-seed produces agents that hallucinate, which is the worst failure mode this
workshop has.

### 4. Wire up `devcontainer.json`

Currently nothing starts the broker, the database, or the catalog service.

```jsonc
"onCreateCommand": "/bin/bash ${containerWorkspaceFolder}/setup_broker.sh && /bin/bash ${containerWorkspaceFolder}/util/seed_retail_db.sh && /bin/bash ${containerWorkspaceFolder}/util/tracker_extension.sh",
"postAttachCommand": "sam run /etc/sam/configs & /bin/bash mcp-servers/product-catalog/start.sh & /bin/bash util/seed_prompts.sh",
"forwardPorts": [8080, 8800, 55555, 8008, 9100],
```

Broker and database start on create because they are slow. The catalog service
backgrounds itself and waits on its own health check, so it belongs on attach.

### 5. Pre-bake dependencies into the image

Attendees on conference wifi must not download anything mid-lab.

- `mcp` and `psycopg[binary]` for the catalog service. `start.sh` pip-installs
  them on each run, which needs network the first time.
- Confirm Go is in the image. `.devcontainer/configureEnv.sh` installed it but
  is invoked by nothing, and should be deleted either way.
- Run `sam toolset init substitution-scoring --lang go --force` (or
  `sam toolset sync`) once to vendor the SDK into `src/_sdk/`. The committed
  source expects it. This is offline by design once done.

---

## Verification: run these on a fresh Codespace, twice

Every one of these is a claim a guide makes. `INFRA_TODO.md` section 5 has the
full list; these are the ones that would embarrass you on stage.

- [ ] Cold start to fully ready in **under 5 minutes**
- [ ] `sam config plan` succeeds for **every incremental manifest subset** the
      guides apply, not just the final one. Attendees apply six partial
      manifests, and I could only validate the YAML statically.
- [ ] Publishing to `retail/order/exception/us-west/1042` triggers the workflow
      and a message appears on `retail/order/remediated/ORD-10428`
- [ ] `inventory-analyst` appears as an Orchestrator peer with **no** explicit
      config (guide 300 claims this)
- [ ] With the toolset disabled, `order-triage` **refuses to rank** rather than
      falling back to its own judgment. Test this deliberately: a prompt rule
      the model ignores under pressure is not a rule, and this one carries the
      whole argument for guide 400.
- [ ] The margin weight change flips the recommendation in the running system,
      not just in the Go tests
- [ ] Toolset rebuild completes in under 60 seconds **with networking disabled**

**Capture real CLI output while you are in there.** The guides quote plan and
apply output I constructed from the reference docs. It is structurally right but
not captured from a run, and the spec asks for verbatim. Grep the guides for
```` ``` ```` blocks containing `sam config` and replace with what you actually see.

---

## Presentation

### 6. Fix the broken deck

`presentation/slides/05-why-new-lifecycle.html` is linked from `index.html` and
from slide 04's nav chain but **does not exist**. Deck navigation is broken
today. Either create it or remove both references.

`index.html` also hardcodes "14 slides"; there are 13.

Navigation is hardcoded per file, so inserting or reordering means editing both
neighbours' `nav-prev` and `nav-next`. Verify the chain end to end after any
change, forward and backward.

### 7. Rebuild slide content for the retail narrative

The design system is good and carries over unchanged. Only content changes.

| Slide | Action |
|---|---|
| `01-title` | Retail framing |
| `02-agenda` | Rebuild to the new section map. Currently five topics, no times. |
| `03-takeaways` | Rewrite. Currently promises structured evaluation, which is now take-home. Do not promise what the in-room session does not deliver. |
| `04-adlc-overview` | Keep, but reposition to after the demo |
| `08-what-is-sam`, `09-process-types` | Reframe as the parts bin |
| `13-broker-vs-http` | Keep as is. It sets up guide 600. |
| `14-closing` | Rewrite around the returns-fraud extension argument |
| new | A Meridian architecture diagram, reusable across guides with the current component highlighted |

### 8. Record the cold open

20 minutes, facilitator-driven, nobody touching a keyboard. Publish one message
and narrate what happens.

**Record it.** With 50 people watching, a live demo that fails at minute three is
unrecoverable. Run it live once as a closer if the room is warm.

The single most important 30 seconds is the moment the event lands and an agent
wakes with nobody having clicked anything. Do not rush past it.

---

## Decisions and sign-off

### 9. Time a real person

**This is the acceptance criterion that matters most and the only one you cannot
fake.** Someone who has never seen Solace Agent Mesh completes guides 100
through 600 in 100 minutes. Time them. Do not estimate, and do not use anyone
who helped build this.

Record where they get stuck. If it overruns, the cut order is: make the MCP half
of guide 200 a read-along, then trim guide 300's second agent. **Never cut 500
or 600.**

### 10. Size the LiteLLM budget

Still open. Instrument one full end-to-end run, capture token usage, and
multiply by 2 to 3 attempts per lab per attendee.

Worth noting in the facilitator notes: deterministic scoring in a toolset costs
fewer tokens than a chatty agent chain would. That is a real benefit of the
shape, not a compromise.

### 11. Confirm one held-back deletion

`sample_configuration/.claude/skills/` is a ~140-file mirror of the root copy. It
looks like waste, but it plausibly exists so `sam ai-assistance` and Claude Code
work when scoped to that directory, which is where attendees author YAML.

Check whether removing it breaks the AI-assist path in guide 900 before deleting.

---

## Small repo fixes

All currently wrong, all quick. Detail in `INFRA_TODO.md` section 7.

- [ ] `README.md` links to `solace-agent-mesh/solace-cloud-signup-workshop.md`, which 404s
- [ ] `README.md` says "Create codespaces on main"; the workshop is on a branch
- [ ] `README.md` tool list is stale: no postgres, no catalog service, no new ports
- [ ] `.sam/settings.yaml` placeholder reads `<INSER_API_KEY_HERE>` (typo).
      `util/set_api_key.sh` seds against that exact string, so **fix both or neither**
- [ ] Delete `.devcontainer/configureEnv.sh`, which installs toolchains and is
      invoked by nothing. Leaving it means the next person assumes it runs.
- [ ] `configs/gwe/platform.yaml` references RBAC role-mapping YAML not in the repo
- [ ] `util/prompts/populate_prompts.sh` defaults `--url` to 8080, which is the
      broker. `seed_prompts.sh` overrides it to 8800, but the default is wrong.
- [ ] Delete dead directories: `faa-workshop/` (node_modules, no source),
      `samples/` (empty), `guides/presentation/slides/` (empty)

---

## What is already done

For reference, so you do not redo it:

- Schema and seed, tested against postgres 16. Idempotent, all row counts verified.
- The scoring toolset in Go. 16 tests pass, including both workshop acceptance
  criteria and a regression test for asymmetric sizing.
- All SAM resources: two connectors, two agents, skill bundle, workflow,
  entrypoint, plus dataset, two evaluators, and an experiment for the eval lab.
- Eight guides, replacing five. Every image, path, and link verified to resolve.
- The product catalog MCP server, tested end to end against a seeded database.
- `workshop-sections.json` rewritten to eight entries; prompts reseeded and
  verified to match guide text verbatim.
