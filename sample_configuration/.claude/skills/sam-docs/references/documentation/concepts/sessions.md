---
title: Sessions
description: "How Agent Mesh persists conversations and manages the LLM context window: backends, session keying per entrypoint type, history compaction, and what stays in scope across turns."
sidebar_position: 5100
---

# Sessions

Sessions and [Artifacts](./artifacts.md) are the two persistence surfaces Agent Mesh exposes to a conversation. This page covers sessions: the conversation thread that ties a sequence of user turns and agent responses together, where the history lives, how the entrypoint derives a session ID from whatever surface a user comes in on, and how Agent Mesh keeps the conversation inside the model's context window without losing context across turns.

## What a Session Is

A *session* is the persistent conversation thread between a user and an agent. It holds the ordered message history (user turns, assistant turns, tool calls, and results), the user identity bound to that thread, and an opaque per-session key-value state map that tools can read and write across turns. The session is the unit on which the agent loop remembers anything from one turn to the next. Without it, every user message would arrive without context.

Sessions exist because the agent loop is otherwise stateless. The Entrypoint Executor accepts a user message, the Agent-Workflow Executor runs the large language model (LLM) loop and any tool calls (some of those tools run inside the Secure Tool Runtime), and a response goes back. Without a durable record of the prior exchange, the next user turn arrives at a model with no memory. The session is the row in a session store that the agent reads at the start of every turn and writes at the end of every turn. The session is what turns a stateless loop into a conversation.

## The Three Backends

Agent Mesh ships three session-store configurations. All three satisfy the same session-store interface; switching configurations changes durability and the cross-process visibility story, not the shape of the API. You select the backend with the `session_service.type` YAML key.

| Backend | Durability | Cross-process visibility | When to select it |
|---|---|---|---|
| `memory` | Process-local. Lost on restart. | No. Every Agent-Workflow Executor replica holds its own copy. | Tests, harness scenarios, ephemeral demos. Not for production. |
| `sql` with SQLite | Disk-persistent. Survives process restarts. | Only when every reader mounts the same database file. | Single-host development and small single-instance deployments. |
| `sql` with PostgreSQL | PostgreSQL-durable. | Yes. Every Agent-Workflow Executor and Entrypoint Executor replica that points at the same database sees the same sessions. | Multi-instance production. Required when you scale the Entrypoint Executor or Agent-Workflow Executor horizontally. |

The `sql` backend covers both relational variants. Its `database_url` field decides which: `sqlite:///path/to/sessions.db` opens SQLite, `postgres://user:pass@host/db?sslmode=require` opens PostgreSQL. The migration set is identical across both engines, so flipping a deployment from SQLite to PostgreSQL is a schema-compatible move. You point `database_url` at the new database, the runtime runs migrations on first start, and the agent and entrypoint pick up the new store with no other changes.

In a distributed deployment every component that must read or write the same session must point its `session_service` block at the same store. The Agent-Workflow Executor creates the session row on the first task under a given context ID; every subsequent turn on that context loads and appends to the same row. The Entrypoint Executor reads sessions back when the user requests a session history list. If the Entrypoint Executor and Agent-Workflow Executor point at different stores, the user sees partial history. For the per-component configuration block, see [Creating Agents](../building/agents/index.md) and [Configuring Entrypoints](../building/entrypoints/index.md).

## Session Keying: How Each Entrypoint Type Derives a Session ID

A session ID is the primary key the session store indexes on. Each entrypoint type derives that ID from whatever identity material its external surface gives it. Operators routinely get this part wrong: select the wrong keying and the entrypoint either treats every user message as a brand-new conversation, or merges two unrelated conversations into the same thread.

| Entrypoint type | Keyed by | Notes |
|---|---|---|
| Web UI (HTTP and Server-Sent Events (SSE)) | Browser session cookie (signed with `session_secret_key`), per authenticated user | The cookie is opaque to the user; the entrypoint maps it to a session row. JSON Web Token (JWT) subject identifies the user; the session ID is per browser tab or conversation. |
| Slack | `(channel, thread_ts)` | Every thread is its own conversation. An `@`-mention in a channel root opens a new session; direct messages are sessioned per direct-message channel. |
| Email | Email thread (`Thread-Index` and `In-Reply-To`, falling back to `Message-ID`) | Replies that thread together share a session; an unrelated email from the same sender opens a new one. Lowercase canonicalization runs on the user **identity**, not on the session key. |
| MCP | OAuth identity claim (`user_id_claim`, default `email`) | Each authenticated Model Context Protocol (MCP) caller gets a session per agent it delegates to. Public unauthenticated mode collapses everyone to a single session, which is fine for local development only. |
| Event mesh | Per-message ephemeral: each inbound broker message mints its own session, which does not carry over to the next message | Suits event-driven flows where each inbound message is treated as its own task. |
| Teams | Teams-issued `convID` plus a day bucket (`personal:{convID}:{YYYYMMDD}` / `groupChat:{convID}:{YYYYMMDD}` / `channel:{convID}:{YYYYMMDD}`) | Deliberately **not** keyed on the resolved user identity. The email-to-aadObjectID lookup that resolves the user can transiently fail and would otherwise split one chat across multiple sessions; `convID` is immutable for the lifetime of the chat, so it stays consistent. The day bucket resets the session daily. |

The principle that makes these choices coherent: a session key must collapse the same conversational context onto the same row, and only that context. Slack threads are conversations, so `(channel, thread_ts)` is correct. Email replies thread by reference, so the thread root is correct; two unrelated emails from the same sender open two sessions. MCP clients are software, so an OAuth identity is correct. Event mesh messages are usually one-shot transformations, so the key derived from each inbound message stands alone.

When a user wonders "why doesn't the agent remember what I said yesterday?" or "why is the agent confusing my conversation with someone else's?", the answer is almost always one row up in the preceding table. The entrypoint's session key is doing what it was configured to do, and what it was configured to do is not what the operator expected.

## Persistent Versus Run-Based Sessions

Sessions run in one of two modes: **persistent** or **run-based**. The distinction is what happens to the session row when a task finishes.

- **Persistent.** The session row survives. The next turn under the same session ID loads the same row and reads the prior history. Persistent rows are what makes a chat a chat. This is the mode a direct user task uses.
- **Run-based.** The session is bounded to a single task. After the task completes, the history is not re-used on a subsequent task. Run-based mode is the right shape for one-shot agent invocations that must not carry stale context.

The mode is not an operator setting. Direct user tasks run persistent; sub-task delegations run run-based. The runtime selects the mode automatically based on how the task arrived.

Concretely, when one agent calls another through the workflow engine or a peer call, the caller stamps `sessionBehavior: RUN_BASED` on the outgoing message's user properties. The called agent reads that flag off the wire and treats the delegation as a fresh context rather than inheriting the caller's history, even when the caller's own session is persistent. Structured invocations (a workflow node calling an agent with a typed input) are implicitly run-based on the same principle. Each layer in a multi-agent flow starts fresh.

The mode selection lives with the caller and the transport, not with the session store. Configuring an agent's `session_service:` YAML block does not turn a chat agent into a one-shot transformer, and does not turn an event-mesh handler into a conversation. Delegation semantics come from the delegation itself.

## History and the LLM Context Window

The LLM context window is a hard ceiling. On every turn the model sees:

- The system prompt and the agent's instructions.
- The tool definitions the agent has declared.
- The conversation history the session store hands back.
- The current user message.
- Whatever space remains for the model to write its response.

All five share the same token budget. As a conversation grows, history takes up an increasing share of that budget; eventually it crowds out everything else. Modern models publish large context windows of hundreds of thousands of tokens, but a 200,000-token context window does not solve the problem. Sending every prior turn back to the model on every turn is expensive (you pay for the tokens), slow (the model has to attend to all of them), and eventually impossible (the conversation overruns the window).

Naive truncation, dropping the oldest turns until the rest fits, is the wrong fix. Old turns are where the user told the agent which project they're working on, what conventions to follow, and which files matter. Dropping them silently degrades responses in ways the user cannot see, until the agent no longer references something the user provided three turns earlier and the user notices.

The Agent Mesh answer is **history compaction**. When the model would otherwise refuse to accept the request because the window is full, an extra LLM call summarizes the older parts of the history into a single replacement message, and the loop retries with the smaller history. The summary keeps the gist of the earlier turns without keeping every word, so the agent stays aware of the earlier context without paying the token cost.

## History Compaction

Compaction runs in two modes. Both end with the same effect: older messages collapse into a summary, the remaining messages stay verbatim, and the next LLM call uses the smaller history.

- **Reactive auto-compaction.** When the LLM returns a context-limit error during a turn, the runtime catches it, runs a summarization LLM call against the older messages in the session, replaces those messages with the summary, and retries the original call. Enabled by default (`auto_summarization.enabled: true`); tune the post-summary size via `auto_summarization.compaction_percentage` (default `0.25`, meaning 25% of the conversation is compacted into the summary). If retry after compaction still exceeds the window, the runtime retries up to a small fixed number of times before returning a "conversation too long" error.
- **Manual compaction.** Operators or end users can compact a session on demand without waiting for the context-limit boundary. The Agent Mesh UI context-usage indicator surfaces a compact button on every conversation. The button lets you pick how much of the recent conversation to keep verbatim: choosing 50% keeps roughly the newest half and folds the older half into the summary; choosing 25% keeps only the newest quarter and folds the older three-quarters into the summary.

The flow is the same in both cases; only the trigger differs:

```mermaid
flowchart LR
  turn[User turn arrives] --> read[Read history from store]
  read --> llm[LLM call]
  llm --> ok{Context limit hit?}
  ok -->|no| write[Write turn to store]
  ok -->|yes| compact[Summarize older turns]
  compact --> replace[Replace older turns with one summary]
  replace --> retry[Retry LLM call]
  retry --> write
```

The compacted history is what the store records: the summary persists, the original older turns do not. Subsequent turns load the compacted history just like any other history. The summary message carries metadata so the runtime can distinguish it from a user or assistant turn (the Agent Mesh UI renders it as a system note rather than a chat bubble), but on the wire to the LLM it is one more message in the conversation.

A few details to keep in mind. The compaction LLM call uses the agent's configured model; a long conversation hitting the context limit pays one extra LLM round-trip on the turn that triggers it. The 25% default is conservative; a chattier agent with cheap tokens can lower it to compact less aggressively, a budget-constrained agent with expensive tokens can raise it to compact more aggressively. `max_input_tokens` is resolved in this order: the value on the agent's bound model configuration, then the runtime's static catalog for that model, then unset if neither carries a value. Set an explicit value on the model configuration when you want to compact earlier than the model's hard limit, for example to leave headroom for tool results.

## Lifecycle

A session's lifetime is bounded by the mode the task ran under and by what the operator's retention policy chooses to keep.

- **Create.** The Agent-Workflow Executor creates the session row on the first task under a given context ID. Subsequent turns load and append to the same row.
- **Update.** Every turn writes the row again, appending the new messages, bumping the optimistic-lock version, and refreshing `updatedAt`. The runtime uses the version to detect concurrent writers and retry on conflict.
- **Compact.** Reactive or manual compaction rewrites the history field; the row's identity does not change.
- **Discard (run-based tasks only).** A sub-task delegation, peer call, or workflow-node invocation writes its session row but the row is not re-used on a subsequent task. It stays in the database for audit but does not participate in any further conversation.
- **Retain.** Agent Mesh does not ship a background retention sweep. SQLite and PostgreSQL databases grow until you trim them. Sessions follow the same lifetime model as [Artifacts](./artifacts.md): durable across the conversation's life, not auto-purged. Operational guidance for sizing, snapshots, and retention lives in [Managing Backups and Data Retention](../administering/backups-and-data-retention.md).

## What Next?

You now have the concept layer of session persistence and history compaction. The next decisions are practical:

- [Creating Agents](../building/agents/index.md) covers the `session_service` block, the `auto_summarization` knobs, and `max_input_tokens`.
- [Configuring Entrypoints](../building/entrypoints/index.md) covers the entrypoint-side `session_service` block and how each adapter's session keying lines up with the table on this page.
- [Managing Backups and Data Retention](../administering/backups-and-data-retention.md) covers database growth, backup, retention, and the operational story for production PostgreSQL deployments.
- [Configuring Agent Mesh](../installing/configure.md) covers the per-backend YAML schema, including `database_url` formats for SQLite and PostgreSQL.
