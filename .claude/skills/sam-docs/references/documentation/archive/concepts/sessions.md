---
title: Sessions
description: How Solace Agent Mesh persists conversations and manages the LLM context window — backends, session keying per gateway type, history compaction, and what stays in scope across turns.
sidebar_position: 6
---

# Sessions

Concepts → Artifacts is one of the two persistence subsystems that live on top of the shared runtime layer. This page is the other: sessions, the conversation thread that ties a sequence of user turns and agent responses together. The page covers what a session is, where the history lives, how the gateway derives a session ID from whatever surface a user comes in on, and how Agent Mesh keeps the conversation inside the model's context window without losing context across turns. The YAML that wires a backend up is in Building → Agents and Building → Gateways; the day-two operational concerns sit in Administering.

## What a Session Is

A **session** is the persistent conversation thread between a user and an agent. It holds the ordered message history (user turns, assistant turns, tool calls, and results), the user identity bound to that thread, and an opaque per-session key-value state map that tools can read and write across turns. The session is the unit on which the agent loop remembers anything from one turn to the next — without it, every user message would land cold.

Sessions exist because the agent loop is otherwise stateless. The Gateway Executor (GWE) accepts a user message, the Agent-Workflow Executor (AWE) runs the LLM loop and any tool calls (some of those tools run inside the Secure Tool Runtime (STR)), and a response goes back. Without a durable record of the prior exchange, the next user turn arrives at a model with no memory. The session is the row in a session store that the agent reads at the start of every turn and writes at the end of every turn — it is what turns a stateless loop into a conversation.

## The Three Backends

Agent Mesh ships three session-store configurations. All three satisfy the same session-store interface; switching configurations changes durability and the cross-process visibility story, not the shape of the API. The backend is selected by the `session_service.type` YAML key.

| Backend | Durability | Cross-process visibility | When to pick it |
|---|---|---|---|
| `memory` | Process-local. Lost on restart. | No — every AWE replica holds its own copy. | Tests, harness scenarios, ephemeral demos. Not for production. |
| `sql` with SQLite | Disk-persistent. Survives process restarts. | Only when every reader mounts the same database file. | Single-host development and small single-instance deployments. |
| `sql` with Postgres | Postgres-durable. | Yes — every AWE and GWE replica that points at the same database sees the same sessions. | Multi-instance production. Required when you scale GWE or AWE horizontally. |

The `sql` backend covers both relational variants. Its `database_url` field decides which: `sqlite:///path/to/sessions.db` opens SQLite, `postgres://user:pass@host/db?sslmode=require` opens Postgres. The migration set is identical across both engines, so flipping a deployment from SQLite to Postgres is a schema-compatible move — you point `database_url` at the new database, the runtime runs migrations on first start, and the agent and gateway pick up the new store with no other changes.

In a distributed deployment every component that needs to read or write the same session must point its `session_service` block at the same store. GWE writes the first user turn; AWE reads it, writes the assistant response, and writes any sub-task history; GWE reads it back when the user requests a session history list. If GWE and AWE point at different stores, the user will see partial history. See Building → Agents and Building → Gateways for the per-component configuration block.

## Session Keying — How Each Gateway Type Derives a Session ID

A session ID is the primary key the session store indexes on. Each gateway type derives that ID from whatever identity material its external surface gives it. This is the part operators routinely get wrong: pick the wrong keying and either every user message looks like a brand-new conversation, or two unrelated conversations bleed into the same thread.

| Gateway type | Keyed by | Notes |
|---|---|---|
| Web UI (HTTP/SSE) | Browser session cookie (signed with `session_secret_key`), per authenticated user | The cookie is opaque to the user; the gateway maps it to a session row. JWT subject identifies the user; the session ID is per browser tab / conversation. |
| Slack | `(channel, thread_ts)` | Every thread is its own conversation. An `@`-mention in a channel root opens a new session; direct messages are sessioned per DM channel. |
| Email | Email thread (`Thread-Index` / `In-Reply-To`, falling back to `Message-ID`) | Replies that thread together share a session; an unrelated email from the same sender opens a new one. Lowercase canonicalisation runs on the user **identity** (`Alice@Example.Com` and `alice@example.com` resolve to the same user), not on the session key. |
| MCP | OAuth identity claim (`user_id_claim`, default `email`) | Each authenticated MCP caller gets a session per agent it delegates to. Public unauthenticated mode collapses everyone to a single session — fine for local dev only. |
| Event Mesh | Derived from the inbound broker message's `input_expression` or user properties | Event Mesh handlers are typically configured with `default_behavior: RUN_BASED`, so the session lives for one task and is then discarded. |
| Teams | Teams-issued `convID` plus a day bucket (`personal:{convID}:{YYYYMMDD}` / `groupChat:{convID}:{YYYYMMDD}` / `channel:{convID}:{YYYYMMDD}`) | Deliberately **not** keyed on the resolved user identity. The email→aadObjectID lookup that resolves the user can transiently fail and would otherwise split one chat across multiple sessions; `convID` is immutable for the lifetime of the chat, so it stays consistent. The day bucket resets the session daily. |

The principle that makes these choices coherent: a session key must collapse the same conversational context onto the same row, and only that context. Slack threads are conversations, so `(channel, thread_ts)` is correct. Email replies thread by reference, so the thread root is correct — two unrelated emails from the same sender open two sessions. MCP clients are software, so an OAuth identity is correct. Event Mesh messages are usually one-shot transformations, so they don't even need a persistent row — `RUN_BASED` discards the session at the end of the task.

When a user wonders "why doesn't the agent remember what I said yesterday?" or "why is the agent confusing my conversation with someone else's?", the answer is almost always one row above in this table — the gateway's session key is doing what it was configured to do, and what it was configured to do isn't what the operator expected.

## `default_behavior` — `PERSISTENT` vs `RUN_BASED`

`default_behavior` is the second knob, set on every `session_service:` block. It controls what happens to a session row when a task finishes:

- **`PERSISTENT`** — The session row survives. The next turn under the same session ID loads the same row and reads the prior history. This is what makes a chat a chat. The shipped default for every gateway type, including Event Mesh.
- **`RUN_BASED`** — The session row is bounded to a single task. After the task completes, the row's history is not reused. Opt-in by setting `default_behavior: RUN_BASED` explicitly; the right choice for one-shot agent invocations that should not be biased by stale context — for example, a workflow node that delegates to an agent on each run, or a scheduled task that processes a batch of records and should treat each one independently. Event Mesh handlers are the most common opt-in case because event-driven flows are usually transformations, not conversations.

The choice is driven by the workload, not the storage cost. A chat agent must stay on the `PERSISTENT` default — `RUN_BASED` would make every turn forget the previous turn. An agent that runs as a one-shot transformation should set `RUN_BASED` explicitly — otherwise the agent accumulates irrelevant history from previous runs and starts conflating unrelated invocations.

Sub-task delegations (one agent calling another via the workflow engine or a peer call) propagate `sessionBehavior: RUN_BASED` on the wire so the called agent treats the delegation as a fresh context rather than inheriting the caller's session — even when the caller's own session is `PERSISTENT`. This is correct behaviour: each layer in a multi-agent flow gets a clean slate.

## History and the LLM Context Window

The LLM's context window is a hard ceiling. On every turn the model sees:

- The system prompt and the agent's instructions.
- The tool definitions the agent has declared.
- The conversation history the session store hands back.
- The current user message.
- Whatever space remains for the model to write its response.

All five share the same token budget. As a conversation grows, history takes up an increasing share of that budget; eventually it crowds out everything else. Modern models advertise large context windows — hundreds of thousands of tokens — but a 200K-token context window does not make this disappear. Sending every prior turn back to the model on every turn is expensive (you pay for the tokens), slow (the model has to attend to all of them), and eventually impossible (the conversation overruns the window).

Naïve truncation — dropping the oldest turns until the rest fits — is the wrong fix. Old turns are where the user told the agent which project they're working on, what conventions to follow, and which files matter. Dropping them silently makes the agent worse in ways the user cannot see, until the agent suddenly forgets something it was told three turns ago and the user notices.

Agent Mesh's answer is **history compaction**: when the model would otherwise refuse to accept the request because the window is full, an extra LLM call summarises the older parts of the history into a single replacement message, and the loop retries with the smaller history. The summary keeps the gist of what was said without keeping every word of it, so the agent stays aware of the earlier context without paying the token cost.

## History Compaction

Compaction runs in two modes. Both end with the same effect: older messages collapse into a summary, the remaining messages stay verbatim, and the next LLM call uses the smaller history.

- **Reactive auto-compaction** — When the LLM returns a context-limit error during a turn, the runtime catches it, runs a summarisation LLM call against the older messages in the session, replaces those messages with the summary, and retries the original call. Enabled by default (`auto_summarization.enabled: true`); tune the post-summary size via `auto_summarization.compaction_percentage` (default `0.25` — 25% of the conversation gets compacted into the summary). If retry-after-compaction still exceeds the window, the runtime retries up to a small fixed number of times before giving up with a "conversation too long" error.
- **Manual compaction** — Operators or end users can compact a session on demand without waiting for the context-limit boundary. The Web UI's context-usage indicator surfaces a compact button on every conversation; the same endpoint is also available directly:

  ```bash
  # Replace {id} with the session you want to compact.
  curl -X POST \
    -H "Content-Type: application/json" \
    -d '{"targetPercent": 50}' \
    https://gateway.example.com/api/v1/sessions/{id}/compact
  ```

  `targetPercent` is the desired post-compaction history size as a percentage of the **current** conversation. `targetPercent: 50` keeps roughly the newest half of the conversation verbatim and folds the older half into the summary; `targetPercent: 25` keeps roughly the newest quarter and summarises the older three-quarters. The runtime is intentionally permissive — a smaller `targetPercent` summarises more aggressively.

The flow is the same in both cases — only the trigger differs:

```mermaid
flowchart LR
  turn[User turn arrives] --> read[Read history from store]
  read --> llm[LLM call]
  llm --> ok{Context limit hit?}
  ok -->|no| write[Write turn to store]
  ok -->|yes| compact[Summarise older turns]
  compact --> replace[Replace older turns with one summary]
  replace --> retry[Retry LLM call]
  retry --> write
```

The compacted history is what the store records — the summary persists, the original older turns do not. Subsequent turns load the compacted history just like any other history. The summary message carries metadata so the runtime can distinguish it from a user or assistant turn (the Web UI renders it as a system note rather than a chat bubble), but on the wire to the LLM it is one more message in the conversation.

A few details to keep in mind. The compaction LLM call uses the agent's configured model; a long conversation hitting the context limit pays one extra LLM round-trip on the turn that triggers it. The 25% default is conservative; a chattier agent with cheap tokens can lower it to compact less aggressively, a budget-constrained agent with expensive tokens can raise it to compact more aggressively. `max_input_tokens` is resolved in this order: an admin override stamped on the task, then the value baked into the model's metadata in the runtime, then `null` if neither is set. Set an explicit value in agent config when you want to compact earlier than the model's hard limit — for example, to leave headroom for tool results.

## Lifecycle

A session's lifetime is bounded by what its `default_behavior` allows and by what the operator's retention policy chooses to keep.

- **Create.** The session row is created at the first user message under a given session ID. GWE writes it; AWE reads and updates it.
- **Update.** Every turn writes the row again — appending the new messages, bumping the optimistic-lock version, refreshing `updatedAt`. The runtime uses the version to detect concurrent writers and retry on conflict.
- **Compact.** Reactive or manual compaction rewrites the history field; the row's identity does not change.
- **Discard (RUN_BASED only).** When `default_behavior` is `RUN_BASED`, the session row is not reused for a subsequent task — it stays in the database for audit but does not participate in any further conversation.
- **Retain.** Agent Mesh does not ship a background retention sweep. SQLite and Postgres databases grow until you trim them. This is the same lifetime model as Concepts → Artifacts: durable across the conversation's life, not auto-purged. Operational guidance for sizing, snapshots, and retention lives in Administering → Maintenance.

## What Next?

You now have the concept layer of session persistence and history compaction. The next decisions are practical:

- Building → Agents — the `session_service` block, the `auto_summarization` knobs, `max_input_tokens`, and the manual-compaction endpoint as a `curl` example.
- Building → Gateways — the gateway-side `session_service` block and how each adapter's session keying lines up with the table on this page.
- Administering → Maintenance — database growth, backup, retention, and the operational story for production Postgres deployments.
- Installing → Configure — the per-backend YAML schema, including `database_url` formats for SQLite and Postgres.
