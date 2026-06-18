---
title: Building Gateways
description: How to author a configured gateway — the Web UI, Event Mesh, Slack, Email, MCP, and Teams adapters, plus the A2A proxy mode.
sidebar_position: 2
---

# Building Gateways

A gateway is the bridge between an external surface — humans, other systems, message meshes — and the Solace Agent Mesh runtime. Each gateway type translates a different kind of incoming request into an A2A task on the broker, then streams the agent's response back to the caller. The agent mesh sees every request the same way regardless of which gateway minted it; that uniformity is the whole point.

This page covers the configured-gateway path. The configured-vs-built dimension is explained once in Concepts → Configured vs built; this page does not restate it. For the agents the gateway routes to, see Building → Agents. For the tools those agents call, see Building → Tools.

## What a Gateway Is

GWE owns three responsibilities:

1. **Listen on an external surface.** That can be HTTP/SSE for the Web UI, a Solace topic subscription for Event Mesh routing, Slack's Socket Mode, IMAP for email, MCP Streamable HTTP for MCP clients, or Microsoft's Bot Framework for Teams.
2. **Translate.** Each incoming request becomes an A2A JSON-RPC envelope addressed to a target agent on the broker. Each outgoing response — status updates, partial output, final result — is serialized back into the external surface's native shape.
3. **Hold session and identity.** The gateway owns the conversation history binding (one session per chat thread, channel, or external identity), the user authentication surface, and the artifact-store handle the agent uses.

Gateways are the trust boundary for the agent mesh. Operators can run multiple gateways at once: a Web UI for humans, a Slack gateway for chatops, an MCP gateway for downstream tooling, all pointing at the same set of configured agents on the same broker.

## The Common Shape

Every gateway is an entry under `apps:` whose `app_exec:` points at the gateway binary (`sam-gateway`). The `app_config:` block carries the gateway's identity, broker access, session and artifact backends, the user-facing model used for auto-titles and embeds, and a `gateway_adapter:` block that selects the adapter:

```yaml
# configs/my_gateway.yaml
apps:
  - name: my_gateway_app
    app_exec: sam-gateway
    app_config:
      namespace: ${NAMESPACE, solace-agent-mesh}
      gateway_id: ${GATEWAY_ID, my-gateway}

      gateway_adapter:
        type: slack
        adapter_config:
          slack_bot_token: ${SLACK_BOT_TOKEN}
          slack_app_token: ${SLACK_APP_TOKEN}
          default_agent_name: "Orchestrator"
```

`gateway_adapter.type` is the adapter selector. The supported values are `httpsse` (Web UI / REST), `eventmesh`, `slack`, `email`, `mcp`, and `teams`. When the `gateway_adapter:` block is absent, the gateway defaults to `httpsse`.

Each adapter reads `adapter_config:` differently, so the shapes inside that block diverge per adapter. The keys that sit *outside* `gateway_adapter:` — namespace, gateway id, model, session and artifact services, and broker config — apply to every adapter.

## Common Adapter-Agnostic Config

These keys configure the shared gateway surface and apply regardless of which adapter you select:

- `namespace` — broker topic-tree partition. Must match the agents this gateway routes to.
- `gateway_id` — unique identity used in status topics (`{ns}/a2a/v1/gateway/status/{gatewayId}/{taskId}`) and surfaced in logs.
- `session_secret_key` — secret used to sign and verify session cookies. Required for the Web UI gateway. Treat as a real secret.
- `session_service` — where conversation history lives. Same shape as the agent's `session_service`; see Building → Agents → Session memory.
- `artifact_service` — where files the agent reads and writes live. Backends: `filesystem`, `memory`, `s3`, `gcs`.
- `model` — the language model the gateway uses for auto-title generation and embed resolution. Same shape as the agent's `model` block.
- `enable_embed_resolution` — whether the gateway resolves `«type:params»` embeds in outbound text. Default `true`.
- `gateway_artifact_content_limit_bytes` — maximum size of an artifact the gateway inlines into responses. Default `10000000` (10 MB).
- `task_logging` — toggles for the task-event log; see Administering → Observability.
- `frontend_*` — Web-UI-only branding and feature flags; ignored by other adapters.

## Web UI Gateway (HTTP/SSE)

The Web UI gateway is the default. It serves the React frontend, exposes the REST + SSE API at `fastapi_host:fastapi_port`, and bridges browser sessions to the agent mesh:

```yaml
# configs/webui_gateway.yaml
apps:
  - name: webui_gateway_app
    app_exec: sam-gateway
    app_config:
      namespace: ${NAMESPACE, solace-agent-mesh}
      gateway_id: ${WEBUI_GATEWAY_ID, webui-gw}
      session_secret_key: ${SESSION_SECRET_KEY}

      artifact_service:
        type: filesystem
        base_path: /var/lib/sam/artifacts
        artifact_scope: namespace
      session_service:
        type: sql
        database_url: "sqlite:///var/lib/sam/sessions.db"
        default_behavior: "PERSISTENT"

      model:
        model: ${LLM_SERVICE_GENERAL_MODEL_NAME, openai/gpt-4o}
        api_base: ${LLM_SERVICE_ENDPOINT}
        api_key: ${LLM_SERVICE_API_KEY}

      fastapi_host: ${FASTAPI_HOST, 0.0.0.0}
      fastapi_port: ${FASTAPI_PORT, 8800}
      cors_allowed_origins:
        - "https://app.example.com"

      sse_max_queue_size: 200
      visualization_queue_size: 1000
      task_logger_queue_size: 600

      frontend_welcome_message: "Welcome to Solace Agent Mesh"
      frontend_bot_name: "Agent Mesh"
      frontend_collect_feedback: true

      task_logging:
        enabled: true
        log_status_updates: true
        log_artifact_events: true
        log_file_parts: true
        max_file_part_size_bytes: 10240

      frontend_feature_enablement:
        background_tasks: true
        auto_title_generation: true

      background_tasks:
        default_timeout_ms: 3600000
```

A few notes on the most-touched knobs:

- **`fastapi_host` / `fastapi_port`** decide where the listener binds. Use `0.0.0.0` for production behind a reverse proxy and `localhost` for desktop builds where only the local machine reaches the gateway.
- **`cors_allowed_origins`** is enforced strictly. The browser will reject requests from any origin not on this list.
- **`sse_max_queue_size`** caps how many SSE events a single subscriber can buffer. Raise this if you ship dashboards that subscribe to many simultaneous task streams.
- **`auto_title_generation`** is what consumes the gateway's `model`. The first user message of a new conversation is summarized into a short title using this model. Set the model to a cheap fast one.
- **`task_logging.*`** controls whether the gateway emits structured task events to the event log. Required for the visualization view and for downstream audit pipelines.

Notable endpoint families on the REST + SSE surface:

- `POST /api/v1/message:stream` — submit a new task as a JSON-RPC `message/stream` request. The success envelope's `result` is `{id, contextId, kind: "task"}`; use the returned `id` as the `{taskId}` path segment when subscribing to the per-task SSE stream.
- `POST /api/v1/message:send` — submit a new task as a JSON-RPC `message/send` request. Accepts the same body and returns the same envelope shape as `:stream`; use this route when the client will not subscribe to the SSE stream. The task still runs and publishes status to the broker.
- `GET /api/v1/sse/subscribe/{taskId}` — Server-Sent Events stream for live status, partial output, and artifact events.
- `GET /api/v1/agents` — list discoverable agents.
- `POST /api/v1/sessions/{id}/compact` — manual session compaction; see Building → Agents.
- `POST /api/v1/scheduledTasks` and the 13 related routes — see Building → Scheduled tasks.

## Event Mesh Gateway

The Event Mesh gateway turns the agent mesh into a programmable component of a wider Solace event-driven architecture. Incoming broker messages trigger agent tasks; agent responses publish to computed output topics. There is no HTTP surface — everything flows through the broker.

```yaml
# configs/eventmesh_gateway.yaml
apps:
  - name: eventmesh_gateway_app
    app_exec: sam-gateway
    app_config:
      namespace: ${NAMESPACE, solace-agent-mesh}
      gateway_id: ${EVENT_MESH_GATEWAY_ID, eventmesh-gw}

      artifact_service:
        type: filesystem
        base_path: /var/lib/sam/artifacts
        artifact_scope: namespace
      session_service:
        type: memory
        default_behavior: "RUN_BASED"

      gateway_adapter:
        type: eventmesh
        adapter_config:
          broker_config:
            broker_url: ${DATA_BROKER_URL}
            broker_vpn: ${DATA_BROKER_VPN}
            broker_username: ${DATA_BROKER_USER}
            broker_password: ${DATA_BROKER_PASSWORD}

          event_handlers:
            - subscriptions: ["acme/orders/new/>"]
              input_expression: "input.payload:order_summary"
              target_agent_name: "OrderProcessor"
              payload_format: json
              forward_context: true

          output_handlers:
            - success:
                topic: "acme/orders/processed/{userId}"
                payload_format: json
              error:
                topic: "acme/orders/errored/{userId}"
                payload_format: json
              ack_policy:
                mode: on_completion
                timeout_seconds: 300
```

The shape of an `event_handler` entry mirrors the Python plugin:

- `subscriptions` — broker subscription topics (with `>` wildcards and `*` segments).
- `input_expression` — extracts the agent's input from the inbound message. Common forms: `input.payload:<field>` (extract a JSON field), `input.payload` (entire JSON body), `input.user_data` (use the user-data property block).
- `target_agent_name` (or `target_workflow_name`) — which configured agent or workflow receives the request.
- `payload_format` — `json`, `text`, `yaml`, or `csv`. Controls how the inbound bytes are parsed and how the agent's response is serialized.
- `forward_context` — when `true`, carries the inbound message's user properties through to the agent so it can read the original sender's identity.

`output_handlers` describe where to publish results. `topic` accepts substitutions like `{userId}` that resolve against the inbound message's user properties. `ack_policy` has two modes: `on_receive` (the gateway acks immediately on dispatch) and `on_completion` (the gateway delays the ack until the agent finishes, with `timeout_seconds` as the deadline).

The Event Mesh gateway is a natural fit when an existing broker-based workflow already exists and you want to slot AI-driven processing into specific subscriptions without re-architecting the upstream producers.

## Slack Gateway

The Slack gateway uses **Socket Mode** — the gateway opens an outbound WebSocket to Slack and never accepts inbound HTTP from Slack's servers. This is what lets the gateway run inside a private network with no public ingress.

```yaml
# configs/slack_gateway.yaml
apps:
  - name: slack_gateway_app
    app_exec: sam-gateway
    app_config:
      namespace: ${NAMESPACE, solace-agent-mesh}
      gateway_id: ${SLACK_GATEWAY_ID, slack-gw}

      artifact_service:
        type: filesystem
        base_path: /var/lib/sam/artifacts
        artifact_scope: namespace
      session_service:
        type: sql
        database_url: ${SESSION_DB_URL}
        default_behavior: "PERSISTENT"

      model:
        model: ${LLM_SERVICE_GENERAL_MODEL_NAME, openai/gpt-4o}
        api_base: ${LLM_SERVICE_ENDPOINT}
        api_key: ${LLM_SERVICE_API_KEY}

      gateway_adapter:
        type: slack
        adapter_config:
          slack_bot_token: ${SLACK_BOT_TOKEN}
          slack_app_token: ${SLACK_APP_TOKEN}
          default_agent_name: ${SLACK_DEFAULT_AGENT, Orchestrator}
          slack_initial_status_message: "Working on it..."
          correct_markdown_formatting: true
          feedback_enabled: true
          slack_email_cache_ttl_seconds: 300
```

Sessions are keyed by `(channel, thread_ts)` — every thread becomes its own conversation, and `@`-mentions in a channel root start a new session. Direct messages are sessioned per DM channel.

To provision the Slack app:

1. Create a Slack app at `api.slack.com/apps`.
2. Enable **Socket Mode** and generate an app-level token with `connections:write` scope. This is your `slack_app_token` (starts with `xapp-`).
3. Under **OAuth & Permissions**, add bot scopes: `app_mentions:read`, `channels:history`, `chat:write`, `files:write`, `groups:history`, `im:history`, `im:read`, `im:write`, `users:read`, `users:read.email`. Install to your workspace and grab the bot token (`xoxb-`).
4. Under **Event Subscriptions**, enable events and subscribe to: `app_mention`, `message.channels`, `message.groups`, and `message.im`.

`correct_markdown_formatting: true` rewrites the agent's Markdown output to Slack's `mrkdwn` flavor (bold becomes `*text*` not `**text**`, links become `<url|text>`). Leave it on unless you have a specific reason to ship raw Markdown into Slack.

## Email Gateway

The Email gateway turns incoming email into an A2A task and sends the agent's response back as a reply. Inbound uses IMAP; outbound uses SMTP:

```yaml
# configs/email_gateway.yaml
apps:
  - name: email_gateway_app
    app_exec: sam-gateway
    app_config:
      namespace: ${NAMESPACE, solace-agent-mesh}
      gateway_id: ${EMAIL_GATEWAY_ID, email-gw}

      artifact_service:
        type: filesystem
        base_path: /var/lib/sam/artifacts
        artifact_scope: namespace
      session_service:
        type: sql
        database_url: ${SESSION_DB_URL}
        default_behavior: "PERSISTENT"

      model:
        model: ${LLM_SERVICE_GENERAL_MODEL_NAME, openai/gpt-4o}
        api_base: ${LLM_SERVICE_ENDPOINT}
        api_key: ${LLM_SERVICE_API_KEY}

      gateway_adapter:
        type: email
        adapter_config:
          mailbox: "agent@example.com"
          imap_host: "imap.gmail.com"
          imap_port: 993
          imap_password: ${GMAIL_APP_PASSWORD}

          smtp_host: "smtp.gmail.com"
          smtp_port: 587

          delivery_mode: idle
          poll_interval_seconds: 60
          fetch_limit: 50
          worker_count: 4
          queue_capacity: 100

          max_message_size_bytes: 26214400
          max_attachment_size_bytes: 10485760

          policy_mode: require_dmarc
          trusted_authserv_ids:
            - "mx.google.com"

          default_agent_name: ${EMAIL_DEFAULT_AGENT, EmailAssistant}
```

Authentication has two paths and they are mutually exclusive:

- **App password** — set `imap_password` (Gmail App Password, or any IMAP server that accepts a password). Simplest, suitable for personal-mailbox-style deployments.
- **Microsoft 365 OAuth2 (XOAUTH2)** — set `oauth2_tenant_id`, `oauth2_client_id`, `oauth2_client_secret`. The gateway exchanges a client-credentials grant for an access token and uses XOAUTH2 over IMAP and SMTP. Use this for any Microsoft 365 mailbox; basic auth is deprecated.

Delivery modes:

- `idle` — IMAP IDLE; the gateway holds an open connection and is notified immediately when new mail arrives. Lowest latency.
- `poll` — fixed-interval polling using `poll_interval_seconds`. More reliable across flaky IMAP servers.
- `auto` — IDLE with poll fallback; tries IDLE and downgrades to poll if the server doesn't support it.

`policy_mode` accepts three values. `require_dmarc` (the default and the recommended production setting) rejects messages whose Authentication-Results header doesn't show a DMARC pass from a trusted `trusted_authserv_ids` entry. `log_only` is the soft enforcement: it logs the DMARC outcome but accepts the message regardless — useful during an initial rollout while you tune `trusted_authserv_ids`. `strict` is the toughest setting: it accepts only messages with an explicit DMARC pass *and* no `quarantine` or `reject` policy action, rejecting anything ambiguous.

The gateway's identity model uses the canonical lowercase sender email as the user ID. `Alice@Example.Com` and `alice@example.com` collapse to the same session and the same authorization principal.

## MCP Gateway

The MCP gateway exposes Agent Mesh agents to **external MCP clients** (Claude Desktop, Claude Code, custom MCP clients) as if each agent were a remote MCP tool. The agent mesh sits behind the gateway; the MCP client talks to the gateway and never touches the broker directly.

```yaml
# configs/mcp_gateway.yaml
apps:
  - name: mcp_gateway_app
    app_exec: sam-gateway
    app_config:
      namespace: ${NAMESPACE, solace-agent-mesh}
      gateway_id: ${MCP_GATEWAY_ID, mcp-gw}
      session_secret_key: ${SESSION_SECRET_KEY}

      artifact_service:
        type: filesystem
        base_path: /var/lib/sam/artifacts
        artifact_scope: namespace
      session_service:
        type: sql
        database_url: ${SESSION_DB_URL}
        default_behavior: "PERSISTENT"

      gateway_adapter:
        type: mcp
        adapter_config:
          transport: http
          endpoint_path: /mcp
          issuer: https://gateway.example.com/gw/mcp-gw

          enable_auth: true
          external_auth_provider: ${EXTERNAL_AUTH_PROVIDER}
          allowed_redirect_uris:
            - "http://localhost:6274/*"
          require_pkce: true
          user_id_claim: email
```

The gateway hosts the MCP Streamable HTTP endpoint at `/gw/{gatewayId}{endpointPath}`. The example serves MCP at `/gw/mcp-gw/mcp`. Three deployment modes:

| Mode | `enable_auth` | Who can call tools | When to use |
|---|---|---|---|
| No-auth | `false` | Anyone reachable | Local dev only |
| Authn-only | `true` (no role provider) | Any authenticated identity | Trusted enterprise networks |
| Authn + RBAC | `true` + role provider | Identities holding `agent:<name>:delegate` scope | Multi-tenant production |

When auth is enabled the gateway exposes the OAuth flow at the same prefix:

- `GET /gw/{id}/.well-known/oauth-authorization-server` — RFC 8414 metadata.
- `POST /gw/{id}/oauth/register` — Dynamic Client Registration (RFC 7591). Public, no credentials required.
- `GET /gw/{id}/oauth/authorize` — authorization endpoint; redirects to the upstream IdP.
- `GET /gw/{id}/oauth/callback` — IdP callback; mints the access token.
- `POST /gw/{id}/oauth/token` — token endpoint.

`require_pkce: true` enforces PKCE on every code grant. Leave it on. `user_id_claim` picks which OIDC claim identifies the calling user; `email` is the default, with `sub`, `upn`, and `preferred_username` available for IdPs that scope identity differently.

In the RBAC mode, the gateway filters the `tools/list` MCP response by the caller's scopes. A tool corresponds to an agent, and the gateway lists only the agents the caller holds `agent:<name>:delegate` for. See Administering → RBAC reference for the scope reference.

## Teams Gateway

The Teams gateway routes Microsoft Teams chat messages to configured agents through the Microsoft Bot Framework. The bot acts as a Teams app; messages to it (in channels or direct) become A2A tasks.

```yaml
# configs/teams_gateway.yaml
apps:
  - name: teams_gateway_app
    app_exec: sam-gateway
    app_config:
      namespace: ${NAMESPACE, solace-agent-mesh}
      gateway_id: ${TEAMS_GATEWAY_ID, teams-gw}

      artifact_service:
        type: filesystem
        base_path: /var/lib/sam/artifacts
        artifact_scope: namespace
      session_service:
        type: sql
        database_url: ${SESSION_DB_URL}
        default_behavior: "PERSISTENT"

      gateway_adapter:
        type: teams
        adapter_config:
          app_id: ${TEAMS_APP_ID}
          app_password: ${TEAMS_APP_PASSWORD}
          tenant_id: ${TEAMS_TENANT_ID}
          default_agent_name: ${TEAMS_DEFAULT_AGENT, Orchestrator}

          http_host: "0.0.0.0"
          http_port: 8080

          initial_status_message: "Processing your request..."
          enable_typing_indicator: true
          buffer_update_interval: 500ms
          email_cache_ttl_seconds: 300
          max_download_file_size_mb: 100
```

`app_id` and `app_password` come from the Microsoft Bot Framework registration. Both are required. `tenant_id` is optional but recommended for single-tenant deployments — it scopes the email-lookup cache so the gateway can resolve a Teams user to a canonical email identity for session keying.

Unlike Slack's Socket Mode, Microsoft's Bot Framework reaches the Teams gateway over an HTTP webhook. The Teams adapter does not terminate TLS itself — terminate it upstream at an ingress or reverse proxy, or at the gateway's own HTTPS listener (`ssl_certfile`, `ssl_keyfile`, `fastapi_https_port`), and point the Azure Bot messaging endpoint at that public HTTPS URL.

`enable_typing_indicator: true` makes Teams show the "Agent Mesh is typing…" indicator while the agent is mid-task. `buffer_update_interval: 500ms` controls how often the gateway flushes streamed agent output to Teams; lower values feel snappier but produce more API calls.

## A2A Proxy Mode

The A2A proxy is technically not a gateway — it is an **AWE-level** instance kind that brings an external HTTPS A2A agent (one that lives outside your mesh) onto the broker as if it were native. From any other agent's perspective, a proxied agent looks exactly like a peer; it appears in agent-card discovery and accepts the standard `peer_<name>` tool calls.

Configure it as an `apps:` entry whose `app_config:` declares a `proxied_agents:` block:

```yaml
# configs/a2a_proxy.yaml
apps:
  - name: external_a2a_proxy
    app_exec: sam-awe
    app_config:
      namespace: ${NAMESPACE, solace-agent-mesh}

      discovery_interval_seconds: 60
      default_request_timeout_seconds: 300
      task_state_ttl_minutes: 60
      task_cleanup_interval_minutes: 10
      artifact_handling_mode: reference

      proxied_agents:
        - display_name: "WeatherAgent"
          url: https://weather.example.com
          agent_card_path: /.well-known/agent-card.json
          request_timeout_seconds: 60
          ssl_verify: true

          agent_card_authentication:
            type: static_bearer
            token: ${WEATHER_CARD_TOKEN}

          task_authentication:
            type: oauth2_client_credentials
            token_url: https://idp.example.com/oauth/token
            client_id: ${WEATHER_CLIENT_ID}
            client_secret: ${WEATHER_CLIENT_SECRET}
            scopes:
              - "weather.read"
```

The proxy fetches the external agent's `/.well-known/agent-card.json` on `discovery_interval_seconds` cadence, republishes it on the broker's discovery topic, and forwards inbound A2A requests to the external HTTPS endpoint. The four supported auth types cover most external setups:

- `static_bearer` — a literal bearer token. Simplest; the token sits in your YAML or env vars.
- `static_apikey` — a static API key sent on a configurable header (default `header: X-Api-Key`).
- `oauth2_client_credentials` — the proxy runs a client-credentials grant against `token_url` and caches the resulting access token. Refresh is proactive; on a 401 the proxy retries once after refreshing.
- `oauth2_authorization_code` — per-user PKCE. The proxy does not hold service-account credentials; instead, the first task from a user triggers an authentication-required signal back to the gateway, which prompts the user to complete an OAuth flow before retrying.

`agent_card_authentication` is the auth used to fetch the agent card. `task_authentication` is the auth used for every task request. They are configured separately because the card endpoint is sometimes public while the task endpoint requires per-user identity, or vice versa.

A2A proxy is the right tool when you want to expose a third-party HTTPS agent — say, a vendor's hosted analytics agent — to your internal orchestrator agent without that orchestrator caring about the HTTPS plumbing. It is the wrong tool when your "external" service is a generic HTTP API; for that, use an OpenAPI tool (see Building → Tools).

## When the In-Box Gateways Don't Cover It

The configured gateways above cover the protocols that ship in the runtime. When you need to integrate with a surface the in-box adapters do not handle — a custom voice protocol, an internal messaging system, a hardware control plane — the usual answer is one of the following:

- **The MCP gateway.** It exposes the agent mesh to any MCP client. If the integrating system can speak MCP (directly, or through a thin adapter you control), this is the lowest-friction path.
- **A configured agent calling out.** Wire a custom built tool (`pkg/samtoolsdk`) into a configured agent and let the agent be the integration point. The tool owns the protocol; the agent stays standard.
- **The A2A proxy.** If the foreign system already speaks A2A over HTTPS, the A2A proxy mode above is the right shape.

If none of those fit and you need a truly custom gateway transport, contact Solace — the gateway transports live inside the runtime, so adding a new one is a Solace-side change rather than a customer authoring path.

## What Next?

You have just learned how to author a configured gateway. Most readers next want to set up recurring task execution against the agents the gateway routes to, which is covered in Building → Scheduled tasks. For drafting new agent configurations from a natural-language description, see Building → AI assistant. For the auth and RBAC reference that several gateways depend on, see Administering → RBAC reference.
