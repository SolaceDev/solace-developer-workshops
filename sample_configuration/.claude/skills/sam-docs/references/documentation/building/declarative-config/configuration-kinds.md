---
title: Configuration Kinds
description: The catalog of every resource kind you can manage as declarative config, its directory and diff key, and a link to each kind's authoring page.
sidebar_position: 7
---

# Configuration Kinds

:::warning
This feature is in the Early Access stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

This is the catalog of every kind you can declare in a declarative-config repo. It tells you which directory each kind lives in, what `sam config` diffs it on, whether it has a deployment phase, and where to read the fields it accepts. For the file shape all kinds share, see [The Configuration Repo](./the-config-repo.md).

Every kind's fields are available offline from the CLI:

```bash
sam config schema list          # every kind
sam config schema show <kind>   # one kind's fields
sam config schema example <kind>  # a templated starter file
```

The following tables group the kinds and point at the authoring page for each. Kinds that have a full authoring guide link to it; the rest are authored directly from `sam config schema show <kind>` and link to their concept or reference page.

## Core Resource Kinds

These are the building blocks of a running deployment.

| Kind | Directory | Diff key | Deploys | Authoring guide |
|---|---|---|---|---|
| `model` | `models/` | `name` (the alias) | no | [Configuring Models with the CLI](../models/cli.md) |
| `agent` | `agents/` | `name` | yes | [Creating Agents with the CLI](../agents/cli.md) |
| `entrypoint` | `entrypoints/` | `name` | yes | [Configuring Entrypoints](../entrypoints/index.md) |
| `connector` | `connectors/` | `name` | no | [Configuring Connectors](../connectors/index.md) |
| `toolset` | `toolsets/` | `name` | no | [Creating Toolsets](../toolsets.md) |
| `skill` | `skills/` | directory name | no | [Creating Skills](../skills.md) |
| `workflow` | `workflows/` | `name` | yes | [Creating Workflows (Early Access)](../workflows/index.md) |

Notes:

- **`entrypoint` and `connector` are typed.** Each `type` (and, for connectors, `subtype`) has its own `spec.values` fields. Use `sam config schema show entrypoint --type <type>` or `sam config schema show connector --type <type> --subtype <subtype>` to see them, along with the [Configuring Entrypoints](../entrypoints/index.md) and [Configuring Connectors](../connectors/index.md) pages.
- **External A2A agents are not a declarative kind.** An external agent is an Agent-to-Agent proxy connection with no `kind` and no YAML file; `sam config` does not create, export, or reconcile one. Manage them from the Agent Mesh UI, or through the `/api/v1/platform/remoteAgents` endpoints. See [Connecting External Agents with the CLI](../external-agents/cli.md).
- **`workflow`, `agent`, and `entrypoint` deploy.** After the configuration sync, `apply` brings these online in its deployment phase. The others are available as soon as they are synced. See [Planning and Applying Changes](./planning-and-applying.md).

## Evaluation Kinds

These describe evaluation runs that score agent behavior. For the concepts and the results view, see [Evaluating Agent Performance](../../evaluating-agent-performance/index.md).

| Kind | Directory | Diff key | Authoring |
|---|---|---|---|
| `dataset` | `datasets/` | `name` | `sam config schema show dataset`. Rows live in a CSV sidecar referenced from the spec. |
| `evaluator` | `evaluators/` | `name` | `sam config schema show evaluator`. |
| `experiment` | `experiments/` | `name` | `sam config schema show experiment`. References a dataset, evaluators, and a target agent by name. |

Apply an experiment declaratively, then trigger it with `sam eval run <experiment-name>`.

## Access-Control Kinds

These describe role-based access control. For the model, the scope reference, and how to diagnose a denial, see [RBAC Reference](../../reference/rbac-reference.md).

| Kind | Directory | Diff key | Authoring |
|---|---|---|---|
| `rbacRole` | `rbac/roles/` | `name` | `sam config schema show rbacRole`. A named set of permission scopes, with inheritance. Grant the role to identities inline with `spec.users`. |
| `rbacClaimMapping` | `rbac/claim-mappings/` | provider, claim, value, and role together | `sam config schema show rbacClaimMapping`. Maps a sign-in claim value to a role. |

Grants are declared on the role itself through `spec.users` — a list of identities. There is no separate assignment kind. Each entry becomes one platform grant at apply time. Claim mappings reconcile by create and delete rather than update, because their identity is the whole tuple. Roles that an operator loads from files at platform startup are managed outside declarative config and are not diffed here.

## Manifest-Level Settings

Some platform settings are not a standalone resource and live in the manifest instead of a resource file:

| Setting | Where | Authoring |
|---|---|---|
| `profileProvider` | the manifest's `platform` block | [The Manifest](./the-manifest.md). Wires a toolset into the post-sign-in user-enrichment step. |

Run `sam config schema manifest` for the full manifest reference, including every `platform` setting the running version supports.

## Related Topics

- [The Configuration Repo](./the-config-repo.md) covers the file shape every kind shares and how to discover its fields.
- [Planning and Applying Changes](./planning-and-applying.md) covers which kinds deploy and how deletes work.
- [Managing Configuration as Code (Early Access)](./index.md) is the section overview.
