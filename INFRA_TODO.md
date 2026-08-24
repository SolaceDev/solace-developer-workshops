# Infrastructure wiring: what still needs a container

Everything in this file requires a running Codespace to verify. The content
work (data model, SAM resources, toolset, guides, prompts, slides) does not.

Ordered by what blocks the most.

---

## 1. The broker. Critical path for guide 600.

`.devcontainer/devcontainer.json` runs `sam run --embedded /etc/sam/configs`,
which reads configs baked into the image rather than this repo's `configs/`.
`setup_broker.sh` exists at the repo root, works, is idempotent, and starts a
real software broker on 8080/55555/8008. **Nothing invokes it.**

**The one question that matters:** can a client outside SAM publish a message
that SAM sees? Guide 600 does not exist if the answer is no. Test with the
Solace Try-Me VS Code extension, which is already installed and unused by any
guide today.

Two candidate topologies:

**Option A, preferred.** Drop `--embedded`, point SAM at the software broker.
All of `configs/gwe/gwe.yaml`, `configs/gwe/platform.yaml`, and
`configs/str/str.yaml` already read `${SOLACE_BROKER_URL, ws://localhost:8008}`
and friends, so no config file edits are needed if the env vars are set.

```jsonc
"onCreateCommand": "/bin/bash ${containerWorkspaceFolder}/setup_broker.sh && /bin/bash ${containerWorkspaceFolder}/util/seed_retail_db.sh && /bin/bash ${containerWorkspaceFolder}/util/tracker_extension.sh",
"postAttachCommand": "sam run /etc/sam/configs & /bin/bash util/seed_prompts.sh",
```

**Option B, fallback.** Keep `--embedded` and give the event mesh entrypoint
its own broker block. Smaller blast radius, but attendees then see two brokers
in play, which generates questions there is no time to answer.

Broker start is slow, so it belongs on `onCreateCommand`, not the attach path.
If SAM needs a readiness wait before connecting, add it separately rather than
editing `setup_broker.sh`.

**Ports.** Only 8080 is listed today; 8800 relies on auto-detect.

```jsonc
"forwardPorts": [8080, 8800, 55555, 8008, 9100],
"portsAttributes": {
  "8080":  { "label": "Solace Broker Manager" },
  "8800":  { "label": "Solace Agent Mesh", "onAutoForward": "openPreview" },
  "55555": { "label": "Solace SMF" },
  "8008":  { "label": "Solace Web Messaging" },
  "9100":  { "label": "Product Catalog MCP" }
}
```

**Shared vs per-attendee broker.** Still open. A shared broker needs a
per-attendee topic prefix, or attendee A's published event triggers attendee
B's workflow. Suggested shape `{githubUser}/retail/order/exception/...`, with
the prefix from `$GITHUB_USER` (already available; `util/register.sh` uses it).
This changes the entrypoint YAML and the guide 600 text, so settle it early.

## 2. Local postgres

Replaces the shared EC2 instance. Docker-in-docker is already enabled.

Committed and ready: `util/db/01_schema.sql`, `util/db/02_seed.sql`.

**Still to write: `util/seed_retail_db.sh`.** Requirements:

- Idempotent. Attendees re-run things. Three consecutive runs must be clean.
- Postgres 16 on `localhost:5432`, database `retail`, user/password
  `postgres`/`postgres`. Keep those credentials: `sample_configuration/.env`
  and the guides reference them, and there is no security value in a workshop
  container.
- Wait for readiness with `pg_isready` in a bounded loop. Do not sleep and hope.
- Verify row counts after seeding and **exit non-zero with a clear message** if
  they are wrong. A silent partial seed produces agents that hallucinate, which
  is the worst failure mode this workshop has.
- One log line per step so an attendee watching the terminal sees it working.

Expected row counts, which the script should assert:

| Table | Rows |
|---|---|
| `locations` | 12 |
| `products` | 300 |
| `inventory` | 1803 |
| `customers` | 60 |
| `orders` | 200 (30 exception, 20 remediated) |
| `order_lines` | 271 |
| `style_families` | 19 |
| `substitution_rules` | 19 |
| `product_copy` | 300 |

Regenerate the seed with `python3 util/db/generate_seed.py > util/db/02_seed.sql`.
It is deterministic, so output is byte-identical across runs.

## 3. Product catalog MCP server

**Built and tested.** `mcp-servers/product-catalog/`, Python, streamable HTTP on
9100, backed by the catalog-owned tables.

Verified locally against a seeded postgres: all three tools return correct data,
and the full chain (catalog attributes joined to SQL availability, fed to the Go
scorer) reproduces the documented `ORD-10428` outcomes at both weight settings.

`/health` returns 200 with the family count when queryable, 503 when postgres is
unreachable or the catalog tables are empty. Verified by stopping the database
mid-run: it reports unhealthy, then recovers on its own.

**Wire into `devcontainer.json`.** It backgrounds itself and waits on its own
health check, so it belongs on the attach path alongside `sam run`:

```jsonc
"postAttachCommand": "sam run /etc/sam/configs & /bin/bash mcp-servers/product-catalog/start.sh & /bin/bash util/seed_prompts.sh",
```

Two things to confirm in a container:

- `mcp` and `psycopg[binary]` install cleanly. `start.sh` pip-installs from
  `requirements.txt` on each run, which is a few seconds warm but needs network
  the first time. **Pre-bake both into the image** rather than relying on
  conference wifi.
- Port 9100 is free and forwarded.

## 4. Toolset build path

The Go toolchain question is **resolved by the docs, not assumed**:
`sam toolset init --lang go` vendors the SDK into `src/_sdk/samtoolsdk/` from
the CLI binary, and the build pipeline re-injects it if the directory is
missing. No network at build time, so conference wifi is not a risk.

Still to confirm in a container:

- `go version` in the image. `.devcontainer/configureEnv.sh` installed Go but
  is invoked by nothing and should be deleted.
- Run `sam toolset init substitution-scoring --lang go --force` against the
  existing directory, or `sam toolset sync`, to vendor `_sdk/`. The committed
  source expects it.
- `./build.sh` completes in under 60 seconds with networking disabled.
- The built artifact lands in `toolsets_dir` (`${SAM_TOOLS_DIR, /opt/sam/tools}`)
  and SAM sees it.

Note the committed `main.go` carries `//go:build !nosdk` so the scoring tests
run on a machine without the SDK. The container build needs no flag.

## 5. Verification that needs a live instance

- `sam config plan` succeeds for **every incremental manifest subset** the
  guides apply, not just the final one.
- Publishing to `retail/order/exception/us-west/1042` triggers the workflow, and
  a message appears on `retail/order/remediated/ORD-10428`.
- `inventory-analyst` registers as an Orchestrator peer tool with **no**
  explicit configuration. A guide claims this.
- With the toolset disabled, `order-triage` **refuses to rank** rather than
  falling back to its own judgment. Test this deliberately. A prompt rule the
  model ignores under pressure is not a rule, and this one carries the whole
  argument for guide 400.
- Cold start under 5 minutes on a fresh Codespace, twice.
- A real person who has never seen SAM completes guides 100 through 600 in 100
  minutes. Time someone. Do not estimate.

## 6. Deletion held back

`sample_configuration/.claude/skills/` is a ~140-file mirror of the root copy.
It looks like waste, but it plausibly exists so `sam ai-assistance` and Claude
Code work when scoped to that directory, which is where attendees author YAML.
Confirm whether removing it breaks the AI-assist path in guide 900 before
deleting it.

## 7. Repo fixes, all small and all currently wrong

| File | Problem |
|---|---|
| `README.md` | Links to `solace-agent-mesh/solace-cloud-signup-workshop.md`, which 404s |
| `README.md` | Says "Create codespaces on main"; the workshop is on a `sam-go` branch |
| `README.md` | Tool list is stale: no postgres, no MCP server, no new ports |
| `.sam/settings.yaml` | Placeholder reads `<INSER_API_KEY_HERE>` (typo). `util/set_api_key.sh` seds against that exact string, so fix both or neither |
| `.devcontainer/configureEnv.sh` | Dead code that installs toolchains. Delete it |
| `presentation/slides/05-why-new-lifecycle.html` | Missing but linked from `index.html` and slide 04. Deck navigation is broken today |
| `presentation/index.html` | Hardcodes "14 slides"; there are 13 |
| `configs/gwe/platform.yaml` | References RBAC role-mapping YAML not in the repo |
| `util/prompts/populate_prompts.sh` | Defaults `--url` to 8080, which is the broker. Overridden to 8800 by `seed_prompts.sh`, but the default is wrong |
