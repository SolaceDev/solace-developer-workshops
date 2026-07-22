---
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
| `<resource>` | A specific instance id, `*` (any instance), or the literal `_` (no specific instance — for collection-level or flat-feature actions). |
| `<verb>` | The action. Standard set: `read`, `create`, `update`, `delete`, `deploy`, `invoke`, `subscribe`, `share`, `test`, `assign`. Tool-execution verbs (for example, `request`, `transcribe`) are an exception. |

Three valid values for the resource segment:

| Form | Meaning | Example |
|---|---|---|
| `<id>` | This specific instance (YAML-defined resources use the authored name as their id) | `agent:hr-bot:invoke` |
| `*` | Any instance | `agent_builder:*:update` |
| `_` | No instance — collection-level or flat-feature | `agent_builder:_:create`, `rbac:_:read` |

`*:*:*` is the superadmin grant. Inside segments 1-3, `*` works like a shell glob within that segment. The matcher also accepts the bare `*` (single token) as a shorthand for `*:*:*`.

## Common Scopes

The tables that follow list a non-exhaustive selection. Per-instance scopes (for example, `agent:<id>:invoke`) are derived from the resource being addressed; the runtime maps each component to the exact invoke scope a caller must hold (see the three-row rule that follows).

### Flat Platform Features

| Scope | Gates |
|---|---|
| `rbac:_:read` / `:_:create` / `:_:update` / `:_:delete` | RBAC management surface |
| `rbac:*:*` | All RBAC operations |
| `evaluation:_:read` / `:_:create` / `:_:update` / `:_:delete` / `:_:invoke` | Evaluation runs and configuration |
| `analytics:_:read` | Admin observability dashboard |
| `analytics:_:read_content` | Same plus per-user prompt/feedback content |
| `tool:_:read` | Read the tool catalog |
| `deployment:_:read` | View deployment audit log |
| `builder:_:use` | Cross-builder UI capability gate |
| `profile_provider:_:update` | Configure the identity profile-provider toolset |
| `notify:_:send` | Send a notification to your own inbox (default user grant) |
| `notify:_:send_others` / `:_:read_others` | Post to, or read, another user's inbox (elevated admin/support) |

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

Built-in tools otherwise require no scopes: holding `agent:<id>:invoke` for an agent implies access to every tool configured on it, including `schedule_task` (the scheduled invocation re-authorizes against the creator's invoke scopes when it fires). The two preceding scopes (plus `notify:_:send`) are the deliberate exceptions — capabilities with externalized side effects that stay individually grantable. Custom tools (Secure Tool Runtime packages, Model Context Protocol (MCP), OpenAPI, connectors) can still declare their own `required_scopes`, which are enforced as before.

**Which invoke scope a component requires (the three-row rule):**

| Component | Required scope | `<id>` is |
|---|---|---|
| Deployed workflow | `workflow:<id>:invoke` | the workflow's dashed UUID |
| Platform-deployed agent | `agent:<id>:invoke` | the agent's dashed UUID |
| YAML-authored / built-in agent | `agent:<name>:invoke` | the authored name |

Segment 2 is always the dashed UUID (`019e47f4-2be0-75d8-828e-77a0d1d9221f`), never the underscored broker name the component is addressed by on the wire (`workflow_019e47f4_2be0_...`). `agent:*:invoke` covers the `agent` category only — it does **not** cover deployed workflows. A role that must run workflows needs `workflow:*:invoke` (or a per-workflow `workflow:<id>:invoke`).

**Authoring pattern for roles that run workflows:** grant `workflow:*:invoke` (or the per-UUID scope). This is the single boundary grant a role needs to run a workflow: the workflow's invoke scope is checked once at the receiver, and its directed acyclic graph (DAG) then delegates to child agents and nested workflows transitively without a per-hop scope check against the caller. You no longer need to add `agent:*:invoke` for the child hops (it is harmless to keep for roles that also invoke agents directly).

## Authoring Surfaces

Two authoring surfaces, both writing into the same composed role/assignment graph.

### YAML Role Files

These role files are operator-managed on disk and loaded at entrypoint and platform startup from `ROLE_DEFINITIONS_PATH` and `USER_ROLES_PATH`. Use them for the bootstrap admin and for stable, change-controlled role definitions.

```yaml
# roles.yaml
roles:
  rbac_admin:
    description: "Manage RBAC. Cannot grant scopes the admin themselves do not hold."
    scopes:
      - "rbac:*:*"

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
    roles: [rbac_admin]
  bob@example.com:
    roles: [analyst]
```

Email identities are lowercased for matching; other identity forms (OIDC `sub`) are case-sensitive.

Note the direction of this operator surface: `users.yaml` is keyed by **user**, mapping each identity to the roles it holds. The declarative `spec.users` shown in the following section is the inverse — keyed by **role**, listing the identities granted that role. They write into the same composed graph from opposite ends.

### `sam config apply`

Two declarative-configuration kinds manage the same surface from a Git-backed repository: `rbacRole` and `rbacClaimMapping`. The lifecycle matches the other declarative kinds (skills, connectors, toolsets) — see [Managing Configuration as Code (Early Access)](../building/declarative-config/index.md) for the `sam config plan` / `apply` / `pull` workflow.

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

There is no standalone assignment kind. Each `spec.users` entry becomes one platform grant at apply time; removing a user from the list retires that grant (behind `--prune`). A repo that still keeps grants under `rbac/assignments/` (or a manifest declaring `rbacAssignments`) is rejected with a message pointing at `spec.users` — move each grant onto its role file's `users:` list and delete the `rbac/assignments/` directory. Group-to-role mapping via `spec.groups` is not currently supported; use `rbacClaimMapping` for claim-driven access.

The YAML and database halves are **disjoint at the foreign-key level** — a database role cannot inherit a YAML role, and a database assignment cannot reference a YAML role. The Platform service refuses both at write time.

## IdP Claim Mapping

Roles can be sourced from OIDC group claims rather than (or in addition to) explicit user entries:

```yaml
authorization_service:
  type: default_rbac
  idp_claims_config:
    claim_key: groups
    mappings:
      "/sam-admins": [rbac_admin]
      "/sam-analysts": [analyst]
```

A user's resolved roles are the union of YAML user-roles, IdP claim mappings, and database-managed assignments.

## Diagnosing a Denial

When the entrypoint logs `agent delegation denied` or returns 403 `insufficient scope: X required`:

1. Confirm the user's resolved scopes by calling `GET /api/v1/user/capabilities?scopes=<scope>` on the entrypoint.
2. Cross-check the role assignments in the Platform service.
3. Verify the IdP claim if the user is sourced via `idp_claims_config`.

Scope matching is wildcard-aware per segment: a `*` in a granted scope matches any value in that position. Wildcard matching is what makes per-instance access work — a grant of `agent:*:invoke` covers a check against any specific `agent:<id>:invoke`, and `workflow:*:invoke` covers any `workflow:<id>:invoke`. The category (segment 1) still has to match: `agent:*:invoke` does not cover a `workflow:<id>:invoke` check, so a role that runs workflows needs the `workflow:` grant (see the preceding three-row rule). The management families are category-wide: `agent_builder:*:*` covers the collection-level `agent_builder:_:create` and every category-wide verb (`agent_builder:*:read` / `:update` / …) in one grant, and `*:*:*` (or the bare `*`) authorizes everything. The `_` sentinel is a literal value: a required `rbac:_:read` is covered by a grant of `rbac:_:read` or `rbac:*:read`, but not by `rbac:foo:read`. Every scope you author must have all three segments — the family-wide grant is `agent_builder:*:*`, not `agent_builder:*` — with the single bare `*` (superadmin) the only exception.

**Matching is case-sensitive.** The instance id in segment 2 of a per-instance scope carries the exact casing of the underlying object. For YAML-defined or built-in resources the id is the authored name, which may be mixed-case — for example an agent named `Orchestrator`. A grant of `agent:orchestrator:invoke` (lowercase) does **not** authorize a check against `agent:Orchestrator:invoke` (capital O). If your IdP claim mapper or role-management tooling normalizes scope strings (for example, lowercases everything), make sure the id in each grant matches the live object's case exactly. A common pitfall is an IdP-mapped group claim that lowercases the scope, granted to a user whose target agent has a mixed-case name. (Platform-deployed resources use a generated lowercase id, so this only affects name-derived ids.)
