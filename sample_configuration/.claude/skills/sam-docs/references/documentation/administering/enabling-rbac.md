---
title: Enabling Role-Based Access Control (RBAC)
description: Turn on least-privilege RBAC in Agent Mesh — what it gates, the configuration that enables enforcement, trying agent-invocation control with the built-in dev identity, and enforcing every surface once single sign-on is on.
sidebar_position: 815
---

# Enabling Role-Based Access Control (RBAC)

Role-Based Access Control (RBAC) in Solace Agent Mesh is **allowlist only**: a user is granted scopes through roles, and any action whose required scope the user does not hold is denied. A fresh deployment is permissive by default — every user resolves to a universal grant — so nothing is enforced until you turn RBAC on.

This page covers what RBAC gates, the configuration that turns enforcement on, how to try agent-invocation control locally without an identity provider, and how to enforce the full API once single sign-on (SSO) is enabled. For the scope grammar and the full platform-shipped scope catalog, see the [RBAC Reference](../reference/rbac-reference.md).

## What RBAC Gates

RBAC gates several surfaces, and they become enforcing under different conditions. Knowing which is which saves you from concluding "RBAC isn't working" when it is working exactly as configured.

| Surface | What it controls | Example scopes |
|---|---|---|
| **Agent and workflow invocation** | Which agents and deployed workflows an identity can invoke and see in discovery — across direct submission, agent-to-agent (peer) delegation, scheduled tasks, and the Model Context Protocol (MCP) entrypoint. Agents and workflows are separate scope categories: an agent grant does not reach workflows | `agent:*:invoke`, `agent:<agentId>:invoke`, `workflow:*:invoke`, `workflow:<workflowId>:invoke` |
| **Tool execution** | Which tools an identity may run. Built-in tools are covered by agent access — holding an agent's invoke scope grants the tools configured on it — so most declare no scope. A few built-in tools with externalized side effects stay individually gated, and custom tools (Secure Tool Runtime, MCP, OpenAPI, connectors) can still declare their own opt-in `required_scopes` | `tool:email:send`, `tool:datadog_logs:invoke`, `tool:*:*` |
| **Agent and workflow required scopes** | Extra scopes an agent's card demands before it runs for a caller; workflows run as agents and use the same mechanism | Author-defined on the card — any scope the agent requires (for example `analytics:_:read`, so only callers with analytics access can run it) |
| **Analytics** | The admin analytics and observability endpoints (`/api/v1/analytics/*`) on the entrypoint; the content tier adds per-user detail to the reports. Artifacts and project/prompt sharing are **not** scope-gated — they are governed by ownership (described after this table) | `analytics:_:read`, `analytics:_:read_content` |
| **Platform management API** | Building, deploying, and configuring agents, workflows, connectors, entrypoints, skills, toolsets, and model configuration; evaluations; and RBAC management itself — the `/api/v1/platform/*` surface | `agent_builder:*:*`, `workflow_builder:*:*`, `connector:*:*`, `entrypoint:*:*`, `skill:*:*`, `toolset:*:*`, `model_config:*:*`, `deployment:_:read`, `evaluation:_:read`, `rbac:_:read` |
| **Notifications** (when the notification service is deployed) | Sending notifications to, and reading the inboxes of, *other* users | `notify:_:send`, `notify:_:send_others`, `notify:_:read_others` |

The example scopes are representative, not exhaustive — each category carries a full verb set (`read`, `create`, `update`, `delete`, and category-specific verbs such as `deploy` and `invoke`). For the complete catalog and the scope grammar, see the [RBAC Reference](../reference/rbac-reference.md).

Every preceding surface is enforced only when `authorization_service.type: default_rbac` is set. Among those, the dividing line is *where* the check runs, which determines whether authentication must also be enabled:

- **Enforced even with authentication off** — agent and workflow invocation, agent and workflow required scopes, and tool execution. The agent runtime checks these against the identity's resolved scopes, and those scopes are resolved and carried through even for the built-in dev identity used when authentication is off. A no-login deployment (Part 1) gates all three.
- **Requires authentication on** — the analytics API, the platform management API, and notifications. These are checked at the HTTP layer, which passes through for the built-in dev identity when authentication is off, so gating them per user needs real logins (Part 2).

The reason the first group still enforces without login is that RBAC resolves the dev identity's scopes and the trust manager carries them into the agent runtime; the HTTP layer does not resolve scopes for ordinary requests, so it lets the scopeless dev identity through until real identities arrive.

Two things are **not** governed by RBAC scopes. Access to your own data — your sessions, tasks, projects, prompts, and their artifacts — is governed by *ownership*, not scopes: a user always reaches what they created, and only the owner can manage its shares. (Administrative views layered on top, such as cross-user analytics, are the part that scopes gate.) And the internal token exchange between components is handled by the trust manager (described in the following section), not by roles you author.

## Prerequisites

- A running Agent Mesh deployment and write access to its configuration (or the equivalent Helm values). See [Install and Deploy](../installing/index.md).
- For agent-invocation RBAC with the dev identity (Part 1): nothing else.
- For full-surface enforcement (Part 2): an OpenID Connect (OIDC) identity provider (IdP) you can register an application with.

## Turning Enforcement On

Enforcement requires three things together:

- `authorization_service.type: default_rbac`
- a role-definitions file and a user-assignments file (authored in the next step)
- the trust manager enabled — `default_rbac` relies on the signed token exchange between the entrypoint and the Platform service, and without it the Platform service rejects entrypoint-minted tokens

Set the authorization service to `default_rbac` and point it at the two files:

```yaml
# authorization configuration
authorization_service:
  type: default_rbac
  role_to_scope_definitions_path: roles.yaml
  user_to_role_assignments_path: users.yaml
  default_roles: []
```

Setting `type: default_rbac` turns on allowlist enforcement. The permissive default is `type: none`, under which every user receives the universal `*` grant and nothing is checked. Set each path key to where that file lives in your deployment; if you configure paths through the environment or Helm, `ROLE_DEFINITIONS_PATH` and `USER_ROLES_PATH` populate these same two keys, and `AUTHORIZATION_TYPE` sets the mode.

The `default_roles` key lists the roles an authenticated identity receives **only when it has no explicit assignment** — from the assignments file, an IdP claim mapping, or the database. This key is a fallback, not an addition: a user with any explicit assignment does not also inherit these. Every name in it must be defined in the role file, or the deployment fails to start. Leave it empty to make access grant-by-assignment only.

:::note
Wrong or unreadable role- or user-file paths do **not** fail fast the way an undefined `default_roles` name does. The deployment logs an error and keeps running with no roles loaded, so every authenticated user resolves to zero scopes — a silent deny-all that can be mistaken for a broken login. If access unexpectedly disappears, check the startup logs for an RBAC file-load error and confirm both paths resolve.
:::

Enable the trust manager in the same deployment:

```yaml
# trust configuration
trust_manager:
  enabled: true
```

The environment-variable equivalent is `TRUST_MANAGER_ENABLED=true`. The trust manager is off by default, and leaving it off is a **fail-open** gap, not a fail-closed one: without it the runtime substitutes no-op authorizers and resolves no identity, so `default_rbac` is silently **bypassed** — enforcement is skipped and every caller is effectively allowed, rather than denied. Enabling the trust manager is what makes the roles you author actually enforce.

## Authoring Roles and Assignments

Define roles as a name-to-scopes mapping, and assign identities to roles.

```yaml
# roles.yaml
roles:
  agent_user:
    description: "Invoke agents and use the chat surface."
    scopes:
      - "agent:*:invoke"
      - "tool:*:*"

  agent_developer:
    description: "Build and deploy agents in addition to invoking them."
    inherits:
      - agent_user
    scopes:
      - "agent_builder:*:*"
      - "connector:*:*"
      - "entrypoint:*:read"
```

```yaml
# users.yaml
users:
  alice@example.com:
    roles: [agent_developer]
```

The `agent_developer` role inherits `agent_user`, so it picks up those scopes without repeating them. A single `*:*` grant covers a whole management category — `agent_builder:*:*` authorizes the collection-level `agent_builder:_:create` and every management verb (`read`, `update`, `delete`, `deploy`, `test`) in one line. For the complete catalog, see the [RBAC Reference](../reference/rbac-reference.md).

The `agent:*:invoke` scope grants invocation of every agent. To restrict a role to specific agents, use `agent:<agentId>:invoke` — but be precise about what `<agentId>` is. For an agent defined in configuration, it is the authored name. For an agent deployed through the Platform service or the Agent Mesh UI, it is the resource's generated UUID, **not** the display name. A scope built from the display name of a platform-deployed agent silently matches nothing, so prefer `agent:*:invoke` unless you have each agent's exact id. The [RBAC Reference](../reference/rbac-reference.md) gives the exact id shape for each kind of resource.

Deployed workflows are governed by their **own** scope category, not the agent one. Invoke a specific workflow with `workflow:<workflowId>:invoke`, or grant `workflow:*:invoke` for all of them — `agent:*:invoke` does **not** cover deployed workflows. The workflow's invoke scope is the single boundary grant a role needs to run it: it is checked once when the workflow is invoked, and the workflow's steps then delegate to child agents and nested workflows transitively, with no separate per-hop scope check against the caller. You do not need to add `agent:*:invoke` for the child steps (keep it only if the role also invokes those agents directly). As with agents, `<workflowId>` is the authored name for a configuration-defined workflow and the resource's generated UUID for a platform- or UI-deployed one. (The `workflow_builder:*` scopes are a different surface — they govern building and deploying workflows, not running them.)

## Part 1 — Try Agent-Invocation RBAC Without an Identity Provider

Agent-invocation control is enforced for every resolved identity, including the built-in dev identity, so you can see it work with no IdP.

### Step 1: Run with the Built-In Dev Identity

Keep authentication off. When it is off, Agent Mesh injects one fixed dev identity into every request:

```yaml
# entrypoint and platform configuration
frontend_use_authorization: false
```

:::warning
Auth-disabled mode treats every request as the same unauthenticated dev user. Use it only to try RBAC locally. A production deployment authenticates users through SSO — see **Part 2**.
:::

To see which identity the deployment resolves you as, run:

```bash
curl https://your-entrypoint/api/v1/user
```

The response reports your `username` — `sam_dev_user` by default. That value is the key you assign roles to.

### Step 2: Assign the Dev Identity a Role Without Agent Access

Grant the dev identity a role that has tool access but no agent-invocation scope, so you can watch invocation be denied before you grant it:

```yaml
# roles.yaml
roles:
  chat_user:
    description: "Use tools and the chat surface; invoke no agents yet."
    scopes:
      - "tool:*:*"
```

```yaml
# users.yaml
users:
  sam_dev_user:
    roles: [chat_user]
```

The `chat_user` role holds no agent-invocation scope, so `sam_dev_user` cannot invoke any agent yet. Restart the deployment to load the role and assignment files.

### Step 3: Verify Agent-Invocation Enforcement

Do **not** verify the dev identity with `GET /api/v1/user/capabilities` — with authentication off, that endpoint reports every scope as held, because the dev identity carries no resolved scopes and the capability check treats an empty scope set as allow-all. Verify with an actual invocation instead.

With no agent-invocation scope, every agent is hidden from discovery and refused on invocation. Send a message to any agent:

```bash
curl -X POST https://your-entrypoint/api/v1/message:send \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":"1","method":"message/send","params":{"message":{"kind":"message","messageId":"11111111-1111-1111-1111-111111111111","role":"user","parts":[{"kind":"text","text":"hello"}],"metadata":{"agent_name":"Orchestrator"}}}}'
```

The response is `403 Forbidden` with a JSON-RPC error whose message is `agent delegation denied: <agent>`, and `GET /api/v1/agentCards` returns an empty list. Now grant agent invocation — add `agent:*:invoke` to `chat_user` (or, to allow only specific agents, `agent:<agentId>:invoke` using the ids from your agent list) — then restart and repeat: the call now succeeds, and the permitted agents appear in `agentCards`.

This deny/allow flip is what distinguishes "enforcement is on" from "enforcement is on but every role grants everything".

### What Part 1 Does Not Cover

With authentication off, every request runs as the same built-in dev identity. RBAC still gates agent invocation, tool execution, and agent and workflow required scopes against that identity's resolved scopes — Step 3 demonstrates the agent-invocation case, and any tool that declares `required_scopes` (or an agent card that does) is checked the same way against the dev identity. What a no-login deployment cannot show is *per-user* differences: every caller is the one dev identity. Separately, the analytics API, the platform management API, and notifications are **not** gated in this mode — those checks run at the HTTP layer, which passes through for the dev identity when authentication is off. To differentiate users and gate the HTTP surfaces, enable authentication, as described in the following section.

## Part 2 — Enforce Every Surface with an Identity Provider

After users authenticate, each request carries that user's own identity instead of the shared dev identity, so the agent-runtime checks from Part 1 (agent invocation, tool execution, agent and workflow required scopes) now differentiate real users — and enforcement additionally extends to the HTTP-layer surfaces that Part 1 left open: the analytics API, the platform management API, and notifications.

### Step 4: Turn on SSO

Set `frontend_use_authorization: true` and configure your OIDC provider. The provider catalog keys and callback-URI registration live in [Authentication](../installing/configure.md#authentication); the per-provider walkthroughs live in [Enabling Single Sign-On (SSO)](./enabling-sso.md).

After SSO is on, identities come from your IdP rather than the dev identity. The assignments-file key becomes whatever the deployment reports as the user's `username` — for OIDC `sub` UUIDs, use the UUID directly. Your Part 1 roles carry over unchanged; only how identities arrive has changed.

### Step 5: Map IdP Group Claims to Roles

Instead of an entry per user, map an IdP group claim to a role. Set `user_to_role_provider: idp_claims` to select the IdP-claims role provider, then declare the mappings under `idp_claims_config`:

```yaml
# authorization configuration
authorization_service:
  type: default_rbac
  role_to_scope_definitions_path: roles.yaml
  user_to_role_assignments_path: users.yaml
  default_roles: []
  user_to_role_provider: idp_claims
  idp_claims_config:
    claim_key: groups
    mappings:
      "/sam-developers": [agent_developer]
      "/sam-users": [agent_user]
```

On the IdP side, configure a mapper that emits the user's groups under the `claim_key` you named. Any group whose value matches an entry in `mappings` is translated into the corresponding role. A user's resolved roles are the union of the user-assignments file, the IdP claim mappings, and any database-managed assignments.

### Step 6: Verify End to End

With a real authenticated identity, `GET /api/v1/user/capabilities?scopes=agent_builder:_:create` reports whether the logged-in user holds a scope. Log in as a user in only the `/sam-developers` group, confirm they hold `agent_developer`'s scopes, then confirm a user in no mapped group is denied the same action. That positive-plus-negative check proves the claim path works.

## Managing RBAC and the Management API

Roles and claim mappings can also be managed as version-controlled code with the `rbacRole` and `rbacClaimMapping` kinds through the [Managing Configuration as Code (Early Access)](../building/declarative-config/index.md) workflow (`sam config plan` / `apply` / `pull`). There is no standalone assignment kind: a grant is declared inline on its role through the role's `spec.users` list — see the [RBAC Reference](../reference/rbac-reference.md).

The RBAC management **API** (`/api/v1/platform/rbac/**`) and `sam config apply` of the RBAC kinds are always available and protected by scope checks — a caller missing the required scope gets `403 Forbidden`. Scope enforcement of the roles you author is independent of `authorization_service.type` and of any feature flag.

## What Next?

You have turned on least-privilege RBAC. Most readers next want real logins in front of it, covered in [Enabling Single Sign-On (SSO)](./enabling-sso.md). For the full scope catalog and grammar, see the [RBAC Reference](../reference/rbac-reference.md).
