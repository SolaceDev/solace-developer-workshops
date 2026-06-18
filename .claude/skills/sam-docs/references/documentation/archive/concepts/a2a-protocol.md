---
title: A2A Protocol
description: The Agent-to-Agent wire format Solace Agent Mesh speaks across the broker — JSON-RPC 2.0 envelope, topic conventions, user-property headers, signal taxonomy, and the JWT trust chain.
sidebar_position: 2
---

# A2A Protocol

Concepts → GWE / AWE / STR names the three workload classes; Concepts → Request lifecycle walks one prompt through them. This page is the wire-format reference: the JSON-RPC envelope, the topic naming rules, the broker-header user properties, the signal taxonomy, and the JWT trust chain that they use to talk to each other.

A2A is a JSON-RPC 2.0 dialect carried over broker topics. The shape is **identical to Python Agent Mesh** — both implementations accept each other's messages without translation. This is a hard constraint, not a goal. When the Go code disagrees with the Python wire, the Python wire wins and the Go code is the bug.

## The Envelope

Every A2A payload is a JSON-RPC 2.0 message. Requests and responses both carry the task ID in the JSON-RPC `id` field.

```json
{
  "jsonrpc": "2.0",
  "id": "<taskID>",
  "method": "message/stream",
  "params": {
    "message": {
      "kind": "message",
      "messageId": "<messageID>",
      "role": "user",
      "parts": [{ "kind": "text", "text": "Summarise quarterly earnings" }],
      "contextId": "<sessionID>"
    }
  }
}
```

The success response is a JSON-RPC `result`; an error response is a JSON-RPC `error` with `{code, message, data?}`. The `result` payload is an A2A task, message, or status-update event (the polymorphism is method-dependent).

The JSON-RPC method names on the wire:

| Method | Direction | Use |
|---|---|---|
| `message/stream` | gateway → AWE, AWE → peer agent | Submit a streaming task |
| `message/send` | gateway → AWE | Non-streaming submit (used to resume an `auth-required` or `input-required` pause) |
| `tasks/cancel` | gateway → AWE | Cancel an in-flight task |
| `sam_remote_tool/invoke` | AWE → STR | Invoke a remote tool |
| `sam_remote_tool/status` | STR → AWE | Tool progress update |
| `sam_remote_tool/init` | STR → AWE | Tool registration broadcast (one per tool at startup) |
| `sam_remote_tool/init_request` | AWE → STR | Request a config-aware schema for a specific tool |
| `sam_remote_tool/removed` | STR → AWE | Tool removed from the manifest |
| `sam_remote_tool/failed_discovery` | STR → AWE, STR → Platform | `--schema` invocation failed for a tool binary |

## Topic Conventions

Every A2A topic follows the prefix `<namespace>/a2a/v1/<service>/...` where `<namespace>` is the configurable broker namespace (default: `solace-agent-mesh`).

| Topic | Producer / consumer |
|---|---|
| `<ns>/a2a/v1/agent/request/<agentName>` | gateway publishes; AWE subscribes |
| `<ns>/a2a/v1/gateway/status/<gatewayID>/<taskID>` | AWE publishes; gateway subscribes |
| `<ns>/a2a/v1/gateway/response/<gatewayID>/<taskID>` | AWE publishes; gateway subscribes |
| `<ns>/a2a/v1/agent/status/<delegatingAgent>/<subTaskID>` | Peer agent publishes; delegating agent subscribes |
| `<ns>/a2a/v1/agent/response/<delegatingAgent>/<subTaskID>` | Peer agent publishes; delegating agent subscribes |
| `<ns>/a2a/v1/sam_remote_tool/invoke/<toolName>` | AWE publishes; STR subscribes |
| `<ns>/a2a/v1/sam_remote_tool/response/<agentName>/<corrID>` | STR publishes; AWE subscribes |
| `<ns>/a2a/v1/sam_remote_tool/status/<agentName>/<corrID>` | STR publishes; AWE subscribes |
| `<ns>/a2a/v1/sam_remote_tool/cancel/<corrID>` | AWE publishes; every STR worker subscribes via wildcard |
| `<ns>/a2a/v1/discovery/agentcards` | AWE publishes; gateway and peer agents subscribe |
| `<ns>/a2a/v1/discovery/gatewaycards` | gateway publishes; clients subscribe |
| `<ns>/a2a/v1/trust/<componentType>/<componentID>` | Every component publishes; trust manager subscribes |

The `<namespace>` segment is validated at config load — broker wildcards (`*`, `>`), path-traversal segments (`..`), and leading slashes are rejected so a misconfigured namespace fails fast instead of producing topics that escape the intended prefix.

## User Properties

The broker carries a flat map of string key/value pairs alongside every payload (in Solace terms, "user properties"). A2A uses this map for routing and auth metadata that has to be visible without parsing the JSON-RPC body.

| Key | Set by | Purpose |
|---|---|---|
| `clientId` | originating gateway | Gateway ID — used for response topic routing |
| `userId` | gateway | End-user identifier |
| `replyTo` | gateway | Topic the agent publishes the terminal response to |
| `a2aStatusTopic` | gateway | Topic the agent publishes status events to |
| `traceId` | gateway (minted as UUIDv7) | Immutable per-task trace ID, forwarded on every republish |
| `authToken` | gateway | Per-task JWT signed by the gateway's trust manager |
| `a2aUserConfig` | gateway | JSON blob carrying `_enterprise_capabilities`, `user_profile`, enrichment outcome |
| `a2aExtensions` | originating publisher | Comma-separated A2A extension URIs the publisher is using |
| `gatewayCapabilities` | gateway | Capability flags peers forward unchanged. `interactive_plan_verification` — gateway can render the deep-research plan card. `interactive_user_input` — gateway can render a generic A2UI `user_input_request` surface (`ask_user_question`, tool approval, volume `prompt_user`) and round-trip a response. Web sets both; Slack/Teams set `interactive_user_input`; email sets it only when a magic-link form is configured; MCP/event-mesh leave it unset, so those prompts return a clean error (or, for tool approval, a fail-safe denial) instead of deadlocking. |
| `callDepth` | delegating agent | Agent-to-agent recursion depth — gated by the per-agent peer-recursion limit |
| `timestamp` | every publisher | Publication time in epoch milliseconds |
| `delegating_agent_name` | delegating agent | Set on peer delegation; triggers verify-without-task-binding on the receiver |

All keys are camelCase **except `delegating_agent_name`**, which stays snake_case for Python Agent Mesh wire parity. Reading the map with the wrong case is the most common A2A bug.

## Signal Taxonomy

Streaming status events carry a Agent Mesh-specific signal type in the status-update event's metadata. The most common signals group as follows:

| Category | Signals | Emitted when |
|---|---|---|
| LLM | `llm_invocation`, `llm_response`, `thinking_content` | The agent calls the LLM, the LLM responds, an extended-thinking model emits its reasoning |
| Agent progress | `agent_progress_update` | The agent surfaces a free-form progress message |
| Tool invocation | `tool_invocation_start`, `tool_result` | Tool dispatch begins, tool result arrives |
| Artifact lifecycle | `artifact_creation_progress`, `artifact_saved` | A tool is producing an artifact, an artifact write commits |
| Templates / structured | `template_block`, `structured_invocation_request`, `structured_invocation_result` | A fenced template block resolves, a structured-output sub-call begins / completes |
| Workflow | `workflow_execution_start`, `workflow_execution_result`, `workflow_node_execution_start`, `workflow_node_execution_result`, `workflow_map_progress` | The workflow engine and each typed node emit their lifecycle |
| Deep research | `deep_research_progress`, `deep_research_plan`, `deep_research_plan_stale`, `deep_research_report` | The deep-research tool publishes iteration progress, the verifiable plan, and the final report |
| Auth | `authentication_required`, `auth_response` | A tool needs OAuth, the user has completed the consent flow |
| Human-in-the-loop | `user_input_request`, `user_input_response` | The agent pauses for typed user input, the user has answered |
| RAG | `rag_info_update` | A retrieval step emits its source metadata |
| AI Builder | `builder_component_progress` | The Platform service's AI Builder reports a component-generation step |

Signal-type values are snake_case lowercase on the wire — `llm_invocation`, not `LLMInvocation` and not `llm-invocation`.

## Task State Vocabulary

A2A defines a closed set of task states, carried in the `state` field of every status-update event and on the final task body.

| State | Meaning |
|---|---|
| `submitted` | Accepted by the agent, not yet started |
| `working` | Actively in the LLM loop or executing a tool |
| `completed` | Reached natural termination |
| `failed` | Unrecoverable error |
| `canceled` | The client called `tasks/cancel` |
| `input-required` | Paused for human-in-the-loop input |
| `auth-required` | Paused for OAuth consent |
| `rejected` | Refused at admission (e.g. RBAC scope failure) |
| `unknown` | Unrecognised state from an older or newer wire version |

The terminal status-update event for a task has `final: true`. After that, the agent publishes the final response on the response topic.

## Snake_Case on the Wire vs CamelCase in HTTP

The gateway's HTTP API uses camelCase (per the Solace REST API ADRs), but the A2A broker wire uses snake_case for inner blobs. The two conventions coexist by surface: A2A wire parity with Python Agent Mesh is non-negotiable; REST ADR parity for the HTTP API is non-negotiable.

The canonical example is `task_metadata` — the same logical record flips case depending on whether it is travelling on the broker or in an HTTP DTO.

On the A2A wire (inside `message.metadata` or the parameters of a tool invocation):

```json
{
  "task_metadata": {
    "agent_name": "Orchestrator",
    "project_id": "${PROJECT_ID}",
    "session_id": "${SESSION_ID}"
  }
}
```

In an HTTP DTO returned by the gateway:

```json
{
  "taskMetadata": {
    "agentName": "Orchestrator",
    "projectId": "${PROJECT_ID}",
    "sessionId": "${SESSION_ID}"
  }
}
```

The rule is: if the bytes are going through the broker, snake_case; if they are going through HTTP, camelCase. Don't try to unify; the conversion happens at the gateway boundary.

## JWT Signing and Trust

A2A uses a single signed channel for both authentication and authorization:

1. The gateway resolves the user's roles → scopes and signs a per-task JWT carrying both the user identity claims and the resolved `scopes` claim. The signed JWT is attached as `authToken` in the broker user properties.
2. The agent's trust manager verifies the JWT (proving the request came from a legitimate gateway) and reads the resolved scopes directly from the verified claims. The agent does not run its own RBAC resolution.

Each component holds a signing key for itself and verification keys for every other component, distributed via the trust-card topic. The signing key is bound to the broker client-username, and broker ACLs guarantee topic authenticity on the trust-card topic — that is what prevents a compromised peer from impersonating a gateway.

**Hard warning.** The unsigned `a2aUserConfig._enterprise_capabilities` body field exists for historical reasons but must not be used to populate scopes. Trusting it would let a compromised peer agent re-publish a legitimately-signed gateway JWT alongside an inflated `_enterprise_capabilities` body, and the receiving agent would honor the inflated scopes. Authorization decisions must derive from the cryptographically-verified JWT claims only.

In practice the receiving agent reconciles the unsigned body against the signed claims via a soft-subset assert — narrowing is allowed, widening is dropped with a structured warn. This is a deliberate migration accommodation, not a design feature; a future strict-mode configuration will reject mismatches outright.

## Three Patterns the Protocol Uses

The protocol layers three independent patterns on top of the same envelope.

**Discovery.** Every agent and gateway publishes its card (agent card or gateway card) on the discovery topics on startup, then republishes when its capability set changes. Subscribers (peer agents, the gateway agent-card endpoint) build a local view of who is on the mesh. A component that stops publishing is reaped from the local view by a TTL sweep. Trust cards on `<ns>/a2a/v1/trust/<componentType>/<componentID>` follow the same publish-on-startup pattern for signing keys.

**Request-response.** One request on the request topic, one terminal response on the reply topic. Used for `tasks/cancel`, `sam_remote_tool/invoke`, and the non-streaming `message/send`. The request carries `replyTo` in user properties; the responder publishes exactly once and then stops.

**Stream-status.** Used for `message/stream`. The responder accepts the request, then emits a sequence of status-update events on the status topic until it finishes — at which point it emits one event with `final: true` and publishes a single response on the reply topic. Clients (the SSE event log, peer agents) follow the status stream live and use the terminal event to close their subscription.

## Python Agent Mesh Parity

The other implementation of A2A is the Python Agent Mesh runtime — same envelope, same topic conventions, same user-property semantics. A Go AWE can serve a Python gateway's request; a Python AWE can serve a Go gateway's request. Mixed deployments are explicitly supported.

When the Go code and the Python code disagree on the wire, the Python repo is the cross-implementation contract. The fix is to change the Go code, not to invent a Go-specific message shape.

## What Next?

The protocol described here is what flows; Concepts → Request lifecycle shows the same protocol from the dynamic angle — what gets published in what order when a user sends one prompt.
