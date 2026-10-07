# RBAC scope reference

Scopes are the permission strings a role grants. They appear in `rbacRole.spec.scopes`; every other RBAC kind references roles by name and never names a scope directly.

## Grammar

Every scope is three colon-separated segments: `<category>:<resource>:<verb>`.

The second segment addresses *which* instances the scope covers:

| Segment 2 | Meaning | Example |
|---|---|---|
| `<id>` | One named instance | `agent:hr-bot:invoke` |
| `*` | Any instance in the category | `agent_builder:*:update` |
| `_` | Collection-level; the category has no instances | `rbac:_:read` |

Author the form the catalog entry below uses. A category whose catalog entry reads `_` has no per-instance addressing, and one that reads `*` does.

In a **granted** scope, a segment-2 `_` is read as `*` — they are the same permission in two spellings, so a role holding `connector:_:*` satisfies a check for `connector:*:read`. The equivalence applies only to segment 2 of a three-segment scope: a segment-3 `_` is never a wildcard over verbs, and it never rewrites the scope being checked. Prefer the spelling the catalog uses; the equivalence exists so older stored roles keep working.

The bare `*` is a separate, legacy spelling of the universal grant (equivalent to `*:*:*`). Both are live in shipped role seeds; prefer `*:*:*` in new config.

## Verbs

Use only the verbs the assignable scope catalog below uses: the CRUD verbs `read`, `create`, `update`, `delete`, plus `invoke` and the per-subject verbs a category lists (such as `read_feedback`). The synonyms `view`, `edit`, `write`, `manage`, `execute` and `delegate` are not used by any gate — a role granting one stores fine and authorizes nothing.

## Invoke scopes are resolved per instance

The scope that gates invoking a mesh participant depends on what the participant is, so an invoke grant cannot be written generically:

| Target | Scope |
|---|---|
| Deployed workflow | `workflow:<uuid>:invoke` |
| Platform-deployed agent | `agent:<uuid>:invoke` |
| Plain-named (config) agent | `agent:<name>:invoke` |

`agent:*:invoke` does **not** cover deployed workflows — those gate on the `workflow` category. A role meant to invoke both needs a scope in each.

## Who may write RBAC config

Every RBAC write — roles, grants, claim mappings, system users and the default-role set — requires the universal grant (`*:*:*` or the legacy `*`). A caller holding `rbac:_:read` can plan but not apply: `sam config plan` still previews the changes, then each write is refused with "RBAC management requires a super administrator". Nothing is partially written, since the refusal is uniform.

## Assignable scope catalog

Generated from the CLI's own catalog at the bundled version. A scope outside this list is not gated by any route, so it stores fine and grants nothing.

| Scope | Name | Description |
|---|---|---|
| `activity:*:read` | View all users' activity | View task activity across all users through the Activity Monitor — grants tenant-wide reports, cross-user failure lists, and full task traces. Content read is bundled: a holder can read any user's prompts, tool arguments, tool results and system prompt, including the raw task export. It grants reads only — it never permits cancelling or modifying another user's task. Users without this scope see only their own task activity. |
| `agent:*:invoke` | Invoke agents | Invoke (chat with or delegate to) agents over A2A. |
| `agent:*:read_feedback` | View agent feedback | View thumbs feedback on tasks handled by any agent. Experimental: the review screens are still in development and off by default, but this grant reaches the API as soon as it is assigned. |
| `agent:*:read_trace` | View agent traces | Open the full contents of task traces, including prompts, tool inputs and outputs, for every agent. A trace is fully visible only when every agent it ran is covered. Does not by itself open any task. Experimental: the review screens are still in development and off by default, but this grant reaches the API as soon as it is assigned. |
| `agent_builder:*:delete` | Delete agents | Delete agents. |
| `agent_builder:*:deploy` | Deploy agents | Deploy agents. |
| `agent_builder:*:read` | View agents | View agent configuration. |
| `agent_builder:*:test` | Test agents | Run agents in test mode. |
| `agent_builder:*:update` | Update agents | Update agent configuration. |
| `agent_builder:_:create` | Create agents | Create new agents. |
| `builder:_:use` | Use builders | Access the agent and workflow builder section of the UI. |
| `connector:*:delete` | Delete connectors | Delete connectors. |
| `connector:*:read` | View connectors | View connector configuration. |
| `connector:*:update` | Update connectors | Update connector configuration. |
| `connector:_:create` | Create connectors | Create new connectors. |
| `deployment:_:read` | View deployments | View the deployment audit log. |
| `entrypoint:*:delete` | Delete entrypoints | Delete entrypoints. |
| `entrypoint:*:deploy` | Deploy entrypoints | Deploy entrypoints. |
| `entrypoint:*:read` | View entrypoints | View entrypoint configuration. |
| `entrypoint:*:update` | Update entrypoints | Update entrypoint configuration. |
| `entrypoint:_:create` | Create entrypoints | Create new entrypoints. |
| `evaluation:_:create` | Create evaluations | Create evaluation datasets and experiments. Also lets the holder run an experiment as any Agent Mesh system user, so its runs authorize — and reach connected tool credentials — as that principal. Grant only to operators trusted with access beyond their own scopes. |
| `evaluation:_:delete` | Delete evaluations | Delete evaluation datasets and experiments. |
| `evaluation:_:invoke` | Run evaluations | Trigger evaluation runs, and connect or disconnect the tool credentials their system user runs with. |
| `evaluation:_:read` | View evaluations | View evaluation datasets, experiments, and runs. |
| `evaluation:_:update` | Update evaluations | Update evaluation datasets and experiments, including the system user an experiment's runs execute as. Same trust bar as Create evaluations. |
| `evidence:_:read` | View the evidence store | View evidence population health, the ingestion quarantine, the content-free trace evidence and its aggregates, and the configuration change proposals drafted from it; a proposal's summary and values also need the read scope of the agent or skill it changes. |
| `evidence:_:update` | Operate the evidence store | Request quarantine retries, derivation rebuilds and bounded rewinds of evidence population. |
| `evidence_proposal:_:update` | Review configuration proposals | Reject the configuration change proposals drafted from evidence findings. A rejection also takes evidence:_:read and the read scope of the agent or skill the proposal changes. |
| `model_config:*:delete` | Delete model configurations | Delete model configurations. |
| `model_config:*:read` | View model configurations | View model configuration. |
| `model_config:*:update` | Update model configurations | Update model configuration. |
| `model_config:_:create` | Create model configurations | Create new model configurations. |
| `profile_provider:*:read` | View profile provider | View which toolset is wired as the identity profile provider. |
| `profile_provider:_:update` | Manage profile provider | Configure the identity profile provider. |
| `project:_:share` | Share projects | Share projects with other users. |
| `prompt:_:share` | Share prompts | Share saved prompt templates with other users. |
| `rbac:_:read` | View roles & permissions | View RBAC roles, assignments, and claim mappings. |
| `skill:*:delete` | Delete skills | Delete skills. |
| `skill:*:read` | View skills | View skill configuration. |
| `skill:*:update` | Update skills | Update skill configuration. |
| `skill:_:create` | Create skills | Create new skills. |
| `toolset:*:delete` | Delete toolsets | Delete toolsets. |
| `toolset:*:read` | View toolsets | View toolset configuration. |
| `toolset:*:update` | Update toolsets | Update toolset configuration. |
| `toolset:_:create` | Create toolsets | Create new toolsets. |
| `webui_settings:*:read` | View web UI settings | View the instance-level web UI settings overrides (branding, assistant defaults, and feedback handling). |
| `webui_settings:*:update` | Update web UI settings | Set or clear instance-level web UI settings overrides, including the system purpose injected into web UI tasks and whether user feedback is published to the event mesh. |
| `workflow:*:invoke` | Invoke workflows | Invoke workflows over A2A. |
| `workflow:*:read_feedback` | View workflow feedback | View thumbs feedback on tasks handled by any workflow. Experimental: the review screens are still in development and off by default, but this grant reaches the API as soon as it is assigned. |
| `workflow_builder:*:delete` | Delete workflows | Delete workflows. |
| `workflow_builder:*:deploy` | Deploy workflows | Deploy workflows. |
| `workflow_builder:*:read` | View workflows | View workflow configuration. |
| `workflow_builder:*:update` | Update workflows | Update workflow configuration. |
| `workflow_builder:_:create` | Create workflows | Create new workflows. |

## Verifying a role after apply

Read the stored role back and confirm the scopes are the ones you authored:

```
sam api /api/v1/platform/rbac/roles
```

A clean `sam config plan` on the next run is the other signal: it means the platform's copy matches the repo. Read `references/rbacRole.md` for the role file's own shape.
