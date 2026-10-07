---
published: true
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
| **Tool execution** | Which tools an identity may run. Agent access covers built-in tools, because holding an agent's invoke scope grants the tools configured on it, so most declare no scope. A few built-in tools with externalized side effects stay individually gated, and custom tools (Secure Tool Runtime, MCP, OpenAPI, connectors) can still declare their own opt-in `required_scopes`. For more information, see [Restricting Who Can Run a Tool](../building/toolsets.md#restricting-who-can-run-a-tool). | `tool:email:send`, `tool:datadog_logs:invoke`, `tool:*:*` |
| **Agent and workflow required scopes** | Extra scopes an agent's card demands before it runs for a caller; workflows run as agents and use the same mechanism | Author-defined on the card — any scope the agent requires (for example `analytics:_:read`, so only callers with analytics access can run it) |
| **Analytics** | The admin analytics and observability endpoints (`/api/v1/analytics/*`) on the entrypoint; the content tier adds per-user detail to the reports. Artifacts and project/prompt sharing are **not** scope-gated — they are governed by ownership (described after this table) | `analytics:_:read`, `analytics:_:read_content` |
| **Platform management API** | Building, deploying, and configuring agents, workflows, connectors, entrypoints, skills, toolsets, model configuration, and Web UI settings; evaluations; and reading RBAC state — the `/api/v1/platform/*` surface. *Changing* RBAC requires a super administrator, not a scope | `agent_builder:*:*`, `workflow_builder:*:*`, `connector:*:*`, `entrypoint:*:*`, `skill:*:*`, `toolset:*:*`, `model_config:*:*`, `deployment:_:read`, `evaluation:_:read`, `rbac:_:read`, `webui_settings:*:read` |
| **Notifications** (when the notification service is deployed) | Sending notifications to, and reading the inboxes of, *other* users | `notify:_:send`, `notify:_:send_others`, `notify:_:read_others` |

The example scopes are representative, not exhaustive — each category carries a full verb set (`read`, `create`, `update`, `delete`, and category-specific verbs such as `deploy` and `invoke`). For the complete catalog and the scope grammar, see the [RBAC Reference](../reference/rbac-reference.md).

:::note
A wildcard grant satisfies every gate it covers, so a role holding `tool:*:*` can run every tool gated by a `tool:` scope, regardless of the `required_scopes` those tools declare. Tools gated in another category are unaffected. For example, `notify_user` still requires `notify:_:send`. If a per-tool gate appears to have no effect, check the caller's roles for a covering wildcard before concluding that the gate is broken. The `agent_user` role defined in the following section grants `tool:*:*`. Remove it from any role whose holders must be subject to per-tool gates.
:::

Every preceding surface is enforced only when `authorization_service.type: default_rbac` is set. Among those, the dividing line is *where* the check runs, which determines whether authentication must also be enabled:

- **Enforced even with authentication off** — agent and workflow invocation, the required scopes declared on agents and workflows, and tool execution. The agent runtime checks these against the identity's resolved scopes, and those scopes are resolved and carried through even for the built-in dev identity used when authentication is off. A no-login deployment (Part 1) gates all three.
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

After users authenticate, each request carries that user's own identity instead of the shared dev identity, so the agent-runtime checks from Part 1 (agent invocation, tool execution, and the required scopes declared on agents and workflows) now differentiate real users — and enforcement additionally extends to the HTTP-layer surfaces that Part 1 left open: the analytics API, the platform management API, and notifications.

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

The `claim_key` you set here applies to the whole deployment, and Agent Mesh supports only one. Claim mappings you create with `sam config apply` or in the Agent Mesh UI use this same key, and you can't set a different key in either one. For those mappings, see [IdP Claim Mapping](../reference/rbac-reference.md#idp-claim-mapping), and for creating them in the Agent Mesh UI, see [Managing Users and Roles](../building/user-management/index.md).

### Step 6: Verify End to End

With a real authenticated identity, `GET /api/v1/user/capabilities?scopes=agent_builder:_:create` reports whether the logged-in user holds a scope. Log in as a user in only the `/sam-developers` group, confirm they hold `agent_developer`'s scopes, then confirm a user in no mapped group is denied the same action. That positive-plus-negative check proves the claim path works.

## Machine Entrypoints and System Users

Not every request carries an end-user identity. Webhooks, the event mesh, unauthenticated Model Context Protocol (MCP) calls, and shared-channel Slack and Teams messages arrive with no signed-in user for RBAC to resolve against. These requests run as a **system user**: a principal Agent Mesh owns, which holds RBAC scopes like any other identity.

An entrypoint that does not name one runs as the built-in default system user, which can invoke **any agent or workflow that does not declare `required_scopes`**. That keeps an entrypoint working without extra setup, but it is deliberately broad — to restrict what an entrypoint can reach, create a scoped system user and name it in `run_as`. For the rules that apply to each entrypoint type, see [Where `run_as` Applies](#where-run_as-applies).

A system user is a principal that Agent Mesh owns: it is never an identity-provider login, and it holds RBAC scopes like any other principal. An entrypoint names one through its `run_as` setting, and every request that entrypoint handles then authorizes as that system user. A system user never completes an interactive login of its own, but an operator can authorize a **delegated tool credential** on its behalf, and that credential is stored against the principal rather than against the person who authorized it. For more information, see [Secure User-Delegated Tool Access](./secure-user-delegated-access.md).

### The Default System User

Agent Mesh ships three built-in system users. The default system user, `system:default`, holds `agent:*:invoke` and `workflow:*:invoke`. For more information about `system:channel` and `system:eval`, see [System Users](../reference/rbac-reference.md#system-users). An entrypoint opts into `system:default` by setting its `run_as` to `default`:

```yaml
run_as: "default"
```

`run_as: "default"` is **broad by design** — `system:default` can invoke any agent or workflow that does **not** declare `required_scopes`. Two mechanisms that you might expect to narrow this do not:

- **`inter_agent_communication` does not apply here.** That allow-list governs agent-to-agent (peer) delegation — which agents a *running agent* may call onward — not the entrypoint's direct submission. It never constrains what `run_as` can reach.
- **`required_scopes` is opt-in.** An agent is gated by required scopes only if its card declares them; an agent that declares none is reachable by any holder of `agent:*:invoke`, including `system:default`.

Consequently, once machine entrypoints run as the default system user, an agent's `required_scopes` is the **load-bearing** per-agent control — not optional hardening. Declare `required_scopes` on any agent a machine entrypoint must not reach by default.

### Restricting an Entrypoint to Specific Agents

To scope an entrypoint to only certain agents rather than the permissive default, create a **custom system user** whose role holds only the invoke scopes you want, and point the entrypoint's `run_as` at it. Declare both as code with the `rbacRole` and `systemUser` kinds (see [Configuration Kinds](../building/declarative-config/configuration-kinds.md)):

```yaml
kind: rbacRole
name: orders_invoke_only
spec:
  scopes:
    - "agent:OrderProcessor:invoke"
```

```yaml
kind: systemUser
name: orders-bot
spec:
  displayName: "Orders webhook"
  roleNames: [orders_invoke_only]
```

```yaml
# the entrypoint runs as the custom system user
run_as: "orders-bot"
```

The entrypoint now reaches only the agents its system user's scopes allow. A custom system user — not `inter_agent_communication` — is the mechanism for narrowing a machine entrypoint's reach.

### Changing and Removing a Custom System User

Manage a custom system user from the configuration file that defines it. That file holds its whole role set, so `sam config apply` reconciles it in both directions: adding a role to `spec.roleNames` grants it, and removing one revokes it. Both take effect on an ordinary apply. `sam config plan` names the roles an apply revokes, so read that line first, because the apply narrows what the entrypoint can reach.

:::warning
The file replaces the role set rather than adding to it. Any role granted to a system user outside declarative config is revoked on your next `sam config apply`, with no flag required. Run `sam config plan` before the first apply after upgrading, and reconcile anything you want to keep into `spec.roleNames`.
:::

To remove a system user, delete its file, remove its name from the manifest's `systemUsers` list, and apply with `--prune`:

```bash
sam config apply --prune
```

Keep the `systemUsers` key in the manifest even when the list is empty. A kind you do not list under `resources` is never diffed, so removing the whole key leaves the principal in place instead of deleting it.

Without `--prune`, the plan still lists the deletion, and the apply skips it, leaving the principal in place. `--prune` also deletes every other undeclared resource of every kind your manifest lists, so review the plan before you run it. See [Planning and Applying Changes](../building/declarative-config/planning-and-applying.md).

Deleting a system user that an entrypoint still runs as does not stop the entrypoint. Agent Mesh resolves no scopes for the requests that entrypoint handles and denies every one, so point that entrypoint's `run_as` at another system user first.

You cannot rename a system user in place. Its subject `system:<name>` is its identity, so changing its name (`spec.name`, or the file's `name` when `spec.name` is omitted) creates a second principal and plans the original for deletion under `--prune`. Point the entrypoint's `run_as` at the new name in the same apply.

The built-in `default`, `channel`, and `eval` system users cannot be changed or removed. They ship with Agent Mesh rather than living in your configuration. Declaring a `systemUser` under one of those names is rejected: `sam config plan` refuses a file naming one, and so does the platform API. The built-in roles resolve from the embedded defaults and union with anything you grant, so such a file could only widen the principal's reach, never produce the role set you asked for. To run something under a narrower principal, declare a system user of your own and point at that.

### Where `run_as` Applies

`run_as` names a system user by its bare name (`default`, or a custom name such as `orders-bot`):

| Entrypoint | Runs as the real user when… | Uses `run_as` when… | No identity and no `run_as` → |
|---|---|---|---|
| **Webhook** | never (no end-user identity) | always | the default system user |
| **Event mesh** | a per-rule identity resolves from the message | no per-message identity resolves | the default system user |
| **MCP** | OAuth is enabled (the caller's token identifies them) | OAuth is disabled and no `default_user_identity` is set | the default system user |
| **Slack / Teams** | a 1:1 direct message | a shared-channel (multi-party) message | the default system user |
| **WhatsApp** | no `run_as` is set and the sender matches an Agent Mesh user through an identity provider claim | `run_as` is set, for every message | the sender is refused and asked to sign in |

A resolved per-message or per-request identity always takes precedence over `run_as`; `run_as` is the fallback for the no-identity case, never an override. WhatsApp is the exception: a WhatsApp entrypoint that sets `run_as` never identifies its senders, and one that does not set it never falls back to a system user. For more information, see [Identifying WhatsApp Senders](../building/entrypoints/whatsapp/sender-identity.md).

An MCP entrypoint with OAuth disabled can name a static `default_user_identity`. Leave that field unset in production: the call then runs as the entrypoint's system user, which is what carries invoke scopes. When you set it, the field acts as an identity source and takes precedence over `run_as`, exactly as a resolved per-request identity does. Under enforced RBAC the named identity carries only the scopes granted to it, which are normally none. The value must not begin with `system:`. Agent Mesh rejects an entrypoint that sets a `system:` value, so a static identity cannot resolve a system user's scopes.

One case does not fall back to the entrypoint's system user. An event-mesh rule that sets `user_identity_expression` declares that every event carries its own identity. Agent Mesh therefore **discards** an event whose expression resolves to nothing rather than running it as the system user, and publishes the rejection to the rule's error output when the rule declares one.

### Shared Channels: Slack and Teams

In a **1:1 direct message**, a Slack or Teams request runs as the real user, with that user's own scopes. In a **shared channel** (public or private channel, or a group message), it runs as the `run_as` system user instead — a *confused-deputy* protection so a task in a shared space cannot act with the asker's personal credentials or reach their private data. Set `use_user_identity_in_channels: true` to opt a deployment out and run shared-channel messages as the real user as well.

Because a shared-channel request runs as the system user, the reach of that system user is what bounds it. In particular, a channel participant can address a specific agent by name (an `@mention` of a discovered agent), which routes directly to that agent — so a permissive `run_as: "default"` lets any participant reach any agent without `required_scopes`. Use a scoped custom system user on shared-channel entrypoints where that breadth is not wanted.

### The Reserved `system:` Prefix

System users are identified by a subject that begins with `system:` (the default is `system:default`; a custom user named `orders-bot` becomes `system:orders-bot`). This prefix is **reserved**: an external identity provider must not issue a `sub` claim beginning with `system:`. Agent Mesh rejects such a login so an IdP identity can never impersonate a system user and inherit its scopes.

### Upgrading From Earlier Versions

If you are upgrading an existing deployment, especially one that predates system users:

- A Slack or Teams `run_as: "channel-user"` (the earlier fixed principal) is migrated to a built-in channel system user that keeps its original Orchestrator-only reach.
- **Review your entrypoints' reach after upgrading.** `channel-user` was previously applied automatically rather than written into your configuration, so an entrypoint that never set `run_as` explicitly now runs as the default system user and can reach every agent and workflow without `required_scopes`. Where that is broader than you want, create a scoped system user and set it as the entrypoint's `run_as`.
- **An unauthenticated MCP entrypoint now runs as a system user.** Earlier releases attributed unauthenticated calls to a development identity that normally resolved no scopes, so those calls usually reached no agents where the deployment ran authorization. An MCP entrypoint that sets neither `default_user_identity` nor `run_as` now runs as the default system user and can reach every agent and workflow that does not declare `required_scopes`. Where that is broader than you want, create a scoped system user and set it as the entrypoint's `run_as`.
- **An MCP entrypoint with OAuth disabled now enforces RBAC.** On a deployment with single sign-on and RBAC enforcement on, an MCP entrypoint that you deployed from the Agent Mesh UI or with `sam config apply` and then turned OAuth off carried no authorization configuration. Its tool calls reached every agent and workflow in the mesh, including ones that declare `required_scopes`, regardless of which principal `run_as` or `default_user_identity` named. Agent Mesh now authorizes those calls as that principal.
  - Agent Mesh denies a call that previously succeeded when the principal does not hold the invoke scope for the agent or workflow it calls. Agent Mesh narrows the entrypoint's `tools/list` response to the same set, so a principal that holds no invoke scopes receives an empty tool list rather than an error.
  - Check any such entrypoint that sets `default_user_identity` first. That identity holds only the scopes granted to it, which are normally none. Clear the field to run as the entrypoint's system user, or grant the named user the scopes it needs.
  - Authentication does not change. The entrypoint still accepts calls that carry no token. An entrypoint with OAuth enabled, a deployment without single sign-on, and a deployment that sets `authorization_service.type: none` are all unaffected.
  - An entrypoint defined in a configuration file keeps its existing call authorization: its `authorization_service` setting comes from the file, which this change does not rewrite. Agent Mesh now narrows the `tools/list` response of an entrypoint that pairs `enable_auth: false` with an `authorization_service` block, so it advertises fewer tools than before.
- **Clear any `default_user_identity` that begins with `system:` before you upgrade.** Agent Mesh now rejects a system user named in that field: `sam config plan` fails, and an MCP entrypoint that still names one fails to start. Set `run_as` to the system user's name instead and leave `default_user_identity` empty. Earlier releases accepted the `system:` value and resolved that system user's scopes, so check any entrypoint you configured that way.
- **Check any MCP entrypoint that sets both `default_user_identity` and `run_as`.** The `default_user_identity` field now takes precedence, whereas earlier releases used `run_as`. Such an entrypoint changes identity on upgrade, which also changes the scopes its calls carry. Remove whichever of the two settings you do not want.
- An explicit `run_as: ""` no longer means "run as the real user in channels" — it now runs as the default system user; set `use_user_identity_in_channels: true` for the old behavior.
- Event-mesh entrypoints deployed before the upgrade keep an auto-generated identity in their running configuration that resolves to no scopes. **Redeploy** them after upgrading so they pick up `run_as`; no data migration is required. Once redeployed, an event that resolves no identity runs as the entrypoint's system user — unless the rule sets `user_identity_expression`, in which case an event that resolves no identity is discarded.
- **Run `sam config plan` before your first apply if you manage system users as code.** Earlier releases only ever added roles to a system user, so a role removed from `spec.roleNames` stayed granted, and a role added outside declarative config accumulated. The configuration file is now the whole role set, so that first apply revokes anything it does not list, and `--prune` can now delete a system user your configuration no longer declares. The plan names both the revocations and the deletions before anything changes. See [Changing and Removing a Custom System User](#changing-and-removing-a-custom-system-user).
- **Move any `system:` entry out of `spec.users` before you run `sam config plan` again.** `sam config plan` now rejects a system principal listed in a role's `spec.users` or in a standalone `kind: rbacGrant` file. It validates the whole configuration together, so one such entry stops the plan for every resource. Earlier releases of `sam config pull` wrote these entries, so check a pulled repository. Declare the principal as a `kind: systemUser` resource that names the role in `spec.roleNames` instead. See [Machine Entrypoints and System Users](#machine-entrypoints-and-system-users).
- **An `eval-runner` entry in your authorization YAML no longer applies.** Evaluation runs previously published under a fixed `eval-runner` identity. They now run as the experiment's `runAs` principal, or as the built-in `system:eval` when the experiment names none, so a `user_to_role` assignment for `eval-runner` has no effect after upgrading. Re-express it against the principal your experiments run as, and check any log filter or audit query that matched on `eval-runner`.

## Managing RBAC and the Management API

Roles, grants, and claim mappings can also be managed from the **User Management** page in the Agent Mesh UI, which is the quickest way to give a group access to a set of agents. That page also lists every identity the deployment has seen, which is populated as people sign in. For more information, see [Managing Users and Roles](../building/user-management/index.md).

You can manage the same resources as version-controlled code with the `rbacRole`, `rbacGrant`, `rbacClaimMapping`, and `systemUser` kinds through the [Managing Configuration as Code (Early Access)](../building/declarative-config/index.md) workflow (`sam config plan` / `apply` / `pull`). Declare a grant inline on the role, in its `spec.users` list. The `rbacGrant` kind covers a role that has no configuration file of its own, such as a role Agent Mesh ships. For more information, see the [RBAC Reference](../reference/rbac-reference.md) and [Managing Users and Roles with the CLI](../building/user-management/cli.md).

The RBAC management **API** (`/api/v1/platform/rbac/**`) and `sam config apply` of the RBAC kinds are always available and protected by scope checks — a caller missing the required scope gets `403 Forbidden`. Scope enforcement of the roles you author is independent of `authorization_service.type` and of any feature flag.

## What Next?

You have turned on least-privilege RBAC. Most readers next want real logins in front of it, covered in [Enabling Single Sign-On (SSO)](./enabling-sso.md). For the full scope catalog and grammar, see the [RBAC Reference](../reference/rbac-reference.md).
