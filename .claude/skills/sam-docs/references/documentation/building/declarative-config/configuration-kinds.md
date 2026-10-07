---
published: true
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

These describe role-based access control. For authoring them, see [Managing Users and Roles with the CLI](../user-management/cli.md). For the model, the scope reference, and how to diagnose a denial, see [RBAC Reference](../../reference/rbac-reference.md).

| Kind | Directory | Diff key | Authoring |
|---|---|---|---|
| `rbacRole` | `rbac/roles/` | `name` | `sam config schema show rbacRole`. A named set of permission scopes, with inheritance. Grant the role to identities inline with `spec.users`. |
| `rbacGrant` | `rbac/grants/` | the subject and the role together | `sam config schema show rbacGrant`. Grants the role named in `spec.roleName` to the identities in `spec.users`. Use it when the role has no configuration file of its own to carry `spec.users`: a role Agent Mesh ships, or one created outside the declarative-config repo. |
| `rbacClaimMapping` | `rbac/claim-mappings/` | `oidcProvider` and `claimValue` together | `sam config schema show rbacClaimMapping`. Grants the roles in `spec.roleNames` to every identity whose sign-in claim carries a matching value. The claim key itself is a deployment-wide setting, not part of the mapping. See [IdP Claim Mapping](../../reference/rbac-reference.md#idp-claim-mapping). |
| `systemUser` | `rbac/system-users/` | `name` | `sam config schema show systemUser`. A principal owned by Agent Mesh that a machine entrypoint runs as through `run_as` (`spec.roleNames` sets its scopes). See [Machine Entrypoints and System Users](../../administering/enabling-rbac.md#machine-entrypoints-and-system-users). |

Grants are declared on the role itself through `spec.users`, a list of identities. Each entry becomes one platform grant at apply time; use `rbacGrant` only when the role has no configuration file of its own. A claim mapping is identified by its provider and claim value, not by its name, so editing `spec.roleNames` updates the mapping in place rather than replacing it. Roles that an operator loads from files at platform startup are managed outside declarative config and are not diffed here.

For a system user, the configuration file holds the whole role set rather than an addition to it:

- Adding a role to `spec.roleNames` grants it, and removing one revokes it. Both take effect on an ordinary apply. A role granted outside declarative config is revoked on the next apply, because the file replaces the role set instead of adding to it. `sam config plan` names the roles an apply revokes.
- Removing the resource deletes the system user. That deletion is gated behind `--prune`, like every other kind. Keep the `systemUsers` key in the manifest even when the list is empty, because a kind you do not list is never diffed.
- You cannot rename a system user in place. The subject `system:<name>` is the principal's identity, so a new name is a new principal: the plan shows a create for the new one and a `--prune`-gated delete for the old.

`sam config pull` exports system users, so an existing deployment round-trips into a configuration repository.

## Manifest-Level Settings

Some platform settings are not a standalone resource and live in the manifest instead of a resource file:

| Setting | Where | Authoring |
|---|---|---|
| `profileProvider` | the manifest's `platform` block | [The Manifest](./the-manifest.md). Wires a toolset into the post-sign-in user-enrichment step. |
| `defaultRoles` | the manifest's `platform` block | [The Manifest](./the-manifest.md). Names the roles that apply when no grant or claim mapping matches the user. Omitting the block leaves the current default roles unmanaged; setting `roles` to an empty list clears the override. |
| `webuiSettings` | the manifest's `platform` block | [The Manifest](./the-manifest.md). Layers instance-wide Agent Mesh UI branding, assistant defaults, and feedback handling over the Helm or environment-variable values. Setting a field applies the value; setting it to `null` clears the override; omitting a field, or removing the block, changes nothing until you run `apply --prune`. |

Run `sam config schema manifest` for the full manifest reference, including every `platform` setting the running version supports.

## Related Topics

- [The Configuration Repo](./the-config-repo.md) covers the file shape every kind shares and how to discover its fields.
- [Planning and Applying Changes](./planning-and-applying.md) covers which kinds deploy and how deletes work.
- [Managing Configuration as Code (Early Access)](./index.md) is the section overview.
