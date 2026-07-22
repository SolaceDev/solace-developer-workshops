# Inspecting platform state

After `sam config apply`, use `sam api` (see `references/cli-auth.md`) to
confirm what actually landed. This page covers the status fields, how to look
a resource up by name, and which endpoint returns what.

## Status fields — what each one means

A platform resource carries several independent status fields. They answer
different questions; don't conflate them.

| Field | Lives on | Values | Meaning |
|---|---|---|---|
| `deploymentStatus` | agent, entrypoint, workflow | `deployed`, `not_deployed`, `deploy_failed` | Did the last deploy succeed? |
| `syncStatus` | agent | `in_sync`, `out_of_sync` | Does the **running deployment** match the **stored config**? `out_of_sync` means a config change never made it into a running deployment (e.g. a deploy that failed after the config was saved). |
| `discoveryStatus` | toolset | `pending`, `ready`, `failed` | Has STR finished scanning the tool bundle and learned its schema? A deploy that references a toolset still `pending` is rejected until it reaches `ready`. |
| `runtimeStatus` | agent | `running`, `starting`, `disconnected`, `stopped` | Is the deployed process actually up right now? |

The trap: an agent can be `deploymentStatus: deployed` and `runtimeStatus:
running` yet `syncStatus: out_of_sync` — it's up, but running *older* config
than the YAML you just applied. **`sam config apply` now re-deploys
`out_of_sync` agents automatically** (and `plan` flags them as "out of sync —
will re-deploy"), so you no longer need to POST a manual deploy to recover a
stale deployment. If a re-deploy fails, apply exits non-zero.

## Looking up a resource by name

Platform paths address resources by **UUID**, not name —
`GET /api/v1/platform/agents/<name>` returns `400 invalid id: must be a UUID`.
To find a resource by its human name, list and filter client-side:

```sh
# Resolve a name → id
sam api --target dev /api/v1/platform/agents \
  --jq '.data[] | select(.name=="my-agent") | .id'

# Inspect one agent's sync/deploy status by name
sam api --target dev /api/v1/platform/agents \
  --jq '.data[] | select(.name=="my-agent") | {id, deploymentStatus, syncStatus, runtimeStatus}'

# Check whether a custom toolset finished discovery
sam api --target dev '/api/v1/platform/toolsets?type=custom' \
  --jq '.data[] | {name, discoveryStatus, discoveryErrors}'
```

## Which endpoint returns what

Two agent-shaped endpoints exist and are easy to confuse:

| Endpoint | Returns | Use when |
|---|---|---|
| `/api/v1/platform/agents` | The **managed** agents — desired + stored config and the status fields above. `PaginatedResponse` envelope. | Verifying what `sam config apply` created/updated, or resolving a name → id. |
| `/api/v1/agentCards` | The **discovered** agent cards published on the broker by running agents (A2A discovery). Different shape — this is the runtime view, not the config view. | Checking what's actually live and discoverable, independent of the config store. |

All `/api/v1/platform/...` list endpoints use the `PaginatedResponse`
envelope (`{data: [...], meta: {pagination: {...}}}`); single-resource GETs
return the bare DTO. Walk multi-page lists with `--paginate`.

## Embedded mode note

In embedded mode (the desktop app) the `remote_tool_execution`
feature is enabled by default, so `sam config apply` of agents/toolsets/skills
works out of the box. On a standalone platform deployment it is off unless
`SAM_FEATURE_REMOTE_TOOL_EXECUTION=true` is set; the 501 you'd get names the
exact variable.
