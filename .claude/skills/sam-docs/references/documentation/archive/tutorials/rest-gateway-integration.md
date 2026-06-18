---
title: REST Gateway Integration
description: Integrate Solace Agent Mesh into an existing application via the HTTP / SSE API — submit tasks, stream results, and continue conversations from any HTTP client.
sidebar_position: 2
---

# REST Gateway Integration

This tutorial wires a Solace Agent Mesh deployment behind the Web UI gateway's HTTP / SSE API and drives it from `curl`. The same flow works from any HTTP client — Python `httpx`, Node `fetch`, a Go `http.Client`, an iOS Swift client — because the wire format is plain JSON-RPC 2.0 over HTTP plus a Server-Sent Events stream for live results.

By the end you will have:

- A configured Web UI gateway and a configured agent running locally.
- A reusable `curl` recipe to submit a task and stream the agent's response.
- A second `curl` recipe to continue the same conversation across multiple turns.

## What You Need Before You Start

- Agent Mesh installed locally. Walk Installing → Install if you have not yet.
- An LLM API endpoint and key, configured per Installing → Configure.
- A broker reachable from the gateway. The dev broker that ships with the repo is enough for a laptop run.
- `curl` (any version that supports `--no-buffer` is fine). The samples use `jq` to slice JSON; either install it or strip the trailing `| jq …` from the commands.

## Configure the Gateway

Drop a Web UI gateway config in your project's `configs/` directory. The Web UI gateway is the default adapter — when `gateway_adapter:` is omitted, the gateway selects `httpsse` automatically.

```yaml
# configs/webui_gateway.yaml
log:
  level: info

apps:
  - name: webui_gateway_app
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
        database_url: "sqlite:///tmp/sam-go-rest.db"
        default_behavior: "PERSISTENT"

      model:
        model: ${LLM_SERVICE_GENERAL_MODEL_NAME, openai/gpt-4o-mini}
        api_base: ${LLM_SERVICE_ENDPOINT}
        api_key: ${LLM_SERVICE_API_KEY}

      gateway_id: ${WEBUI_GATEWAY_ID, rest-tutorial-gw}
      fastapi_host: ${FASTAPI_HOST, localhost}
      fastapi_port: ${FASTAPI_PORT, 8800}

      cors_allowed_origins:
        - "http://localhost:3000"

      enable_embed_resolution: true
      sse_max_queue_size: 200

      task_logging:
        enabled: true
        log_status_updates: true
        log_artifact_events: true
```

A few notes on the knobs that matter most:

- **`fastapi_host` / `fastapi_port`** bind the HTTP listener. The default `localhost:8800` is fine for a laptop run; behind a reverse proxy in production, bind to `0.0.0.0` and let the proxy handle TLS.
- **`cors_allowed_origins`** is enforced strictly by the gateway. Browser clients that hit the API from any origin not on this list get rejected. Server-to-server `curl` callers are unaffected — CORS is browser-side enforcement.
- **`session_service.default_behavior: PERSISTENT`** is what lets you reuse a `contextId` across calls to continue a conversation. Without a session store, each call is a fresh session.
- **`session_secret_key`** signs the gateway's session cookie. Generate one with `openssl rand -hex 32`. Treat as a real secret.

The full key reference lives in Building → Gateways.

## Configure the Agent

The gateway dispatches tasks to a configured agent. A minimal one looks like this:

```yaml
# configs/chat_agent.yaml
log:
  level: info

apps:
  - name: chat_agent_app
    app_exec: sam-awe
    app_config:
      agent_name: ChatAgent
      display_name: Chat
      namespace: ${NAMESPACE, solace-agent-mesh}
      supports_streaming: true

      model:
        model: ${LLM_SERVICE_GENERAL_MODEL_NAME, openai/gpt-4o}
        api_base: ${LLM_SERVICE_ENDPOINT}
        api_key: ${LLM_SERVICE_API_KEY}

      instruction: |
        You are a helpful assistant. Answer questions clearly and
        concisely. Cite a source when one is available.

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

      agent_card:
        description: |
          A general-purpose chat agent for REST-API integration testing.
        defaultInputModes: ["text"]
        defaultOutputModes: ["text", "file"]

      agent_card_publishing: { interval_seconds: 10 }
      agent_discovery: { enabled: true }
```

`agent_name: ChatAgent` is the addressable name the gateway uses; `display_name: Chat` is the friendlier label that surfaces in agent-card listings. The HTTP API accepts either when you ask for an agent — see Configured vs built for the broader design and Building → Agents for every field.

## Run the Gateway and the Agent

Set the environment, then start everything in one command.

```bash
# Mesh and LLM config
export NAMESPACE=solace-agent-mesh
export LLM_SERVICE_ENDPOINT=${LLM_SERVICE_ENDPOINT}
export LLM_SERVICE_API_KEY=${LLM_SERVICE_API_KEY}
export LLM_SERVICE_GENERAL_MODEL_NAME=openai/gpt-4o

# Gateway session cookie key
export SESSION_SECRET_KEY=$(openssl rand -hex 32)

# Dev broker for a laptop run
export SOLACE_DEV_MODE=true
```

Launch the agent and the gateway under one orchestrator:

```bash
sam run configs/
```

`sam run` spawns one subprocess per YAML config in the directory (the agent and the gateway) and starts an in-process TCP dev broker on `:55554` that both subprocesses connect to. Logs from each subprocess are interleaved into the same terminal with `[chat_agent]` / `[webui_gateway]` prefixes, and `Ctrl+C` shuts down everything together.

Confirm the gateway is up:

```bash
curl -s http://localhost:8800/health
```

The response is `{"status":"A2A Web UI Backend is running"}`.

## Discover the Agents

The gateway exposes a list of agents that have advertised themselves on the broker:

```bash
curl -s http://localhost:8800/api/v1/agentCards | jq '.data[] | {name, description}'
```

You will see your `ChatAgent` in the list within ten seconds of the agent process starting — the agent's `agent_card_publishing.interval_seconds: 10` setting decides how often it re-publishes. The shape of the response is the standard list envelope:

```json
{
  "data": [
    {
      "name": "ChatAgent",
      "description": "A general-purpose chat agent for REST-API integration testing.",
      "defaultInputModes": ["text"],
      "defaultOutputModes": ["text", "file"]
    }
  ],
  "meta": {
    "pagination": {
      "pageNumber": 1,
      "pageSize": 1,
      "count": 1,
      "totalPages": 1,
      "nextPage": null
    }
  }
}
```

Every list endpoint on this surface uses the same envelope; single-resource endpoints return the resource bare. The full convention is documented in the API ADRs (linked from the Building → Gateways section).

## Submit a Task and Stream the Response

A task starts with a single POST. The body is a JSON-RPC 2.0 envelope:

```bash
TASK_REQUEST=$(cat <<'EOF'
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "method": "message/stream",
  "params": {
    "message": {
      "kind": "message",
      "role": "user",
      "messageId": "msg-001",
      "metadata": {
        "agent_name": "ChatAgent"
      },
      "parts": [
        {"kind": "text", "text": "Hello, who are you?"}
      ]
    }
  }
}
EOF
)

SUBMIT_RESPONSE=$(curl -s -X POST http://localhost:8800/api/v1/message:stream \
  -H "Content-Type: application/json" \
  -d "${TASK_REQUEST}")

echo "${SUBMIT_RESPONSE}" | jq
```

The response carries the assigned `taskId` and `contextId`:

```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": {
    "id": "0193f4b9-3a7e-7c2f-a4d8-b9e1c5d2f604",
    "contextId": "0193f4b9-3a7e-7c2f-a4d8-b9e1c5d2f605",
    "kind": "task"
  }
}
```

A few things worth noting about the request body:

- **`jsonrpc: "2.0"`** is required. The gateway rejects requests with a different version.
- **`metadata.agent_name`** is the routing key. The gateway matches it against either the agent's `agent_name` (the broker-routed identity) or its `display_name`. Without it, the gateway responds with a JSON-RPC error.
- **`messageId`** is a client-generated identifier for the message inside the conversation. Use a UUID per message; the gateway dedupes against it.
- **`parts`** is an A2A message-parts list. A single text part is the simplest payload; file parts can be inlined as base64 `bytes` or referenced by `uri`. The full part shape is part of the A2A protocol — see Concepts → A2A protocol.

Now subscribe to the live event stream for that task:

```bash
TASK_ID=$(echo "${SUBMIT_RESPONSE}" | jq -r '.result.id')

curl --no-buffer -N \
  "http://localhost:8800/api/v1/sse/subscribe/${TASK_ID}"
```

`--no-buffer` (or `-N`) is mandatory — without it `curl` waits to print until the connection closes, which defeats the streaming purpose. The output is a sequence of SSE frames:

```text
: SSE connection established

id: 1
event: status_update
data: {"jsonrpc":"2.0","result":{"status":{"state":"working","message":{"role":"agent","parts":[{"kind":"text","text":"Looking that up"}]}}}}

id: 2
event: status_update
data: {"jsonrpc":"2.0","result":{"status":{"state":"working","message":{"role":"agent","parts":[{"kind":"text","text":"I am an AI assistant."}]}}}}

id: 3
event: final_response
data: {"jsonrpc":"2.0","result":{"kind":"task","status":{"state":"completed"},"artifacts":[{"parts":[{"kind":"text","text":"I am an AI assistant built on Solace Agent Mesh."}]}]}}
```

Three event types matter for most clients:

- **`status_update`** — partial output and progress messages. Multiple per task. The `data` field is a JSON-RPC envelope whose inner `result.status.message.parts[*].text` carries the streamed text.
- **`final_response`** — the last event for the task. `data.result.status.state` is `"completed"` on success or `"failed"` on error. The connection closes after this event.
- **`artifact_update`** — emitted when the agent creates or updates an artifact. The `data` field references the artifact by URI; fetch the bytes via the `/api/v1/artifacts/*` endpoints documented in Building → Gateways.

The stream also includes periodic `: heartbeat` comment lines (every 15 seconds) to keep the connection alive across proxies and OS-level TCP timeouts. Comment lines start with `:` and carry no event — your client can ignore them.

### Non-Streaming Alternative

If you do not need live progress, swap the method:

```bash
curl -s -X POST http://localhost:8800/api/v1/message:send \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "req-002",
    "method": "message/send",
    "params": {
      "message": {
        "kind": "message",
        "role": "user",
        "messageId": "msg-002",
        "metadata": {"agent_name": "ChatAgent"},
        "parts": [{"kind": "text", "text": "Hello"}]
      }
    }
  }' | jq
```

The HTTP response shape is identical — you get the `taskId` and `contextId` immediately. The agent still runs in the background and publishes status to the broker; you just don't receive the SSE stream. Poll task status with `GET /api/v1/tasks/{id}/status` if you need to.

## Continue a Conversation

To make a second call part of the same conversation, reuse the `contextId` from the first response. The gateway looks up the existing session and threads the new message into it.

```bash
CONTEXT_ID=$(echo "${SUBMIT_RESPONSE}" | jq -r '.result.contextId')

curl -s -X POST http://localhost:8800/api/v1/message:stream \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": \"req-003\",
    \"method\": \"message/stream\",
    \"params\": {
      \"message\": {
        \"kind\": \"message\",
        \"role\": \"user\",
        \"messageId\": \"msg-003\",
        \"contextId\": \"${CONTEXT_ID}\",
        \"metadata\": {\"agent_name\": \"ChatAgent\"},
        \"parts\": [{\"kind\": \"text\", \"text\": \"What did you just tell me?\"}]
      }
    }
  }" | jq
```

The response returns a fresh `taskId` (each turn is its own task) but the same `contextId`. The agent sees the prior turn's messages in its session history and can refer back to them. Subscribe to the new `taskId` to stream the second turn.

A few rules around session reuse:

- A `contextId` is one conversation. Don't reuse it across users — the gateway looks up the session by id, and session ownership is enforced once auth is configured.
- A fresh `messageId` is required per message. The gateway uses it for dedup; two messages with the same `messageId` collapse into the first.
- The `metadata.agent_name` stays the same across turns inside one `contextId`. Changing agents mid-conversation is a different flow — use a fresh `contextId` for the second agent.

## Cancel a Running Task

If a task is taking too long, cancel it:

```bash
curl -s -X POST "http://localhost:8800/api/v1/tasks/${TASK_ID}:cancel"
```

The response is an `Operation` envelope:

```json
{
  "id": "0193f4b9-3a7e-7c2f-a4d8-b9e1c5d2f604",
  "status": "in_progress",
  "resourceUrl": "/api/v1/tasks/0193f4b9-3a7e-7c2f-a4d8-b9e1c5d2f604"
}
```

The gateway publishes a cancellation signal to the agent; the agent stops at the next available checkpoint. Child tasks (peer-agent delegations, workflow sub-tasks) are cancelled as well. Subscribers to the original task's SSE stream see a `final_response` event with `result.status.state: "cancelled"`.

## Authentication

The Web UI gateway runs unauthenticated by default — anyone who can reach the listener can submit tasks. That is fine for a laptop demo; it is not fine for a deployment that anyone outside your local machine can reach.

For production, configure OIDC authentication, signed session cookies, and per-endpoint RBAC. Configuration walks through Installing → Configure; the RBAC scope model is in Administering → RBAC reference.

For a CI bot or a server-to-server caller, the common pattern is to put the gateway behind your existing API-gateway layer (or a reverse proxy that does mTLS or HMAC validation) and inject the resulting identity through the auth middleware. The gateway accepts the identity through standard auth headers; the field-by-field reference is documented in the configuration page.

## Troubleshooting

### `POST /api/v1/message:stream` Returns 400

**Symptoms.** The server responds with `400 Bad Request` and a JSON-RPC error envelope.
**Diagnostic.** Read the `error.message` field. The common cases are `parse error: ...` (the body is not valid JSON), `invalid jsonrpc version` (missing or wrong `jsonrpc: "2.0"`), and `metadata.agent_name is required` (the `params.message.metadata.agent_name` field is missing or empty).
**Resolution.** Validate the request body against the Submit a task and stream the response example. Every key inside `params.message` is checked.
**Prevention.** Generate the request from a typed model in your client language rather than hand-assembling JSON strings.

### Submit Returns 404 `agent not found`

**Symptoms.** The response is `{"jsonrpc": "2.0", "id": "...", "error": {"code": -32001, "message": "agent not found: ..."}}`.
**Diagnostic.** Run `curl -s http://localhost:8800/api/v1/agentCards | jq '.data[].name'` and confirm the name the agent advertises matches the `metadata.agent_name` value you sent.
**Resolution.** Use either the agent's `agent_name` or its `display_name`. The match is exact and case-sensitive — `chatagent` does not match `ChatAgent`. If the agent isn't in the list at all, the agent process isn't running, or it isn't reaching the broker, or it is publishing in a different `namespace`.
**Prevention.** Pin the same `namespace:` value in the gateway and every agent. If a deployment grew across multiple namespaces, the agent-discovery topic is scoped per namespace and a gateway will never see agents outside its own.

### `GET /api/v1/sse/subscribe/{taskId}` Closes Immediately

**Symptoms.** The SSE connection opens, prints `: SSE connection established`, and closes within milliseconds with no events.
**Diagnostic.** The most common cause is hitting the wrong path. The correct path is `/api/v1/sse/subscribe/{taskId}`. A request to `/sse/subscribe/{taskId}` (missing the `/api/v1` prefix) does not match any route — the gateway responds with 404 and most clients log "connection closed".
**Resolution.** Use `/api/v1/sse/subscribe/{taskId}`. The taskId must be a UUID — if you accidentally pass the `contextId` or some other identifier, the gateway returns 400.
**Prevention.** Keep the base URL plus the API version (`http://localhost:8800/api/v1`) as a single constant in your client; build endpoint paths off of it.

### 200 On Submit but No `final_response` Ever Arrives

**Symptoms.** The POST succeeds and the SSE stream connects, but the agent's response never lands. `status_update` events may appear and then stop.
**Diagnostic.** Check the agent process logs. The most common patterns are (a) the LLM call timed out, (b) the agent crashed on a tool call, (c) the broker connection dropped on the agent side.
**Resolution.** Restart the agent. If the failure is reproducible, run with `LOG_LEVEL=debug` to surface the LLM and tool-call detail. For production deployments, set up alerting on the agent's `/health` endpoint and on log-level `error` events through the observability pipeline documented in Administering → Observability.
**Prevention.** Cap LLM-tool loop depth with `max_llm_calls_per_task` on the agent and pin per-tool `timeout_seconds` so a stuck tool can't strand a task indefinitely.

## What Next?

You have now driven Agent Mesh from raw HTTP and SSE. Most readers next want to expose this same surface from a chat tool like Slack — covered in Slack support bot. For the full HTTP API and other gateway adapters, see Building → Gateways.
