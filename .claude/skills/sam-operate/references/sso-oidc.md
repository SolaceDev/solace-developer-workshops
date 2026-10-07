# SSO / OIDC for the entrypoint

The Agent Mesh entrypoint implements **native, in-process OIDC**. There is no `oauth2-proxy` sidecar and no `oauth2_config.yaml` (those are Python Agent Mesh). You configure a **providers catalog** in the entrypoint runtime YAML; the entrypoint owns the login and callback routes itself (callback is `/api/v1/auth/callback`).

## The providers catalog

A top-level `providers:` block maps named IdPs to their config. Each entry:

```yaml
providers:
  keycloak:                                  # the catalog key = the provider name
    issuer: "${OIDC_ISSUER}"                 # required — e.g. https://kc.example.com/realms/myrealm
    client_id: "${OIDC_CLIENT_ID}"           # required
    client_secret: "${OIDC_CLIENT_SECRET}"   # required (env-sourced)
    redirect_uri: "${OIDC_REDIRECT_URI, }"   # optional — derived from frontend_server_url if omitted
    scopes: ["openid", "email", "profile", "offline_access"]   # optional (defaults shown)
    ca_cert_path: "${OIDC_CA_CERT_PATH, }"   # optional — PEM bundle for a private-CA IdP
    insecure_skip_verify: false              # optional — DEV/LAB ONLY; disables TLS verification
    dev_mode: false                          # optional — DEV ONLY; allows http://localhost login
```

YAML keys stay snake_case (operator-written YAML convention). Secrets are `${VAR}` references, never literals.

## Selecting the active provider

- **One entry** in the catalog → auto-selected.
- **More than one** → the entrypoint's `app_config` must set `external_auth_provider` to a catalog key; a missing/mismatched name fails at startup with an error listing the available providers.
- `external_auth_callback_uri` (per-app) overrides the entry's `redirect_uri`, which overrides the value derived from `frontend_server_url` + `/api/v1/auth/callback`.
- A catalog entry missing `issuer` or `client_id` is **dropped with a WARN, not a hard failure** — a mistyped entry silently disappears and login just won't offer that provider. If a provider "isn't there," check the entrypoint logs for the drop warning before anything else.

## Session secret

OIDC requires a signing key for the session/state cookie: `session_secret_key` in YAML or `SESSION_SECRET_KEY` env (generate with `openssl rand -hex 32`). `dev_mode: true` drops the cookie's `Secure` flag so plain `http://localhost` works for local testing — never in production.

## Self-signed / private-CA IdPs

Two fields control TLS on the entrypoint's calls to the IdP (discovery, token exchange, userinfo, refresh):

- `ca_cert_path` — path to a PEM file with the CA bundle. Use this for a private-CA IdP; it keeps verification on. (Mounted file path — fine to name; it's the customer's own file.)
- `insecure_skip_verify: true` — disables hostname/chain checks entirely. **Dev/lab only** — it exposes tokens to MITM on the IdP connection.

## IdP-side setup (provider-agnostic)

Create a **confidential** client, set its valid redirect URI to your entrypoint's `<external-base>/api/v1/auth/callback`, and configure the claim you'll map to roles (commonly `groups`) — that claim feeds the RBAC `idp_claims` provider (see [rbac.md](rbac.md)).

## Docs note

There **is** a published **Enabling Single Sign-On (SSO)** page on the docs site, and it describes the Go architecture — in-process OIDC login with no separate auth proxy — covering IdP registration, redirect URIs, the provider catalog and the login flow. Point operators there, and treat this reference as the verified config surface for shapes that page doesn't spell out. Don't link the older Python SSO material, and don't invent a doc URL. The shipped enterprise entrypoint example config (which the customer receives with their distribution) is the working template to copy from.
