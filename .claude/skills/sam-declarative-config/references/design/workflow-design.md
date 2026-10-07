# Agent Mesh Workflow Design Guide

## When to Use Workflows

Use a workflow instead of (or wrapping) an agent when:

- **The process has known structure.** You know the steps ahead of time — extract, then analyze, then summarize. The sequence doesn't depend on LLM judgment at runtime.
- **You need validation between steps.** Each node's output can be checked before feeding the next node. This prevents error cascades.
- **You need structured I/O contracts.** When processing data through a pipeline where each stage expects a specific format.
- **You need parallelism.** Independent steps should execute simultaneously. Workflows express this through dependency declarations.
- **You need auditability.** Each node's input and output is recorded separately.
- **You need per-step retry.** If step 3 of 5 fails, retry just that step. With a single agent, failure often means starting over. (Retry reaches agent, workflow, map and loop nodes — never `type: tool`; see Error Handling.)

Don't use workflows when:
- The process is conversational and the next step depends on LLM reasoning
- There's only one step (just use an agent)
- The steps are so tightly coupled that separating them adds complexity without benefit

Workflows often contain agents as nodes — the workflow controls "what order" and the agents handle "how" within each step.

### Node agents run unattended — avoid interactive OAuth

A workflow executes as an unattended background task; there is no live user session behind its nodes. An agent whose tools use **interactive per-user OAuth** (authorization-code + PKCE) will raise `authentication_required` and stall inside a workflow node — the sign-in has nowhere to complete. When choosing agents for workflow nodes, prefer ones whose tools use non-interactive credentials (service-account / client-credentials), or pre-authenticate interactively so a refreshable token is already cached before the run. This bites when you assemble a workflow from agents already running on the mesh: an agent that works fine in chat can fail the moment it runs as a workflow node. The symptom lies, too: the child agent waits on the pending sign-in for up to ten minutes while the workflow times the node out at five, so what you actually see is a node **timeout**, not an auth error — and you go debugging the wrong thing.

---

## Design Patterns

### Pipeline (Linear)

The simplest pattern. Each node depends on the previous one.

```
Extract → Analyze → Summarize → Format
```

Use when: Each step transforms data for the next. Order is fixed.

```yaml
nodes:
  - id: extract
    type: agent
    agent_name: Extractor
    input:
      raw_data: "{{workflow.input.data}}"

  - id: analyze
    type: agent
    agent_name: Analyzer
    depends_on: [extract]
    input:
      extracted: "{{extract.output}}"

  - id: summarize
    type: agent
    agent_name: Summarizer
    depends_on: [analyze]
    input:
      analysis: "{{analyze.output}}"
```

**Tip**: Each node gets only the data it needs from the previous node. Don't pass the entire workflow input to every node — this clutters their context.

### Fan-Out / Fan-In

Parallel processing of independent tasks that converge to a single result.

```
          ┌→ Process A ─┐
Input → Split            → Aggregate → Output
          └→ Process B ─┘
```

Use when: Multiple independent analyses of the same input, or processing different aspects in parallel.

```yaml
nodes:
  - id: security_scan
    type: agent
    agent_name: SecurityScanner
    input:
      code: "{{workflow.input.code}}"

  - id: performance_scan
    type: agent
    agent_name: PerformanceScanner
    input:
      code: "{{workflow.input.code}}"

  - id: aggregate
    type: agent
    agent_name: ReportWriter
    depends_on: [security_scan, performance_scan]
    input:
      security: "{{security_scan.output}}"
      performance: "{{performance_scan.output}}"
```

Nodes with no dependency relationship run in parallel automatically. `security_scan` and `performance_scan` execute simultaneously because neither depends on the other.

### Conditional Routing (Switch)

Route execution to different paths based on data.

```
          ┌→ Premium Path
Classify → Switch
          └→ Standard Path
```

Use when: Different data types or categories need different processing.

```yaml
nodes:
  - id: classify
    type: agent
    agent_name: Classifier            # `category` and `data` declared in classify's output schema
    input:
      request: "{{workflow.input}}"

  - id: route
    type: switch
    depends_on: [classify]
    cases:
      - condition: "'{{classify.output.category}}' == 'premium'"
        node: premium_handler
      - condition: "'{{classify.output.category}}' == 'standard'"
        node: standard_handler
    default: fallback_handler

  - id: premium_handler
    type: agent
    agent_name: PremiumProcessor
    depends_on: [route]
    input:
      data: "{{classify.output.data}}"

  - id: standard_handler
    type: agent
    agent_name: StandardProcessor
    depends_on: [route]
    input:
      data: "{{classify.output.data}}"

  - id: fallback_handler
    type: agent
    agent_name: FallbackProcessor
    depends_on: [route]
    input:
      data: "{{classify.output.data}}"
```

**Important**: Switch target nodes must include the switch node in their `depends_on`.

When converging after a switch, use `coalesce` in the output mapping to pick whichever path actually executed:

```yaml
output_mapping:
  result:
    coalesce:
      - "{{premium_handler.output}}"
      - "{{standard_handler.output}}"
      - "{{fallback_handler.output}}"
```

### Map (Batch Processing)

Process a list of items in parallel, collecting results.

```
            ┌→ Process Item 1 ─┐
Items → Map ├→ Process Item 2 ─┤→ Collect Results
            └→ Process Item 3 ─┘
```

Use when: Processing a collection where each item is independent.

```yaml
nodes:
  - id: split
    type: agent
    agent_name: Splitter              # `items` declared in split's output schema
    input:
      batch: "{{workflow.input.items}}"

  - id: process_all
    type: map
    depends_on: [split]
    node: process_one
    items: "{{split.output.items}}"
    concurrency_limit: 5

  - id: process_one
    type: agent
    agent_name: ItemProcessor
    input:
      item: "{{_map_item}}"
      index: "{{_map_index}}"

  - id: aggregate
    type: agent
    agent_name: Aggregator
    depends_on: [process_all]
    input:
      results: "{{process_all.output}}"
```

**Tip**: Set `concurrency_limit` to avoid overwhelming downstream services. `max_items` (default 100) protects against unexpectedly large lists.

### Loop (Iterative Refinement)

Repeat a step until a condition is met.

```
     ┌────────────┐
     │   Process   │ ← condition check
     └──────┬──────┘
            │ (repeat until done)
            ▼
         Result
```

Use when: Iterative improvement, polling, or retry-with-backoff patterns.

```yaml
nodes:
  - id: refine
    type: loop
    node: refine_step
    condition: "{{refine_step.output.quality_score}} < 0.9"
    max_iterations: 5
    delay: "1s"

  - id: refine_step
    type: agent
    agent_name: Refiner               # `quality_score` and `result` declared in refine_step's output schema
    input:
      previous_result: "{{refine_step.output.result}}"
      iteration: "{{_loop_iteration}}"
```

**Warning**: Always set `max_iterations` to the number of passes you actually want. Without it the loop stops only after 100 iterations, which is 100 agent calls. The condition should converge — if quality can't improve, the loop must still terminate.

### Nested Workflows

Compose workflows from sub-workflows for reusability.

```yaml
nodes:
  - id: validate
    type: workflow
    workflow_name: ValidationWorkflow
    input:
      data: "{{workflow.input}}"

  - id: process
    type: workflow
    workflow_name: ProcessingWorkflow
    depends_on: [validate]
    input:
      validated: "{{validate.output}}"
```

Use when: A sub-process is reusable across multiple parent workflows, or when the parent workflow would be too complex as a flat DAG.

### Render a Report Template

To turn workflow data into a formatted artifact (HTML/Markdown/JSON report), use a plain `tool` node calling the built-in `instantiate_template` — there is no dedicated template node. Bind each of the template's declared `data_inputs` by its **logical name** to an upstream artifact (`filename` or `filename:version`); the tool rewrites the document's references to point at that artifact, pinned to the exact version it validated, so you never reproduce the template's internal filenames.

```yaml
tools:
  - tool_type: builtin
    tool_name: query_data_with_sql
  - tool_type: builtin
    tool_name: instantiate_template

nodes:
  - id: aggregate
    type: tool
    tool_name: query_data_with_sql      # saves an artifact of aggregated rows
    input:
      input_files:
        sales: "{{workflow.input.input_filename}}"
      sql_query: "SELECT region, SUM(revenue) AS total FROM sales GROUP BY region"
      output_filename: "sales_totals"
      output_format: "csv"

  - id: build_report
    type: tool
    tool_name: instantiate_template
    depends_on: [aggregate]
    input:
      skill_name: quarterly-report       # or: source_artifact: my_template.samt
      asset: report.html.samt            # must be the bundled .samt (a non-.samt asset is copied verbatim)
      substitutions:
        report_title: "Q3 Sales"
      data_inputs:
        sales_rows: "{{aggregate.output.output_filename}}"   # logical name → upstream artifact
```

Bind `data_inputs` to the field the upstream node actually returns (`query_data_with_sql` returns `output_filename`; an agent node returns its `output_schema` fields); the rendered artifact comes back as `{{build_report.output.filename}}`. A built-in's input parameter names and result field names are separate sets, both listed per tool in the built-in tools table (*Per-tool inputs and result fields* in the lookup table at the end of this guide) — take them from there rather than assuming one matches the other.

Use when: a workflow's final step is a rendered document. Tool-node failures are terminal, so a bad contract (schema mismatch, missing/invalid data, unresolved embed) fails the node cleanly instead of emitting a hollow success — there is no LLM here to read findings and retry.

### Reshape Data Between Tool Nodes (the shape seam)

Chaining two tool nodes works only when the upstream tool's output shape is already what the downstream tool's parameters want. When it isn't, **the workflow template language cannot fix it**. `coalesce` and `concat` operate on whole values; there is no projection, no per-item field rename, no unnesting. A collection cannot be reshaped inside a `{{…}}` expression.

This is the decision that determines whether a pipeline can be LLM-free at all, so check the seam before writing the nodes: write down what the upstream tool returns, write down what the downstream tool accepts, and see whether they line up.

**The failure mode is silent, not loud.** Dispatch does check that required top-level parameters are present and that each top-level argument matches its declared type — get *those* wrong and the node fails loudly, naming the argument. What it does not check is the shape *inside* an array's items or an object's properties. So a value of the right top-level type but the wrong inner shape sails through: the fields the tool looked for are absent, they unmarshal to zero values, and the tool does its work on those. A box-drawing tool fed `[{class_name, box:{x1,y1,x2,y2}}]` where it expects `[{x1,y1,x2,y2,label}]` places every box at the origin, discards them all as sub-pixel, and returns **success** having drawn nothing.

Four ways to close a seam, best first:

1. **Check whether the upstream tool already returns the shape — or the aggregate — you need.** Detectors, query tools and API wrappers commonly return a pre-computed summary alongside the raw rows. Reaching for an LLM to count something the tool already counted is the most common waste in a workflow.
2. **Reshape in the producing tool's response processing.** For an MCP tool that is `extract_fields` (below), which uses JMESPath — and JMESPath *does* project over collections. No LLM, no code change.
3. **Change the tool to accept the shape.** Right when you own the tool and the mismatch is permanent.
4. **Put an agent node in the seam.** Always works, always costs: a model call, plus the risk of a model transcribing coordinates or long numbers by hand. Choose this when the reshape needs judgment, not when it needs a projection.

#### `extract_fields` — reshaping an MCP tool's output

An MCP tool entry's `tool_config` can carry JMESPath expressions whose results are published as a navigable field on the node's output:

```yaml
tools:
  - tool_type: mcp
    tool_name: detect_objects
    connection_params:
      type: streamable-http
      url: "http://127.0.0.1:9666/mcp"
    tool_config:
      # extracted_fields rides along with SAVED responses only, so force every
      # response down that path. Default threshold is 2048 bytes.
      mcp_tool_response_save_threshold_bytes: 1
      mcp_intelligent_processing:
        extract_fields:
          count: "count"
          counts: "counts"
          # The reshape: nested {class_name, box:{…}} -> flat {x1,y1,x2,y2,label}
          boxes: "detections[].{x1: floor(box.x1), y1: floor(box.y1), x2: ceil(box.x2), y2: ceil(box.y2), label: class_name}"
```

`detect_objects` and `image-tools__draw_boxes` below stand in for tools you supply — the first an MCP server you run, the second a tool from your own skill bundle. Neither ships with Agent Mesh.

A downstream node reads the results under `extracted_fields`:

```yaml
- id: draw
  type: tool
  depends_on: [fetch, detect]
  tool_name: image-tools__draw_boxes
  input:
    image: "{{fetch.output.filename}}"
    boxes: "{{detect.output.extracted_fields.boxes}}"
```

Four things to know before relying on it:

- **The path is `{{<node>.output.extracted_fields.<key>}}`**, not `{{<node>.output.<key>}}`. Every extraction is namespaced under that one key.
- **Nothing is emitted unless the response takes the saved path.** The digest carrying `extracted_fields` is built only when a response is saved as an artifact, so a payload smaller than `mcp_tool_response_save_threshold_bytes` (default 2048) yields no extractions at all. Setting the threshold to `1` forces it for every non-empty response.
- **Each extracted field is capped at 4096 bytes.** Beyond that the value is replaced with a `(value too large: N bytes …)` marker — and the node still succeeds, so the *downstream* node fails on a type error one step away from the cause. Keep extractions small: integerizing float coordinates roughly halves their cost, and `floor` on the top-left with `ceil` on the bottom-right keeps the integer box containing the float box, so no edge is clipped.
- **A whole-string `{{…}}` input preserves the native type**, so the downstream tool receives a real array rather than a stringified one. That is the Type Preservation rule below, and it is what makes this work at all.

**Diagnosing a missing extraction.** Whatever went wrong upstream surfaces on the *downstream* node, and the shape it takes there names the cause — including one case that raises nothing at all:

| Downstream symptom | Cause |
|---|---|
| `field "extracted_fields" not found` | no digest was built: either the response stayed below `mcp_tool_response_save_threshold_bytes`, or the upstream call failed in a way the tool reported as success (e.g. an MCP server 400 on a bad argument) |
| `field "<key>" not found` — the *leaf* key, e.g. `boxes` | the digest exists but that field's JMESPath matched nothing or errored, so the key was left out |
| a **type error** — the downstream tool got a string where it expected an array or object | the field is there, holding the `(value too large: N bytes …)` marker; the 4096-byte cap overflowed |
| **no error at all**, but the value arrives truncated | the extraction resolved to a *string* over 256 bytes. Strings are cut in place with a `…(truncated)` suffix; the 4096-byte cap and its `(value too large)` marker apply only to arrays and objects. Nothing downstream can tell a shortened string from a short one — extract strings you intend to act on with care |

The silent-server-failure case deserves dwelling on: an MCP tool can return `status: success` with `error_message: null` and still have failed at the server, emitting no extractions. The offending argument never appears anywhere in the error path.

#### A tool node's output is its `Data`, plus the artifact it saved

The same class of surprise, one seam over. A tool node's `{{node.output.*}}` namespace is built from the tool's structured **data** map, plus `message` and `status` injected if the tool did not already set those keys. Files the tool produced are persisted to the artifact store as a side effect. When a call saves **exactly one** artifact, the framework also injects `created_artifact` — its name pinned to the version this call wrote, such as `report.json:3` — along with `created_artifact_name` (the bare name) and `created_artifact_version`, so `output_mapping` and a downstream node can reach it without the tool having reported it. When a call saves several, all three are absent: the template language cannot index a list, so naming a set the caller cannot take apart would be no better than naming none.

The pin is load-bearing inside a `map`. Its iterations, and any workflows they call, share one artifact session, so two iterations that write the same filename would otherwise each read back whichever wrote last. Pass `created_artifact` unchanged to a step that reads the file — built-in tools that read an artifact accept `name:version`. Where a step needs the filename itself, such as an output filename or deleting the artifact, use `created_artifact_name`.

A tool that creates a file should still *also* return that filename in its structured data, and it is the only option for a multi-artifact call. **There is no conventional key for it, so do not guess** — `web_request` returns `filename` while `query_data_with_sql` returns `output_filename`. A tool's result keys are a separate namespace from its input parameter names, and the two often differ (`web_request` *takes* `output_artifact_filename` and *returns* `filename`). For a built-in, look the key up rather than inferring it: the built-in tools table (*Per-tool inputs and result fields* in the lookup table at the end of this guide) lists input parameters and result fields per tool, generated from the registry, for every built-in that declares them — a handful of registered built-ins are not in that table yet, so a miss there means read the tool's own description. For a tool that is not a built-in — MCP, OpenAPI, a toolset or a connector — the result keys are not declared anywhere you can read, so confirm them from the tool's own documentation or from one real run, and never infer them from the input side:

```yaml
output_mapping:
  annotated_image: "{{draw.output.output_filename}}"
```

If you are writing the tool, that is the contract to satisfy. If you are consuming one that doesn't, and the step saves exactly one artifact, `{{<node>.output.created_artifact}}` names it regardless. Fall back to setting an explicit output name and hardcoding the same literal in the consumer only when the step saves zero or several, which the framework cannot name because the template language has no way to index a set.

One collision to know about: because `message` and `status` are only injected when absent, a tool whose own data map defines `message` wins — so `{{node.output.message}}` does not mean the same thing for every tool.

---

## Structured I/O Contracts

### Define Schemas at Boundaries

Use `input_schema` and `output_schema` to enforce data contracts:

```yaml
input_schema:
  type: object
  properties:
    text:
      type: string
    language:
      type: string
      enum: ["en", "fr", "de", "es"]
  required: ["text"]

output_schema:
  type: object
  properties:
    sentiment:
      type: string
      enum: ["positive", "negative", "neutral"]
    keywords:
      type: array
      items:
        type: string
  required: ["sentiment"]
```

### Schema Design Tips

- Use `enum` for categorical fields — the LLM is more reliable with constrained choices
- Keep schemas flat when possible — deeply nested schemas are harder to validate
- Mark only truly required fields as required — optional fields give the agent flexibility
- Use `description` on properties to help the agent understand expected values
- Set `validation_max_retries: 2` on agents that produce structured output

### Node-Level Schema Overrides

When a workflow node needs a different schema than the agent's default:

```yaml
- id: specialized_analysis
  type: agent
  agent_name: Analyzer
  input_schema_override:
    type: object
    properties:
      data: { type: string }
  output_schema_override:
    type: object
    properties:
      score: { type: number }
```

### An Agent Node Guarantees Only the Fields It Declares

Reference `{{node.output.<field>}}` — in `output_mapping`, a node's `input:`, a `when:`, or a switch or loop condition — only for a field that node declares, in its `output_schema_override` or in its agent's `output_schema`. Then make the agent's instruction, or the node's `instruction`, tell it to return exactly those keys. An agent node that declares no output schema guarantees no fields: its output is whatever structured result the agent returned, and `{"text": "..."}` when it returned only prose. If the node's output shape is not declared, map the whole `{{node.output}}` instead in `output_mapping` or a node's `input:`. A switch case or a map node's `items` needs a field, so declare it. To add a field to a node that already has a schema, extend that schema — an `output_schema_override` replaces the agent's whole schema, so adding a new override drops the fields the agent declared.

The failure differs by where the reference sits. In a node's `input:`, a reference to a field the agent did not return fails that node. In the workflow's `output_mapping`, an unresolved reference is left verbatim, so the run completes and returns the literal `{{decide.output.action}}` text as if it were data. In a `when:`, a switch case, or a loop condition, an unresolved reference is treated as not matched: the node is skipped, the case declines, or the loop stops with `stopped_reason: condition_unresolved`.

Declare the fields and name them in the instruction as a pair:

```yaml
nodes:
  - id: decide
    type: agent
    agent_name: Decider
    instruction: >-
      Return a JSON object with exactly two keys: "action" (one of approve,
      reject, escalate) and "confidence" (a number from 0 to 1).
    output_schema_override:
      type: object
      properties:
        action: { type: string, enum: [approve, reject, escalate] }
        confidence: { type: number }
      required: [action, confidence]

output_mapping:
  action: "{{decide.output.action}}"
  confidence: "{{decide.output.confidence}}"
```

---

## Error Handling

### Retry Strategy

Configure retries for transient failures (API timeouts, rate limits):

```yaml
retry_strategy:
  limit: 3                    # 3 retries = 4 total attempts
  retry_policy: "Always"      # retry agent failures and timeouts alike
  backoff:
    duration: "1s"            # start at 1 second
    factor: 2.0               # exponential: 1s, 2s, 4s
    max_duration: "30s"       # cap at 30 seconds
```

**Retry policies**:
- `OnFailure` — retry only when the agent reports failure; timeouts and system errors are not retried. This is the default when `retry_policy` is omitted
- `OnError` — retry only timeouts and system errors; a failure the agent reports is not retried
- `Always` — retry both

**Retry never reaches a `type: tool` node.** The executor short-circuits every tool node to no-retry, by design: tools have no shared retryability contract, so a tool error cannot be classified as transient or permanent. A `retry_strategy:` on a tool node parses and then never fires, and nothing warns you — **its presence in your YAML is not evidence that it applies.**

So a DAG containing tool nodes has uneven resilience: every other kind of node gets another attempt and the tool nodes do not. Either move the retry-worthy work into an agent node, or make the tool idempotent so the whole workflow can simply be run again.

One case cuts the other way, and it surprises people who have just learned the rule above: **a tool used as the body of a `map` or `loop` is re-invoked when that enclosing node retries.** The short-circuit keys on the enclosing node's type, not the body's, and a re-dispatch re-runs every branch from scratch — including the branches that already succeeded. If that tool sends email, charges a card or appends to a file, make it idempotent.

Set retries per-node for different reliability needs (agent, workflow, map and loop nodes — tool nodes never retry, as above):
```yaml
- id: critical_step
  type: agent
  agent_name: CriticalAgent
  retry_strategy:
    limit: 5
    retry_policy: "OnError"

- id: optional_step
  type: agent
  agent_name: OptionalAgent
  retry_strategy:
    limit: 1
```

### Fail-Fast vs Partial Completion

**fail_fast: true** (default): Stop the entire workflow when any node fails. Use when all steps are essential.

**fail_fast: false**: Continue executing other branches. Use when some paths are optional or when you want partial results.

With `fail_fast: false`, use `coalesce` in output mapping to handle missing results:

```yaml
output_mapping:
  result:
    coalesce:
      - "{{main_path.output}}"
      - "{{fallback_path.output}}"
      - "Processing incomplete"
```

### Exit Handlers

Run cleanup or notification logic regardless of outcome:

```yaml
on_exit:
  always: "cleanup"
  on_success: "notify_success"
  on_failure: "alert_ops"
  on_cancel: "cleanup_partial"
```

Exit handler nodes can check the workflow status:

```yaml
- id: alert_ops
  type: agent
  agent_name: Alerter
  input:
    status: "{{workflow.status}}"
    error: "{{workflow.error.message}}"
```

---

## Timeout Design

### Per-Node Timeouts

Set timeouts based on expected execution time plus margin:

```yaml
- id: quick_classify
  type: agent
  agent_name: Classifier
  timeout: "15s"              # classification should be fast

- id: deep_analysis
  type: agent
  agent_name: Analyzer
  timeout: "5m"               # analysis takes longer
```

### Workflow-Level Timeout

Caps total execution time. Useful for SLA enforcement:

```yaml
workflow_timeout: "10m"
```

### Default Node Timeout

Applied to all nodes that don't specify their own:

```yaml
default_node_timeout: "2m"
```

### Timeout Priorities

1. Node-specific `timeout` (highest)
2. Workflow `default_node_timeout`
3. The built-in default of five minutes

---

## Template Expression Patterns

### Pass-Through

Forward workflow input directly to a node:
```yaml
input:
  data: "{{workflow.input}}"
```

### Selective Forwarding

Pick specific fields:
```yaml
input:
  name: "{{workflow.input.user.name}}"
  query: "{{workflow.input.search_query}}"
```

### Cross-Node Data Flow

Reference output from a completed node:
```yaml
input:
  analysis: "{{step1.output.analysis}}"
  metadata: "{{step1.output.metadata}}"
```

Name a field only when `step1` declares it — for an agent node, in its output schema (see "An Agent Node Guarantees Only the Fields It Declares"). Otherwise pass `{{step1.output}}` whole.

### Fallback Chains

Use `coalesce` when a value might come from different paths:
```yaml
result:
  coalesce:
    - "{{fast_path.output}}"
    - "{{slow_path.output}}"
    - "no result available"
```

### String Construction

Use `concat` to build strings from parts:
```yaml
topic:
  concat:
    - "results/"
    - "{{workflow.input.category}}"
    - "/"
    - "{{process.output.id}}"
```

### Type Preservation

Full templates preserve types:
```yaml
count: "{{node.output.count}}"       # returns number, not string "42"
items: "{{node.output.list}}"        # returns array
config: "{{node.output.settings}}"   # returns object
```

Embedded templates always return strings:
```yaml
message: "Found {{node.output.count}} results"  # returns string "Found 42 results"
```

---

## Testing and Debugging

### Start Small

Build and test one node at a time. Verify each node produces expected output before adding the next. A 10-node workflow is hard to debug all at once.

### Use Simple Agents First

When prototyping a workflow, use simple agents that echo or minimally transform their input. Verify the workflow structure (dependencies, conditions, data flow) before adding real agent logic.

### Check Template Expressions

Common template issues:
- Missing quotes in conditions: `{{status}} == 'done'` should be `'{{status}}' == 'done'`
- Referencing a node that hasn't completed (not in depends_on)
- Typos in node IDs (resolve to nil silently); a typo in a *field* name on a node that did run is a hard error that fails the node, and on a built-in the workflow also warns about it as it starts
- A field reference into an agent node that declares no output schema — nothing guarantees the field exists. In `output_mapping` it comes back as literal `{{…}}` text in a run that reports success

### Validate Schemas

If an agent repeatedly fails output validation, the schema may be too strict. Relax it during development, then tighten when the agent is producing reliable output.

---

## Common Anti-Patterns

### The Monolithic Workflow

A workflow with 20+ nodes that handles every possible case. Hard to understand, debug, or modify.

**Fix**: Break into sub-workflows. Each should handle one coherent process with 3-7 nodes.

### Missing Dependencies

Nodes that reference `{{node.output}}` without declaring `depends_on: [node]`. The referenced node may not have completed yet.

**Fix**: If you reference a node's output, always include it in `depends_on`.

### Over-Sequencing

Making every node depend on the previous one when some could run in parallel:
```yaml
# Bad: A → B → C → D (all sequential)
# Good: A → C, B → C, C → D (A and B run in parallel)
```

**Fix**: Only declare dependencies that are actually needed for data flow.

### No Error Handling

A workflow with no retry strategy, no exit handlers, and `fail_fast: true` (default). Any single failure kills the entire workflow with no cleanup.

**Fix**: Add retry for transient failures, exit handlers for cleanup, and consider `fail_fast: false` for workflows where partial results are acceptable.

### Unbounded Loops

A loop node whose condition might never become false. Without `max_iterations` it runs the default cap of 100 iterations before it stops.

**Fix**: Set `max_iterations` to the number of passes you actually want. Design conditions that converge.

### Complex Conditions

Switch conditions that are hard to read or that reference multiple nodes:
```yaml
condition: "{{a.output.x}} > 10 and '{{b.output.y}}' == 'z' or {{c.output.w}} != null"
```

Beyond readability, two things here do not work. `!= null` never matches anything — `null` is not an expr literal, and a template resolves to text before the expression is parsed, so there is no nil to compare against. And a reference to a field a node did not produce cannot decide the condition: it answers only if the references that did resolve settle the answer whichever way the missing one would have gone, and otherwise is treated as not matched (with a WARN naming it). A workflow input the caller left out is weighed the same way, as an ordinary outcome without the WARN: a condition it decides does not match, so `'{{workflow.input.flag}}' != 'true'` does not match when the flag was omitted — test an optional flag for its supplied value instead. The more nodes a condition spans, the more likely one of them is an optional field, and the more likely the condition declines to answer at all.

**Fix**: Use a classifier agent node to produce a simple category, then switch on that:
```yaml
# Classifier agent outputs: {category: "premium"}
condition: "'{{classify.output.category}}' == 'premium'"
```

### Assuming a Tool Chain Type-Checks

Wiring one tool's output straight into the next tool's input because the field names look close enough. Dispatch checks top-level parameter names and types, but nothing validates the shape *inside* an array or object — absent inner fields become zero values and the node reports success on garbage.

**Fix**: Compare the two shapes explicitly before wiring them, and close any gap with `extract_fields` or a change to the tool — see "Reshape Data Between Tool Nodes". Where a chain has to be trusted, assert on a value only the real data could produce (a count, a provenance field), never on the node's status.

### Data Explosion

Passing entire node outputs when only one field is needed:
```yaml
# Bad: passes everything from step1
input:
  data: "{{step1.output}}"

# Good: passes only what's needed
input:
  score: "{{step1.output.score}}"
  category: "{{step1.output.category}}"
```

**Fix**: Select specific fields in template expressions. This keeps node contexts focused and reduces token usage. Select a field only from a node that declares it — for an agent node, declare `score` and `category` in its output schema and name them in its instruction first.

## Working with declarative config

Where this guide says to look something up, read one of these files. Paths are relative to the `sam-declarative-config` skill root; a sibling skill is installed next to it.

| Topic | Where |
|---|---|
| Workflow schema | `references/workflow.md` |
| Per-tool inputs and result fields | `builtin-tools.md` under the `sam-author-agent` skill's references, the table generated from the registry |

For "An Agent Node Guarantees Only the Fields It Declares": a workflow node's `output_schema_override` sits on the node inside the workflow's `spec.appConfig`. An agent resource carries its own schema as `outputSchema` (camelCase) under `spec.additionalConfigurations`; the platform writes it as the runtime `output_schema` at deploy.
