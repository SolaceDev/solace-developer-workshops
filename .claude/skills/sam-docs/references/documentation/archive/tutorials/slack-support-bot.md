---
title: Slack Support Bot
description: Build a Solace Agent Mesh deployment that answers support questions from Slack channels and direct messages, with thread-scoped conversation continuity.
sidebar_position: 1
---

# Slack Support Bot

This tutorial wires up a Slack-resident support agent end to end. The agent listens for `@`-mentions in any channel it has been invited to and for direct messages, replies in-thread, and keeps each Slack thread as its own conversation. Anything the agent emits — a generated report, an artifact, a screenshot — uploads back to the originating thread.

The Slack gateway uses **Socket Mode**, so the gateway opens an outbound WebSocket to Slack and accepts no inbound HTTP from Slack's servers. That makes this scenario practical on a laptop or inside a private network with no ingress.

By the end you will have:

- A Slack app provisioned in your workspace with the right scopes and event subscriptions.
- A configured Slack gateway and a configured support agent, both YAML-only.
- A working bot you can mention in a channel and direct-message.

## What You Need Before You Start

- Solace Agent Mesh installed locally. If you have not done this yet, walk Installing → Install first.
- An LLM API endpoint and key for the gateway's auto-titles and the agent's model. Installing → Configure covers the env-var contract.
- A Slack workspace where you can install apps. A free personal workspace is the simplest option; for shared workspaces, an admin needs to approve the install.
- A broker the gateway can reach. The dev broker that ships with the repo is fine for a laptop run; production deployments point at a Solace broker. Both paths are covered in Installing → Configure.

## Provision the Slack App

These steps happen once per workspace and produce the two tokens the gateway needs: an **app-level token** for Socket Mode (`xapp-…`) and a **bot user token** for the API surface (`xoxb-…`). The whole flow happens at api.slack.com/apps.

### 1. Create the App

In the Slack app dashboard, choose **Create New App** → **From scratch**. Name it (`Agent Mesh Support` is a good default) and pick the workspace you will install it into.

### 2. Enable Socket Mode

In the sidebar, open **Socket Mode** and toggle **Enable Socket Mode** on. Slack prompts you to generate an app-level token. The token needs the `connections:write` scope. Copy the `xapp-…` value — this becomes `SLACK_APP_TOKEN` in your environment.

### 3. Add Bot Token Scopes

Open **OAuth & Permissions** → **Bot Token Scopes** and add the following scopes:

```text
app_mentions:read
channels:history
channels:read
chat:write
files:write
groups:history
im:history
im:read
mpim:history
mpim:read
users:read
users:read.email
```

`app_mentions:read` and the four `*history` scopes let the bot see the messages it needs to react to. `chat:write` and `files:write` let it reply and upload attachments. `users:read` plus `users:read.email` let the gateway resolve a Slack user id to a stable email identity for session keying and RBAC; without `users:read.email`, the gateway falls back to a synthetic id.

If you add a new scope later, Slack requires a reinstall — repeat step 5.

### 4. Subscribe to Bot Events

Open **Event Subscriptions** and toggle **Enable Events** on. Under **Subscribe to bot events**, add:

```text
app_mention
message.channels
message.groups
message.im
message.mpim
```

`app_mention` covers `@Agent Mesh Support` calls in any channel. The four `message.*` events let the bot see direct messages, multi-party DMs, and channel messages it has been invited to.

### 5. Install the App and Capture the Bot Token

Open **Install App** → **Install to Workspace** and approve the OAuth grant. Slack shows the **Bot User OAuth Token** on the same page — copy the `xoxb-…` value. This becomes `SLACK_BOT_TOKEN`.

### 6. Invite the Bot Into a Test Channel

In Slack itself, type `/invite @Agent Mesh Support` (or whatever you named the app) in a channel you own. The bot has to be in the channel to see `app_mention` events from it.

## Configure the Gateway

Drop a gateway config in your project's `configs/` directory:

```yaml
# configs/slack_gateway.yaml
log:
  level: info

apps:
  - name: slack_gateway_app
    app_exec: sam-gateway
    app_config:
      namespace: ${NAMESPACE, solace-agent-mesh}
      session_secret_key: ${SESSION_SECRET_KEY}

      artifact_service:
        type: filesystem
        base_path: /tmp/sam
        artifact_scope: namespace

      session_service:
        type: sql
        database_url: "sqlite:///tmp/sam-go-slack.db"
        default_behavior: "PERSISTENT"

      model:
        model: ${LLM_SERVICE_GENERAL_MODEL_NAME, openai/gpt-4o-mini}
        api_base: ${LLM_SERVICE_ENDPOINT}
        api_key: ${LLM_SERVICE_API_KEY}

      gateway_id: ${SLACK_GATEWAY_ID, slack-support-bot}
      fastapi_host: ${FASTAPI_HOST, localhost}
      fastapi_port: ${FASTAPI_PORT, 8002}

      gateway_adapter:
        type: slack
        adapter_config:
          slack_bot_token: ${SLACK_BOT_TOKEN}
          slack_app_token: ${SLACK_APP_TOKEN}
          default_agent_name: SupportAgent
          slack_initial_status_message: "On it"
          correct_markdown_formatting: true
          feedback_enabled: false
          slack_email_cache_ttl_seconds: 3600

      system_purpose: >
        You are an AI support bot. Inbound messages arrive via Slack;
        respond clearly and concisely. When you create files or
        artifacts, attach them to the response so they upload back to
        the Slack thread.

      response_format: >
        Format responses using markdown. The gateway converts to Slack
        mrkdwn on the way out.

      task_logging:
        enabled: true
        log_status_updates: true
        log_artifact_events: true

      enable_embed_resolution: true
```

A few notes on the knobs that matter most:

- **`gateway_adapter.type: slack`** selects the Slack adapter. The keys under `adapter_config:` are Slack-specific; everything outside `gateway_adapter:` is the common gateway surface and behaves the same for every adapter type. The full key reference lives in Building → Gateways.
- **`default_agent_name`** is the agent the gateway routes to when the user's message doesn't name one explicitly. Slack users can override it inline by writing `@SupportAgent help me` — the adapter substring-matches the `@`-mention against discovered agent names. The value here is the bare agent name; no `@` prefix.
- **`session_service`** with `default_behavior: PERSISTENT` is what gives each Slack thread its own conversation. The adapter keys sessions by `(channel, thread_ts)`, so two messages in the same thread reuse the same session, while a new thread starts fresh.
- **`enable_embed_resolution: true`** lets the agent emit `«artifact_return:filename»` embeds in its responses — the gateway resolves those to real file uploads via Slack's `files.upload`.
- **`correct_markdown_formatting: true`** rewrites the agent's Markdown into Slack's `mrkdwn` flavor (`*bold*`, not `**bold**`; `<https://example.com|text>`, not `text`). Leave it on unless you have a specific reason to ship raw Markdown.
- **`fastapi_port: 8002`** binds the gateway's admin and health endpoints. The Slack adapter itself has no public HTTP surface — Socket Mode is outbound-only — but the gateway core still needs a port for `/health`.

`SESSION_SECRET_KEY` is a real secret. Generate one with `openssl rand -hex 32`. The session cookie HMAC depends on it, and rotating the key invalidates every active session.

## Configure the Agent

The gateway routes tasks to a configured agent. A minimum-viable support agent is short:

```yaml
# configs/support_agent.yaml
log:
  level: info

apps:
  - name: support_agent_app
    app_exec: sam-awe
    app_config:
      agent_name: SupportAgent
      display_name: Support
      namespace: ${NAMESPACE, solace-agent-mesh}
      supports_streaming: true

      model:
        model: ${LLM_SERVICE_GENERAL_MODEL_NAME, openai/gpt-4o}
        api_base: ${LLM_SERVICE_ENDPOINT}
        api_key: ${LLM_SERVICE_API_KEY}

      instruction: |
        You are a support agent. You answer support questions clearly
        and concisely. When you create or modify a file, attach it
        to the response so the user can download it.

      tools:
        - tool_type: builtin-group
          group_name: "artifact_management"
        - tool_type: builtin-group
          group_name: "general_agent_tools"

      session_service:
        type: memory
        default_behavior: "PERSISTENT"
      artifact_service:
        type: filesystem
        base_path: /tmp/sam
        artifact_scope: namespace
      artifact_handling_mode: "reference"
      enable_embed_resolution: true
      enable_artifact_content_instruction: true

      agent_card:
        description: |
          Use this agent to answer support questions. It can read and
          write artifacts and respond in Slack threads.
        defaultInputModes: ["text"]
        defaultOutputModes: ["text", "file"]

      agent_card_publishing: { interval_seconds: 10 }
      agent_discovery: { enabled: true }
```

`agent_name: SupportAgent` matches the gateway's `default_agent_name`. The `artifact_management` and `general_agent_tools` built-in tool groups give the agent enough surface to upload, list, and load artifacts; for the full tool catalog see Building → Tools.

The agent ships configured, not built. The configured-vs-built distinction is covered in Concepts → Configured vs built. Default to configured; the agent here can grow real behavior (extra tools, a more specific instruction, peer-agent delegation) without ever leaving the YAML.

## Run the Bot

Set the environment, then start everything in one command.

Environment:

```bash
# Slack credentials from the app you provisioned
export SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN}
export SLACK_APP_TOKEN=${SLACK_APP_TOKEN}

# Mesh and LLM config
export NAMESPACE=solace-agent-mesh
export LLM_SERVICE_ENDPOINT=${LLM_SERVICE_ENDPOINT}
export LLM_SERVICE_API_KEY=${LLM_SERVICE_API_KEY}
export LLM_SERVICE_GENERAL_MODEL_NAME=openai/gpt-4o

# Session cookie key
export SESSION_SECRET_KEY=$(openssl rand -hex 32)

# Dev broker for a laptop run; point at a real Solace broker in production
export SOLACE_DEV_MODE=true
```

Then launch the agent and the gateway under one orchestrator:

```bash
sam run configs/
```

`sam run` spawns one subprocess per YAML config in the directory (the agent and the gateway) and starts an in-process TCP dev broker on `:55554` that both subprocesses connect to. Logs from each subprocess are interleaved into the same terminal with `[support_agent]` / `[slack_gateway]` prefixes, and `Ctrl+C` shuts down everything together.

In the gateway logs you will see `socket mode connecting...` followed within a second or two by `slack adapter started (Socket Mode)`. Once that line appears, the bot is online.

## Verify

Three smoke tests in the channel you invited the bot into.

1. **App mention in a channel.** Type `@Agent Mesh Support what time is it?`. Within a second the bot replies with the status `On it`, then a final answer in the same thread.
2. **Direct message.** Open a DM with the bot and send `hello`. The bot replies in the DM channel.
3. **Thread continuity.** Reply to the bot's first answer inside the thread. The follow-up reuses the existing session — the agent will know what you said before.

In the gateway logs, each successful inbound message produces a `task submitted` line carrying a `traceID`, the resolved agent name, and the user identity (the user's email when `users:read.email` is granted, otherwise a synthetic id). `grep traceID=<uuid>` against the agent and gateway logs surfaces the whole causal chain — useful when something goes wrong further down. Administering → Observability covers the slog field layout.

## Optional Follow-Ons

Once the bot is up, the natural extensions are:

- **Look things up in a database.** Attach a SQL connector and a SQL tool to the agent so it can answer questions like "what's the status of ticket 4071?" against your ticketing database. Building → Tools covers the connector and tool surface.
- **Persist conversations across restarts.** Swap the agent's `session_service` from `memory` to `sql` with the same SQLite URL the gateway uses, so the agent's per-session history survives process restarts. Installing → Configure covers session-storage backends.
- **Gate access by role.** Map IdP identities to roles and restrict which Slack users can talk to which agents. Administering → RBAC reference walks the scope model.
- **Add authentication and platform integration.** Swap `app_exec: sam-gateway` for `sam-gateway-enterprise`, add the `authorization_service` and `platform_service` blocks, and point at a real Solace broker. Installing → Deploy options covers the bundled deployment shapes.

## Troubleshooting

### Bot Stays Offline; Logs Loop on `socket mode error`

**Symptoms.** The gateway logs show repeated `socket mode connecting...` followed by `socket mode error: ...` and never reaches `slack adapter started (Socket Mode)`.
**Diagnostic.** The error message identifies which token is rejected. An `xapp-…` rejection means the app-level token is wrong; an `xoxb-…` rejection means the bot token is wrong.
**Resolution.** Re-check `SLACK_APP_TOKEN` — generate a fresh one from the Slack app's **Socket Mode** page if needed and make sure the scope is `connections:write`. Confirm **Socket Mode** is enabled in the app dashboard.
**Prevention.** Store both tokens in your secret manager and inject them at process startup; don't keep them in committed YAML.

### Bot Replies in DMs but Ignores Channel Mentions

**Symptoms.** Direct messages get a response; `@Agent Mesh Support` in a channel does nothing.
**Diagnostic.** Check **OAuth & Permissions** in the Slack app dashboard. If `app_mentions:read` or `channels:history` is missing, channel events never reach the bot.
**Resolution.** Add the missing scopes and reinstall the app via **Install App** → **Reinstall to Workspace**. Refresh `SLACK_BOT_TOKEN` from the reinstall page if the token rotated.
**Prevention.** Provision the full scope list from step 3 in one go; reinstalls cost time and rotate tokens.

### Bot Replies but Treats Every Message as a New Conversation

**Symptoms.** Reply-in-thread doesn't carry context — the bot acts like it has never seen you before.
**Diagnostic.** `grep contextID` in the gateway logs. If every inbound message gets a fresh `contextID`, session lookup is not finding the thread.
**Resolution.** Confirm `session_service.database_url` points at a writable file (the SQLite file the YAML specifies must be writable by the gateway process). Confirm `default_behavior: "PERSISTENT"`. Without a session backend, every inbound message starts a fresh ephemeral session.
**Prevention.** Use the same `session_service` config in the gateway and the agent so both sides see the same conversation history.

### `No agent available to handle this request`

**Symptoms.** The bot replies in Slack with `No agent available to handle this request` and the gateway logs show the task could not be dispatched.
**Diagnostic.** From the gateway's host, hit `http://localhost:8002/health` to confirm the gateway is up. Check the gateway logs for `agent card received` lines — those mark agent discovery. If you don't see any, the gateway is not seeing your agent.
**Resolution.** Confirm both the gateway and the agent declare the same `namespace:` value. Confirm the agent process is actually running and reaching the broker. If you're using the dev broker, all three (broker, agent, gateway) must share the same `SOLACE_DEV_MODE=true` environment.
**Prevention.** Pin the namespace value in a single shared env file rather than repeating the literal in each YAML.

### Bot Misses the First Message After Restart

**Symptoms.** A message sent in the second or two after gateway startup never reaches the agent.
**Diagnostic.** Check the gateway logs — the message arrived before `slack adapter started (Socket Mode)` was logged.
**Resolution.** Slack only delivers events while Socket Mode is connected, and the handshake takes 1–2 seconds. There is no replay for events sent before connect. Re-send the message after the gateway is up.
**Prevention.** If your deployment is sensitive to lost first messages, gate user-visible traffic on `/health` returning 200 in your supervisor.

## What Next?

You have just wired Agent Mesh into a chat surface. Most readers next want to integrate it into an existing application or backend service via the HTTP/SSE API, covered in REST gateway integration.
