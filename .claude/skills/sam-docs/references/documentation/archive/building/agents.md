---
title: Building Agents
description: How to author a configured agent in YAML — the LLM loop, streaming, peer routing, structured I/O, session memory, approvals, and operator knobs.
sidebar_position: 1
---

# Building Agents

An agent is the unit Solace Agent Mesh delegates work to. It receives a user task, consults a language model, calls tools, optionally hands subtasks off to other agents, and returns a final response. This page walks the **configured agent** path — a YAML file the Agent-Workflow Executor (AWE) loads at startup and runs until shutdown. The configured-vs-built dimension is explained once in Concepts → Configured vs built; this page does not restate it.

For tool authoring see Building → Tools. For lazy-loaded capability bundles see Building → Skills. For deterministic orchestration without an LLM, see Building → Workflows.

## What a Configured Agent Is

A configured agent is a YAML document under an `apps:` entry whose `app_exec:` points at the AWE binary. AWE reads the file at startup, validates it, then runs one agent instance per `apps:` entry. Each instance subscribes to its task topic on the broker, publishes an agent card so peers can discover it, and accepts A2A requests for the lifetime of the process.

You do not write Go code to ship a configured agent — the runtime owns the LLM loop, tool dispatch, streaming, embed resolution, peer routing, session persistence, and the A2A wire format. Your job is to declare:

- **Identity** — agent name, namespace, display name, agent card.
- **Brain** — which language model the agent calls and the system instruction it carries.
- **Hands** — the tools it can call (built-in, MCP, OpenAPI, remote — see Building → Tools).
- **Memory** — the session-service backend and history behavior.
- **Operator knobs** — timeouts, output limits, discovery cadence.

The minimal walkthrough that follows shows each of these in order.

## A Minimal Agent YAML

Save the following as `configs/my_agent.yaml` and start it with `./bin/sam run configs/my_agent.yaml`:

```yaml
# configs/my_agent.yaml
log:
  level: info

apps:
  - name: my_agent_app
    app_exec: sam-awe
    app_config:
      agent_name: "MyAgent"
      display_name: "My Agent"
      namespace: ${NAMESPACE, solace-agent-mesh}
      supports_streaming: true

      model:
        model: ${LLM_SERVICE_PLANNING_MODEL_NAME, openai/gpt-4o}
        api_base: ${LLM_SERVICE_ENDPOINT}
        api_key: ${LLM_SERVICE_API_KEY}

      instruction: |
        You are a helpful assistant. Use the available tools to answer the user.

      tools:
        - tool_type: builtin-group
          group_name: "artifact_management"

      session_service:
        type: memory
        default_behavior: "PERSISTENT"

      artifact_service:
        type: filesystem
        base_path: /tmp/sam
        artifact_scope: namespace

      agent_card:
        description: "An example agent."
        defaultInputModes: ["text"]
        defaultOutputModes: ["text", "file"]
        skills: []
      agent_card_publishing: { interval_seconds: 10 }
      agent_discovery: { enabled: true }
      inter_agent_communication:
        allow_list: ["*"]
        request_timeout_seconds: 120
```

The pieces work as follows.

`apps[].app_exec` selects the binary AWE will exec for this entry. `sam-awe` runs a configured agent. Workflow files and proxy files use the same `apps:` shape with different `app_config` content — the loader picks the right kind from what you declared inside `app_config`. One YAML file can declare many entries; large deployments commonly group several agents and a workflow in one file.

`agent_name` is the agent's identity on the A2A protocol. Peers address it by this exact string. Pick a name your tooling can grep for in logs.

`namespace` partitions the broker topic tree. Two agents with different namespaces never see each other's traffic. The `${NAMESPACE, solace-agent-mesh}` form reads from the environment variable and falls back to a default — covered in the Reference → Environment-variable substitution section.

`model` describes the language-model client. The `model:` *inside* the `model:` block is a provider-prefixed string (`openai/gpt-4o`, `anthropic/claude-sonnet-4-5`, `bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0`, etc.). `api_base` and `api_key` are passed straight to the LLM client; never hard-code an `api_key` value — use environment-variable substitution so the secret stays out of YAML.

`instruction` is the system prompt the runtime prepends to every conversation. Keep it focused on the agent's role and the tools it should prefer; the runtime appends its own instruction blocks (tool catalog, artifact summary, embed grammar) on top of yours.

`tools` declares which tools the LLM may call. The full taxonomy lives in Building → Tools. The example shows the most common form: a built-in group that gives the agent file read/write tools without naming each one individually.

`session_service` is the backend that stores conversation history. The example uses an in-memory store, which is fine for development but discarded on restart. Production deployments use the SQLite or Postgres backends — see Session memory and history compaction.

`artifact_service` is the backend that stores files the agent and its tools read and write. The filesystem backend is the simplest choice; production deployments commonly use S3 or GCS. See Reference → Configuration schema for the full surface.

`agent_card` is the public description of the agent. Peers discover it over the broker, the Web UI lists it on the home screen, and OpenAPI-style integrations introspect it. `defaultInputModes` and `defaultOutputModes` advertise what the agent expects to receive and produce. The `skills:` list in this block is the agent-card skills array (free-text capability advertisements) — it is **not** the same as the lazy-loaded skill bundles described in Building → Skills, which are declared in a separate top-level `skills:` block alongside `tools:`.

`agent_card_publishing.interval_seconds` controls how often the agent republishes its card. The example overrides the default of `60` seconds with `10` for snappier peer discovery during development. The shipping default is a sensible production choice — short enough that peers re-discover within a minute of a restart, long enough that broker traffic stays light.

`agent_discovery` enables this agent to receive cards published by peers. Disable only when you want a sealed agent that cannot delegate.

`inter_agent_communication` controls peer routing — see Peer agents and the orchestrator pattern.

## The Agent Loop

When a task arrives, AWE runs an iterative loop until the agent produces a final response or hits a stop condition. Each iteration follows the same shape:

1. **Build a prompt.** The runtime assembles the conversation history (from the session store), the system instruction, the tool catalog, and any pending tool results into a single LLM request.
2. **Call the LLM.** The runtime invokes the configured model with the request. If `supports_streaming: true`, the response streams back token by token; otherwise the runtime waits for the full response.
3. **Parse and dispatch.** If the LLM emitted tool calls, the runtime dispatches each call to the right component — a built-in tool runs in-process, an MCP tool calls out to the MCP server, a remote tool dispatches through the Secure Tool Runtime (STR). The full dispatch matrix is in Building → Tools.
4. **Feed results back.** Tool results — including errors — are appended to the conversation and the loop iterates. Tool errors are fed to the LLM as content, not raised as exceptions, so the model can recover or apologize.
5. **Stop.** The loop ends when the LLM emits a final response with no further tool calls, when `max_llm_calls_per_task` is reached, when the broker cancels the task, or when an unrecoverable error fires.

Two operator knobs shape this loop:

- `max_llm_calls_per_task` (default `30`) caps how many LLM round-trips a single task can perform. This is the runtime's safety net against runaway loops. Raise it for agents that do long multi-step reasoning; lower it to fail fast in cost-sensitive deployments.
- `enable_auto_continuation` (default `true`) tells the runtime to automatically continue when an LLM response is truncated at `max_tokens`. The runtime issues a "continue" follow-up and stitches the responses together. Disable it only when you want the LLM's truncated output to surface verbatim.

A second runtime safeguard is the **subtask call depth**. When an agent delegates to a peer that delegates onward, the chain is capped by `max_call_depth` (default `6`). Beyond that depth, further delegations fail rather than recurse.

## Streaming and Embed Resolution

Setting `supports_streaming: true` lets clients receive tokens as the model produces them. Most modern UIs depend on this — without it the user sees a long blank wait followed by the entire response at once. Leave it on unless you are running a non-streaming model.

The runtime's streaming pipeline is more than a passthrough. As tokens arrive, the runtime:

- **Detects embed syntax** — the `«type:params»` delimiters described in Building → Tools. When the runtime sees `«status_update:...»`, it emits a status event to the client; when it sees `«artifact_content:my_file.txt»`, it pauses long enough to inline the artifact bytes before resuming token flow.
- **Inlines fenced artifact and template blocks.** The LLM can emit a code fence tagged `artifact` (with a `filename="..."` attribute) or `template_liquid` to write a file or render a Liquid template inside the response. The runtime processes those blocks before the final response is returned.
- **Buffers across token boundaries.** Embed delimiters and fenced blocks can straddle the chunks the model produces. The runtime holds the smallest amount of text it needs to recognize a delimiter, never enough to introduce user-visible latency.
- **Publishes status events.** Every tool call, peer delegation, and streaming chunk is published on the A2A status topic. The Web UI's "thinking" indicator and the gateway's SSE stream are both fed by these events.

Embed resolution is enabled by `enable_embed_resolution: true` (typically already on in shipped configs). The artifact-content instruction (`enable_artifact_content_instruction: true`) makes the runtime add a short note to the system prompt telling the LLM what artifacts are currently in scope — extremely useful when the agent has produced a file in an earlier turn and needs to reference it later.

The grammar is the same whether the agent is streaming or not — `supports_streaming` only controls whether the client sees tokens as they arrive.

## Peer Agents and the Orchestrator Pattern

Agent Mesh routes between agents over the **A2A protocol** on the broker. Every running agent publishes an agent card; every agent with `agent_discovery.enabled: true` subscribes to the discovery topic and builds an in-memory map of known peers.

When a peer is discovered, the runtime auto-generates a tool named `peer_<agent_name>` and adds it to the calling agent's tool catalog. The LLM can call it like any other tool — there is no separate API for delegation. The runtime serializes the call to an A2A request, publishes it to the peer's topic, awaits the response (or status events), and feeds the result back to the LLM.

Three knobs shape peer behavior, all under `inter_agent_communication`:

- `allow_list` — glob patterns naming which peers this agent may call. `["*"]` allows all; `["billing_*", "reports_*"]` allows only matching peers. Defaults to `["*"]`.
- `deny_list` — glob patterns naming peers this agent must not call, evaluated after the allow list.
- `request_timeout_seconds` — how long the runtime waits for a peer response before failing the delegation. Defaults to `30` in agent config; the test example raises it to `120` for slower peers.

Two more knobs control discovery:

- `agent_card_publishing.interval_seconds` — how often *this* agent republishes its card. Setting this to `0` or negative disables periodic publication; the agent still publishes once at startup and again on shutdown, but never refreshes.
- `agent_discovery.health_check_ttl_seconds` (default `300`) — how long a peer is considered alive after its last card. Set this comfortably higher than the peer's publishing interval.

### The Orchestrator Pattern

An **orchestrator agent** is a configured agent whose job is to route — its tool catalog is mostly `peer_*` tools and its instruction tells the LLM to break the user's request into subtasks and delegate. The orchestrator carries little domain knowledge; the peers carry it. This pattern shines when:

- Domains have different escalation paths or compliance requirements.
- Different peers need different models (a cheap model for triage, a strong model for analysis).
- You want to swap peers in and out without retraining the orchestrator's prompt.

There is no `agent_type: orchestrator` — an orchestrator is just a configured agent with peer-shaped tools and an orchestration-shaped instruction. Use the example agent shape from the minimal YAML section; replace `tools:` with `agent_discovery: { enabled: true }` plus any auxiliary built-ins; write an instruction that tells the model when to delegate to which peer.

## Structured I/O

By default, an agent accepts free-text input and produces free-text output. For agent-to-agent contracts — and for any workflow node that invokes an agent — you want **structured I/O**: the inputs and outputs validated against a JSON Schema.

Add `input_schema` and/or `output_schema` keys to the agent's `app_config` block, alongside `agent_name`, `model`, `instruction`, and `tools`:

```yaml
# configs/structured_agent.yaml — input_schema and output_schema fragment
input_schema:
  type: object
  properties:
    invoice_id: { type: string }
    fields: { type: array, items: { type: string } }
  required: [invoice_id]

output_schema:
  type: object
  properties:
    total: { type: number }
    line_items:
      type: array
      items:
        type: object
        properties:
          description: { type: string }
          amount: { type: number }
  required: [total]
```

Two things happen with these schemas in place:

1. **Input is validated before the LLM is called.** If a caller sends data that fails the schema, the agent rejects the task with a validation error. The LLM never sees malformed input.
2. **Output is validated before being returned.** The runtime asks the LLM to produce JSON matching the output schema, validates the response, and retries (within `max_llm_calls_per_task`) if it fails. The caller receives validated output or a clear failure.

There are two ways callers can pass structured input:

- **Parameter mode** — the caller sends a `DataPart` containing a JSON object that matches `input_schema`. Best for short, fully-typed contracts.
- **Artifact mode** — the caller sends a `FilePart` referencing an artifact. The runtime fetches the artifact, validates its contents against `input_schema`, and proceeds. Best for large inputs that you don't want to embed inline.

Workflow `agent` nodes (see Building → Workflows) call agents in this structured mode automatically when `input_schema` is declared. The workflow engine uses the schema to decide which mode to use and how to materialize the response.

## Session Memory and History Compaction

A session is the conversation history the agent reads at the start of every turn. The session backend determines where that history lives.

| Backend | When to use it |
|---|---|
| `memory` | Development and tests. Discarded on restart. |
| `sql` with SQLite | Single-node deployments. Survives restart; cannot be shared between AWE instances. |
| `sql` with Postgres | Production. Shared across all AWE instances; required when you scale horizontally. |

Configure the SQL backend by replacing the `session_service:` block from the minimal walkthrough with:

```yaml
# configs/session_sql.yaml — session_service fragment
session_service:
  type: sql
  database_url: ${SESSION_DB_URL}
  default_behavior: "PERSISTENT"
```

`database_url` accepts a SQLite path (`sqlite://./sessions.db`) or a Postgres DSN (`postgres://user:pass@host:5432/db?sslmode=require`). The runtime runs migrations automatically on first start.

`default_behavior` controls whether the agent retains conversation history across user turns:

- `"PERSISTENT"` — history accumulates across turns. The next turn sees the full prior conversation. This is the default for chat-style agents.
- `"RUN_BASED"` — each task starts fresh. The agent has no memory of prior turns. Use this when the agent is invoked as a one-shot tool inside a workflow or by a scheduled task that should not be biased by stale context.

### History Compaction

Long conversations eventually exceed the model's context window. When that happens, two things keep the agent responsive:

**Reactive auto-compaction.** When the LLM returns a context-limit error, the runtime catches it, summarizes the older parts of the conversation into a single message, replaces the original messages with that summary, and retries the call. This is enabled by default (`auto_summarization.enabled: true`); set `auto_summarization.enabled: false` to disable, or tune the aggressiveness with `auto_summarization.compaction_percentage` (default `0.25`).

**Manual compaction.** Operators can compact a session on demand:

```bash
# Replace {id} with the session you want to compact.
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"targetPercent": 50}' \
  https://gateway.example.com/api/v1/sessions/{id}/compact
```

`targetPercent` is the desired post-compaction history size, expressed as a percentage of `max_input_tokens`. A value of `50` asks the runtime to summarize aggressively enough that the remaining history is roughly half the model's input window.

The Web UI's context-usage indicator surfaces a compact button on every conversation. Operators can use it without touching the API directly.

`max_input_tokens` is resolved in this order: (1) an admin override stamped on the task, (2) the value baked into the model's metadata in the runtime, (3) `null` if neither is set. Set an explicit value in agent config when you want to compact earlier than the model's hard limit — for example, to leave headroom for tool results.

## Approvals and Asking the User

Two patterns let an agent pause and wait for a human to weigh in mid-task.

### Agent-Initiated Questions

The built-in `ask_user_question` tool lets the LLM emit a structured question with 2–4 options. Pull it in by adding the `hil_tools` group to the agent's `tools:` list:

```yaml
# configs/agent_with_question.yaml — tools fragment
tools:
  - tool_type: builtin-group
    group_name: "hil_tools"
  - tool_type: builtin-group
    group_name: "artifact_management"
```

The tool is also included in the `general_agent_tools` group. When the LLM calls it, the runtime emits a question event to the client, transitions the task to the `input-needed` state, and waits for the user's answer. The user's selection comes back to the LLM as the tool result, and the loop continues.

Use this when the LLM needs disambiguation — for example, asking whether the user means "support ticket #4521" or "support ticket #4521B" before proceeding.

### Admin-Required Tool Approval

The other pattern is operator-controlled: some tools are too sensitive to run without a human nod, even when the LLM wants to call them. Mark such tools with an `hil:` block at the tool entry inside the agent's `tools:` list:

```yaml
# configs/agent_with_approval.yaml — tools fragment
tools:
  - tool_type: mcp
    tool_name: send_email
    connection_params:
      type: stdio
      command: ./bin/email-mcp
    hil:
      require_approval: true
      approval_message: "Send email to {{to}}?"
      timeout: 45m
      show_args: true
```

When the LLM tries to call `send_email`, the runtime intercepts the call, emits an approval-request event to the client, and waits up to `timeout` (default 45 minutes) for the operator to approve or deny. On approval, the tool runs; on denial, the LLM receives an error result; on timeout, the LLM receives a timeout result and may retry or abandon the call.

`approval_message` is rendered with the tool's call arguments using a small Liquid template, so the prompt shown to the operator can include the actual values the LLM wants to send. `show_args: true` adds a structured view of the full argument set under the prompt for the operator to inspect.

The default timeout is generous because admin approvals often go to humans who are not at their desks. Lower it for synchronous flows where a slow response is worse than a missed approval.

## Operator Knobs

The configuration surface beyond identity, tools, and memory is mostly defaults that ship reasonable. The keys you reach for most often:

| Key | Default | What it does |
|---|---|---|
| `max_llm_calls_per_task` | `30` | Caps LLM round-trips per task. Raise for long-reasoning agents; lower for cost-sensitive deployments. |
| `enable_auto_continuation` | `true` | Auto-continues LLM responses truncated at `max_tokens`. |
| `supports_streaming` | `false` | Streams tokens to the client as the model produces them. Turn on for chat-style agents. |
| `max_message_size_bytes` | `10000000` | Maximum size of an A2A message payload published by this agent. |
| `tool_output_save_threshold_bytes` | `4096` | Tool results larger than this are saved as artifacts and replaced with a reference, instead of inlined in the conversation. |
| `tool_output_llm_return_max_bytes` | `8192` | Maximum bytes of a tool result returned to the LLM. Anything past this is truncated; the artifact remains intact. |
| `agent_card_publishing.interval_seconds` | `60` | How often this agent republishes its card. `0` or negative disables periodic publishing. |
| `agent_discovery.health_check_ttl_seconds` | `300` | How long a peer's card is considered fresh after its last publish. |
| `agent_discovery.health_check_interval_seconds` | `60` | How often this agent sweeps its peer map for staleness. |
| `inter_agent_communication.request_timeout_seconds` | `30` | How long to wait for a peer response before failing the delegation. |
| `inter_agent_communication.allow_list` | `["*"]` | Glob patterns of peer names this agent is allowed to delegate to. |
| `inter_agent_communication.deny_list` | `[]` | Glob patterns of peer names this agent must never delegate to. |
| `max_call_depth` | `6` | Maximum delegation depth. Prevents deep peer recursion. |
| `enable_embed_resolution` | `true` | Resolves `«type:params»` embeds during response streaming. |
| `enable_artifact_content_instruction` | `true` | Tells the LLM what artifacts are currently in scope. |
| `artifact_handling_mode` | `"ignore"` | How tool-produced artifacts are surfaced to the LLM: `"ignore"` (no inline summary), `"embed"` (content embedded), or `"reference"` (URI reference). |

Setting any of these to non-default values is a routine operator decision; most deployments only touch `model`, `instruction`, `tools`, `session_service`, and possibly `inter_agent_communication`. The rest stay at their defaults unless a specific need surfaces.

## When YAML Isn't Enough

A configured agent covers nearly every case. When the YAML surface cannot express what you need, the answer is usually one of the following — none of which involves writing a custom agent:

- **A custom built tool.** A Go binary authored against `pkg/samtoolsdk` extends the agent's reach into Go libraries, CGO-bound code, or systems the in-box tools and MCP servers don't cover. See Building → Tools.
- **An MCP server.** Wrap an existing service or library as an MCP server; the agent picks it up through `tool_type: mcp`. Works in any language the MCP ecosystem supports.
- **A workflow.** When the orchestration logic is what's hard, compose configured agents into a workflow — switch, map, loop, and nested nodes give you deterministic routing without bypassing the agent loop.

If none of those fit and you genuinely cannot express the behavior, contact Solace — the agent runtime itself is closed-source, so deeper extension is a Solace-side change rather than a customer authoring path.

## What Next?

You have just learned how to author a configured agent. Most readers next want to add lazy-loaded capabilities to that agent, which is covered in Building → Skills. If you want to chain several agents together deterministically, read Building → Workflows. If your agent needs richer tooling, the full taxonomy is in Building → Tools.
