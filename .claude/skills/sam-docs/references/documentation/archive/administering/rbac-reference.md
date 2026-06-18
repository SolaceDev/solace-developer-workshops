---
title: RBAC Reference
description: How Solace Agent Mesh authorizes users. The Role-Based Access Control (RBAC) model, the scope reference, the two authoring surfaces (YAML and `sam config apply`), per-gateway specifics, and how to diagnose a denial.
sidebar_position: 3
---

# RBAC Reference

Role-Based Access Control (RBAC) in Solace Agent Mesh is **allow-list only**. A user is granted scopes via roles, and any operation whose required scope is not in the granted set is denied. There are no deny rules, no negation syntax, and no per-resource overrides.

Two services share the work. The Platform service composes the merged role and scope catalog and is the source of truth. Every gateway resolves the caller's scopes against that catalog at token-mint time and bakes the result into the per-task JWT. Enforcement runs on every request.

Read this page top to bottom the first time you wire RBAC up. Jump straight to Troubleshooting when a running deployment starts denying things you did not expect.

## Authorization Service Types

The `authorization_service.type` field selects how a user's scopes are resolved at token-mint time.

| Type | Behavior | When to use |
|---|---|---|
| `none` | Every authenticated user receives `["*"]` (all scopes) | Verify SSO works before adding RBAC. Development and smoke tests. |
| `default_rbac` | Loads roles and assignments from YAML files and the Platform service database | Production |
| `deny_all` | No scopes granted to anyone | Test isolation. Secure-by-default fallback when the block is fully omitted. |

The shipped configs default to `${AUTHORIZATION_TYPE, none}` in both the gateway and Platform service blocks, so out of the box every authenticated user has wildcard scopes. Flip RBAC on by setting the environment variable:

```bash
export AUTHORIZATION_TYPE=default_rbac
```

If the `authorization_service` block is omitted entirely (not just left at `none`), the runtime falls through to `deny_all`. This is the secure-by-default fallback for misconfigurations: if the block is missing, every gated request fails until an operator adds it back.

:::warning
The gateway and Platform service configs both carry their own `authorization_service` block, and **both must agree**. The Platform service owns the database-side role registry. The gateway resolves scopes on every request. A mismatch (gateway on `default_rbac`, Platform service on `none`) produces hard-to-diagnose denials because the gateway looks up scopes against a registry the Platform service has not loaded.
:::

## Scope Format

Scopes are colon-separated hierarchical strings with glob-style wildcards.

| Pattern | Matches |
|---|---|
| `*` | Everything |
| `tool:*` | Any tool operation |
| `tool:artifact:load` | The specific `artifact:load` tool scope |
| `agent:MyAgent:delegate` | Delegate to `MyAgent` specifically |
| `agent:*:delegate` | Delegate to any agent |
| `monitor/namespace/*:a2a_messages:subscribe` | Subscribe to A2A messages in any namespace (segment glob) |
| `control:apps/<name>:update` | Update a specific app |

Three matching rules apply, in this order:

1. The universal wildcard `*` (granted) matches anything required.
2. Exact string match wins.
3. Segment-by-segment compare, where a granted segment of `*` matches any one required segment. If granted ends in `*`, trailing required segments are accepted (suffix wildcard).

Wildcards are glob, not regex. `tool:.*` matches a literal scope containing a dot and an asterisk. It does not match every tool scope. Scope strings are case-sensitive.

## Scope Reference

Every scope the runtime gates on, grouped by enforcement surface.

### Platform Service Scopes

The Platform service exposes the agent builder, connector library, skills and toolsets, model configuration, evaluations, RBAC management, and the profile provider. Every Platform service endpoint requires a scope from the `sam:` family.

| Scope | Gated operations |
|---|---|
| `sam:agent_builder:read` | List and view agents, remote agents, test agents, agent configuration, and agent preview |
| `sam:agent_builder:create` | Create an agent, register a remote agent, generate an agent with the AI assistant |
| `sam:agent_builder:write` | Upload an agent bundle |
| `sam:agent_builder:update` | Update an agent or remote agent |
| `sam:agent_builder:delete` | Delete an agent or remote agent |
| `sam:agent_builder:test` | Create or delete a test-agent session |
| `sam:connectors:read` | List, view, and download connectors and OpenAPI schemas |
| `sam:connectors:create` | Create a connector |
| `sam:connectors:update` | Update a connector or upload connector resources |
| `sam:connectors:delete` | Delete a connector |
| `sam:skills:read` | List, view, and download skills and skill configuration |
| `sam:skills:create` | Create a skill |
| `sam:skills:update` | Update a skill, upload a skill bundle, or patch skill configuration |
| `sam:skills:delete` | Delete a skill |
| `sam:toolsets:read` | List, view, and download toolsets, toolset configuration, and build targets |
| `sam:toolsets:create` | Create a toolset |
| `sam:toolsets:update` | Update a toolset, upload a toolset bundle, or patch toolset configuration |
| `sam:toolsets:delete` | Delete a toolset |
| `sam:tools:read` | List or view tools |
| `sam:workflow_builder:read` | List, view, or fetch the configuration for a workflow |
| `sam:workflow_builder:create` | Create a workflow |
| `sam:workflow_builder:update` | Update a workflow |
| `sam:workflow_builder:delete` | Delete a workflow |
| `sam:gateways:read` | List, view, fetch the configuration, fetch networking details, test-connect, or fetch schemas for gateways and gateway deployments |
| `sam:gateways:create` | Create a gateway |
| `sam:gateways:update` | Update a gateway |
| `sam:gateways:delete` | Delete a gateway |
| `sam:gateways:deploy` | Create a gateway deployment |
| `sam:deployments:read` | List or view agent and workflow deployments |
| `sam:deployments:create` | Create an agent or workflow deployment |
| `sam:model_config:read` | Read model configurations and provider details over the broker-mediated control plane |
| `sam:model_config:create` | Create a model configuration. Also satisfies provider listings, supported-models lookup, and connection-test endpoints during the create flow |
| `sam:model_config:update` | Update an existing model configuration. Also satisfies provider listings, supported-models lookup, and connection-test endpoints during the update flow |
| `sam:model_config:delete` | Delete a model configuration |
| `sam:evaluations:read` | List and view datasets, examples, evaluators, experiments, runs, and run results |
| `sam:evaluations:write` | Create, update, or delete evaluation resources |
| `sam:evaluations:execute` | Trigger an experiment run or cancel an in-flight run |
| `sam:profile_provider:manage` | Get, configure, or remove the profile provider |
| `sam:rbac:read` | List and view roles, assignments, and claim mappings |
| `sam:rbac:create` | Create roles, assignments, and claim mappings |
| `sam:rbac:update` | Update a role or claim mapping |
| `sam:rbac:delete` | Delete a role, assignment, or claim mapping |

### Gateway Scopes

The Web UI gateway gates the artifact API and project sharing.

| Scope | Gated operations |
|---|---|
| `tool:artifact:create` | Upload artifacts and copy artifacts between sessions |
| `tool:artifact:list` | List artifacts and artifact versions |
| `tool:artifact:load` | Download an artifact, get a specific version, or render an artifact as PDF |
| `tool:artifact:delete` | Delete an artifact |
| `project:share` | Manage project-share grants |

### Agent Delegation Scopes

Required on the caller for the gateway to delegate a task to an agent.

| Scope | Gated operations |
|---|---|
| `agent:<name>:delegate` | Delegate a task to a specific agent (orchestrator or peer) |
| `agent:*:delegate` | Delegate to any agent |

### Per-Tool Scopes

Each tool declares its own `required_scopes` list. The gateway propagates the caller's resolved scopes to the downstream agent as `_enterprise_capabilities` on `userProps.A2AUserConfig`, and the agent applies the per-tool check at dispatch time. Per-tool scope names live in the tool's own configuration.

### Control-Plane Scopes

Used by the broker-fronted control surface that manages running apps.

| Scope shape | Gated operations |
|---|---|
| `control:apps:read` / `:create` | List or create apps (collection-level) |
| `control:apps/<name>:read` | Read a specific app |
| `control:apps/<name>:update` | Update a specific app (PUT or PATCH) |
| `control:apps/<name>:delete` | Delete a specific app |
| `control:apps/<name>:manage` | Custom sub-resources under an app |

### Event Mesh Subscriptions

Broker-side ACLs gate which topics a gateway or eval client can subscribe to. The scope shape uses path-like segments rather than colon-separated keys.

| Scope shape | Gated operations |
|---|---|
| `monitor/namespace/<ns>:a2a_messages:subscribe` | Subscribe to A2A messages in a namespace |

## Where Checks Fire

Knowing which enforcement point rejected a request tells you which scope to grant.

| Enforcement point | Required scope |
|---|---|
| Tool invocation | The tool's declared `required_scopes` |
| Agent delegation (peer routing) | `agent:<peer_name>:delegate` |
| Platform service request | The route's `sam:<resource>:<action>` scope |
| Gateway request (Web UI) | The route's `tool:artifact:*` or `project:share` scope |
| Control-plane operation | `control:apps/<name>:<action>` |

Per-tool scopes are owned by the tools themselves, not by the gateway. The gateway propagates the caller's resolved scopes downstream as `_enterprise_capabilities` on `userProps.A2AUserConfig`, and the downstream agent applies its own check. The gateway is intentionally not in the per-tool loop.

:::note
Peer delegation propagates the caller's identity, not the delegating agent's scopes. A user who cannot delegate directly to a peer agent cannot launder access through a permitted intermediary, because the JWT scopes that follow the task to the peer are always the original caller's.
:::

## Two Sources of Truth

A `default_rbac` deployment resolves scopes from a union of two stores.

| Source | Owner | Authored via |
|---|---|---|
| YAML files referenced by `authorization_service.*_path` | Operator | Text editor, `kubectl apply`, or image rebuild |
| `rbac_*` tables in the Platform service database | Platform admin | Platform web UI, `/api/v1/platform/rbac/*`, or `sam config apply` |

The two halves are **disjoint by construction**:

- Database foreign keys (`rbac_role_inheritance.parent_role_id`, `rbac_user_role_assignments.role_id`, `rbac_claim_mappings.role_id`) all point at `rbac_roles.id`. YAML rows have no `id` in that table, so the database cannot physically reference one.
- Creating a database role whose name collides with a YAML-defined role returns HTTP 409. A database role cannot inherit from a YAML role, and a database assignment cannot reference a YAML role.

Pick the YAML half for operator-bootstrapped baseline state: the admin role, default roles, and any roles whose lifecycle is tied to image releases. Pick the database half (Platform web UI or `sam config apply`) for everything you want auditable in the Platform service audit log, reviewable in pull requests, or editable without re-rolling pods.

List endpoints on the Platform API expose an `origin: "db" | "yaml"` field so you can tell them apart at a glance.

## Authoring with YAML

Two files define the YAML half. Paths are configurable. The shipped defaults are:

```yaml
# configs/gwe/platform.yaml
...
authorization_service:
  type: ${AUTHORIZATION_TYPE, none}
  role_to_scope_definitions_path: ${ROLE_DEFINITIONS_PATH, config/auth/role-to-scope-definitions.yaml}
  user_to_role_assignments_path: ${USER_ROLES_PATH, config/auth/user-to-role-assignments.yaml}
...
```

The same block must be present in the gateway config. Paths are resolved relative to the working directory the binary launched from. Absolute paths work too.

### Roles File

```yaml
# config/auth/role-to-scope-definitions.yaml
roles:
  analyst:
    description: "Can run tools and delegate to most agents"
    scopes:
      - "tool:*"
      - "session:*"
      - "project:*"
      - "agent:Orchestrator:delegate"
      - "agent:ResearchAgent:delegate"

  admin:
    description: "Full access"
    scopes:
      - "*"
```

Roles can inherit from other roles via `inherits: [parent_role]`. Cycles are detected at startup and fail the runtime fast.

### Users File

```yaml
# config/auth/user-to-role-assignments.yaml
users:
  alice@example.com:
    roles: [admin]

  bob@example.com:
    roles: [analyst]
    description: "Data analyst, no admin agent access"
```

Keys are user identities. Email identities are lowercased for matching. Opaque identifiers (OIDC `sub` UUIDs) are case-sensitive.

The `authorization_service` block also accepts `default_roles: [role1, role2]`, an optional list of roles automatically granted to any authenticated user who is not listed in the users file. Leave it unset or empty to deny unknown users entirely.

## Authoring with `sam config apply`

`sam config apply` manages the database half of the registry. Three kinds map 1:1 to the Platform service `/api/v1/platform/rbac/*` endpoints, all database-side only.

| Kind | Purpose | Diff key |
|---|---|---|
| `rbacRole` | A role and its scope list | `name` |
| `rbacAssignment` | A user-to-role grant | `(identity, roleName)` |
| `rbacClaimMapping` | An IdP-claim-value-to-role grant | `(oidcProvider, claimKey, claimValue, roleName)` |

Author roles and references by **name**. The CLI resolves names to Platform service UUIDs at plan time. The same `xref` machinery used for agent-to-skill references is reused here.

### Directory Layout

The CLI discovers RBAC specs from a top-level `rbac/` directory, partitioned by subdirectory:

```text
solace-chat-go/
  rbac/
    roles/
      sam_admin.yaml
      incident_responder.yaml
    assignments/
      oncall-rotation-alice.yaml
    claim-mappings/
      azure-admins-group.yaml
```

### `kind: rbacRole`

```yaml
# rbac/roles/incident_responder.yaml
kind: rbacRole
name: incident_responder
description: "Read incidents, respond to PagerDuty, comment on tickets."

spec:
  scopes:
    - "agent:incident-bot:invoke"
    - "agent:incident-bot:view"
    - "chat:*:read"
  inherits:
    - sam_user
```

`inherits` references **role names**, not IDs. A database role can only inherit from another database role. The foreign key from `rbac_role_inheritance.parent_role_id` to `rbac_roles.id` rejects any reference to a YAML-only role.

### `kind: rbacAssignment`

```yaml
# rbac/assignments/oncall-rotation-alice.yaml
kind: rbacAssignment
name: oncall-rotation-alice
description: "Alice carries the incident_responder role."

spec:
  identity: 8c1f...e9b7
  roleName: incident_responder
```

The header `name` is a **local handle**. It appears in plan output and manifest references but is never sent to the wire. The real identity of an assignment is the `(identity, roleName)` tuple.

`identity` is the **opaque IdP `sub`** the gateway resolves at login time. PII-bearing claims (email, `preferred_username`) are deliberately not stored on assignments. For group-based assignment without per-user rows, use `rbacClaimMapping`.

The API exposes Create and Delete only. There is no Update. To change Alice from `sam_user` to `sam_admin`, `sam config apply` emits one Delete and one Create. `--prune` is the practical mechanism for retiring the old row.

### `kind: rbacClaimMapping`

```yaml
# rbac/claim-mappings/azure-admins-group.yaml
kind: rbacClaimMapping
name: azure-admins-group
description: "Members of the Azure 'sam-admins' group get sam_admin."

spec:
  oidcProvider: azure
  claimKey: groups
  claimValue: "sam-admins"
  roleName: sam_admin
```

`oidcProvider` must match an entry in the Platform service `providers:` catalog. `claimKey` is the JSON key in the merged ID-token and userinfo claims (for example, `groups`/`roles`). `claimValue` is the literal value the user must carry to receive the mapped role.

### Manifest

```yaml
# manifest.yaml
kind: manifest
name: prod

resources:
  rbacRoles:
    - sam_admin
    - sam_user
    - incident_responder
  rbacAssignments:
    - oncall-rotation-alice
  rbacClaimMappings:
    - azure-admins-group
```

Standard `name@source` imports apply. A corporate-wide RBAC repository can be imported by per-environment manifests.

### Feature-Flag and Mini-IdP Behavior

If the Platform service `rbac` feature flag is off, the RBAC endpoints return HTTP 501. `sam config apply` detects this on its first probe call and surfaces a clear error rather than producing N×501 failures.

If `mini_idp_mode: true` is set, RBAC reads stay open but writes return HTTP 403. The CLI prints a single warning at plan time and emits one "skipped: mini_idp_mode" outcome per RBAC operation at apply time. The plan is still computed, so operators can see what would change once mini-IdP is off.

## Mapping IdP Claims to Roles

To grant roles from IdP group memberships rather than maintaining a per-user row, use the role provider surface.

The only role provider implemented today is `idp_claims`. It reads the merged ID-token and userinfo claims the gateway already passes to scope resolution, and translates matching values into roles. SCIM provisioning is on the roadmap. There is no Microsoft Graph integration and no Microsoft-specific role provider. Anything not present in the OIDC claims is out of scope.

### YAML Side (`idp_claims_config`)

In your gateway's `authorization_service` block:

```yaml
# configs/gwe/platform.yaml
authorization_service:
  type: default_rbac
  role_to_scope_definitions_path: config/auth/role-to-scope-definitions.yaml
  user_to_role_assignments_path: config/auth/user-to-role-assignments.yaml
  idp_claims_config:
    claim_key: groups
    mappings:
      "/sam-admins": [admin]
      "/sam-analysts": [analyst]
```

On the IdP side, configure a mapper that emits the user's groups (or roles, or any other set claim) on the userinfo or ID token. The gateway reads `claim_key` from the resolved claims and translates matching values into roles.

### Database Side (`kind: rbacClaimMapping`)

The same concept managed through `sam config apply`. One resource per `(provider, claim, value, role)` tuple. See Authoring with `sam config apply`.

The two halves are additive. A user can receive roles from the users file, from `idp_claims_config`, and from a database `rbacClaimMapping` simultaneously, and the resolved set is their union.

### OIDC Trust to a Self-Signed IdP

Each catalog entry in `providers:` accepts two optional fields for development against an IdP whose TLS chain is not in the system trust store.

```yaml
providers:
  - name: azure
    type: oidc
    issuer: https://idp.example.internal/realms/agent-mesh
    client_id: agent-mesh
    client_secret: "${OIDC_CLIENT_SECRET}"
    ca_cert_path: /etc/agent-mesh/certs/idp-ca.pem
    # insecure_skip_verify: true   # Demo only. See danger callout that follows.
```

| Field | Behavior |
|---|---|
| `ca_cert_path` | Path to a PEM file containing one or more trusted CA certificates. Appended to the system roots for OIDC discovery, token, and userinfo requests against this provider only. |
| `insecure_skip_verify` | Disables TLS certificate verification for this provider entirely. |

:::danger
`insecure_skip_verify: true` exposes the bearer-token exchange to MITM attackers on the IdP connection. Use `ca_cert_path` instead for anything past a quick demo. When both fields are set, the gateway logs a warning that `ca_cert_path` is ignored.
:::

## Bootstrap: The First Admin

RBAC writes require the `sam:rbac:*` family of scopes. Those scopes are themselves resolved through the system being bootstrapped, so the first admin has to come from somewhere outside `sam config apply`.

Three documented paths:

1. **YAML-seeded admin role (the happy path).** Author a `sam_admin` role in the roles file with `scopes: ["*"]`. Pair it with an `idp_claims_config.mappings` entry that grants the role to a known IdP group. Anyone who lands in that group carries `sam:rbac:*` from the first login. `sam config apply` does nothing here. The runtime resolves it on its own.
2. **`mini_idp_mode` plus admin claim.** Same as path 1 but using the built-in mini IdP for environments without an external IdP. Wire a known `sub` or claim value to `sam_admin` in YAML.
3. **Direct database seed.** An escape hatch for the truly stuck case. Write directly to the `rbac_user_role_assignments` table. Documented in the operator runbook. Not a `sam config apply` workflow.

If you forget the bootstrap step, the first `sam config apply` against a fresh cluster fails with HTTP 403 on the first role create because the Platform service refuses the call: the caller lacks `sam:rbac:create`. Fix by adding the YAML-side seed (either an `idp_claims_config.mappings` entry that grants `sam_admin` to your IdP group, or a `default_roles: [sam_admin]` entry) and rerunning the apply.

## Event Mesh Gateway

The Event Mesh gateway has no per-request bearer token. Identity has to be carried by the inbound message itself. Configure it on each handler:

```yaml
# configs/gateways/pirate_event_mesh_gateway.yaml
apps:
  - name: pirate_event_mesh_gateway
    app_exec: sam-gateway-enterprise
    app_config:
      authorization_service:
        type: default_rbac
        role_to_scope_definitions_path: config/auth/roles.yaml
        user_to_role_assignments_path: config/auth/users.yaml
      event_handlers:
        - name: pirate_request_handler
          subscriptions:
            - topic: pirate-request
          user_identity_expression: "input.user_properties:user_id"
          target_agent_name: Orchestrator
```

Identity resolution falls through this precedence chain, stopping at the first non-empty source:

1. `user_identity_expression` on the handler (evaluated against the inbound message).
2. `default_user_identity` on the handler.
3. `default_user_identity` on the gateway.
4. `force_user_identity` on the gateway (a development-only override that logs a `DEVELOPMENT MODE` warning).

If none of these produces a non-empty identity, the gateway discards the message with `authentication failed; discarding message reason=no_user_identity`. No agent dispatch occurs.

### Expression Syntax

Three common patterns:

```yaml
# 1. From a Solace user property
user_identity_expression: "input.user_properties:user_id"

# 2. From a JSON payload field
user_identity_expression: "input.payload:user_id"

# 3. From the topic (zero-indexed level).
#    For topic `pirate-request/alice`, level 1 is "alice".
user_identity_expression: "input.topic:1"
```

The expression must yield a non-empty string. Empty results fall through to the next source in the precedence chain.

## MCP Gateway

The MCP gateway enforces authorization in two places:

- **`tools/list` visibility filter.** The catalog returned to an MCP client contains only the tools whose backing agent the caller can delegate to.
- **`tools/call` delegation gate.** The same `agent:<name>:delegate` scope is re-checked at task-submission time. A caller that knows a tool's name (perhaps from a stale client-side cache) but lacks the scope receives an MCP protocol error.

Both checks share the same identity and the same scopes as HTTP RBAC. There is no MCP-specific scope shape. Grant `agent:<agent_name>:delegate` (directly or via wildcard) and the MCP client sees that agent's tools.

### Three Deployment Modes

| Mode | `enable_auth` | `authorization_service` | `tools/list` | `tools/call` |
|------|---------------|-------------------------|--------------|--------------|
| Open | `false` | omitted | unfiltered | passes for every caller |
| Authentication only | `true` | omitted | **unfiltered** | every authenticated caller passes the delegation gate |
| Authentication and authorization | `true` | configured | filtered to caller's `agent:<name>:delegate` scopes | denied for callers missing the scope |

Authentication-only mode emits one startup warning on the gateway:

```text
MCP gateway running in authentication-only mode — no authorization_service configured; all authenticated callers will pass the delegation gate
```

This is almost never what you want in production. Either configure `authorization_service` or set `enable_auth: false` for a development sandbox.

## Troubleshooting

### Authorization Denied; User Has the Right Role

The gateway and Platform service `authorization_service` blocks must agree on `type` and on the `*_path` values. If the gateway is on `default_rbac` but the Platform service is on `none` (or vice versa), one side resolves scopes against an empty registry. Verify both blocks point at the same files and the same database.

Also check the Platform web UI or `GET /api/v1/platform/rbac/roles`. If the role was added via YAML but the Platform service was not restarted (or `kubectl rollout`-ed), its in-memory state still reflects the previous file.

### `tools/list` Returns an Empty Catalog

A user that resolves to no scopes in `default_rbac` mode receives an empty MCP catalog. Causes:

- The user appears in the users file but their roles point at names that do not exist in the roles file.
- The user's roles have empty `scopes:` lists.
- The MCP gateway's `user_id_claim` does not match how the users file is keyed (for example, `user_id_claim: sub` but the users file is keyed on email).

The gateway logs `MCP tools/list: empty scopes after resolution, returning empty catalog` once per call. Per-tool hides also surface as a single summary line `MCP tools/list: hidden by RBAC`.

### `agent delegation denied`

Look for a `WARN` line on the gateway:

```text
agent delegation denied  user_id=carol@example.com  agent=agent_a
```

The user is missing `agent:agent_a:delegate`. Grant the scope to one of the user's roles, or add the user to a role that already has it.

### `authentication failed; discarding message`

Event-Mesh-gateway-specific. The handler's `user_identity_expression` returned empty and no fallback was configured. Either fix the publisher to set the expected property, or set `default_user_identity` on the handler or the gateway.

### Role Change Is Not Reflected in the MCP Client

`mcp-go` caches the tools list within a session. A user whose roles change mid-session does not see the new catalog until the MCP client reconnects. Workaround: have the user disconnect and reconnect.

### A Successful Apply Did Not Change Behavior

The Platform service rebuilds the merged scope registry on every RBAC mutation. If the rebuild fails, the previous write succeeded but the Platform service keeps serving the previous snapshot until the next successful rebuild. The metric `rbac_composer_rebuild_failures_total` increments and an `ERROR` log line fires on every failed rebuild. Inspect Platform service logs around the failed-apply timestamp.

### Cross-Reference: Who Changed What

Every RBAC mutation lands in the Platform service audit log with the calling principal recorded as `actor`. See Audit and Compliance for the audit-log fields and retention.

## What Next?

You have RBAC enforcing on roles, assignments, and IdP claims. Next, decide where the secret values referenced by `${OIDC_CLIENT_SECRET}` and friends actually come from in your deployment, covered in Secrets management. Wiring up the IdP itself (OIDC discovery, redirect URIs, signing-key rotation) is covered in the IdP-setup section of Configure.
