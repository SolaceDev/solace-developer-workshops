---
title: RBAC Setup Walkthrough
description: "Take a permissive Solace Agent Mesh deployment from authorization_service.type none to least-privilege RBAC — first role, IdP-claim mapping, deliberate-denial loop, and the hardened production default."
sidebar_position: 5
---

# RBAC Setup Walkthrough

This tutorial walks a permissive Solace Agent Mesh deployment from `authorization_service.type: none` (every authenticated user has wildcard scopes) to a least-privilege RBAC configuration. By the end you will have:

- A roles file with two roles (`sam_admin` and `sam_analyst`) and a known IdP group mapped to each.
- The gateway and Platform service flipped to `default_rbac` and resolving scopes from the same source.
- A deliberate-denial verification: log in as a user without a role, see the denial in the audit log, fix the mapping, retry.
- A hardened default that denies unknown users — the production posture.

This is not a reference. For the full scope catalog, wildcard rules, control-plane scopes, and the Event Mesh / MCP gateway specifics, the canonical source is Administering → RBAC reference.

## What You Need Before You Start

- Agent Mesh installed and running. Installing → Install covers the install; Installing → Configure covers the env-var contract.
- A working SSO login. The walkthrough assumes you already have an OIDC provider wired to the gateway (the `providers:` catalog populated, `EXTERNAL_AUTH_PROVIDER` set, `FRONTEND_USE_AUTHORIZATION=true`, redirect URI registered with the IdP). If you do not yet, walk the IdP-setup section of Installing → Configure first — RBAC sits on top of SSO and is meaningless without it.
- The ability to add a group-membership mapper to your OIDC client. Every IdP has its own UI for this; you need at least one named group that emits in the userinfo or ID-token claims as part of a `groups` list.
- Two test accounts in your IdP — one that is a member of an admin-style group, one that is not. The deliberate-denial step needs both.

The walkthrough uses the bundled `configs/` shape — the same shape the deploy scripts under Installing → Deploy options emit. If you have copied that tree elsewhere, the YAML paths in this tutorial are still relative to your project root.

## The Three Modes

The `authorization_service.type` field selects the mode:

| Type | Behavior | When to use |
|---|---|---|
| `none` | Every authenticated user gets `*` (all scopes) | Verifying SSO end-to-end before adding RBAC. |
| `default_rbac` | Roles, assignments, and IdP-claim mappings come from configuration | Production. |
| `deny_all` | No scopes granted to anyone | Default when the block is omitted entirely. |

The shipped configs default to `${AUTHORIZATION_TYPE, none}`, so out of the box every authenticated user resolves to wildcard scopes — useful while you are still checking that SSO works, dangerous to leave on. The rest of this tutorial walks the move to `default_rbac`.

## Step 1 — Confirm You Are Starting From `none`

Before touching anything, confirm the baseline. With your gateway and Platform service running, log in via SSO and open any agent. Every request passes; the gateway logs carry no denial lines.

In a terminal, check the gateway logs for the line:

```text
authorization service: none (all access granted)
```

That confirms the gateway booted into permissive mode. The Platform service logs the same. If you see `authorization service: deny_all` instead, the `authorization_service` block was omitted entirely — add it back with `type: none` and restart before continuing.

## Step 2 — Author the First Role

In `default_rbac`, the source of truth for role definitions is the Platform service. The gateway makes a broker call to the Platform service at token-mint time and bakes the resolved scopes into the JWT, so every gated request reads its scopes from the JWT itself — no per-request platform call.

Author the roles file:

```yaml
# config/auth/role-to-scope-definitions.yaml
roles:
  sam_admin:
    description: "Full access — all platform CRUD and any agent."
    scopes:
      - "*"

  sam_analyst:
    description: "Read agents and delegate to the Orchestrator. No platform writes."
    scopes:
      - "sam:agent_builder:read"
      - "sam:gateways:read"
      - "sam:deployments:read"
      - "tool:artifact:list"
      - "tool:artifact:load"
      - "agent:Orchestrator:delegate"
```

Then create the user-assignments file — empty for now, with no per-user rows:

```yaml
# config/auth/user-to-role-assignments.yaml
users: {}
```

A few notes on what is in the roles file:

- `sam_admin` carries the universal wildcard `*`, which matches every scope the runtime checks. The matching rules — exact match, single-segment wildcard, suffix wildcard — are documented in Administering → RBAC reference.
- `sam_analyst` is a worked example of a narrower role. The `sam:` family gates the Platform service surface (agent builder, connectors, gateways, deployments — the full catalog lives in the reference page). `tool:artifact:list` and `:load` let the user see and download artifacts, but `tool:artifact:create` and `:delete` are deliberately absent. `agent:Orchestrator:delegate` is what makes the role actually useful — without it, the user can log in but cannot send a task to the Orchestrator.
- Names are arbitrary, but the convention is `sam_<role>` for built-in shapes (`sam_admin`, `sam_user`, `sam_analyst`) and `<team>_<role>` for org-specific roles (`security_responder`, `data_analyst`).

## Step 3 — Map Your IdP Group to a Role

Listing every user in the assignments file by hand does not scale. The supported pattern is **mapping IdP group claims to roles**: the IdP emits a `groups` claim on the userinfo response, and the RBAC layer translates matching values into roles. This is the only role-acquisition surface today — there is no Microsoft Graph integration; SCIM provisioning is on the roadmap. Anything that is not in the OIDC claims is out of scope.

### IdP Side

In whichever OIDC client your gateway uses, add (or confirm) a group-membership mapper that emits the user's groups in the userinfo response or ID token. The output looks like:

```json
{
  "sub": "00uid7a8f9b0c1d2e3f4g",
  "email": "alice@example.com",
  "groups": ["sam-admins", "engineering"]
}
```

Most IdPs ship a built-in mapper for this. In Keycloak it is the **Group Membership** mapper on the client's **Mappers** tab, configured with **Token Claim Name** `groups` and **Full group path** off. In Azure AD it is the **groups** claim on the Token configuration. In Okta it is a **Groups** claim on the app's claim set. The shape matters more than the IdP: a JSON array of strings under a single claim key.

Create two groups in the IdP — `sam-admins` and `sam-analysts` is a fine pair to use — and assign one of your test accounts to each.

### Platform Service Side

Wire the platform service to map those group values to roles. Edit the `authorization_service` block on the Platform service config:

```yaml
# configs/gwe/platform.yaml
apps:
  - name: platform_service_app
    app_config:
      component_type: platform
      namespace: ${NAMESPACE, solace-agent-mesh}

      authorization_service:
        type: ${AUTHORIZATION_TYPE, none}
        role_to_scope_definitions_path: ${ROLE_DEFINITIONS_PATH, config/auth/role-to-scope-definitions.yaml}
        user_to_role_assignments_path: ${USER_ROLES_PATH, config/auth/user-to-role-assignments.yaml}
        user_to_role_provider: idp_claims
        idp_claims_config:
          oidc_provider: ${EXTERNAL_AUTH_PROVIDER}
          claim_key: groups
          mappings:
            "sam-admins":   [sam_admin]
            "sam-analysts": [sam_analyst]
```

A few knobs that matter:

- **`user_to_role_provider: idp_claims`** is required to activate the IdP-claim mapping path. Without it, the runtime falls back to per-user rows in the assignments file and never consults `idp_claims_config`. The only other supported value is the empty string (YAML assignments only).
- **`oidc_provider`** must match an entry in your `providers:` catalog. If you have a single-entry catalog and have not set `EXTERNAL_AUTH_PROVIDER` manually, the runtime auto-defaults this field to the catalog's only entry — so you can omit it. With multiple providers, set it explicitly to avoid silent claim-loss after migration.
- **`claim_key`** is the JSON key the runtime reads from the merged claims. `groups` is the most common choice; `roles` is a second-typical pattern.
- **`mappings`** maps claim values to role-name lists. The values are matched as literal strings against each element of the claim array. Group paths (Keycloak's `/sam-admins`) and plain names (`sam-admins`) are both valid — the value here must match what the IdP actually emits, character for character.

The gateway's own `authorization_service` block stays minimal — under `default_rbac` the gateway no longer loads the YAML files itself; it asks the Platform service at token-mint time:

```yaml
# configs/gwe/gwe.yaml
apps:
  - name: a2a_webui_backend_app
    app_config:
      namespace: ${NAMESPACE, solace-agent-mesh}

      authorization_service:
        type: ${AUTHORIZATION_TYPE, none}
```

A bare `type:` keeps the gateway in **broker-only mode** — it asks the Platform service over the broker at token-mint time and never touches a roles file directly. If the gateway block also carries `role_to_scope_definitions_path` (and optionally `user_to_role_assignments_path`), the gateway additionally builds an in-process role engine from those files as a fallback. For new deployments, leave the gateway block bare and keep the Platform service as the single source of truth; the in-process fallback is there for legacy single-process setups.

## Step 4 — Flip the Switch

Set the environment variable and restart both services:

```bash
export AUTHORIZATION_TYPE=default_rbac
```

Restart the Platform service first, then the gateway. In the Platform service logs, look for:

```text
authorization service: default_rbac
role provider: idp_claims
```

The first line confirms the Platform service is in RBAC mode. The second confirms the IdP-claim role provider was activated and points at the `oidc_provider` and `claim_key` values you configured. If the second line is missing, `user_to_role_provider` was not set — recheck the YAML and restart.

Log out, log back in as the user in `sam-admins`, and load the agents page. Every action passes. In the gateway logs you will see no denial lines.

The JWT minted at login carries the user's resolved scope set as a `scopes` claim. The deliberate-denial step below is the most useful end-to-end check that RBAC is wired correctly; for ad-hoc inspection, paste a captured JWT into a decoder such as https://jwt.io and read the `scopes` array.

Admins (any identity holding the `sam:rbac:read` scope) can also list every current role assignment with `GET /api/v1/platform/rbac/assignments`. The response uses the standard list envelope (`{data: [...], meta: {pagination: ...}}`); each row carries at minimum `{identity, roleId, origin}` — `origin` is `"yaml"` for assignments-file rows and `"db"` for assignments created through the API or the AI assistant. The Platform also exposes `GET /api/v1/platform/user/capabilities`, which returns `{"capabilities": {"manageRbac": bool}}`; the flag is `false` when the platform is running in mini-IDP mode (every RBAC mutation endpoint returns 403 regardless of scope) and `true` otherwise.

## Step 5 — Verify with a Deliberate Denial

The most useful verification is making a request that the runtime will deny and watching it fail in the right place. Log out, and log back in as the user **not** in either group.

Open the agents page. The page loads, but every gated action — viewing an agent, sending a task, invoking a tool — fails. The frontend shows a `permission denied` or `403` toast.

When the denial is an agent delegation (sending a task to the Orchestrator), the audit log records it:

```text
WARN agent delegation denied seq=42 userID=bob@example.com agent=Orchestrator
```

When the denial is a per-tool scope check (the Orchestrator tried to invoke a tool the user lacks scope for), the audit log records:

```text
WARN tool access denied seq=43 userID=bob@example.com tool=<tool-name> requiredScopes=[<scope>]
```

Pure HTTP-API 403s from the Platform service (a list call the user lacks `sam:agent_builder:read` for, for example) do not produce a per-request audit line — the HTTP middleware returns 403 directly. The audit pipeline records RBAC tool / agent / control-plane decisions and authentication outcomes; the schema and the full event list are in Administering → Audit and compliance. Enable the audit logger with `audit_log.enabled: true` on each component if you have not already — the same page covers the YAML and the precedence rules.

Now fix the denial deliberately, the way an operator would in practice. Two paths:

**Path A — narrow grant via the assignments file.** Add an explicit per-user row mapping the locked-out account to `sam_analyst`:

```yaml
# config/auth/user-to-role-assignments.yaml
users:
  bob@example.com:
    roles: [sam_analyst]
```

Email keys are lowercased for matching. Opaque OIDC `sub` identifiers (UUID-shaped strings) are case-sensitive. Save the file and restart the Platform service. Bob logs out, logs back in, and can now load the agents page and delegate to the Orchestrator, but still cannot create or delete agents.

**Path B — broaden the claim mapping.** If the right answer is for everyone in a known group to have analyst access, edit `idp_claims_config.mappings` to add another value:

```yaml
idp_claims_config:
  oidc_provider: ${EXTERNAL_AUTH_PROVIDER}
  claim_key: groups
  mappings:
    "sam-admins":   [sam_admin]
    "sam-analysts": [sam_analyst]
    "engineering":  [sam_analyst]
```

Restart the Platform service. Anyone who is a member of the `engineering` group in the IdP now resolves to `sam_analyst`.

Both paths produce the same observable result for the affected user. Pick the path that matches how you want the grant to be reviewed: per-user rows show up in the assignments file and live alongside the rest of the YAML; claim mappings are organisation-wide and follow the IdP group memberships. Most production deployments lean on claim mappings and reserve per-user rows for narrow exceptions.

## Step 6 — Harden the Default

The walkthrough so far has left `default_roles:` unset, which means any authenticated user who matches no claim mapping and has no per-user row resolves to **no scopes** and is denied everywhere. That is the production-correct default — leave it that way.

If you have set `default_roles:` to anything during testing — for example to make every authenticated user a `sam_user` — remove it now:

```yaml
# configs/gwe/platform.yaml
authorization_service:
  type: ${AUTHORIZATION_TYPE, none}
  role_to_scope_definitions_path: ${ROLE_DEFINITIONS_PATH, config/auth/role-to-scope-definitions.yaml}
  user_to_role_assignments_path: ${USER_ROLES_PATH, config/auth/user-to-role-assignments.yaml}
  user_to_role_provider: idp_claims
  idp_claims_config:
    oidc_provider: ${EXTERNAL_AUTH_PROVIDER}
    claim_key: groups
    mappings:
      "sam-admins":   [sam_admin]
      "sam-analysts": [sam_analyst]
```

There is no `default_roles:` key here — that is the point. Restart the Platform service. Log in as a user in no mapped group and with no per-user row. Every gated action denies. The audit log shows the denials with the user's identity. Production is now in least-privilege mode.

One more sanity check on the configuration shape itself. The `none` → `default_rbac` flip is the only field you toggle to switch modes; leave the rest of the block static. Operators sometimes get a `403`-everywhere outcome from a subtler mistake — the gateway is on `default_rbac` but the Platform service is still on `none` (or vice versa). Both services share the `AUTHORIZATION_TYPE` env var in the shipped configs precisely to avoid this. If you have parameterised them separately, the **Gateway and Platform service disagree on mode** troubleshooting entry covers what that failure mode looks like.

## Troubleshooting

### Every Request Denies After the Flip

**Symptoms.** Every authenticated user sees `permission denied` on the frontend. The audit log (component=audit on the Platform service) shows `agent delegation denied` and `tool access denied` lines for every gated action, and the user *is* in the right IdP group.

**Diagnostic.** Check the Platform service logs for `authorization service: default_rbac` immediately followed by `role provider: idp_claims`. If you see `default_rbac` but no `role provider` line, `user_to_role_provider` was not set on the Platform service config and the IdP-claim mapping never activated. Every user then falls through to "no roles" and resolves to no scopes.

**Resolution.** Add `user_to_role_provider: idp_claims` to the Platform service's `authorization_service` block and restart. The startup logs now show both lines.

**Prevention.** When you add `idp_claims_config:`, always add `user_to_role_provider: idp_claims` alongside it. The two go together — the config block on its own is silently ignored.

### Claim Values Look Right but No Roles Resolve

**Symptoms.** Logs show `authorization service: default_rbac` and `role provider: idp_claims` at startup, but the user's resolved scope set is empty even though they are a member of a mapped IdP group.

**Diagnostic.** Add a temporary log line on your side or check the userinfo response from the IdP directly. The literal value the IdP emits must match the key in `idp_claims_config.mappings` character-for-character. Keycloak with **Full group path** on emits `/sam-admins`; with it off, `sam-admins`. Azure AD emits group object IDs (UUIDs) unless you have configured the **Optional claims** to emit group names. The mapping key has to match what the IdP actually sends.

**Resolution.** Either flip the IdP mapper so it emits names instead of paths (or vice versa) or update `idp_claims_config.mappings` so the key matches the literal value the IdP emits. Restart the Platform service.

**Prevention.** When wiring up RBAC for the first time, log a sample claim payload from the IdP once (a `userinfo` curl with the user's access token works) and copy the literal values into the mapping. Do not assume the IdP's UI labels match what is on the wire.

### Gateway and Platform Service Disagree on Mode

**Symptoms.** The gateway logs `authorization service: default_rbac` but every request denies with a generic error. The audit log on the Platform service shows no denial entries — the gateway is not even reaching it.

**Diagnostic.** Check the Platform service startup logs. If they show `authorization service: none` (or `deny_all`), the two services are out of sync. Under `default_rbac`, the gateway resolves scopes by calling the Platform service over the broker. If the Platform service is not in RBAC mode, the gateway gets either wildcard scopes back (`none`) or no scopes back (`deny_all`), and authorisation behaves nothing like what you configured.

**Resolution.** Confirm `AUTHORIZATION_TYPE=default_rbac` is exported in the environment the Platform service launched from. The shipped configs parameterise both blocks with the same env var so they stay in lockstep; if you have parameterised them separately, set both. Restart whichever service is on the wrong mode.

**Prevention.** Keep both services parameterised by the same env var. If you must split them, add a CI check that asserts the two values match before any deploy.

### Role-Name Typo Silently Denies

**Symptoms.** The user is in the right IdP group; the claim value matches the mapping key; the Platform service is in `default_rbac`. The user still has no scopes.

**Diagnostic.** Open `role-to-scope-definitions.yaml` and look for the role name in the mapping value list (`["sam_admin"]` or `["sam_analyst"]`). Compare to the role keys defined at the top of the file. A typo (`sam_admins` with an extra `s`, `sam-admin` with a dash) silently produces an empty role set because the mapping points at a role that does not exist.

**Resolution.** Fix the typo and restart the Platform service. The composer rebuilds the merged scope registry on every RBAC mutation; the restart picks up the corrected file.

**Prevention.** When you add a new role, add the entry under `roles:` before adding any mappings that reference it. The Platform service does not fail-fast on a mapping that references a non-existent role — it just silently produces no scopes.

### Tools List Returns an Empty Catalog

**Symptoms.** A user in `sam_analyst` (or any non-admin role) loads the agents page and sees no tools. Logs show `MCP tools/list: hidden by RBAC` or `MCP tools/list: empty scopes after resolution, returning empty catalog`.

**Diagnostic.** The tools catalog is filtered by the caller's `agent:<name>:delegate` scopes. If the user has no delegate scope, the tools list comes back empty — even tools the user could not delegate to are hidden, by design. Check the role's `scopes:` list for an `agent:*:delegate` or `agent:<specific>:delegate` entry.

**Resolution.** Either add an explicit `agent:Orchestrator:delegate` (or whichever agent backs the tool the user needs) to the role's scope list, or use a wildcard `agent:*:delegate` for an open-tool-catalog posture.

**Prevention.** When you author a new role, list the agents it needs to reach explicitly. Wildcarding `agent:*:delegate` is the convenience choice; enumerating each agent is the auditable choice.

## What Next?

You now have RBAC enforcing roles, assignments, and IdP-claim mappings end to end. Next, decide where the secret values referenced by `${OIDC_CLIENT_SECRET}` and the rest of the OIDC trust chain actually come from in your deployment — covered in Administering → Secrets management. For the audit-log fields the deliberate-denial step relied on, read Administering → Audit and compliance. The full scope catalog and per-gateway specifics (Event Mesh, MCP) are in Administering → RBAC reference.
