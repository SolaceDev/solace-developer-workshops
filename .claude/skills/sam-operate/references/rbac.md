# RBAC: roles, scopes, providers

## Turn it on: `authorization_service.type`

Set in the gateway and platform YAML:

| Type | Behavior |
|---|---|
| `none` | every authenticated user gets `["*"]` (all scopes). Dev/test only. |
| `default_rbac` | resolves roles + scopes from YAML files and/or the platform DB. Production. |
| `deny_all` | no scopes granted. The secure-by-default fallback when the block is omitted. |

(`type: default` is **not** a valid value — that was a baseline invention.)

## Scope syntax

Colon-separated hierarchical strings, charset `[a-z0-9_*-]`, with `*` wildcards per segment (a granted `*` matches one required segment; trailing-`*` matches the rest). Verified scopes:

- `*` — everything (full admin).
- `tool:*`, `tool:artifact:load` — tool operations.
- `agent:<name>:delegate`, `agent:*:delegate` — **peer delegation**: lets one agent call another. **This is not the scope for an end user "using" an agent** — agent invocation through the gateway is gated by the user being authenticated + the gateway/app's own access policy, not by a per-agent user scope. Don't promise `agent:X:use`/`:invoke` — those aren't the model.
- `sam:connectors:*` — connector management (and `sam:<resource>:<action>` generally for platform resources, e.g. `sam:agent_builder:*`).
- `sam:rbac:read|create|update|delete` — managing RBAC itself.
- `control:apps/<name>:<action>` — control-plane operations.

If a user asks for a scope you can't confirm from this list, say you'd verify it against the RBAC reference rather than emit a guess.

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

- Define an `admin` role with `*` (or scope it down to `sam:connectors:*` + what else admins need) and an `analyst` role with the tool/agent scopes that team needs.
- Map IdP groups to those roles via `idp_claims` (`groups` → `admin`/`analyst`), or assign directly in the users file / platform UI.
- For "only admins manage connectors," the gate is the `sam:connectors:*` scope on the `admin` role; for "analysts use agent X," the gate is authentication + the analyst role carrying whatever tool scopes the agent's tools require — not a per-agent user scope.

**Known limitation — be honest about this.** SAM-Go has **no first-class "only group G may invoke agent X" control.** Agent invocation through the gateway is gated by authentication plus the app/gateway access policy, and the *capabilities* an agent exposes are gated by the tool `required_scopes` its tools carry. So the enforceable approximation of "only analysts use this agent" is: ensure the agent's tools require scopes only the `analyst` role grants. If the requirement is truly "non-analysts must not reach this agent at all," say plainly that per-agent user-reach restriction isn't a first-class RBAC feature today rather than inventing a scope for it. And note the approximation only bites on tool-heavy agents — a pure-LLM/chat agent whose value is the response itself (no scoped tools) has nothing for scope-gating to catch, so capability-gating won't restrict it at all.

## Other notes

- **`mini_idp_mode: true`** (built-in Keycloak deployments) downgrades RBAC-management endpoints to read-only — group assignment happens in the IdP, not in SAM.
- **Enforcement points:** tool execution (a tool's `required_scopes`), peer delegation (`agent:<name>:delegate`), control-plane and platform-API calls. Peer delegation propagates the **original caller's** identity, not the delegating agent's scopes (no scope laundering).
- **Feature flag:** with the `rbac` flag off, `default_rbac` soft-downgrades to `none` with a warning and the RBAC management API returns 501. If RBAC "isn't taking effect," check that flag.
- There is a published **RBAC reference** page on the docs site (scope reference, authoring, two-sources model) — point operators there for the exhaustive scope list and YAML field detail. Full YAML authoring for the roles/users files: defer to that page / `sam-declarative-config`; name the keys here, don't hand-assemble large files from memory.
