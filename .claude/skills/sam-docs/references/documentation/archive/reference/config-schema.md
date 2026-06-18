---
title: Config Schema
description: The two YAML config surfaces in Agent Mesh (runtime config and declarative config), with a kinds table, top-level keys, and pointers to the per-component reference.
sidebar_position: 2
---

# Config Schema

Agent Mesh has two distinct YAML configuration surfaces. They share a syntax (Go-templated YAML with `${VAR, default}` expansion and `!include` directives) but serve different audiences, are read by different processes, and have independent schemas.

This page is the navigator. It tells you which surface you are looking at, what the top-level shape is, and where to find the field-by-field reference.

## The Two Surfaces

| Surface | Read by | How to query the schema |
|---|---|---|
| Runtime config | `sam run`, AWE, Gateway, STR worker | Scaffold a starter with `sam config init`; the keys are documented per component below |
| Declarative config | `sam config apply` | `sam config schema list` and `sam config schema show <kind>` |

Runtime config is what a Solace Agent Mesh-Go binary reads at startup to know what to be: which broker to connect to, which LLM model to call, which agents to host, and which gateway to expose. Declarative config is what an operator sends to the Platform service to manage agents, gateways, toolsets, and RBAC over time, the way a Kubernetes manifest manages workloads.

You write one or the other depending on how Agent Mesh is deployed:

- Local or embedded development uses runtime config only. `sam run` reads a `configs/agent.yaml` file in the working directory and starts the agent.
- A Platform-service deployment uses both. Operators apply declarative resources, and the Platform service generates the runtime config and starts agents from it.

## Runtime Config

Runtime YAML is the set of files passed to `sam run` (or to the individual `sam-awe`, `sam-gateway`, and `sam-str` binaries). One file per process is typical. Each file declares a list of `apps`. Every app is one runtime component.

To get a working starting point, run `sam config init` — it scaffolds a project with a `configs/` directory containing canonical agent, gateway, and Platform service shapes you can edit.

### Top-Level Keys

| Key | Type | Purpose |
|---|---|---|
| `log` | object | Process-wide logging configuration. Common keys: `stdout_log_level`, `format`, `log_file`, `max_size_mb`. |
| `tool_defaults` | object | Process-level fallback `tool_config` blocks merged into every `apps[].app_config.tools` entry. Per-tool config wins on key conflict. |
| `shared_config` | object | YAML anchor source — fields here are referenced from inside `apps[]` via `<<: *anchor`. Has no runtime meaning of its own. |
| `apps` | list | One entry per component. Required. Every component in a runtime config is an app. |

### App Structure

Each entry in `apps` has the same outer shape regardless of component type:

```yaml
# configs/agent.yaml
# ...
apps:
  - name: test_agent
    app_exec: sam-awe
    broker:
      broker_url: ${SOLACE_BROKER_URL}
      broker_username: ${SOLACE_BROKER_USERNAME, default}
      broker_password: ${SOLACE_BROKER_PASSWORD, default}
      broker_vpn: ${SOLACE_BROKER_VPN, default}
    app_config:
      agent_name: TestAgent
      namespace: ${NAMESPACE, solace-agent-mesh}
      # component-specific fields follow
# ...
```

`app_exec` selects the binary that consumes the entry (omit it in embedded mode, which classifies components by their `app_config` shape). The `broker` block is present when the app connects to an external broker; embedded-mode samples typically omit it because the in-memory broker is supplied by the orchestrator. `app_config` is component-specific. Its fields differ for an agent, gateway, STR worker, or Platform service. The per-component reference lives with the component:

| Component | Reference |
|---|---|
| Agent `app_config` | Building → Agents |
| Gateway `app_config` | Building → Gateways |
| STR worker `app_config` | Concepts → Runtime services |
| Platform service `app_config` | Concepts → Platform service |

This page does not restate those tables, because the source of truth for each is the per-component code path. A single page that tried to document every runtime field would drift faster than the code changes.

## Declarative Config

Declarative config is the set of YAML files passed to `sam config apply`. Each file declares one resource (or a manifest bundle that lists which resources to apply, in order). The CLI plans the diff against the Platform service and reconciles.

### Layout

A declarative config tree is laid out by kind. `sam config schema layout` prints the canonical kind directories the resolver expects; the tree below also shows the evaluation kinds (`datasets/`, `evaluators/`, `experiments/`) and the RBAC directories the resolver registers but that the printed layout doc may not yet include:

```text
my-config/
├── manifests/
│   ├── dev.yaml
│   └── prod.yaml                 # one file per environment, or manifest.yaml at the root
├── models/
│   └── <model-name>.yaml
├── agents/
│   └── <agent-name>.yaml
├── gateways/
│   └── <gateway-name>.yaml
├── workflows/
│   └── <workflow-name>.yaml
├── toolsets/
│   ├── <toolset-name>.yaml       # metadata header
│   └── <toolset-name>/           # toolset sources or pre-built bundle
├── connectors/
│   └── <connector-name>.yaml
├── datasets/
│   └── <dataset-name>.yaml
├── evaluators/
│   └── <evaluator-name>.yaml
├── experiments/
│   └── <experiment-name>.yaml
├── skills/
│   └── <skill-name>/             # skills are directories with SKILL.md + assets
└── rbac/
    ├── roles/
    ├── assignments/
    └── claim-mappings/
```

The manifest is the bundle entry point. Convention places it under `manifests/<env>.yaml` so `--manifest manifests/prod.yaml` discovers the repo root one level up; the manifest can also live at the root as `manifest.yaml`. The manifest names the target, declares variables, and lists which resources to apply.

### Kinds

The 10 kinds below have a queryable schema via `sam config schema show <kind>`:

| Kind | Plural path | Description |
|---|---|---|
| `manifest` | (top-level document) | Bundle wrapper. Names the target, declares variables, lists resources to apply. |
| `model` | `models/` | LLM model registration: provider, model name, API base, credentials. |
| `agent` | `agents/` | A configured agent. References models, toolsets, connectors, skills. |
| `gateway` | `gateways/` | A gateway instance. Type-discriminated (`slack`, `email`, `event_mesh`, `teams`). |
| `workflow` | `workflows/` | A declarative DAG of agent steps. Node-type-discriminated. |
| `toolset` | `toolsets/` | A named grouping of tools an agent can reference. |
| `connector` | `connectors/` | A named external connection. Type-discriminated (`sql`, `http`, `mcp`, etc.) with subtypes (e.g. `sql/postgres`). |
| `dataset` | `datasets/` | An evaluation dataset (prompts plus expected outputs). |
| `evaluator` | `evaluators/` | An LLM-judge or rule-based evaluator that scores agent responses. |
| `experiment` | `experiments/` | An evaluation run that binds a dataset, an evaluator, and a target agent. |

Three additional kinds apply alongside the above but are not in `sam config schema list`:

| Kind | Plural path | Where to read |
|---|---|---|
| `rbacRole` | `rbac/roles/` | See Administering → RBAC reference. |
| `rbacAssignment` | `rbac/assignments/` | See Administering → RBAC reference. |
| `rbacClaimMapping` | `rbac/claim-mappings/` | See Administering → RBAC reference. |

Skills are a fourteenth applied surface, but they ship as packaged bundles (`SKILL.md` plus assets) rather than a single declarative YAML, so they have their own authoring path. See Building → Skills.

### Querying the Live Schema

The CLI prints the schema for the running version, so the output is always live truth for the binary you are using.

```console
$ sam config schema list
| Kind | Plural | Description |
|---|---|---|
| `manifest` | `(top-level document)` | Top-level document that lists ... |
| `model` | `models` | CreateModelConfigRequest is the request body for POST /models. |
| `agent` | `agents` | CreateAgentRequest is the request body for POST /agents. |
...
```

To see every field on a kind, plus its constraints and a cross-reference list of which other kinds it points at:

```console
$ sam config schema show agent
```

To generate a starter file you can edit:

```console
$ sam config schema example agent > agents/new-agent.yaml
```

To see the manifest schema specifically (it lives outside the generated DTOs, so it has its own subcommand):

```console
$ sam config schema manifest
```

To see the on-disk layout the resolver expects:

```console
$ sam config schema layout
```

### Type-Discriminated Kinds

Three kinds have an authoring shape that branches on a `type` field. Pass `--type` (and `--subtype` for connectors) to drill into the specific schema:

```bash
sam config schema show gateway --type slack
sam config schema show connector --type sql --subtype postgres
sam config schema show workflow --type map
```

The wrapper schema shown without `--type` documents the fields common to every shape and lists the available types.

### Manifest Structure

A manifest declares the target Platform service, manifest-scoped variables, and the resources to apply.

```yaml
# my-config/manifest.yaml
kind: manifest
name: production-agents
description: Customer-facing agents for the production tenant.

target:
  name: prod
  url: https://platform.example.com
  auth:
    type: bearer_token
    envVar: SAM_PLATFORM_TOKEN

defaults:
  namespace: solace-agent-mesh

variables:
  region: us-east-1

resources:
  models:
    - claude-sonnet
  agents:
    - support-agent
    - billing-agent
  gateways:
    - slack-gateway
```

| Field | Type | Required | Description |
|---|---|---|---|
| `kind` | string | yes | Always `"manifest"`. |
| `name` | string | yes | Human-readable manifest name used in plan and apply output. |
| `description` | string | no | Free-form description of what this manifest deploys. |
| `target` | object | yes | Platform endpoint and authentication. See below. |
| `defaults` | object | no | Cross-cutting defaults applied to every resource. Currently supports `namespace`. |
| `variables` | map | no | Manifest-scoped variables substituted into per-resource YAML via `${VAR}` expansion. Environment variables override these at apply time. |
| `sources` | map | no | Pip-style source URLs keyed by source name. Resource entries can reference imports from a source via `name@source`. |
| `resources` | map | yes | Per-kind list of resources to apply, keyed by plural kind name. Each entry is either a bare local name, a `name@source` import, or `{from: name@source, as: aliased}`. |

The `target.auth.type` is either `bearer_token` (reads a static token from the env var named by `target.auth.envVar`, defaulting to `SAM_PLATFORM_TOKEN` when omitted) or `oauth` (uses the cached OAuth credential populated by `sam auth login`). The `SAM_PLATFORM_TOKEN` environment variable, when set, overrides the manifest's declared auth at apply time regardless of `target.auth.type`. Useful for CI flows that ship a service token without manifest churn.

### Common Fields on Every Resource

Every non-manifest kind shares the same outer wrapper. Kind-specific fields go inside `spec:`:

```yaml
# agents/support-agent.yaml
kind: agent
name: support-agent
description: Front-line customer-support agent.
spec:
  type: standard
  # kind-specific fields follow
```

| Field | Required | Description |
|---|---|---|
| `kind` | yes | The kind name. Must match the directory name singular: `agent` for files under `agents/`. |
| `name` | yes | Unique resource name within the manifest. Becomes the platform-side identity. |
| `description` | no | Free-form description shown in the platform UI. |
| `spec` | yes | Kind-specific fields. For type-discriminated kinds (`gateway`, `connector`, `workflow`), `spec.type` (and `spec.subtype` for connectors) selects the schema. |

`sam config schema show <kind>` lists every `spec.*` field for the kind.

## Shared Mechanics

Both surfaces share two YAML extensions implemented by the runtime config loader:

### Environment-Variable Expansion

Four expansion forms are supported. The set-but-empty case is the one to watch — `${VAR, default}` treats an exported empty string as a real value and does not fall back. Use `${VAR:-default}` when an empty value should fall back too.

| Form | Behavior |
|---|---|
| `${VAR}` | Value if set (even when empty); empty string otherwise. |
| `${VAR, default}` | Value if set (even when empty); the expanded `default` if `VAR` is unset. |
| `${VAR:-default}` | Value if set and non-empty; the expanded `default` otherwise (unset or empty). |
| `${VAR:+alt}` | The expanded `alt` if set and non-empty; empty string otherwise. |

```yaml
broker:
  broker_url: ${SOLACE_BROKER_URL}                      # unset → ""
  broker_username: ${SOLACE_BROKER_USERNAME, default}   # unset → "default"; empty stays ""
  broker_password: ${SOLACE_BROKER_PASSWORD:-changeme}  # unset OR empty → "changeme"
```

Defaults are themselves expanded, so nested references like `${OUTER, ${INNER, fallback}}` resolve. Expansion happens on raw text before YAML parsing, so string values like `"true"`/`"false"` become YAML booleans during the subsequent parse. A bare `${VAR}` with no default expands to an empty string, not a startup error — pair sensitive values with `sam doctor` (enterprise) or rendered-config inspection before launch.

### `!include` Directive

`!include path/to/other.yaml` inlines the contents of another file. Paths are resolved relative to the file that contains the directive. Use this to break a large config into focused files:

```yaml
# configs/agent.yaml
# ...
apps:
  - name: my_agent
    app_config: !include agent_app_config.yaml
# ...
```

Includes are processed before environment-variable expansion, so the included file can reference `${VAR}` and the expansion still applies.

For a step-by-step walkthrough of configuring a fresh install, see Installing and Configuring → Configure.

## What Next?

If you are picking which agent or gateway to author, the kinds table above is the index. Run `sam config schema show <kind>` for any kind to see its field reference, or jump straight to Building → Agents for the most common starting point.
