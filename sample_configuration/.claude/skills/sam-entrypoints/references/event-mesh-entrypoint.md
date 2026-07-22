# Event-mesh entrypoint (GA)

Turns Solace broker messages into agent or workflow tasks, and optionally publishes the results back to the mesh. This is the **trigger half** of "listen → filter → store": the entrypoint fires the task; branching/filtering logic and multi-step processing belong in a workflow (`sam-author-agent`), which an event rule can target directly. The reverse direction — an *agent* sending requests onto the mesh as a tool — is the `event_mesh` **connector** (`sam-connectors`).

Field names below are real keys for recognition; full YAML belongs to `sam-declarative-config` (or pull a UI-created entrypoint). In the builder UI, event rules have a dedicated editor, not a generic form.

## Broker connection

Point the entrypoint at the event-source broker with explicit details: `broker_url` (`tcp/tcps/ws/wss`), `broker_vpn`, `broker_username`, `broker_password`, `tls_skip_verify` (leave `false` outside dev). Leaving `broker_url` empty falls back to the local dev broker in a local desktop instance only; a deployed entrypoint always needs real broker details.

## Event rules (the heart of the type — at least one)

Each rule says *what arrives*, *who handles it*, and *what goes back out*:

- **Match:** `name` (unique), `subscriptions` — one or more topics, Solace wildcards `*` and `>` supported, per-subscription `qos` (default 1). `messageFormat` declares the payload encoding: `json` (default), `text`, `xml`, `raw_bytes`, `protobuf`, `structured`.
- **Target:** `targetAgent` **or** `targetWorkflowName` — mutually exclusive, exactly one. With a target you supply `promptTemplate`, the template that turns the message into the task input — it can expand the whole `{payload}`, the `{topic}`, or JSON fields like `{payload.order.id}`. (Workflow targets can alternatively use an `inputExpression`, and `structuredInvocation` can attach input/output JSON Schemas.)
- **Identity:** `defaultUserIdentity` (static, e.g. `order_event_user`) or `userIdentityExpression` (per-message). This is what RBAC and audit attribute the task to — don't leave it implicit for production rules.
- **Acknowledgment:** `acknowledgmentPolicy.mode` = `on_receive` (default — ack when the message arrives) or `on_completion` (ack only after the task finishes; `timeoutSeconds` default 300, and `onFailure` decides nack outcome: drop vs redeliver). Choose `on_completion` when losing a message on task failure is unacceptable.
- **Outputs:** `successOutput` and `errorOutput`, each with `enabled`, `topic` (`topicType` `static`, or `dynamic` for an expression-built topic — per-result routing like `orders/processed/{id}`), and `responseType` (`text` final text, `full` entire response — the success default, `structured` workflow structured output, `error` — the error-output default, or `custom`). If the user wants the result somewhere other than a topic (a DB, an email), that's a connector on the agent/workflow side, not an entrypoint output.

## Worked shape (in words, not YAML)

"When an order event lands on `orders/new/>`, process it with the order-triage agent, publish the result to `orders/processed`" = one rule: subscription `orders/new/>` (json) → `targetAgent: order-triage` with a promptTemplate embedding `{payload}` → `successOutput.topic: orders/processed`, plus an `errorOutput` topic so failures are visible on the mesh. Decide `on_receive` vs `on_completion` from whether a dropped event matters.

## Verify

Publish a test message to a matching topic (broker Try-Me tab or any client) and watch (a) the task appear in the web UI, and (b) the success topic. Rule cross-field mistakes (target without promptTemplate, both targets set) are rejected at save time with the reason.
