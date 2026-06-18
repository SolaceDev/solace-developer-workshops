---
name: sam-workflow-design
description: Workflow design guide — patterns, structured I/O, node composition, error handling, template expressions, testing, and common anti-patterns.
tags:
  - builder
  - design
  - workflow
  - sam
---

# SAM Workflow Design Guide

## When to Use Workflows

Use a workflow instead of (or wrapping) an agent when:

- **The process has known structure.** You know the steps ahead of time — extract, then analyze, then summarize. The sequence doesn't depend on LLM judgment at runtime.
- **You need validation between steps.** Each node's output can be checked before feeding the next node. This prevents error cascades.
- **You need structured I/O contracts.** When processing data through a pipeline where each stage expects a specific format.
- **You need parallelism.** Independent steps should execute simultaneously. Workflows express this through dependency declarations.
- **You need auditability.** Each node's input and output is recorded separately.
- **You need per-step retry.** If step 3 of 5 fails, retry just that step. With a single agent, failure often means starting over.

Don't use workflows when:
- The process is conversational and the next step depends on LLM reasoning
- There's only one step (just use an agent)
- The steps are so tightly coupled that separating them adds complexity without benefit

Workflows often contain agents as nodes — the workflow controls "what order" and the agents handle "how" within each step.

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
    agent_name: Classifier
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
    agent_name: Splitter
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
    agent_name: Refiner
    input:
      previous_result: "{{refine_step.output.result}}"
      iteration: "{{_loop_iteration}}"
```

**Warning**: Always set `max_iterations` to prevent infinite loops. The condition should converge — if quality can't improve, the loop must still terminate.

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

---

## Error Handling

### Retry Strategy

Configure retries for transient failures (API timeouts, rate limits):

```yaml
retry_strategy:
  limit: 3                    # 3 retries = 4 total attempts
  retry_policy: "OnError"     # retry on any error including timeouts
  backoff:
    duration: "1s"            # start at 1 second
    factor: 2.0               # exponential: 1s, 2s, 4s
    max_duration: "30s"       # cap at 30 seconds
```

**Retry policies**:
- `OnFailure` — retry when the agent reports failure (not timeouts)
- `OnError` — retry on any error including timeouts (most common)
- `Always` — retry regardless of outcome (rarely useful)

Set retries per-node for different reliability needs:
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
3. No timeout (unlimited)

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
- Typos in node IDs or field names (returns nil silently)

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

A loop node without `max_iterations` or with a condition that might never become false.

**Fix**: Always set `max_iterations`. Design conditions that converge.

### Complex Conditions

Switch conditions that are hard to read or that reference multiple nodes:
```yaml
condition: "{{a.output.x}} > 10 and '{{b.output.y}}' == 'z' or {{c.output.w}} != null"
```

**Fix**: Use a classifier agent node to produce a simple category, then switch on that:
```yaml
# Classifier agent outputs: {category: "premium"}
condition: "'{{classify.output.category}}' == 'premium'"
```

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

**Fix**: Select specific fields in template expressions. This keeps node contexts focused and reduces token usage.
