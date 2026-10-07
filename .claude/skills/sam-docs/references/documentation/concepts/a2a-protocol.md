---
published: true
title: Agent-to-Agent Protocol
description: "The Agent-to-Agent wire format Agent Mesh speaks across the event broker: JSON-RPC 2.0 envelope, topic conventions, user-property headers, signal taxonomy, and the JWT trust chain."
sidebar_position: 595
---

# Agent-to-Agent Protocol

[How Agent Mesh Manages Workloads](./managing-workloads.md) names the three workload classes. This page is the wire-format reference: the JSON-RPC envelope, the topic naming rules, the event broker header user properties, the signal taxonomy, and the JSON Web Token (JWT) trust chain that they use to talk to each other.

A2A is a JSON-RPC 2.0 dialect carried over event broker topics, and a frozen wire contract: every component that implements the A2A v1 wire format accepts every other component's messages without translation.

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
      "parts": [{ "kind": "text", "text": "Summarize quarterly earnings" }],
      "contextId": "<sessionID>"
    }
  }
}
```

The success response is a JSON-RPC `result`; an error response is a JSON-RPC `error` with `{code, message, data?}`. The `result` payload is an A2A task, message, or status-update event, depending on the method that was called.

The JSON-RPC method names on the wire:

| Method | From | To | Use |
|---|---|---|---|
| `message/stream` | Entrypoint Executor | Agent-Workflow Executor | Submit a streaming task |
| `message/send` | Entrypoint Executor | Agent-Workflow Executor | Non-streaming submit |
| `message/send` | Agent-Workflow Executor | peer agent | Delegation to a peer agent, subtask forwarding, and resuming an `auth-required` or `input-required` pause |
| `tasks/cancel` | Entrypoint Executor | Agent-Workflow Executor | Cancel an in-flight task |
| `sam_remote_tool/invoke` | Agent-Workflow Executor | Secure Tool Runtime | Invoke a remote tool |
| `sam_remote_tool/status` | Secure Tool Runtime | Agent-Workflow Executor | Tool progress update |
| `sam_remote_tool/init` | Secure Tool Runtime | Agent-Workflow Executor | Tool registration broadcast (one per tool at startup) |
| `sam_remote_tool/init_request` | Agent-Workflow Executor | Secure Tool Runtime | Request a config-aware schema for a specific tool |
| `sam_remote_tool/removed` | Secure Tool Runtime | Platform | Tool removed from the manifest |
| `sam_remote_tool/failed_discovery` | Secure Tool Runtime | Platform | `--schema` invocation failed for a tool binary |

## Topic Conventions

Every A2A topic follows the prefix `<namespace>/a2a/v1/<service>/...` where `<namespace>` is the configurable event broker namespace (default: `solace-agent-mesh`).

| Topic | Publisher | Subscriber |
|---|---|---|
| `<ns>/a2a/v1/agent/request/<agentName>` | Entrypoint Executor | Agent-Workflow Executor |
| `<ns>/a2a/v1/gateway/status/<gatewayID>/<taskID>` | Agent-Workflow Executor | Entrypoint Executor |
| `<ns>/a2a/v1/gateway/response/<gatewayID>/<taskID>` | Agent-Workflow Executor | Entrypoint Executor |
| `<ns>/a2a/v1/agent/status/<delegatingAgent>/<subTaskID>` | Peer agent | delegating agent |
| `<ns>/a2a/v1/agent/response/<delegatingAgent>/<subTaskID>` | Peer agent | delegating agent |
| `<ns>/a2a/v1/sam_remote_tool/invoke/<toolName>` | Agent-Workflow Executor | Secure Tool Runtime |
| `<ns>/a2a/v1/sam_remote_tool/response/<agentName>/<corrID>` | Secure Tool Runtime | Agent-Workflow Executor |
| `<ns>/a2a/v1/sam_remote_tool/status/<agentName>/<corrID>` | Secure Tool Runtime | Agent-Workflow Executor |
| `<ns>/a2a/v1/sam_remote_tool/cancel/<corrID>` | Agent-Workflow Executor | every Secure Tool Runtime worker (via wildcard) |
| `<ns>/a2a/v1/discovery/agentcards` | Agent-Workflow Executor | Entrypoint Executor and peer agents |
| `<ns>/a2a/v1/discovery/gatewaycards` | Entrypoint Executor | clients |
| `<ns>/a2a/v1/trust/<componentType>/<componentID>` | Every component | trust manager |

The `<namespace>` segment is validated at config load. Event broker wildcards (`*`, `>`), path-traversal segments (`..`), and leading slashes are rejected so a misconfigured namespace fails fast instead of producing topics that escape the intended prefix.

## User Properties

The event broker carries a flat map of string key/value pairs alongside every payload (in Solace terms, "user properties"). A2A uses this map for routing and auth metadata that has to be visible without parsing the JSON-RPC body.

| Key | Set by | Purpose |
|---|---|---|
| `clientId` | originating entrypoint | Entrypoint ID, used for response topic routing |
| `userId` | entrypoint | End-user identifier |
| `replyTo` | entrypoint | Topic the agent publishes the terminal response to |
| `a2aStatusTopic` | entrypoint | Topic the agent publishes status events to |
| `traceId` | entrypoint (minted as UUIDv7) | Immutable per-task trace ID, forwarded on every republish |
| `authToken` | entrypoint | Per-task JWT signed by the entrypoint's trust manager |
| `a2aUserConfig` | entrypoint | JSON blob carrying `_enterprise_capabilities`, `user_profile`, enrichment outcome |
| `a2aExtensions` | originating publisher | Comma-separated A2A extension URIs the publisher is using |
| `gatewayCapabilities` | entrypoint | Capability flags peers forward unchanged. `interactive_plan_verification`: entrypoint can render the deep-research plan card. `interactive_user_input`: entrypoint can render a generic A2UI `user_input_request` surface (`ask_user_question`, tool approval, volume `prompt_user`) and round-trip a response. Web sets both; Slack/Teams set `interactive_user_input`; email sets it only when a magic-link form is configured; MCP/event-mesh leave it unset, so those prompts return a clean error (or, for tool approval, a fail-safe denial) instead of deadlocking. |
| `callDepth` | delegating agent | Agent-to-agent recursion depth, gated by the per-agent peer-recursion limit |
| `timestamp` | every publisher | Publication time in epoch milliseconds |
| `delegating_agent_name` | delegating agent | Set on peer delegation; the receiver verifies the sender without binding the check to a specific task |

All keys are camelCase except `delegating_agent_name`, which predates the camelCase convention; renaming it now would break any already-deployed component still reading the old key. Reading the map with the wrong case is the most common A2A bug.

## Signal Taxonomy

Streaming status events carry an Agent Mesh-specific signal type in the status-update event's metadata. The most common signals group as follows:

| Category | Signals | Emitted when |
|---|---|---|
| LLM | `llm_invocation`, `llm_response`, `thinking_content` | The agent calls the LLM, the LLM responds, an extended-thinking model emits its reasoning |
| Agent progress | `agent_progress_update` | The agent emits a free-form progress message |
| Tool invocation | `tool_invocation_start`, `tool_result` | Tool dispatch begins, tool result arrives |
| Artifact lifecycle | `artifact_creation_progress`, `artifact_saved` | A tool is producing an artifact, an artifact write commits |
| Templates / structured | `template_block`, `structured_invocation_request`, `structured_invocation_result` | A fenced template block resolves, a structured-output sub-call begins / completes |
| Workflow | `workflow_execution_start`, `workflow_execution_result`, `workflow_node_execution_start`, `workflow_node_execution_result`, `workflow_map_progress` | The workflow engine and each typed node emit their lifecycle |
| Deep research | `deep_research_progress`, `deep_research_plan`, `deep_research_plan_stale`, `deep_research_report` | The deep-research tool publishes iteration progress, the verifiable plan, and the final report |
| Auth | `authentication_required`, `auth_response` | A tool needs OAuth, the user has completed the consent flow |
| Human-in-the-loop | `user_input_request`, `user_input_response` | The agent pauses for typed user input, the user has answered |
| Retrieval-Augmented Generation (RAG) | `rag_info_update` | A retrieval step emits its source metadata |
| AI Builder | `builder_component_progress` | The Platform service's AI Builder reports a component-generation step |

Signal-type values are snake_case lowercase on the wire: `llm_invocation`, not `LLMInvocation` and not `llm-invocation`.

## Task State Vocabulary

A2A defines a fixed set of task states, carried in the `state` field of every status-update event and on the final task body.

| State | Meaning |
|---|---|
| `submitted` | Accepted by the agent, not yet started |
| `working` | Actively in the LLM loop or executing a tool |
| `completed` | Reached natural termination |
| `failed` | Unrecoverable error |
| `canceled` | The client called `tasks/cancel` |
| `input-required` | Paused for human-in-the-loop input |
| `auth-required` | Paused for OAuth consent |
| `rejected` | Refused at admission (for example, RBAC scope failure) |
| `unknown` | Unrecognized state from an older or newer wire version |

The terminal status-update event for a task has `final: true`. After that, the agent publishes the final response on the response topic.

## Snake_Case on the Wire vs CamelCase in HTTP

The entrypoint's HTTP API uses camelCase (per the Solace REST API ADRs), but the A2A event broker wire uses snake_case for inner blobs. The two conventions coexist at different layers: A2A wire backward compatibility is non-negotiable — every already-deployed component must keep parsing new messages without a coordinated upgrade — and REST ADR compatibility for the HTTP API is separately non-negotiable.

The canonical example is `task_metadata`: the same logical record flips case depending on whether it is travelling on the event broker or in an HTTP data transfer object (DTO).

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

In an HTTP DTO returned by the entrypoint:

```json
{
  "taskMetadata": {
    "agentName": "Orchestrator",
    "projectId": "${PROJECT_ID}",
    "sessionId": "${SESSION_ID}"
  }
}
```

The rule is: if the bytes are going through the event broker, snake_case; if they are going through HTTP, camelCase. Do not try to unify; the conversion happens at the entrypoint boundary.

## JWT Signing and Trust

A2A uses a single signed channel for both authentication and authorization:

1. The entrypoint resolves the user's roles to scopes and signs a per-task JWT carrying both the user identity claims and the resolved `scopes` claim. The signed JWT is attached as `authToken` in the event broker user properties.
2. The agent's trust manager verifies the JWT (proving the request came from a legitimate entrypoint) and reads the resolved scopes directly from the verified claims. The agent does not run its own role-based access control (RBAC) resolution.

Each component holds a signing key for itself and verification keys for every other component, distributed via the trust-card topic. The signing key is bound to the event broker client-username, and event broker ACLs guarantee topic authenticity on the trust-card topic. That is what prevents a compromised peer from impersonating an entrypoint.

Entrypoints persist their signing key across restarts (derived from `session_secret_key` when set, otherwise self-persisted to a file on disk); other components generate a fresh key every restart. See [Trust and Identity Blocks](../reference/config-schema.md#trust-and-identity-blocks).

:::warning
The unsigned `a2aUserConfig._enterprise_capabilities` body field exists for historical reasons but must not be used to populate scopes. Trusting it would let a compromised peer agent re-publish a legitimately signed entrypoint JWT alongside an inflated `_enterprise_capabilities` body, and the receiving agent would honor the inflated scopes. Authorization decisions must derive from the cryptographically verified JWT claims only.
:::

In practice the receiving agent reconciles the unsigned body against the signed claims using a soft-subset assert: narrowing the claims is allowed, but the agent drops and logs a warning for any widened claim. This behavior exists to support gradual migration, not as a permanent design choice; a future strict mode will reject mismatches outright.

## Three Patterns the Protocol Uses

The protocol layers three independent patterns on top of the same envelope.

Discovery. Every agent and entrypoint publishes its card (agent card or entrypoint card) on the discovery topics on startup, then republishes when its capability set changes. Subscribers (peer agents, the entrypoint agent-card endpoint) build a local view of who is on the mesh. A time-to-live (TTL) sweep removes a component from the local view after it stops publishing, clearing out stale entries. Trust cards on `<ns>/a2a/v1/trust/<componentType>/<componentID>` follow the same publish-on-startup pattern for signing keys.

Request-response. One request on the request topic, one terminal response on the reply topic. Used for `tasks/cancel`, `sam_remote_tool/invoke`, and the non-streaming `message/send`. The request carries `replyTo` in user properties; the responder publishes exactly once and then stops.

Stream-status. Used for `message/stream`. The responder accepts the request, then emits a sequence of status-update events on the status topic until it finishes, at which point it emits one event with `final: true` and publishes a single response on the reply topic. Clients (the SSE event log, peer agents) follow the status stream live and use the terminal event to close their subscription.

## Next Steps

- [How Agent Mesh Manages Workloads](./managing-workloads.md): the three workload classes that exchange these messages.
