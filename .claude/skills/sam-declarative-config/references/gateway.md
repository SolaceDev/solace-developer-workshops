# Kind: `gateway`

Manifest path: `resources.gateways`

A gateway exposes the platform to external clients (HTTP, Slack, MS
Teams, etc.). The `type` field is immutable after creation. The
`values` field is a free-form object whose shape is dictated by the
gateway type's schema — consult the per-type section below (or fetch a
running gateway with `sam config pull --only gateway --name X`) for
the per-type field set. `publicUrl` is optional and only meaningful
for HTTP-style gateways.

### Connection model: outbound (Socket Mode) vs inbound (webhook)

Gateway types differ in *which direction* the connection runs, and this
dictates what you must configure outside the platform:

- **Outbound / Socket Mode (e.g. `slack`)** — the gateway opens an
  outbound WebSocket to the provider using an app token. No inbound
  endpoint, no public URL, no DNS — it works behind NAT. Just supply the
  tokens in `values`.
- **Inbound webhook (e.g. `teams`, HTTP-style)** — the provider POSTs to
  a public URL the gateway exposes. You MUST register that URL on the
  provider side (see below), and the platform host must be publicly
  reachable.

### Inbound webhook URL (the `/gw/<slug>/...` named mount)

Non-root gateways are mounted under **`/gw/<slug>/`** on the platform's
public host, where `<slug>` is the gateway's URL-stable slug (derived
from `name` when not set explicitly; lowercase `[a-z0-9]`, dashes
between runs). The slug is **stable across delete/recreate** — unlike the
internal UUID, which changes each time — so a webhook/callback URL bound
to the slug survives reprovisioning. **Never put the gateway UUID in an
externally-registered URL; only the slug is routed** (a UUID path 404s).

For a **Teams** gateway, the Bot Framework **messaging endpoint** to set
in the Azure Bot registration's Configuration blade is therefore:

```
https://<platform-host>/gw/<slug>/api/messages
```

e.g. `https://rc-sam-go.mymaas.net/gw/teams-bot/api/messages`. You can
sanity-check the path before wiring Azure: a `POST` to it should return
**401** (Bot Framework auth rejecting the unsigned request) — a **404**
means the slug/path is wrong. The slug only exists after the gateway is
created, so the order is: apply the gateway → read its slug → set the
provider URL.

### Single-tenant vs multi-tenant (Teams)

`microsoft_app_tenant_id` is **required for single-tenant Azure Bots**
(Microsoft App Type = SingleTenant): the gateway must mint its outbound
Bot Connector token from the bot's *home* tenant. Leave it **empty for
multi-tenant** bots (the token comes from the shared `botframework.com`
authority). Getting this wrong is a classic silent half-failure:
**inbound works** (the task is submitted) but **every outbound reply
fails** with `send activity: HTTP 401: Authorization has been denied for
this request`, because the Connector rejects a token minted from the
wrong authority. If you see inbound-ok / outbound-401, check the tenant
setting and the bot's App Type first.

### `default_agent_name` must be a real, deployed agent

The schema default for `default_agent_name` is the literal string
`Orchestrator` — the built-in orchestrator's name. That is a placeholder,
not a guarantee: it routes to an agent of that exact name, which only
exists if such an agent is actually deployed. Set `default_agent_name` to
the **exact `name:` of an agent in this same config** (and in the
manifest's `resources.agents`), or unmatched messages 404 at dispatch.


## Wrapper schema

CreateGatewayRequest is the request body for POST /gateways.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `name` | `string` | yes | len 3–255 | (no description) |
| `slug` | `string` |  | len 3–63 | (no description) |
| `description` | `string` | yes | len 10–1000 | (no description) |
| `type` | `string` | yes | len 2–50 | (no description) |
| `publicUrl` | `string` |  |  | (no description) |
| `values` | `any` | yes |  | (no description) |
| `deploy` | `bool` | yes |  | (no description) |

## Per-type detail

Each gateway type has its own `values:` shape. Find the section matching the `type:` your gateway uses.

## type: email

**Email Gateway**

Trigger agents from incoming email via IMAP. Microsoft 365 with OAuth 2.0 (recommended) or personal Gmail with an App Password.

> ⚠ OAuth 2.0 against a Microsoft 365 / Entra ID tenant is the recommended production path. Basic auth (App Password) is provided for personal Gmail or legacy IMAP mailboxes during development.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `mailbox` | `string` | yes |  | matches regex | The email address whose inbox this gateway polls. e.g. support@solace.com |
| `imap_host` | `string` | yes | `outlook.office365.com` |  | Common values: outlook.office365.com (Microsoft 365, default), imap.gmail.com (Gmail). Auto-suggested based on mailbox domain. |
| `imap_port` | `number` |  | `993` |  | Default 993 (TLS). Use 143 only with STARTTLS. |
| `auth_mode` | `radio` | yes | `oauth2` |  | OAuth 2.0 (default) is the production-recommended path for Microsoft 365 mailboxes; basic auth (App Password) is for personal Gmail or legacy IMAP. OAuth 2.0 mode also routes replies through Microsoft Graph; basic auth uses SMTP. |
| `imap_password` | `password (secret)` | yes |  | secret | For Gmail, generate an App Password at https://myaccount.google.com/apppasswords. Leave placeholder when editing to keep existing value. |
| `smtp_host` | `string` |  | `smtp.gmail.com` |  | Outbound SMTP host for agent replies. Defaults to Gmail. (OAuth 2.0 mode replies via Microsoft Graph and ignores this.) |
| `smtp_port` | `number` |  | `587` |  | Default 587 (STARTTLS). |
| `oauth2_tenant_id` | `string` | yes |  |  | The Microsoft Entra ID tenant the OAuth app is registered in. |
| `oauth2_client_id` | `string` | yes |  |  | (no description) |
| `oauth2_client_secret` | `password (secret)` | yes |  | secret | (no description) |
| `trusted_authserv_ids` | `string` | yes | `protection.outlook.com` |  | Comma-separated identities (first token) of your receiving mail server's Authentication-Results header. Verdicts from any other authservid are ignored. Common values: protection.outlook.com (Microsoft 365, default), mx.google.com (Gmail). |
| `policy_mode` | `select` | yes | `require_dmarc` |  | Decides whether the gateway accepts a message based on its DMARC/SPF/DKIM verdicts. 'Require DMARC' (default, production-safe) drops any message whose DMARC did not pass. 'Strict' additionally requires SPF and DKIM to pass. 'Log only' accepts every message and just records what would have been rejected — use it only during an initial observation rollout, and pair it with 'Require DMARC pass to accept sender as the SAM user' below so spoofed senders cannot impersonate real users while you observe. |
| `require_dmarc_for_identity` | `boolean` |  | `true` |  | When ON (recommended), the gateway only treats the message's From: address as the authenticated SAM user when DMARC passes. This is the safety net for the case where 'DMARC policy mode' is set to 'Log only' — without this gate, log_only would let any spoofed From: address impersonate a real user. Leave ON unless you have intentionally allowlisted a sender pipeline that does not publish DMARC. |
| `trusted_internal_tenant_id` | `string` |  |  |  | Typically the same as the OAuth2 tenant ID above and pre-filled when that field is set. Differs only in cross-tenant access scenarios. When set AND the receiving MTA is Exchange Online (protection.outlook.com in trusted_authserv_ids), mail authenticated by Exchange Online inside this tenant is admitted even when DMARC is unstamped (the typical state for intra-tenant Office 365 mail). Leave blank for Gmail or to require DMARC for all mail. |
| `allowed_senders` | `string` |  |  |  | Comma-separated list of sender email addresses permitted to trigger the gateway. When empty, all senders are allowed (subject to the auth policy). When set, any sender not in the list is dropped before auth and identity evaluation. |
| `mime_allowlist` | `string` |  |  |  | Comma-separated MIME types permitted as attachments. When empty, every MIME type is allowed (subject to the denylist). When set, any attachment whose declared OR detected MIME is not in the list is dropped. Wildcards like image/* match the whole type. |
| `mime_denylist` | `string` |  | `application/x-msdownload, application/x-msdos-program, application/x-msi, application/x-ms-shortcut, application/hta, application/x-bat, application/x-wsh, application/java-archive, application/x-iso9660-image, application/onenote` |  | Comma-separated MIME types refused as attachments. Pre-populated with the recommended baseline (executables, .lnk, .hta, .iso, OneNote, Java archives). Edit or clear if your environment has different requirements. Deny takes precedence over allow on overlap. |
| `delivery_mode` | `select` |  | `poll` |  | Default 'Poll only' fetches new mail on a fixed interval (configured below). Choose 'Auto' for near-zero inbound latency when the IMAP server advertises IDLE — falls back to polling otherwise. 'IDLE only' refuses to start when the server can't push (use when IDLE is required and you want a hard failure on misconfig). |
| `poll_interval_seconds` | `number` |  | `30` |  | How often to fetch new mail. Hidden in IDLE-only mode (mail arrives push-driven). Auto mode uses this only when it falls back to polling. |
| `max_message_size_mb` | `number` |  | `25` |  | Whole-message size cap. Messages larger than this are dropped before parse. |
| `max_attachment_size_mb` | `number` |  | `10` |  | Per-attachment size cap. Any attachment larger than this drops the whole message. |
| `default_agent_name` | `agent_select` |  |  |  | The agent that receives dispatched email messages. |

### Example

```yaml
kind: gateway
name: example_email_gateway
description: "Example email gateway. Replace with a real description (10+ chars)."
spec:
  type: email
  deploy: true
  values:
    mailbox: "your-mailbox@example.com"
    imap_host: "outlook.office365.com"
    # optional: imap_port: 993
    auth_mode: "oauth2"
    imap_password: ${EXAMPLE_EMAIL_GATEWAY_IMAP_PASSWORD}  # secret — provide via env var
    # optional: smtp_host: "smtp.gmail.com"
    # optional: smtp_port: 587
    oauth2_tenant_id: "..."
    oauth2_client_id: "..."
    oauth2_client_secret: ${EXAMPLE_EMAIL_GATEWAY_OAUTH2_CLIENT_SECRET}  # secret — provide via env var
    trusted_authserv_ids: "protection.outlook.com"
    policy_mode: "require_dmarc"
    # optional: require_dmarc_for_identity: true
    # optional: trusted_internal_tenant_id: "00000000-0000-0000-0000-000000000000"
    # optional: allowed_senders: "alice@solace.com, bob@solace.com"
    # optional: mime_allowlist: "text/plain, application/pdf, image/*"
    # optional: mime_denylist: "application/x-msdownload, application/x-msdos-program, application/x-msi, application/x-ms-shortcut, application/hta, application/x-bat, application/x-wsh, application/java-archive, application/x-iso9660-image, application/onenote"
    # optional: delivery_mode: "poll"
    # optional: poll_interval_seconds: 30
    # optional: max_message_size_mb: 25
    # optional: max_attachment_size_mb: 10
    # optional: default_agent_name: "..."
```

## type: event_mesh

**Event Mesh Gateway**

Connect agents to your Solace event brokers to process real-time events

> ⚠ Optionally configure a separate Solace broker for event sourcing, or use the default system broker

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `broker_connection_type` | `select` | yes | `default` |  | Select the event broker to use for sourcing events. Choose 'Default' to use the system broker, or 'Custom' to specify a different broker. |
| `broker_url` | `string` | yes |  | matches regex | The host URI of the event broker (e.g., tcps://broker.example.com:55443) |
| `broker_vpn` | `string` | yes |  |  | (no description) |
| `broker_username` | `string` | yes |  |  | (no description) |
| `broker_password` | `password (secret)` | yes |  | secret | Required. Enter the broker password explicitly — it is never inherited from the Agent Mesh broker. Leave the placeholder to keep the existing value. |
| `tls_skip_verify` | `select` |  | `false` |  | Controls whether the broker's TLS certificate is validated. Skip verification is insecure — development and testing only. |
| `event_rules` | `event_rules` | yes | `[]` | len 0–0 | Define rules that process incoming events from the broker and route them to agents. |

**Inner schema for `event_rules` (`event_rules`)**:

List of event-routing rules. Each rule subscribes to one or more topics and routes messages to a target agent or workflow.

Each entry is an object with:

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `name` | `string` | yes |  | matches regex | Unique rule identifier within this gateway. Case-insensitive uniqueness applies. |
| `subscriptions` | `array<object>` | yes |  | len 0–0 | Topics this rule listens on. At least one subscription is required. |
| `messageFormat` | `select` |  | `json` | one of: json, text, xml, raw_bytes, protobuf, structured | Inbound payload encoding. Drives how the gateway decodes incoming broker messages before invoking the target. |
| `payloadEncoding` | `string` |  | `utf-8` |  | [advanced] Character encoding for text-shaped payloads. Defaults to utf-8. |
| `targetAgent` | `string` |  |  |  | Name of the agent that handles messages matching this rule. Mutually exclusive with targetWorkflowName. |
| `targetWorkflowName` | `string` |  |  |  | Name of the workflow that handles messages matching this rule. Mutually exclusive with targetAgent. |
| `promptTemplate` | `textarea` |  |  |  | Required when targetAgent or targetWorkflowName is set. Liquid template rendered against the incoming message to build the agent/workflow input. {payload} and {topic} are expanded; other {payload.path.to.field} forms extract from the JSON payload. |
| `inputExpression` | `string` |  |  |  | [advanced] Raw sacexpr expression used to build the input to a workflow target (e.g. "input.payload" to pass the JSON payload through as-is). When set on a workflow target, overrides promptTemplate. Not used for agent targets. |
| `defaultUserIdentity` | `string` |  |  |  | Static identity to attribute incoming events to (e.g. "sfdc_event_user"). Used for RBAC and audit. Overridden by userIdentityExpression when both are set. |
| `userIdentityExpression` | `string` |  |  |  | sacexpr expression that resolves to the user identity per message (e.g. "input.user_properties.requester"). |
| `forwardContext` | `object` |  |  | len 0–0 | Map of context-key → sacexpr expression. Evaluated against the incoming message and forwarded to the output handler's expression context (accessible via user_data.forward_context). |
| `structuredInvocation` | `object` |  |  | len 0–0 | Schema-validated invocation for workflow targets. Supplies input_schema and output_schema as a Data part on the A2A message. |
| `acknowledgmentPolicy` | `object` |  |  | len 0–0 | When to acknowledge the broker. Object form for full control; string shorthand ("on_receive" / "on_completion") expands to {mode: <string>}. |
| `successOutput` | `object` |  |  | len 0–0 | How to publish the target's successful response. |
| `errorOutput` | `object` |  |  | len 0–0 | How to publish errors from the target. |
| `artifactProcessing` | `object` |  |  | len 0–0 | [advanced] Extract artifacts from the incoming message and attach them to the dispatched task. See sacexpr docs for expression syntax. |


### Example

```yaml
kind: gateway
name: example_event_mesh_gateway
description: "Example event_mesh gateway. Replace with a real description (10+ chars)."
spec:
  type: event_mesh
  deploy: true
  values:
    broker_connection_type: "default"
    broker_url: "tcps://broker.example.com:55443"
    broker_vpn: "default"
    broker_username: "solace-client"
    broker_password: ${EXAMPLE_EVENT_MESH_GATEWAY_BROKER_PASSWORD}  # secret — provide via env var
    # optional: tls_skip_verify: "false"
    event_rules:
      - name: route_orders
        subscriptions:
          - topic: "events/orders/>"
        targetAgent: Orchestrator
        promptTemplate: "Process this order event: {{ message.payload }}"
        acknowledgmentPolicy:
          mode: on_completion
          timeoutSeconds: 300
        messageFormat: json
        successOutput:
          enabled: true
          topic: "events/orders/responses"
          topicType: static
          # Advanced output knobs (UI doesn't render these — YAML authors only):
          # responseType: structured       # task_response:structured_output (workflow targets)
          # customExpression: ""           # set responseType=custom and use this for arbitrary sacexpr
          # format: json
          # outputSchema: { ... }          # JSON Schema; payload validated before publish
          # onValidationError: log         # log | drop
        errorOutput:
          enabled: true
          topic: "events/orders/errors"
          topicType: static
```

## type: mcp

**MCP Gateway**

Expose SAM agents as Model Context Protocol tools for Claude Code, MCP Inspector, IDEs, and other MCP-compatible clients

> ⚠ When enableAuth is on, your IdP client must allowlist the per-gateway redirect URI <external-base>/gw/<gateway_id>/oauth/callback before clients can sign in

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `enableAuth` | `select` | yes | `true` |  | When on, the gateway requires a Bearer token on every tool call and joins the cluster's OAuth flow (per-gateway signer, IdP from EXTERNAL_AUTH_PROVIDER, scopes from the cluster RBAC catalog). When off, all callers are attributed to defaultUserIdentity and no token is required — no-auth / local-dev only. |
| `endpointPath` | `string` |  | `/mcp` | len 1–255; matches regex | Path under /gw/<gateway_id>/ where the MCP Streamable HTTP endpoint is served. Leading slash optional. Defaults to /mcp — clients connect to <external-base>/gw/<gateway_id>/mcp. |
| `defaultUserIdentity` | `string` |  |  | max len 255 | User identity attributed to all tool calls when enableAuth is off. Required when enableAuth is off; rejected at startup when enableAuth is on (HTTP transport carries identity via the Bearer token, not this field). |
| `allowedRedirectUris` | `array<object>` |  | `[]` | len 0–0 | Allowlist of MCP-client redirect URIs the gateway accepts on /oauth/authorize. Loopback hosts (http://127.0.0.1, http://localhost) match any port per RFC 8252; everything else must match exactly. Empty list with enableAuth on is a known security gap — RFC 7591 DCR is unauthenticated, so any caller could register an attacker-controlled redirect URI. The gateway emits a startup WARN when empty. |
| `serverName` | `string` |  | `SAM MCP Gateway` | len 1–255 | Name reported to MCP clients in server metadata. Defaults to 'SAM MCP Gateway'. |
| `serverDescription` | `string` |  |  | max len 1024 | Description reported to MCP clients in server metadata. |
| `includeTools` | `array<object>` |  | `[]` | len 0–0 | Allowlist of tool-name patterns to expose. Empty = expose all. Patterns are exact match (case-insensitive) or regex when they contain special chars. Filters check against agent name, skill name, AND final tool name. |
| `excludeTools` | `array<object>` |  | `[]` | len 0–0 | Denylist of tool-name patterns. Takes precedence over includeTools when both match. |
| `corsAllowedOrigins` | `array<object>` |  | `[]` | len 0–0 | Allowlist of browser Origin values accepted from browser-based MCP clients (MCPJam, MCP Inspector). Empty = allow all (server-to-server MCP clients never trigger CORS, so wide-open is harmless for them). Required for browser clients on a different origin than the gateway — without a matching origin the browser's preflight OPTIONS is blocked. Typical local-dev values: http://127.0.0.1:3010 (MCPJam), http://localhost:6274 (MCP Inspector). |

### Example

```yaml
kind: gateway
name: example_mcp_gateway
description: "Example mcp gateway. Replace with a real description (10+ chars)."
spec:
  type: mcp
  deploy: true
  values:
    enableAuth: "true"
    # optional: endpointPath: "/mcp"
    # optional: defaultUserIdentity: "..."
    # optional: allowedRedirectUris: null  # TODO: provide a value of type array<object>
    # optional: serverName: "SAM MCP Gateway"
    # optional: serverDescription: "..."
    # optional: includeTools: null  # TODO: provide a value of type array<object>
    # optional: excludeTools: null  # TODO: provide a value of type array<object>
    # optional: corsAllowedOrigins: null  # TODO: provide a value of type array<object>
```

## type: slack

**Slack Gateway**

Connect your AI agent to Slack workspace using Socket Mode

> ⚠ Requires a Slack app with Socket Mode enabled and appropriate OAuth scopes configured

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `default_agent_name` | `agent_select` |  | `Orchestrator` |  | The agent that handles messages when no specific agent is mentioned. |
| `bot_token` | `password (secret)` | yes |  | len 1–500; secret | Required. Starts with xoxb-. Find this in your Slack app's OAuth & Permissions settings. Leave placeholder when editing to keep existing value. |
| `app_token` | `password (secret)` | yes |  | len 1–500; secret | Required. Starts with xapp-. Generate in your Slack app's Basic Information settings. Leave placeholder when editing to keep existing value. |

**Required environment variables**: SLACK_BOT_TOKEN, SLACK_APP_TOKEN

### Example

```yaml
kind: gateway
name: example_slack_gateway
description: "Example slack gateway. Replace with a real description (10+ chars)."
spec:
  type: slack
  deploy: true
  values:
    # optional: default_agent_name: "Orchestrator"
    bot_token: ${EXAMPLE_SLACK_GATEWAY_BOT_TOKEN}  # secret — provide via env var
    app_token: ${EXAMPLE_SLACK_GATEWAY_APP_TOKEN}  # secret — provide via env var
```

## type: teams

**Teams Gateway**

Connect your AI agent to Microsoft Teams using Bot Framework

> ⚠ Requires Azure Bot Service registration and a publicly accessible webhook endpoint

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `default_agent_name` | `agent_select` |  | `Orchestrator` |  | The agent that handles messages when no specific agent is mentioned. |
| `microsoft_app_id` | `string` | yes |  | matches regex | Microsoft Bot ID found in Azure Bot Service, in GUID format. |
| `microsoft_app_password` | `password (secret)` | yes |  | min len 1; secret | Required. Client Secret from Azure AD App Registration. Leave placeholder to keep existing value. |
| `microsoft_app_tenant_id` | `string` |  |  | matches regex | Azure AD Tenant ID for single-tenant bots. Leave empty for multi-tenant. |
| `initial_status_message` | `string` |  | `Processing your request...` |  | Message shown while processing request. Leave empty to disable. |
| `enable_typing_indicator` | `select` |  | `true` |  | Show 'bot is typing...' indicator while processing. |
| `max_download_file_size_mb` | `number` |  | `100` |  | Maximum file size in MB that can be downloaded from Teams |

**Required environment variables**: TEAMS_APP_PASSWORD

### Example

```yaml
kind: gateway
name: example_teams_gateway
description: "Example teams gateway. Replace with a real description (10+ chars)."
spec:
  type: teams
  deploy: true
  values:
    # optional: default_agent_name: "Orchestrator"
    microsoft_app_id: "..."
    microsoft_app_password: ${EXAMPLE_TEAMS_GATEWAY_MICROSOFT_APP_PASSWORD}  # secret — provide via env var
    # optional: microsoft_app_tenant_id: "..."
    # optional: initial_status_message: "Processing your request..."
    # optional: enable_typing_indicator: "true"
    # optional: max_download_file_size_mb: 100
```

## type: whatsapp

**WhatsApp Gateway**

Connect your AI agent to WhatsApp via the WhatsApp Business Cloud API. Inbound messages arrive over a Meta webhook; replies are sent through the Graph API.

> ⚠ Requires a WhatsApp Business Account, a Cloud API phone number, and a Meta app with a webhook subscribed to the 'messages' field. Use a System User permanent access token in production. The Meta Graph API version is pinned by the gateway (currently v25.0) — no configuration needed.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `phone_number_id` | `string` | yes |  |  | The Cloud API phone-number ID the gateway sends from (the "From" number). Found in the Meta app's WhatsApp > API Setup. |
| `access_token` | `password (secret)` | yes |  | len 1–1000; secret | System User permanent token (or 24-hour dev token) used as the Bearer credential on outbound Graph API calls. Leave placeholder when editing to keep existing value. |
| `app_secret` | `password (secret)` | yes |  | len 1–500; secret | Meta App Secret, used to validate the X-Hub-Signature-256 HMAC on every inbound webhook POST. Leave placeholder when editing to keep existing value. |
| `verify_token` | `password (secret)` | yes |  | len 1–500; secret | Arbitrary string configured in the Meta webhook setup; echoed back during the one-time GET subscription handshake. Leave placeholder when editing to keep existing value. |
| `default_agent_name` | `agent_select` |  |  |  | The agent that handles inbound WhatsApp messages. Leave empty to route to the first discovered agent. |

### Example

```yaml
kind: gateway
name: example_whatsapp_gateway
description: "Example whatsapp gateway. Replace with a real description (10+ chars)."
spec:
  type: whatsapp
  deploy: true
  values:
    phone_number_id: "..."
    access_token: ${EXAMPLE_WHATSAPP_GATEWAY_ACCESS_TOKEN}  # secret — provide via env var
    app_secret: ${EXAMPLE_WHATSAPP_GATEWAY_APP_SECRET}  # secret — provide via env var
    verify_token: ${EXAMPLE_WHATSAPP_GATEWAY_VERIFY_TOKEN}  # secret — provide via env var
    # optional: default_agent_name: "..."
```

