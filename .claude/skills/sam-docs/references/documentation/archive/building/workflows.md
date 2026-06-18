---
title: Building Workflows
description: How to author a configured workflow — declarative DAGs of agent, tool, switch, map, loop, and nested-workflow nodes with timeouts, retry, and exit handlers.
sidebar_position: 6
---

# Building Workflows

A workflow is a declarative DAG that orchestrates one or more configured agents without an LLM loop driving the orchestration. The workflow's nodes fire in dependency order, pass typed inputs and outputs between each other, and produce a structured result. Workflows are the right shape when you want **deterministic orchestration** — the same input should always traverse the same nodes — and the choreography logic is too prescriptive for a language model to be in charge of.

This page covers the configured-workflow path. The configured-vs-built dimension is explained once in Concepts → Configured vs built; this page does not restate it. For LLM-driven orchestration, read Building → Agents. For tool authoring read Building → Tools.

## What a Workflow Is

A workflow lives in the same `apps:` shape as an agent — an entry under `apps:` whose `app_exec:` points at the AWE binary. The Agent-Workflow Executor (AWE) detects that the entry's `app_config` contains a `workflow:` block and loads it as a workflow instance instead of an agent. A workflow instance:

- Publishes an agent card to the broker so peers can discover and call it.
- Accepts A2A requests on its own topic, just like an agent does.
- Validates incoming structured inputs against the workflow's `input_schema`.
- Runs its DAG to completion (or failure), then returns a structured result shaped by `output_schema` and `output_mapping`.

The workflow is itself addressable as a peer. A configured agent can delegate to it through the same `peer_<workflow_name>` mechanism it uses for other agents; another workflow can include it as a nested step.

## Workflow vs Configured Agent

Both are top-level addressable units. Choose between them on three axes.

**Determinism.** A configured agent runs an LLM loop — the same input can take different tool paths on different runs because the model decides. A workflow runs a DAG — the same input always traverses the same nodes in the same order. If your stakeholders need replayable, audit-friendly execution paths, lean workflow.

**Cost and latency.** Workflows save one LLM call per orchestration step — the workflow engine itself does not consult a model. Agents inside the workflow's nodes still call models, but you skip the "outer" reasoning model that an orchestrator-style agent would otherwise carry.

**Flexibility.** An agent can do anything its tools and its model permit; a workflow is fixed to the shape its YAML declares. When the orchestration logic is genuinely fluid — "if the user is asking about X, route to A, but maybe sometimes you need to ask for clarification first, except when..." — an agent is the right tool.

The two often coexist. A workflow can call an orchestrator agent for the parts where flexibility matters; an orchestrator agent can call a workflow for the parts that need to be deterministic. Mix freely.

## A Minimal Workflow

Save the following as `configs/double_and_format.yaml`. It assumes two configured agents named `DataDoubler` and `ValueFormatter` are already running on the same broker namespace:

```yaml
# configs/double_and_format.yaml
log:
  level: info

apps:
  - name: simple_sequential_workflow
    app_exec: sam-awe
    app_config:
      namespace: ${NAMESPACE, solace-agent-mesh}
      name: "SimpleSequentialWorkflow"
      display_name: "Simple Sequential Workflow"

      workflow:
        version: "1.0.0"
        description: "Doubles a value and formats the result."

        input_schema:
          type: object
          properties:
            value: { type: number }
          required: [value]

        output_schema:
          type: object
          properties:
            doubled_value: { type: number }
            message: { type: string }
          required: [doubled_value, message]

        nodes:
          - id: double_value
            type: agent
            agent_name: "DataDoubler"
            input:
              value: "{{workflow.input.value}}"

          - id: format_result
            type: agent
            agent_name: "ValueFormatter"
            depends_on: [double_value]
            input:
              value: "{{double_value.output.doubled_value}}"

        output_mapping:
          doubled_value: "{{double_value.output.doubled_value}}"
          message: "{{format_result.output.message}}"

      session_service:
        type: memory
        default_behavior: "PERSISTENT"

      agent_card_publishing: { interval_seconds: 10 }
      agent_discovery: { enabled: true }
```

The shape is the same as a configured agent up to `app_config:`. From there:

- `name` is the workflow's external identity on the A2A protocol. Peers call this name to invoke the workflow.
- `workflow:` is the block AWE inspects to decide this entry is a workflow rather than an agent. Everything inside `workflow:` is the DAG definition.
- `input_schema` and `output_schema` are JSON Schemas. Inputs are validated before any node fires; outputs are validated against the schema before the workflow returns.
- `nodes:` declares the DAG. Order does not matter — `depends_on` is the only thing that determines execution order.
- `output_mapping:` constructs the workflow's final output from node outputs. This block is required.

`output_mapping` is required because the workflow result is otherwise undefined — the engine does not invent a "default" output by inspecting the last node. State what the result is, explicitly.

## Node Kinds

Six node `type` values are accepted: `agent`, `tool`, `switch`, `map`, `loop`, and `workflow` (nested).

### `agent` Nodes

An `agent` node calls a configured agent over the A2A protocol. Required keys:

- `id` — node identifier, unique within the workflow.
- `type: agent`
- `agent_name` — the exact `agent_name` of the target agent.

Common optional keys:

- `instruction` — overrides or augments the target agent's prompt for this node only.
- `input` — a map of input field names to template expressions. The full set is passed to the agent as a structured request matching its `input_schema`.
- `depends_on` — list of node IDs that must complete before this node runs.
- `when` — boolean expression; skip this node if it evaluates false.
- `timeout` — duration string (`"30s"`, `"5m"`); overrides the workflow's `default_node_timeout` for this node.
- `retry_strategy` — see Timeouts and retry.

Example:

```yaml
nodes:
  - id: parse_invoice
    type: agent
    agent_name: "InvoiceParser"
    timeout: "2m"
    input:
      invoice_id: "{{workflow.input.id}}"
      fields: ["total", "tax", "line_items"]
```

### `tool` Nodes

A `tool` node invokes a single tool directly — no agent and no LLM in the loop. The tool can be a built-in tool (which runs inside AWE), a remote tool (a Python script or Go binary that runs inside STR), or a tool produced by a connector. Required keys:

- `id`, `type: tool`
- `tool_name` — the name of a tool available to the workflow.

The tool must be declared at the workflow's `app_config` level, in the same `tools:` and `connectors:` lists that a configured agent accepts. Tools and connectors share one namespace: if both a `tools:` entry and a connector-produced tool claim the same `tool_name`, the workflow fails to start with a clear error. A tool node advertises the tool's parameter schema as its own input schema on the workflow's agent card, so a gateway can render an input form for it.

Tool-node failures are **terminal**: a tool node is never retried, even when a `retry_strategy` is declared on the node or workflow. Tools share no retry contract — a tool error can mean anything from a transient blip to a deterministic validation failure — so the engine does not assume a failed tool call is safe to repeat.

```yaml
# configs/tool_workflow.yaml
...
app_config:
  tools:
    - tool_type: builtin
      tool_name: get_current_time

  connectors:
    - name: ops_email
      type: email
      subtype: smtp
      scopes: [connector:ops_email:invoke]
      config:
        host: smtp.example.com
        port: 587

  workflow:
    nodes:
      - id: fetch_time
        type: tool
        tool_name: get_current_time

      - id: notify
        type: tool
        tool_name: send_email          # produced by the ops_email connector
        depends_on: [fetch_time]
        input:
          subject: "Daily ping"
          body: "Current time: {{fetch_time.output.message}}"

    output_mapping:
      delivered_at: "{{fetch_time.output.message}}"
...
```

### `switch` Nodes

A `switch` node picks one of several downstream nodes to fire based on conditions. Required keys:

- `id`, `type: switch`
- `cases` — a list of `{condition, node}` pairs. The first case whose `condition` evaluates true selects its `node`.

Optional:

- `default` — node ID to fire if no case matches. Without a default, a switch that finds no matching case skips silently.

Each `cases[].condition` is an expression in the workflow's expression language (described in Conditions and `when` clauses). The `cases[].condition` and `cases[].node` keys accept the aliases `when` and `then` if you prefer that style.

```yaml
nodes:
  - id: route_by_amount
    type: switch
    depends_on: [parse_invoice]
    cases:
      - condition: "{{parse_invoice.output.total}} > 10000"
        node: high_value_review
      - condition: "{{parse_invoice.output.total}} > 1000"
        node: standard_review
    default: auto_approve
```

### `map` Nodes

A `map` node fans out: it runs a template node once per item in a collection, optionally in parallel. Required keys:

- `id`, `type: map`
- `node` — the ID of the template node to instantiate per item.
- One of `items`, `with_param`, or `with_items` — the source of the collection. They are aliases of each other; pick one.

Optional:

- `max_items` (default `100`) — caps how many iterations can fire from a single map. Safety rail against runaway fan-out.
- `concurrency_limit` — caps the number of iterations running at once. Without it, the engine runs all iterations in parallel up to broker and agent capacity.

Inside the template node, the special variables `{{_map_item}}` and `{{_map_index}}` resolve to the current item and its zero-based position.

```yaml
nodes:
  - id: process_each_row
    type: map
    items: "{{load_data.output.rows}}"
    node: row_processor
    concurrency_limit: 5

  - id: row_processor
    type: agent
    agent_name: "RowProcessor"
    input:
      row: "{{_map_item}}"
      index: "{{_map_index}}"
```

### `loop` Nodes

A `loop` node runs a body node repeatedly until a condition becomes false (do-while semantics — the body runs at least once). Required keys:

- `id`, `type: loop`
- `node` — body node ID.
- `condition` — expression evaluated after each iteration; loop continues while true.

Optional:

- `max_iterations` (default `100`) — hard cap, prevents infinite loops.
- `delay` — duration string between iterations (for example, `"5s"`); useful for polling patterns.

```yaml
nodes:
  - id: poll_until_ready
    type: loop
    node: check_job_status
    condition: "{{check_job_status.output.state}} != 'complete'"
    delay: "10s"
    max_iterations: 30

  - id: check_job_status
    type: agent
    agent_name: "JobStatusChecker"
    input:
      job_id: "{{workflow.input.job_id}}"
```

### `workflow` Nodes (Nested)

A `workflow` node invokes another workflow. Required keys:

- `id`, `type: workflow`
- `workflow_name` — the name of the target workflow.

The nested workflow runs in its own DAG context and returns its declared output to the parent. The runtime caps nesting depth at `max_call_depth` (default `6`) — beyond that, the call fails rather than recurse further.

```yaml
nodes:
  - id: run_compliance_check
    type: workflow
    workflow_name: "ComplianceWorkflow"
    input:
      transaction: "{{parse_transaction.output}}"
```

## Wiring Nodes: Dependencies and Data Flow

Two mechanisms wire the DAG together.

**`depends_on`** declares execution order. A node fires only after every node in its `depends_on` list has completed successfully (or, in non-fail-fast mode, completed at all). Nodes with no `depends_on` are roots — they fire as soon as the workflow starts. Nodes that share `depends_on` ancestors fire in parallel automatically.

**`input`** declares what data flows in. Every value in the `input:` map is a template expression resolved against:

- `workflow.input` — the input the workflow itself received.
- `<node_id>.output` — the structured output of any completed node.
- `_map_item` and `_map_index` — current item and index inside a map iteration.

```yaml
nodes:
  - id: enrich
    type: agent
    agent_name: "Enricher"
    depends_on: [parse_invoice, fetch_account]
    input:
      invoice: "{{parse_invoice.output}}"
      account: "{{fetch_account.output}}"
      tier: "{{fetch_account.output.tier}}"
```

A few things worth knowing about template resolution:

- **Single-template values preserve type.** `value: "{{some.output.count}}"` returns a number if `count` is a number, not a stringified number. The engine recognizes a value that is exactly one template expression and skips the stringification step. Mixed strings (`"Hello, {{name}}"`) always return strings.
- **Coalesce with a map operator.** Use a single-key map `{coalesce: ["{{a.output.value}}", "default"]}` as the value to return the first non-null operand. The `|` syntax familiar from Jinja-style templates is not parsed inside `{{...}}`.
- **Concatenate with a map operator or string interpolation.** Use `{concat: ["{{a.output.first}}", "{{a.output.last}}"]}` to compose multiple template values, or use string interpolation (`"prefix_{{a.output.id}}"`) when you just need to splice a template into a literal string. The `+` operator is not parsed inside `{{...}}`.
- **Argo-style aliases.** If you are migrating from Argo Workflows, `{{item}}` is an alias for `{{_map_item}}`, and `{{workflow.parameters.x}}` is an alias for `{{workflow.input.x}}`. Use whichever style your team prefers.

## Conditions and `when` Clauses

Both `switch` cases and node `when` clauses use the same expression language. The language supports:

- Comparison operators: `==`, `!=`, `<`, `<=`, `>`, `>=`
- Boolean operators: `&&`, `||`, `!`
- Membership: `value in [1, 2, 3]`
- Literals: numbers, strings (`'single'` or `"double"` quoted), booleans, null.
- Template expressions inside the comparison: `{{node.output.field}} > 100`

A `when` clause on any node skips that node when it evaluates false. A skipped node's downstream dependents — nodes that named it in `depends_on` — also skip, unless the workflow runs in non-fail-fast mode (see Timeouts and retry).

The expression engine is sandboxed: it cannot call out to functions, cannot read files, and cannot do anything other than evaluate the expression against the data already in the workflow's state.

## Timeouts and Retry

Workflows defend against runaway execution at three levels.

**Workflow-level timeout** (`workflow_timeout`, duration string, no default — meaning unlimited if not set). Caps the entire workflow's wall-clock runtime. When it fires, any in-flight nodes are cancelled and the workflow returns a timeout error.

**Per-workflow default node timeout** (`default_node_timeout`, default `5m`). Every node inherits this as its `timeout` unless it overrides the value directly.

**Per-node timeout** (`timeout`, duration string). Overrides the default for one node. Best when one node — say, a long-running data pipeline — needs more time than the rest.

```yaml
workflow:
  workflow_timeout: "30m"
  default_node_timeout: "1m"

  nodes:
    - id: quick_check
      type: agent
      agent_name: "QuickCheck"
      # inherits 1m timeout

    - id: heavy_compute
      type: agent
      agent_name: "HeavyCompute"
      timeout: "10m"
```

Retry is configured per-node (or at the workflow level as a default) via `retry_strategy`:

```yaml
nodes:
  - id: call_flaky_service
    type: agent
    agent_name: "FlakyServiceAgent"
    retry_strategy:
      limit: 3
      retry_policy: "OnFailure"
      backoff:
        duration: "1s"
        factor: 2.0
        max_duration: "30s"
```

`limit` is the maximum number of attempts (including the first). `retry_policy` is `"OnFailure"` (retry only when the node returned a failure result), `"OnError"` (retry on transport or execution errors but not on a clean failure result), or `"Always"` (retry on any non-success). `backoff` describes exponential backoff between attempts: `duration` is the initial delay, `factor` multiplies it on each retry, `max_duration` caps the delay.

The workflow's `fail_fast` flag (default `true`) controls how a node failure cascades. With `fail_fast: true`, a node failure cancels the entire workflow. With `fail_fast: false`, the engine cascade-skips only the failed node's exclusive dependents — sibling branches continue. Use `fail_fast: false` when independent branches should keep running even if one fails (a "best effort" parallel run).

## Exit Handlers

An `on_exit` declaration names a terminal node — or set of nodes — that should run after the main DAG completes, regardless of how it completed.

The short form names a single node that always runs:

```yaml
workflow:
  on_exit: "cleanup"

  nodes:
    - id: cleanup
      type: agent
      agent_name: "CleanupAgent"
      input:
        run_id: "{{workflow.input.run_id}}"
```

The `cleanup` node sits in the same `nodes:` list as the rest of the workflow's nodes; `on_exit` is what causes it to fire after the main DAG settles.

The long form lets you fire different handlers based on outcome:

```yaml
workflow:
  on_exit:
    on_success: notify_success
    on_failure: notify_failure
    on_cancel: notify_cancelled
    always: final_cleanup
```

`on_success` fires when the workflow finished cleanly. `on_failure` fires when any node failed (and was not retried into success). `on_cancel` fires when the workflow was cancelled mid-run (timeout, external cancel). `always` runs after all of the above, regardless of outcome.

Inside an exit-handler node's `input:`, two special template paths become available:

- `workflow.status` — the outcome string (`"succeeded"`, `"failed"`, `"cancelled"`).
- `workflow.error` — a structured `{message, node_id}` describing the failure, populated only when the workflow did not succeed.

```yaml
nodes:
  - id: notify_failure
    type: agent
    agent_name: "AlertAgent"
    input:
      severity: "high"
      reason: "{{workflow.error.message}}"
      failed_node: "{{workflow.error.node_id}}"
```

Outside an exit-handler node, `workflow.status` and `workflow.error` are not defined.

## Approvals Inside Workflows

The runtime's approval mechanism sits at the **tool-dispatch** layer, inside an agent. A workflow does not have its own approval gate; instead, an `agent` node inside the workflow invokes an agent that calls a tool marked `hil.require_approval: true`. When the LLM tries to call that tool, the runtime suspends the call, emits an approval request to the client, and waits.

From the workflow's perspective, this looks exactly like any other long-running agent node. If the operator approves, the agent's tool runs, the agent returns its result, the workflow's node completes, and the DAG advances. If the operator denies or the approval times out, the agent's tool returns an error, the agent may or may not recover, and the workflow's node either succeeds or fails depending on what the agent does next.

The agent-side configuration of approvals is covered in Building → Agents → Approvals. The workflow-side knob you have is `timeout` on the calling node — if you want to fail a node when the operator takes too long, set the node's `timeout` shorter than the tool's `hil.timeout`.

Approvals are scoped to the **agent** that calls the gated tool, not to the workflow. If a `map` or parallel branches fire multiple agent nodes that each invoke an approval-gated tool, the operator can end up with several pending approval prompts at the same time — there is no workflow-level mutex. Prefer to fire approval-gated nodes sequentially when concurrent prompts would confuse the operator.

## Inputs, Outputs, and Schemas

Three schema-like declarations shape how data flows in and out of a workflow.

**`input_schema`** validates the workflow's input on arrival. A caller sends a structured input via one of three A2A part types: `FilePart` (an artifact URI or inline base64-encoded JSON), `DataPart` (a JSON object), or `TextPart` (a plain string). The runtime extracts input in that priority order — a `FilePart` always wins over a coincident `DataPart`, so a caller that intends to send typed JSON inline should not also attach a JSON file. `DataPart` is the cleanest contract for typed callers; `FilePart` is the right choice when the payload is too large to embed inline.

**`output_schema`** validates the workflow's output on return. The engine builds the output from `output_mapping`, then validates the result against `output_schema`. If validation fails, the workflow returns a structured error rather than emitting malformed data.

**`output_mapping`** is the construction step. It is a map of output-field-name to template expression. The engine resolves each expression against completed-node outputs and produces the final result.

```yaml
workflow:
  input_schema:
    type: object
    properties:
      customer_id: { type: string }
      months: { type: integer, minimum: 1, maximum: 24 }
    required: [customer_id, months]

  output_schema:
    type: object
    properties:
      summary: { type: string }
      total_spend: { type: number }
    required: [summary, total_spend]

  output_mapping:
    summary: "{{format_summary.output.text}}"
    total_spend: "{{aggregate_spend.output.total}}"
```

Nodes can declare their own `input_schema_override` and `output_schema_override`. These override the target agent's own schemas for this node only. Use them sparingly — usually it is better to fix the agent's schema than to patch around it node-by-node.

## What Next?

You have just learned how to author a configured workflow. Most readers next want to deepen the configured-agent skills the workflow's `agent` nodes call into — covered in Building → Agents. For richer tool integration inside those agents, see Building → Tools. For lazy-loaded capability bundles agents can share, see Building → Skills.
