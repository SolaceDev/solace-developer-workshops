# Chat entrypoints: Slack, Teams, email, WhatsApp

Field names are real keys for naming and recognition; full YAML shape and validation belong to `sam-declarative-config` (or pull a UI-created entrypoint). The builder UI form is generated from the same schema.

## Slack (GA)

**Socket Mode only** — the entrypoint opens an outbound WebSocket to Slack; no public URL, no Events-API webhook mode exists. Don't offer one.

**Slack-side setup (the user does this at api.slack.com):**
1. Create an app, **enable Socket Mode**, generate an app-level token (`xapp-…`) with `connections:write`.
2. Bot token scopes the entrypoint uses: `app_mentions:read`, `channels:history`, `chat:write`, `files:read`, `files:write`, `im:history`, `im:write`, `reactions:write`, `users:read`, `users:read.email`, `users.profile:read`.
3. Event subscriptions: `app_mention`, `message.channels`, `message.im` — delivered over the Socket Mode WebSocket; there is **no Request URL to configure**.
4. Install to workspace → bot token (`xoxb-…`); invite the bot to target channels.

**SAM-side fields:** `bot_token` (xoxb, required), `app_token` (xapp, required), `default_agent_name` (optional — falls back to first discovered agent). Optional knobs exist for the initial status message, markdown correction, and feedback buttons.

**Routing:** an inline `@AgentName` mention in the message routes to that agent; otherwise `default_agent_name` (set it explicitly — the fallback is whichever agent is discovered first). Those are the only two mechanisms — there is no per-channel routing config. A Slack thread maps to one SAM session, so follow-ups in-thread keep context; DMs work the same way. Replies stream back into the thread; artifacts upload as files. **Silent no-response usually means the bot wasn't invited to the channel** or an event subscription is missing — check those before the tokens.

## Microsoft Teams (GA)

**Azure-side:** an Azure Bot Service registration provides `microsoft_app_id` (GUID) and `microsoft_app_password` (client secret); `microsoft_app_tenant_id` only for single-tenant bots. The Bot Framework delivers messages by **webhook**, so the entrypoint needs a public URL — the UI's **networking details** view shows the exact endpoint to register.

**SAM-side fields:** the three credentials above plus `default_agent_name` (defaults to the Orchestrator), `initial_status_message`, `enable_typing_indicator`, `max_download_file_size_mb`.

## Email (experimental — `SAM_FEATURE_EMAIL_GATEWAY`)

Polls a mailbox over IMAP and turns each authenticated email into an agent task; the sender's From: address becomes the SAM user identity.

- **Connection:** `mailbox`, `imap_host`, `imap_port` (default 993).
- **Auth:** `auth_mode` = `oauth2` (Microsoft Entra ID: `oauth2_tenant_id` / `oauth2_client_id` / `oauth2_client_secret`; replies via Graph API) or `basic` (IMAP/app password; replies via `smtp_host`/`smtp_port`).
- **Sender authentication policy:** `policy_mode` = `log_only` / `require_dmarc` (default — drop on DMARC fail) / `strict` (SPF+DKIM+DMARC); plus `allowed_senders` hard allowlist and `trusted_authserv_ids`. These are the security core of the type — explain them, don't skip them.
- **Guardrails:** attachment MIME allow/deny lists, message and attachment size caps, `poll_interval_seconds`.
- **Save runs a live IMAP probe** — a failed connection blocks creation with the reason.

## WhatsApp (experimental — `SAM_FEATURE_WHATSAPP_GATEWAY`)

Meta Cloud API webhook (needs a public HTTPS URL — see networking details). Fields: `phone_number_id`, `access_token` (System User token), `app_secret` (validates webhook HMAC), `verify_token` (webhook handshake), `default_agent_name`. Inbound text + media; replies via the Graph API. Treat as a PoC-grade surface — set expectations accordingly.

## Common to all four

- Tokens/secrets are masked after save; `sam config pull` exports them as `${VAR}` placeholders.
- The entrypoint identifies the human (Slack/Teams profile email, email From:, WhatsApp number) — that identity is what RBAC and audit see; identity/permission depth → `sam-operate`.
- Verify by sending a real message and watching the reply; auth failures surface in the entrypoint's logs and deployment status.
