# RBAC: roles, scopes, providers

## Turn it on: `authorization_service.type`

Set in the entrypoint and platform YAML:

| Type | Behavior |
|---|---|
| `none` | every authenticated user gets `["*"]` (all scopes). Dev/test only. |
| `default_rbac` | resolves roles + scopes from YAML files and/or the platform DB. Production. |
| `deny_all` | no scopes granted. The secure-by-default fallback when the block is omitted. |

(`type: default` is **not** a valid value — that was a baseline invention.)

## Scope syntax

Three colon-separated segments: `<category>:<resource>:<verb>`. Segment 2 is a specific instance name, `*` (any instance), or the literal `_` sentinel (no specific instance — for collection-level or flat-feature actions). Wildcards: a granted `*` matches one required segment; a trailing `*` matches the rest. Bare `*` is the superadmin grant. Verified scopes:

- `*` — everything (full admin).
- `tool:email:send`, `tool:datadog_logs:invoke` — the only tool-execution scopes. All other built-in tools require no scopes: agent access (`agent:<name>:invoke`) implies access to the tools configured on that agent.
- `agent:<name>:invoke`, `agent:*:invoke` — **agent invocation**: gates BOTH a user submitting a task to that agent through the entrypoint AND peer delegation (one agent routing to another). Same scope, both call paths.
- `workflow:<uuid>:invoke`, `workflow:*:invoke` — **deployed-workflow invocation**. Deployed workflows live in their own `workflow` category, so `agent:*:invoke` does NOT cover them. The three-row rule for the required invoke scope: a deployed workflow needs `workflow:<dashed-uuid>:invoke`, a platform-deployed agent needs `agent:<dashed-uuid>:invoke`, and a YAML/built-in agent needs `agent:<name>:invoke`. Segment 2 is always the dashed UUID, never the underscored broker name.
- `connector:_:create`, `connector:*:read`/`:update`/`:delete`, `connector:*:*` — connector management (per-instance `connector:<name>:…` is accepted by the matcher but not yet enforced; and per-resource families generally: `agent_builder:*:*`, `entrypoint:*:*`, `model_config:*:*`, `skill:*:*`, `toolset:*:*`, etc.). (`project` is ownership-gated, not a CRUD scope family — its only scope is the retained-but-unenforced `project:_:share`.)
- `rbac:_:read` / `:_:create` / `:_:update` / `:_:delete`, `rbac:*:*` — managing RBAC itself.
- `analytics:_:read`, `deployment:_:read`, `builder:_:use`, `profile_provider:_:update` — flat platform features.

The full catalog of fixed-string scopes ships with the entrypoint, alongside helpers that build per-instance scopes (`agent:<name>:invoke`, `workflow:<uuid>:invoke`, and the `InvokeScopeForInstance` pivot the runtime uses to pick between them). If a user asks for a scope you can't confirm from the RBAC reference doc, say you'd verify rather than emit a guess.

## Where roles come from (two sources of truth)

1. **YAML files** (operator-bootstrapped baseline), pointed to from the authorization service:
   - `role_to_scope_definitions_path` → a roles file: each role has `scopes:` (and optional `inherits:` parents).
   - `user_to_role_assignments_path` → a users file: each identity (email lowercased; OIDC `sub` case-sensitive) lists `roles:`.
2. **Platform DB** — roles/assignments created via the UI/API, auditable. A DB role can't reuse a YAML role's name (returns 409); DB roles can't reference YAML roles.

Use the YAML half for the bootstrap admin + defaults; use the DB half for day-to-day, auditable management.

## Mapping IdP groups to roles: `idp_claims`

Set `user_to_role_provider: idp_claims` on the authorization service, then map a claim's values to roles:

```yaml
authorization_service:
  type: default_rbac
  user_to_role_provider: idp_claims
  idp_claims_config:
    claim_key: groups            # which OIDC claim to read
    mappings:                    # claim value → list of SAM roles
      analysts: [analyst]
      sam-admins: [admin]
```

This is how "users in the `analysts` IdP group get the `analyst` role." `idp_claims` is the supported claim-based provider today; **SCIM is the planned next provider; there is no MS Graph provider** — don't offer one. (The IdP must emit the claim — configure that on the OIDC client; see [sso-oidc.md](sso-oidc.md).)

## Worked shape: gate connector management to admins, give analysts a role

- Define an `admin` role with `*` (or scope it down to `connector:*:*` + what else admins need) and an `analyst` role with the tool/agent scopes that team needs.
- Map IdP groups to those roles via `idp_claims` (`groups` → `admin`/`analyst`), or assign directly in the users file / platform UI.
- For "only admins manage connectors," the gate is `connector:*:*` (or just `connector:_:create` + `connector:*:read|update|delete` to split create from manage) on the `admin` role; for "only analysts may invoke agent X," grant `agent:X:invoke` on the `analyst` role and leave it off everyone else.
- For "this role can run workflows," grant `workflow:*:invoke` (or per-UUID `workflow:<uuid>:invoke`) PLUS `agent:*:invoke`. The agent wildcard covers the child agent hops a workflow's DAG delegates to (each hop is authorized on its own). A later release makes the workflow grant transitive to those hops, at which point the extra agent wildcard is unnecessary but stays harmless.

## Other notes

- **`mini_idp_mode: true`** (built-in Keycloak deployments) downgrades RBAC-management endpoints to read-only — group assignment happens in the IdP, not in SAM.
- **Enforcement points:** tool execution (a tool's `required_scopes`), agent/workflow invocation (the invoke scope `InvokeScopeForInstance` resolves — `agent:<name>:invoke` or `workflow:<uuid>:invoke`; direct user submission AND peer routing share it), control-plane and platform-API calls. Peer delegation propagates the **original caller's** identity, not the delegating agent's scopes (no scope laundering).
- **Feature flag:** the `rbac` flag gates only the **in-product RBAC management UI** (custom-roles pages, assignable-scope catalog, known-users picker, view-as). The foundational substrate is **always on regardless of the flag**: the `/api/v1/platform/rbac/{roles,assignments,claimMappings}` CRUD API, configapply reconcile/pull of `rbac*` kinds, and entrypoint/broker authorization enforcement. So a flag-off environment still enforces scopes — if RBAC "isn't taking effect," look at `authorization_service.type` and role assignments, not the flag.
- There is a published **RBAC reference** page on the docs site (scope reference, authoring, two-sources model) — point operators there for the exhaustive scope list and YAML field detail. Full YAML authoring for the roles/users files: defer to that page / `sam-declarative-config`; name the keys here, don't hand-assemble large files from memory.
