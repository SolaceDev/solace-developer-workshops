---
published: true
title: RBAC Reference
description: How Agent Mesh authorizes users. The Role-Based Access Control (RBAC) model, the scope reference, the two authoring surfaces (YAML and `sam config apply`), per-entrypoint specifics, and how to diagnose a denial.
sidebar_position: 1060
---

# RBAC Reference

Role-Based Access Control in Solace Agent Mesh is **allowlist only**. A user is granted scopes through roles; if a required scope is not in the user's granted set, the request is denied.

This page is the reference for the scope grammar, the platform-shipped scope catalog, and the authoring surfaces. To take a permissive deployment to least-privilege step by step, see [Enabling Role-Based Access Control (RBAC)](../administering/enabling-rbac.md).

## Scope Format

Every scope is three colon-delimited segments:

```
<category>:<resource>:<verb>
```

| Segment | Meaning |
|---|---|
| `<category>` | Singular family name — for example, `rbac`, `agent`, `agent_builder`, `workflow`, `workflow_builder`, `connector`, `entrypoint`, `tool`, `evaluation`, `analytics`. |
| `<resource>` | A specific instance id, `*`, or `_`. The following table describes each form. |
| `<verb>` | The action. Standard set: `read`, `create`, `update`, `delete`, `deploy`, `invoke`, `subscribe`, `share`, `test`, `assign`. Tool-execution verbs (for example, `request`, `transcribe`) are an exception. |

The resource segment (segment 2) accepts three values:

| Form | Meaning | Example |
|---|---|---|
| `<id>` | This specific instance (YAML-defined resources use the authored name as their id) | `agent:hr-bot:invoke` |
| `*` | Any instance or the whole collection | `agent_builder:*:create` |
| `_` | The whole collection, where there is no instance to name | `agent_builder:_:create` |

In a granted scope, `_` and `*` are interchangeable in the resource segment: `agent_builder:_:create` and `agent_builder:*:create` confer the same permission. Solace recommends using `*` in the scopes you author.

`*:*:*` is the superadmin grant. Inside segments 1-3, `*` works like a shell glob within that segment. The matcher also accepts the bare `*` (single token) as a shorthand for `*:*:*`.

## Common Scopes

The tables that follow list a non-exhaustive selection. Per-instance scopes (for example, `agent:<id>:invoke`) are derived from the resource being addressed; the runtime maps each component to the exact invoke scope a caller must hold (see the three-row rule that follows).

### Flat Platform Features

| Scope | Gates |
|---|---|
| `rbac:_:read` | Read roles, assignments, and claim mappings |
| `evaluation:_:read` / `:_:delete` | Read or delete evaluation datasets, evaluators, experiments, and runs |
| `evaluation:_:create` / `:_:update` | Create or update them, including the system user an experiment's runs execute as. Privilege-conferring — see [System Users](#system-users) |
| `evaluation:_:invoke` | Trigger evaluation runs, and connect or disconnect the tool credentials an experiment's system user holds |
| `analytics:_:read` | Admin observability dashboard |
| `analytics:_:read_content` | Same plus per-user prompt/feedback content |
| `activity:*:read` | Cross-user activity reports, failure lists, and task traces |
| `tool:_:read` | Read the tool catalog |
| `deployment:_:read` | View deployment audit log |
| `builder:_:use` | Cross-builder UI capability gate |
| `profile_provider:*:read` / `:_:update` | View or configure the identity profile-provider toolset. Either scope permits viewing; only `:_:update` permits changing it |
| `webui_settings:*:read` / `:*:update` | View or set the instance-wide Agent Mesh UI branding and assistant defaults (welcome message, logos, disclaimer text, system purpose, and response format) |
| `notify:_:send` | Send a notification to your own inbox (default user grant) |
| `notify:_:send_others` / `:_:read_others` | Post to, or read, another user's inbox (elevated admin/support) |

The `activity:*:read` scope intentionally uses `*` rather than the `_` used by the preceding scopes: `*` means "any instance," and activity reporting is the one flat-platform-feature category with a real per-instance dimension — a user id — unlike its neighbors, which have none. For more information about what this scope grants, see [Chatting with the Activity Monitor (Experimental)](../using-agent-mesh/activity-monitor.md).

**RBAC management is restricted to super administrators.** Creating, updating, or deleting roles — and changing user role grants or claim mappings — requires the superadmin grant (`*:*:*`, or the bare `*`). No narrower scope confers it, so there is no delegated RBAC-administrator role: `rbac:_:read` grants read access and nothing more. Establish the first super administrator through a YAML role file, which loads from disk and is unaffected by this restriction (see **Authoring Surfaces**).

### Resource Families with Collection and Category-Wide Scopes

These management families support a collection-level `create` scope plus category-wide (`*`) scopes for the remaining verbs. Enforcement is at the all-instances level: a grant applies to every instance in the family. Per-instance (`<id>`) scoping for these families is not enforced — the only family with true per-instance access is agent invocation, described under **Runtime Agent-to-Agent (A2A) Access** in the following section.

| Collection-level (create) | Category-wide (read/update/delete, and so on) |
|---|---|
| `agent_builder:_:create` | `agent_builder:*:read` / `:update` / `:delete` / `:deploy` / `:test` |
| `workflow_builder:_:create` | `workflow_builder:*:read` / `:update` / `:delete` / `:deploy` |
| `connector:_:create` | `connector:*:read` / `:update` / `:delete` |
| `entrypoint:_:create` | `entrypoint:*:read` / `:update` / `:delete` / `:deploy` |
| `model_config:_:create` | `model_config:*:read` / `:update` / `:delete` |
| `skill:_:create` | `skill:*:read` / `:update` / `:delete` |
| `toolset:_:create` | `toolset:*:read` / `:update` / `:delete` |

A single wildcard grant covers a whole family: `connector:*:*` authorizes both `connector:_:create` and every category-wide operation.

Projects and prompts are governed by resource ownership plus per-resource ACL sharing, not per-instance RBAC scopes. The catalog retains `project:_:share` and `prompt:_:share` capability scopes, but they are **inert — no longer enforced**. Sharing a project or prompt you own requires no scope: the handlers enforce ownership, so only the resource owner can manage its shares.

### Runtime Agent-to-Agent (A2A) Access

| Scope | Gates |
|---|---|
| `agent:<id>:invoke` | Invoke a specific agent over A2A — both direct user submission and peer routing |
| `agent:*:invoke` | Invoke any agent (delegating role) |
| `workflow:<id>:invoke` | Invoke a specific deployed workflow over A2A |
| `workflow:*:invoke` | Invoke any deployed workflow |
| `tool:email:send` | Send email through the `send_email` tool (server-side SMTP credentials) |
| `tool:datadog_logs:invoke` | Query Datadog logs through the `datadog_logs` tool (admin observability) |

Built-in tools otherwise require no scopes: holding `agent:<id>:invoke` for an agent implies access to every tool configured on it, including `schedule_task` (the scheduled invocation re-authorizes against the creator's invoke scopes when it fires). The two preceding scopes (plus `notify:_:send`) are the deliberate exceptions. They are capabilities with externalized side effects that stay individually grantable. Custom tools (Secure Tool Runtime packages, Model Context Protocol (MCP), OpenAPI, connectors) can still declare their own `required_scopes`, which are enforced as before. For more information about gating a tool that comes from an uploaded toolset, see [Restricting Who Can Run a Tool](../building/toolsets.md#restricting-who-can-run-a-tool).

**Which invoke scope a component requires (the three-row rule):**

| Component | Required scope | `<id>` is |
|---|---|---|
| Deployed workflow | `workflow:<id>:invoke` | the workflow's dashed UUID |
| Platform-deployed agent | `agent:<id>:invoke` | the agent's dashed UUID |
| YAML-authored / built-in agent | `agent:<name>:invoke` | the authored name |

Segment 2 is always the dashed UUID (`019e47f4-2be0-75d8-828e-77a0d1d9221f`), never the underscored broker name the component is addressed by on the wire (`workflow_019e47f4_2be0_...`). `agent:*:invoke` covers the `agent` category only — it does **not** cover deployed workflows. A role that must run workflows needs `workflow:*:invoke` (or a per-workflow `workflow:<id>:invoke`).

**Authoring pattern for roles that run workflows:** grant `workflow:*:invoke` (or the per-UUID scope). This is the single boundary grant a role needs to run a workflow: the workflow's invoke scope is checked once at the receiver, and its directed acyclic graph (DAG) then delegates to child agents and nested workflows transitively without a per-hop scope check against the caller. You no longer need to add `agent:*:invoke` for the child hops (it is harmless to keep for roles that also invoke agents directly).

## System Users

A **system user** is a principal that Agent Mesh owns, which unattended work runs as so that it carries real scopes instead of failing closed. A machine entrypoint (webhook, the event mesh, unauthenticated MCP, and shared-channel Slack or Teams) names one through its `run_as` setting; an evaluation experiment names one through `runAs`. A system user never completes an OAuth login of its own, but an operator can authorize a delegated tool credential on its behalf, and that credential is then available to everything running as the principal.

Pointing work at a system user confers that principal's reach with no second authorization check, so a role that sets or invokes an experiment's principal reaches further than the scopes its own holder was granted. For how an experiment names its principal, see [The System User an Experiment Runs As](../evaluating-agent-performance/experiments.md#the-system-user-an-experiment-runs-as).

| Principal | Subject | Holds |
|---|---|---|
| Default system user | `system:default` | `agent:*:invoke` and `workflow:*:invoke`, built in — opt in with `run_as: "default"` |
| Channel system user | `system:channel` | `agent:Orchestrator:invoke`, built in — deprecated, kept only for a Slack or Teams entrypoint still set to `run_as: "channel-user"` |
| Evaluation system user | `system:eval` | `agent:*:invoke`, `workflow:*:invoke`, and `tool:*:*`, built in — the fallback for an experiment that sets no `runAs` |
| Custom system user | `system:<name>` | the scopes of the roles assigned to it — declared with the `systemUser` kind |

The `system:` subject prefix is **reserved**: an external IdP must not issue a `sub` beginning with `system:`, and Agent Mesh rejects such a login so an IdP identity cannot impersonate a system user. A custom system user is declared with the `systemUser` kind (`spec.name`, an optional `spec.displayName`, and a required `spec.roleNames`); scope its role to only the invoke scopes the entrypoint needs. For the full machine-entrypoint model, see [Machine Entrypoints and System Users](../administering/enabling-rbac.md#machine-entrypoints-and-system-users). That section covers per-entrypoint `run_as` behavior, identity precedence, and the shared-channel confused-deputy protection.

## Authoring Surfaces

Three authoring surfaces, all writing into the same composed role/assignment graph.

### YAML Role Files

These role files are operator-managed on disk and loaded at entrypoint and platform startup from `ROLE_DEFINITIONS_PATH` and `USER_ROLES_PATH`. Use them for the bootstrap admin and for stable, change-controlled role definitions.

```yaml
# roles.yaml
roles:
  rbac_auditor:
    description: "Read roles, assignments, and claim mappings. Changing them requires a super administrator."
    scopes:
      - "rbac:_:read"

  agent_developer:
    description: "Build and deploy agents."
    scopes:
      - "agent_builder:*:*"
      - "tool:_:read"

  analyst:
    description: "Run agents and use the chat surface."
    scopes:
      - "agent:*:invoke"
```

```yaml
# users.yaml
users:
  alice@example.com:
    roles: [rbac_auditor]
  bob@example.com:
    roles: [analyst]
```

Email identities are lowercased for matching; other identity forms (OIDC `sub`) are case-sensitive.

Note the direction of this operator surface: `users.yaml` is keyed by **user**, mapping each identity to the roles it holds. The declarative `spec.users` shown in the following section is the inverse — keyed by **role**, listing the identities granted that role. They write into the same composed graph from opposite ends.

### `sam config apply`

Four declarative-configuration kinds manage the same surface from a Git-backed repository: `rbacRole`, `rbacGrant`, `rbacClaimMapping`, and `systemUser`. The default-role set is not a kind; it lives in the manifest's `platform.defaultRoles` block. The lifecycle matches the other declarative kinds (skills, connectors, toolsets). For the `sam config plan` / `apply` / `pull` workflow, see [Managing Configuration as Code (Early Access)](../building/declarative-config/index.md). For each kind's directory and diff key, see [Configuration Kinds](../building/declarative-config/configuration-kinds.md).

Two preconditions apply:

- Every RBAC write requires the superadmin grant described in [Common Scopes](#common-scopes). The Platform service refuses a write from a caller that holds only `rbac:_:read`, returning HTTP 403 with the message `RBAC management requires a super administrator`.
- `sam config plan` validates the structure of your files and diffs them against the Platform service, but it does not verify that you hold the superadmin grant, so a clean plan does not guarantee the writes succeed. This is true of every declarative kind, not only the RBAC ones. The only write scope a plan requires is the update scope it needs to compare a secret. For more information, see [Comparing Secrets at Plan Time](../building/declarative-config/secrets-and-variables.md#comparing-secrets-at-plan-time).

A `systemUser` file is the whole role set, not an addition to it:

- Editing `spec.displayName` takes effect on the next apply.
- Adding a role to `spec.roleNames` grants it, and removing one revokes it on an ordinary apply. The plan names the roles it takes away, so read that line before applying.
- Removing the resource deletes the principal on the next apply with `--prune`, which gates deletion for every kind. `sam config pull` exports every system user your configuration owns.
- You cannot change `spec.name` in place. The subject `system:<name>` is the principal's identity, so a new name is a new principal: renaming plans as a delete plus a create, and the delete needs `--prune`.
- You cannot author the built-in `default`, `channel`, and `eval` principals. `sam config plan` rejects a file naming any of them, because the built-in roles resolve alongside anything you grant, so the file could only widen the principal's reach.

A role grant is declared inline on the role, via a `spec.users` list of identities:

```yaml
kind: rbacRole
name: analyst
spec:
  scopes:
    - "agent:*:invoke"
    - "tool:*:*"
  users:
    - alice@example.com
    - bob@example.com
```

Each `spec.users` entry becomes one platform grant at apply time; removing a user from the list retires that grant (behind `--prune`). You cannot list a `system:` principal here, in either a role file or a `kind: rbacGrant` file. `sam config plan` rejects it and points you at the `systemUser` kind, which owns that principal's whole role set. Use the `rbacGrant` kind only when the role has no configuration file of its own to carry `spec.users`: a role Agent Mesh ships, or one created outside the declarative-config repo. A repo that still keeps grants under `rbac/assignments/` (or a manifest declaring `rbacAssignments`) is rejected with a message pointing at `spec.users` — move each grant onto its role file's `users:` list and delete the `rbac/assignments/` directory. Group-to-role mapping via `spec.groups` is not currently supported; use `rbacClaimMapping` for claim-driven access.

The YAML and database halves are **disjoint at the foreign-key level** — a database role cannot inherit a YAML role, and a database assignment cannot reference a YAML role. The Platform service refuses both at write time.

### The Agent Mesh UI

The **User Management** page writes the same database-backed roles, grants, and claim mappings that `sam config apply` reconciles, and it requires the same superadmin grant. It is visible only to a super administrator, and it exposes three tabs: **Claim Mappings**, **Users**, and **Roles**.

Two limits are worth knowing before you choose this surface. Its role editor grants **agent and workflow invoke scopes only**, so a role needing any management scope (`agent_builder`, `entrypoint`, `evaluation`, `analytics`, and so on) must come from a YAML file or `sam config apply`; such a role remains viewable and editable in the UI, and its other scopes are preserved. And roles loaded from operator YAML files are read-only there, so they cannot be granted to a user, named in a claim mapping, or used as a default role.

For the walkthrough, see [Managing Users and Roles](../building/user-management/index.md).

## IdP Claim Mapping

Roles can be sourced from OIDC group claims rather than (or in addition to) explicit user entries. A deployment reads group membership from a single OIDC claim, and you name that claim with the nested `idp_claims_config.claim_key`. The top-level `external_auth_claim_key` sets the same value for both the entrypoint and the Platform service, and the nested key takes precedence when you set both. On the entrypoint, the top-level value fills in the nested key only when the configuration already has an `idp_claims_config` block.

### YAML Claim Mappings

YAML mappings live in the authorization service configuration, keyed by claim value:

```yaml
authorization_service:
  type: default_rbac
  idp_claims_config:
    claim_key: groups
    mappings:
      "/sam-admins": [rbac_auditor]
      "/sam-analysts": [analyst]
```

### Platform-Managed Claim Mappings

The Platform service stores the mappings you create with `sam config apply` or in the Agent Mesh UI (see [Managing Users and Roles](../building/user-management/index.md)). Each one names the provider, the claim value that qualifies an identity, and the roles to grant:

```yaml
kind: rbacClaimMapping
name: azure-operators
spec:
  oidcProvider: azure
  claimValue: /sam-operators
  roleNames:
    - incident_responder
    - report_viewer
```

The `spec.roleNames` list grants one or more roles from a single mapping. Every role it names must be a Platform-managed `rbacRole`; you cannot reference a role that an operator loads from files at startup. The optional `spec.name` field is a label that defaults to the top-level `name` in the resource file.

Agent Mesh matches claim values without normalization, so `claimValue` must reproduce the token's value exactly, including any leading slash or path prefix your IdP emits.

You don't author the claim key here. Both `sam config apply` and the Agent Mesh UI apply the deployment-wide key described in the preceding section to every mapping.

:::warning
If you author a claim mapping before an administrator configures a claim key, Agent Mesh stores the mapping, but the mapping grants no roles until that key exists.
:::

A user's resolved roles are the union of YAML user-roles, IdP claim mappings, and database-managed assignments.

## Diagnosing a Denial

When the entrypoint logs `agent delegation denied` or returns 403 `insufficient scope: X required`:

1. Confirm the user's resolved scopes by calling `GET /api/v1/user/capabilities?scopes=<scope>` on the entrypoint.
2. Cross-check the role assignments in the Platform service.
3. Verify the IdP claim if the user is sourced via `idp_claims_config`.

Scope matching is wildcard-aware per segment: a `*` in a granted scope matches any value in that position. Wildcard matching is what makes per-instance access work — a grant of `agent:*:invoke` covers a check against any specific `agent:<id>:invoke`, and `workflow:*:invoke` covers any `workflow:<id>:invoke`. The category (segment 1) still has to match: `agent:*:invoke` does not cover a `workflow:<id>:invoke` check, so a role that runs workflows needs the `workflow:` grant (see the preceding three-row rule). The management families are category-wide: `agent_builder:*:*` covers the collection-level create scope and every category-wide verb (`agent_builder:*:read` / `:update` / …) in one grant, and `*:*:*` (or the bare `*`) authorizes everything. Every scope you author must have all three segments — the family-wide grant is `agent_builder:*:*`, not `agent_builder:*` — with the single bare `*` (superadmin) the only exception.

**Matching is case-sensitive.** The instance id in segment 2 of a per-instance scope carries the exact casing of the underlying object. For YAML-defined or built-in resources the id is the authored name, which may be mixed-case — for example an agent named `Orchestrator`. A grant of `agent:orchestrator:invoke` (lowercase) does **not** authorize a check against `agent:Orchestrator:invoke` (capital O). If your IdP claim mapper or role-management tooling normalizes scope strings (for example, lowercases everything), make sure the id in each grant matches the live object's case exactly. A common pitfall is an IdP-mapped group claim that lowercases the scope, granted to a user whose target agent has a mixed-case name. (Platform-deployed resources use a generated lowercase id, so this only affects name-derived ids.)
