# MCP gateway (early access)

Exposes SAM agents as MCP tools to external MCP clients (Claude Code, Cursor, MCP Inspector, custom clients). **Direction check:** consuming a remote MCP server across agents = `mcp` connector (`sam-connectors`); inline on one agent = `sam-author-agent`. This page is your-agents-as-the-server.

## How agents appear to clients

**One MCP tool per agent skill**, named `<agent_name>_<skill_name>` (sanitized to lowercase alphanumeric + underscores) — not one opaque "ask the agent" tool. The catalog updates live as agents come and go. `includeTools` / `excludeTools` patterns (exact or regex, matched against agent name, skill name, or final tool name; exclude wins) narrow what's exposed.

## Connecting a client

The endpoint is `<external-base>/gw/<slug>/mcp` (gateway proxy, default port 8800; `endpointPath` defaults to `/mcp`). Locally/embedded, `<external-base>` is `http://localhost:8800`; for deployments, read it from the gateway's **networking details** view in the UI rather than guessing. Transport is **Streamable HTTP** (the config value is historically spelled `sse`/`http` — same thing). For Claude Code:

```
claude mcp add --transport http sam <external-base>/gw/<slug>/mcp
```

then `/mcp` inside Claude Code to check status and complete login when auth is on. Browser-based clients (MCP Inspector, MCPJam) additionally need their Origin in `corsAllowedOrigins`.

## The three auth modes (say which one you're setting up)

| Mode | Config | tools/list | tools/call |
|---|---|---|---|
| No auth (dev/trial) | `enableAuth: false` + `defaultUserIdentity` | unfiltered | every caller acts as the default identity (the gateway mints it a real identity, so trust-mode agents still accept the delegations) |
| Authentication only | `enableAuth: true`, no authorization service | unfiltered | any authenticated user can call every tool |
| Authentication + RBAC | `enableAuth: true` + the gateway's authorization service (role/user files) | **filtered** to the caller's `agent:<name>:delegate` scopes | denied without the scope |

Both authenticated modes use the same OAuth setup below — RBAC just adds the authorization service on top. RBAC scope shape: one scope per agent, `agent:<name>:delegate` (wildcard `agent:*:delegate`). Under RBAC a missing tool in the client's list is a **scopes problem, not a connection problem** — check the user's roles before debugging transport. Role/user administration depth → `sam-operate`.

## Securing with OAuth (UC-23 — e.g. Keycloak)

What the gateway implements: OAuth 2.1 authorization-code + **PKCE (required)**, **dynamic client registration** (RFC 7591) so MCP clients self-register, and the discovery metadata clients need (RFC 9728 protected-resource + RFC 8414 authorization-server documents, served at the proxy's `/.well-known/...` paths for the gateway). Clients discover all of it from the 401 challenge — no client-side endpoint hand-configuration.

**IdP-side (Keycloak or any OIDC provider):**
- **One confidential client per MCP gateway** — don't share clients between gateways.
- Redirect URI to register: `<external-base>/gw/<slug>/oauth/callback`. The slug is immutable, so this entry survives delete+recreate **if you reuse the slug**.
- Scopes: `openid`, `email`, `profile`, `offline_access` (refresh).

**SAM-side (names only — full YAML via `sam-declarative-config`):** `enableAuth: true`, the OIDC provider reference (issuer, client id, client secret — the secret goes in as a `${VAR}` env reference, never a literal), `allowedRedirectUris` — the allowlist of *MCP-client* redirect URIs (loopback hosts match any port per RFC 8252; leaving it empty logs a security warning), and `userIdClaim` (`email` default; `sub`/`upn`/`preferred_username` options).

**What breaks when you turn auth on (answer this before the user asks):**
- Every existing client gets 401 until its user completes the OAuth flow. No grace period.
- The gateway mints its own short-lived JWTs (≈1 h) with a **per-gateway signing key generated in memory at startup — every gateway restart invalidates all outstanding tokens.** Clients holding an IdP refresh token re-authenticate silently; others see a login prompt (in Claude Code: re-run `/mcp` and log in). Expected behavior, not a bug.
- Tokens from one gateway don't work at another (per-gateway keys — intentional blast-radius limit).
- With RBAC on, under-scoped users see a *shorter tool list*, not an error — expect "where did my agent go" questions.

## Verify

`claude mcp add … && /mcp` → tool list shows `<agent>_<skill>` entries → call one. 401 loop = redirect URI missing from `allowedRedirectUris` or the IdP client's allowlist; empty tool list under RBAC = missing `agent:<name>:delegate` scopes.
