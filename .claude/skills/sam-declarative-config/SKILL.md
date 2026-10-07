---
name: sam-declarative-config
description: Author Agent Mesh declarative-config repos (manifests, per-kind YAML, skills) and drive sam config plan/apply/pull/migrate. Generated from the CLI's own schemas at the bundled CLI version; re-run `sam ai-assistance skill install --force` after a CLI upgrade.
metadata:
  version: main-v2.381.3
---

# Agent Mesh Declarative Config

## Overview

An Agent Mesh declarative-config repository captures the desired state of an Agent Mesh
platform as plain YAML. One **manifest** document lists which resources
to apply; per-kind YAML files (one per resource) live under
well-known top-level directories; non-config artefacts (skills, tool
binaries) live in their own directories.

`sam config plan` shows the diff between the manifest and the running
platform; `sam config apply` reconciles the platform to match. The same
files round-trip through `sam config pull`, which serialises a running
platform back into a fresh repo.

**Apply targets (`--url`, or the manifest's `target.url`).** The same
plan/apply/pull commands work against any running platform:
- A deployed platform — `--url https://platform.example.com`.
- The **desktop app** — it runs a full platform whose admin API is fronted by
  the entrypoint proxy (`http://127.0.0.1:8800` by default; if that port is taken
  it falls back to a free one, so use the instance's actual loopback origin).
  The reserved **`--target desktop`** resolves to a running desktop app's live
  origin for you (also as `target.name: desktop` in a manifest), no
  `sam auth login` needed. This is the desktop→cluster promotion path: `pull`
  from the desktop instance, `apply` to the cluster — or `apply` straight back
  to iterate.

Auth is only required when the target has OIDC/RBAC enabled (`sam auth login`
first); a default desktop instance is unauthenticated.

**Starting from scratch?** If the platform already has configuration —
agents, toolsets, models created through the UI —
don't hand-author YAML from a blank repo. Run `sam config pull` first to
capture the current state into a complete, ready-to-apply repo, then edit
from there. It's the canonical starting point for adopting declarative
config on an existing platform: you get every resource, correctly shaped,
instead of reverse-engineering the schema by hand.

The schema for every kind is auto-generated from the runtime DTOs.
`sam config schema show <kind>` prints the live truth; this skill's
schema sections are a snapshot from the CLI version that wrote it
(see `metadata.version` in the frontmatter — after a CLI upgrade, re-run
your `sam ai-assistance skill install` command with `--force` to refresh).


## How to use this skill

This skill is split into an orientation file (this SKILL.md) plus a `references/` directory of per-topic detail. SKILL.md is the table of contents — pull in the relevant `references/<topic>.md` when the work calls for it:

- **Authoring a manifest** — read `references/manifest.md`.
- **Authoring a resource YAML** — read `references/<kind>.md` for the kind you're touching.
- **Authoring an entrypoint** — `references/entrypoint.md`. Find the section matching the entrypoint type (`## type: slack`, `## type: webhook`, …); its field table + example are the canonical authoring source.
- **Authoring a connector** — `references/connector.md`. Each `## type: <type>` carries one or more `### subtype: <subtype>` sections.
- **Authoring a workflow** — `references/workflow.md`. Top-level workflow shape first, then per-node-type sections (`## node type: agent`, `## node type: switch`, …).
- **Authoring an evaluation corpus** — `references/dataset.md` for examples, `references/evaluator.md` for scorers, `references/experiment.md` to bind a dataset + evaluators to an agent. Trigger experiments from the CLI via `sam eval run <experiment-name>`.
- **Authoring a skill** — `references/skill.md` (bundle layout, frontmatter); `references/skill-asset-templates.md` (`.samt` report templates).
- **Working with toolsets** — `references/toolset.md` is the entry point. It covers the on-disk layout (`toolsets/<name>.yaml` + `toolsets/<name>/{src,<name>.zip}`), the two lifecycle workflows (**author** with sources under `src/`, **mirror** with the pre-built zip from `sam config pull`), the full CLI surface, the toolset-level `spec.config` (secrets + shared defaults), the per-agent `toolsetConfigs[*].configValues` overlay (per-agent overrides, nested by tool name for every toolset kind; only the toolset-level `spec.config` may be written flat), and workflow `toolsets:` binding. Drill into `references/tool-build.md` for the build pipeline — resolution order, the `build.sh`/`build.bat` contract, the `.sam-cache/build/` cache, and `--no-build` semantics.
- **CLI authentication** — `references/cli-auth.md`. Covers `sam auth login/logout/status/list`, the `auth: { type: oauth }` target shape, and the `$XDG_CONFIG_HOME/sam/auth/<target>.json` cache layout. Also documents `sam api` — the generic authenticated HTTP client for poking at the entrypoint when authoring or debugging configs (read live resources, walk `PaginatedResponse` lists, reproduce the Agent Mesh UI's calls).
- **Inspecting platform state after apply** — `references/inspecting-state.md`. The status-field glossary (`deploymentStatus` / `syncStatus` / `discoveryStatus` / `runtimeStatus`), how to resolve a name → id with `sam api --jq` (paths take UUIDs, not names), and the `/api/v1/platform/agents` vs `/api/v1/agentCards` distinction.
- **Authoring RBAC** — `references/rbacRole.md` for roles and their inline `spec.users` grants, `references/rbacClaimMapping.md` to drive access from an OIDC claim, `references/rbacGrant.md` to grant a managed/in-DB role, `references/systemUser.md` for non-human principals. The default-role set lives in the manifest's `platform` block (`references/manifest.md`). Read `references/rbac-scopes.md` before writing any scope string — it carries the grammar, the assignable-scope catalog, and how to verify a role landed.
- **Repo layout / common patterns / common mistakes** — `references/layout.md`, `references/common-patterns.md`, `references/common-mistakes.md`.

## Design guidance

Before authoring a config, read the relevant design reference. These cover *what to build and why*, and several also carry authoring mechanics and worked YAML — so read the relevant one even when the thing to build is already decided. Pair them with the resource-kind references above.

- **Component selection** (workflow vs agent vs skill, when to split, peer delegation) — `references/design/best-practices.md`.
- **Core concepts** (terminology, agent card model, peer-delegation mechanics) — `references/design/concepts.md`.
- **Agent design** (instruction writing, tool selection, structured output, HIL, agent card, model selection) — `references/design/agent-design.md`.
- **Workflow design** (when to use workflows, design patterns, worked YAML for every node type, reshaping data between chained tool nodes, structured I/O, retry/timeout mechanics, anti-patterns) — `references/design/workflow-design.md`. **Read this before hand-authoring a workflow**, not only when deciding whether to use one.
- **Skill design** (when to package a skill, instruction shape, references layout) — `references/design/skill-design.md`.
- **Efficiency** (cutting LLM token usage + latency: keep data out of context, instantiate templates, load skills on demand, structured output, parallelism, compaction, model/runtime settings) — `references/design/efficiency.md`.

## Resource kinds index

| Kind | Plural directory | Reference |
|---|---|---|
| `manifest` | `manifests/` | `references/manifest.md` |
| `model` | `models/` | `references/model.md` |
| `agent` | `agents/` | `references/agent.md` |
| `entrypoint` | `entrypoints/` | `references/entrypoint.md` |
| `workflow` | `workflows/` | `references/workflow.md` |
| `toolset` | `toolsets/` | `references/toolset.md` |
| `connector` | `connectors/` | `references/connector.md` |
| `skill` | `skills/` | `references/skill.md` |
| `dataset` | `datasets/` | `references/dataset.md` |
| `evaluator` | `evaluators/` | `references/evaluator.md` |
| `experiment` | `experiments/` | `references/experiment.md` |
| `rbacRole` | `rbac/roles/` | `references/rbacRole.md` |
| `rbacClaimMapping` | `rbac/claim-mappings/` | `references/rbacClaimMapping.md` |
| `rbacGrant` | `rbac/grants/` | `references/rbacGrant.md` |
| `systemUser` | `rbac/system-users/` | `references/systemUser.md` |

## Pre-flight rules

- Every per-resource YAML file declares its own `kind:` (e.g. `kind: agent`). The manifest is `kind: manifest` and lives separately.
- Spec-level field names are **camelCase** (matches the platform REST API). Nested per-type bodies (connector values, workflow nodes, per-type entrypoint values) follow the casing their kind's reference shows — see `references/common-mistakes.md`.
- Use `${VAR}` placeholders for credentials, never literal tokens. See `references/common-patterns.md` for the full substitution rules.
- See `references/common-mistakes.md` before opening a PR.
