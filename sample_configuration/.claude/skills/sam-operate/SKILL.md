---
name: sam-operate
description: Use when operating a deployed Solace Agent Mesh instance — managing the runtime lifecycle of running components (list, start, stop, restart, or remove a specific running agent or workflow via the builder UI or the `/api/v1/control` API), turning on SSO/OIDC login for the entrypoint (Keycloak, Azure AD, Okta), configuring RBAC roles and scopes (including which users can use an agent or manage connectors), managing secrets and promoting config across dev/staging/prod, or upgrading SAM to a new version. Not for diagnosing why something failed or reading task event logs (sam-troubleshoot), authoring agents/tools/entrypoints/connectors (those skills), or first-time install (sam-install-run / sam-deploy).
version: main-v2.249.1-dirty
---

# sam-operate

Operator configuration for a running Solace Agent Mesh (the Go product, SAM-Go): **SSO/OIDC, RBAC, secrets/promotion, upgrades.** Morgan's skill. This is a Go runtime — its auth is **native and in-process**, not the Python SAM model: there is **no separate `oauth2-proxy` service and no `oauth2_config.yaml`**. If you're about to reach for those, stop. Diagnosis ("X is broken/failing", reading task logs) is `sam-troubleshoot`, not here.

## Picking the area

| Operator task | Reference |
|---|---|
| List / start / stop / restart / remove a **running** agent or workflow instance | [Runtime lifecycle](#runtime-lifecycle) (below) |
| Log users in via an IdP (Keycloak/Azure/Okta), self-signed IdP certs | [references/sso-oidc.md](references/sso-oidc.md) |
| Roles & scopes — gate an agent, gate connector management, map IdP groups to roles | [references/rbac.md](references/rbac.md) |
| Secrets, `${VAR}` substitution, dev→staging→prod promotion, rotation | [references/secrets-and-upgrades.md](references/secrets-and-upgrades.md) |
| Upgrade SAM, migrations, rollback | [references/secrets-and-upgrades.md](references/secrets-and-upgrades.md) |

## Runtime lifecycle

Manage the components (agents, workflows, other AWE-hosted instances) **currently running** in a deployed mesh, via the broker-routed control plane. This is the imperative "act on what's live right now" surface — distinct from `sam config apply`, which changes the *declared* set of resources and lets the reconciler converge. To bounce one misbehaving agent without redeploying or touching the others, this is the surface.

Two paths reach the same control plane:

- **Builder UI** — the operator-facing surface for managing running agents and workflows.
- **Platform control API** — for scripting, hit `/api/v1/control/apps` with `sam api`, which reuses your `sam auth login` token. Needs a reachable entrypoint proxy. There is no `sam control` CLI command; it was removed in favour of this API.

| Task | `sam api` call |
|---|---|
| List running components | `sam api /api/v1/control/apps` |
| Show one component | `sam api /api/v1/control/apps/<NAME>` |
| Stop a running instance | `sam api -X PATCH /api/v1/control/apps/awe/instances/<NAME> --field enabled=false` |
| Start a stopped instance | `sam api -X PATCH /api/v1/control/apps/awe/instances/<NAME> --field enabled=true` |
| Stop **and remove** an instance | `sam api -X DELETE /api/v1/control/apps/awe/instances/<NAME>` |
| Create an instance from a config file | `sam api -X POST /api/v1/control/apps/awe/instances --input <CONFIG-FILE>` |

"Restart just one agent" = stop then start the same instance. See [`sam api`](../../../docs/docs/documentation/reference/cli.md) for target/token resolution (`--target`, `--url`, `SAM_WEBUI_URL`).

## What lives where (ownership)

- **Entrypoint runtime YAML** owns the OIDC `providers:` catalog and the `authorization_service` (RBAC). These are **not** managed by `sam config apply` and have no builder-UI control — the entrypoint/platform YAML is the real surface, so this skill shows those verified shapes directly.
- **Platform DB** holds the second half of RBAC (roles/assignments created via UI/API) — the "two sources of truth" model alongside the YAML roles.
- **Secrets** are never YAML literals — only `${VAR}` references or `*_file` mounts, sourced from env / .env / Kubernetes Secrets.
- **Resource config** (agents, connectors, toolsets, entrypoints) is `sam-declarative-config` + the builder UI — not this skill.

## Hard rules (each counters an observed failure)

- **Native OIDC, not a proxy.** SAM-Go's entrypoint does OIDC in-process via a top-level `providers:` catalog. Never describe an `oauth2-proxy` sidecar or `oauth2_config.yaml` — that's Python SAM and it will mislead.
- **Use the real `authorization_service.type` values:** `none` (all authenticated users get all scopes — dev only), `default_rbac` (YAML + platform DB), `deny_all` (secure default when omitted). Baselines invented `type: default` — that's wrong.
- **Scopes are verified strings, not guesses.** Real (3-segment `<category>:<resource>:<verb>`): `*`, `tool:*:*`, `agent:<name>:invoke`, `connector:_:create` / `connector:*:read`, `rbac:_:read|create|update|delete`, `agent_builder:*:*`. **`agent:<name>:invoke` gates BOTH direct user invocation through the entrypoint AND peer routing (one agent delegating to another)** — same scope, both call paths. If you're unsure a scope exists, say so rather than emit a plausible invention (baselines fabricated `*:*:*` style and mis-scoped agent access). The full catalog ships with the entrypoint; defer to the RBAC reference doc if you need the exhaustive list.
- **Role providers:** YAML files (`role_to_scope_definitions_path`, `user_to_role_assignments_path`) plus the optional **`idp_claims`** provider mapping an OIDC claim (e.g. `groups`) to roles. `idp_claims` is the supported claim-based provider today, SCIM is the planned next one — **there is no MS Graph provider**; don't offer one.
- **Secrets never inline, never echoed.** `${VAR}` / `*_file` only. A secret pasted into chat is exposed — say so once, advise rotation, reference it as `${VAR}` thereafter. **Rotating `SESSION_SECRET_KEY` logs every user out** — flag that before suggesting it.
- **Don't write resource YAML from memory.** For agent/connector/toolset/entrypoint YAML, defer to `sam-declarative-config`. The auth/secrets shapes in this skill's references are the verified operator surface and are fine to show; resource definitions are not.
- **No edition split, no `pip`.** Auth/RBAC are features you configure, never a different build. Upgrades are image-tag rolls (Helm) + auto-applied migrations, not `pip install`.
- **Live lifecycle is this skill — not config-apply, not troubleshoot.** Stopping/starting/restarting/removing a *running* instance goes through the builder UI or the `/api/v1/control` API via `sam api` (this skill). Don't push it to `sam-declarative-config` (that changes the declared set, not the live one) or to `sam-troubleshoot` (that's diagnosing *why* something failed, not acting on it). Diagnose with troubleshoot, then act via the control API/UI. Never guess a `sam agent …` / `sam control …` / `kubectl …` command for this — `sam control` was removed; the live surface is the `/api/v1/control` API (via `sam api`) and the builder UI.

## References

| Topic | File |
|---|---|
| SSO/OIDC — providers catalog, fields, provider selection, self-signed certs, session secret | [references/sso-oidc.md](references/sso-oidc.md) |
| RBAC — authorization service types, scope syntax + real scopes, role providers, two sources of truth | [references/rbac.md](references/rbac.md) |
| Secrets/env promotion + upgrades — substitution forms, file mounts, rotation, roll order, migrations, rollback | [references/secrets-and-upgrades.md](references/secrets-and-upgrades.md) |
