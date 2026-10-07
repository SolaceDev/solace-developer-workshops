# Kind: `workflow`

Manifest path: `resources.workflows`

A workflow is a deterministic DAG of agent calls, switches, maps, and
loops. The `appConfig` field carries the workflow definition itself;
its shape is documented by the workflow-engine reference rather than
this CLI surface. After apply, a workflow runs through the deploy
phase automatically unless `--no-deploy` is set.

## The workflow body lives under `spec.appConfig`

`name` and `description` are the only top-level (header) fields; the
workflow definition — `nodes`, `output_mapping`, timeouts, etc. — is the
body. Write the body under `spec.appConfig`: that is the canonical shape
and the one this reference uses throughout. A flat `spec.{nodes,
output_mapping, …}` is also accepted — it is the legacy shape and what
`sam config pull` emits — and both produce an identical wire payload, so
never rewrap a pulled file just to match this page.

The two shapes are mutually exclusive. When `spec.appConfig` is present,
every other key under `spec:` is **silently dropped** — no plan diff, no
error. Put the whole body inside the wrapper, or none of it.

What does fail is `appConfig:` (or `nodes:`) at the document top level
with no `spec:` parent: the resolver reads an empty spec, emits an empty
body, and deploy fails late with a confusing error such as
`output_mapping is required` even though it is present in your file.

```yaml
kind: workflow
name: MyWorkflow                 # header: display label only (see addressing below)
description: One-line summary of what this workflow does.
spec:                            # REQUIRED — the body lives under here
  appConfig:                     # REQUIRED — the workflow definition
    nodes:
      - id: extract
        type: agent
        agent_name: Extractor    # must match a deployed agent's name:
        input:
          data: "{{workflow.input.data}}"
      - id: summarize
        type: agent
        agent_name: Summarizer
        depends_on: [extract]
        input:
          extracted: "{{extract.output}}"
    output_mapping:              # REQUIRED
      result: "{{summarize.output}}"
```

## What `sam config plan` checks inside the workflow body

Plan diffs the resource envelope and does check references inside the
body — each node's `agent_name`/`workflow_name`, toolset names, and
connector names (it also rejects the retired `connector_refs`). It also
checks that the workflow declares a source for its tool nodes, and runs
the real workflow parser over each tool node, grading the node's
`input:` keys and its `{{node.output.<field>}}` references against the
built-in tool's own schemas:

- A `type: tool` node naming a `tool_name` in a workflow that declares
  none of `tools:`, `toolsets:` or `connectors:` and has no node binding
  a `connector:` **fails the plan** when the workflow is being created or
  changed — that node can never run, because the engine builds its tool
  set only from those sources. A node-level `connector:` anywhere in the
  workflow counts as a source, because deploy adds every tool of that
  connector for all tool nodes — so once any node binds a connector the
  check cannot catch any other tool node whose `tool_name` is undeclared (a
  built-in missing from `tools:`, or a mis-named connector tool; see
  `connector:` below), which then fails at run time as an unknown tool. The error names each node and the
  declaration to add: `toolsets: [<Toolset>]` for an uploaded toolset's
  `<Toolset>__<tool>`, a `tools:` builtin entry with the full name for a
  skill tool or a built-in, a `tools:` entry with `tool_type: mcp` for an
  MCP tool, and `connector: <name>` on the node for a platform
  connector's tool (see the skill-tool limit under `tools` below). An
  unchanged workflow gets a warning instead. It is
  reported together with any argument failures below. It only catches a workflow that declares nothing at all: a
  `tool_name` missing from a non-empty declaration still fails at run
  time as an unknown tool. Saves through the REST workflow API are
  accepted as drafts; plan, Build & Activate and deploy are where a
  workflow with no tool source is refused.
- An `input:` key the built-in does not declare **fails the plan** when
  the workflow is being created or changed, and a failed plan aborts the
  whole manifest before anything is applied. That key is the argument the
  tool would otherwise drop in silence. A workflow this plan is *not*
  changing is reported as a warning instead — the mistake is already
  deployed and already fails at dispatch, so aborting would only block
  whatever you came to apply.
- A `{{node.output.<field>}}` reference the built-in cannot produce is
  reported as a **warning**, never a failure — failing here would block a
  workflow that has been deployed and running since before the check
  existed.

The two checks treat an unproven schema differently, so read a green
plan carefully. A node carrying `connector:` and a built-in the
plan-time registry does not carry are **skipped by both** — silence, not
approval. But a name an `mcp`/`openapi` entry or a `connectors:` block
could supply still gets an argument **warning**, downgraded from a
failure only because the built-in's schema may not be the one that runs;
the *reference* check goes quiet on those instead.

A `toolsets:` list does **not** soften either check. Whatever the
platform expands it into cannot supply a bare built-in name carrying
different parameters — a built-in group expands only into built-ins, a
custom package is namespaced `<package>__<tool>`, and a hand-written
`tools:` entry with an uploaded toolset's expanded `<package>__<tool>`
name is dropped in favour of the expanded entry — and fails deploy as a
collision when declared beside a nested `workflow:` block — so never
hand-write one.

The schemas being graded against are the ones compiled into your `sam`
binary, so a CLI older than the platform can fail a parameter the
platform has since added — the failure message says so.

What plan still does **not** do is reject a structurally invalid body. A
body that fails to parse (missing `output_mapping`, a mis-wrapped body,
a bad node shape) is reported as a warning naming the workflow and the
parse error — the tool-node checks are skipped for it — and the
structural failure itself surfaces at `apply`→deploy where the full
body is parsed. Treat a green plan as "the references resolve," not "the
workflow is valid." Validate structure by applying to a dev target.

Both tool-node checks also run past `apply`, so a green deploy is not the
end of it: the undeclared `input:` key fails that node when it
dispatches, and the unproducible reference is logged as a warning when
the workflow starts, then fails its node at run time when the reference
resolves. Read the log after applying a workflow with tool nodes.

## Addressing a deployed workflow

The workflow's broker card name is generated: `workflow_<id>` — the
workflow's UUID with `-` replaced by `_`, the same scheme
platform-deployed **agents** use (`agent_<id>`). Your config `name:` is
published as that card's *display name*, and entrypoints and agent nodes
resolve display names for you, so submitting a task to the friendly
`name:` does work.

Three places where the generated name still matters:

- **RBAC.** A deployed workflow's invoke scope is
  `workflow:<dashed-uuid>:invoke` — the UUID form, never the friendly
  name. A role granting `workflow:<name>:invoke` will not authorize it.
- **Anything addressing the broker topic directly**, which uses the card
  name verbatim.
- **An agent-node target that resolves to nothing does not error.** The
  task publishes to a topic with no subscriber and times out silently
  once the node's timeout expires — five minutes by default — so a typo
  looks like a long hang rather than a "not found." A **workflow**-node
  target that resolves to no deployed workflow instead fails fast with an
  explicit dispatch error in most cases. The silent, timeout-prone
  publish is reserved for four routable exceptions: an instance-name-form
  target, a self-reference, a YAML-authored parent, or a **cold card
  cache** — no agent cards discovered yet on this instance, which is the
  one you are most likely to hit in practice, shortly after a restart and
  before the first card broadcast lands.

Duplicate display names resolve to the lowest-sorted card name with a
Warn in the log. Read the generated name from the `name` field of the
card the workflow publishes (`GET /api/v1/agentCards`) — the Agent Mesh
UI agent list shows the friendly display name, not this one.

## Authoring keys vs. the field tables below

A few node fields are authored under a short YAML key that differs from
the field's internal name. Write these keys:

- **map** — `node:` (the per-item template node) and exactly one of
  `items:` / `with_items:` / `with_param:` (the list to iterate); *not*
  `template_node`/`items_expression`.
- **switch** — `cases: [{condition, node}]` and `default:`; `when` is an
  alias for `condition` and `then` for `node`; *not* `default_case`.
- **loop** — `node:` (body), `condition:` (required), `max_iterations:`,
  `delay:`; *not* `body_node`.
- **every node type** — `retry_strategy:` for the retry policy. The
  parser only accepts `retry_strategy` (or `retryStrategy`); a node
  written with `retry:` is accepted and **silently gets no retry policy**. Node `timeout:` is a
  duration string (`"30s"`, `"5m"`).

**Read `design/workflow-design.md` before hand-authoring a workflow.** It
carries the worked YAML for every node type with the correct keys, the
retry/timeout rules (including the fact that retry never reaches a tool
node), and how to reshape data across a tool-to-tool seam. This page is
the schema and the key names; that one is how to assemble them.

`type: tool` nodes call tools directly (no agent, no LLM). Three things
can feed them, and they do not all sit at the same level:

- **`toolsets`** — toolset or built-in-group names, the same names agents
  accept in `spec.toolsets:`. Expanded into tools at deploy time; a
  custom toolset's tools are addressed as `<toolset>__<tool>` in the
  node's `tool_name:`, while a built-in group's tools keep their bare
  names. Placement-insensitive.
- **`connector:` on the tool node** — binds one platform connector to
  that node (plus optional `tool:` to pick one of its tools by base
  name), resolved at deploy time. Give every node that calls a connector
  tool its own `connector:`. Deploy adds every tool of that connector to
  the workflow, but naming one by `tool_name` on another node works only
  with the exact emitted name — an API connector's operation name (e.g.
  `get_pet`) or a custom `tool_name` the connector emits as-is. Other
  connector tools carry a suffix from the connector id (e.g.
  `sql_query_1a2b3c4d`), so a guessed name passes the plan and fails at
  run time as an unknown tool. This is the only way to reference a
  connector from the connector store.
  Placement-insensitive. A workflow-level `connectors:` list is also read
  (same two levels as `tools:` below), but it declares a connector inline
  rather than referencing one from the connector store.
- **`tools`** — a raw tool list in the same shape agents accept (an
  inline MCP server, for instance). The runtime reads it from **either**
  level: nested inside `workflow:` alongside `nodes:`, or as a sibling of
  `workflow:` in the deployed `app_config`. A skill tool goes here as
  `{tool_type: builtin, tool_name: <skill>__<tool>}`, but it gets none of
  the skill's stored platform config or credentials — workflows have no
  skill hydration. Put non-secret values in an inline `tool_config:` on
  the entry; when the skill needs credentials, use an agent node whose
  agent has the skill attached.

A tool node's **arguments** go in its `input:` map, and what a tool
returns is reachable only as `{{<node>.output.<key>}}` from the tool's
structured data. A file the tool wrote is reachable too: the framework adds
`{{<node>.output.created_artifact}}`, the name this call saved pinned to the
version it wrote (`report.json:3`), plus `created_artifact_name` (the bare
name) and `created_artifact_version` (the number), so a downstream node can
read it without the producing tool having reported it. Pass
`created_artifact` unchanged to a step that reads the file — built-in tools
that read an artifact accept `name:version` — and use
`created_artifact_name` where a step needs the filename itself, such as an
output filename or `delete_artifact`. The pin is what keeps concurrent `map`
iterations, which share one artifact session, from reading a sibling's file
of the same name. The keys are present only when the call saved **exactly
one** — a call that saved several has none, because the template language
cannot index a list — and a tool publishing its own key of any of these
names keeps it. The *contents* of a file are never in this namespace; pass the name to a
tool that reads it. The exception is `query_data_with_sql` and
`transform_data_with_jmespath`: their rows come back inline as
`result_preview`, limited by default to 50 rows and 2048 bytes (a single
oversized row is still returned whole), with `result_truncated` set when the
preview was cut. When a map's `items:` reads
`{{<node>.output.result_preview}}`, raise `max_result_preview_rows` /
`max_result_preview_bytes` in that tool's `tools:` entry `tool_config`, or the
map silently iterates over only the rows that fit. When the upstream tool's output
shape does not match the downstream tool's parameters, no `{{…}}`
expression can adapt it: see "Reshape Data Between Tool Nodes" in
`design/workflow-design.md`, which covers the `extract_fields` route and
the way a shape mismatch fails as a *successful* node.

Both placements work, so the nesting no longer has to be reasoned about:

```yaml
spec:
  appConfig:
    tools:                         # sibling of workflow: (also valid nested inside it)
      - tool_type: mcp
        tool_name: search
        connection_params: { ... }
    workflow:
      nodes:
        - id: call
          type: tool
          tool_name: search
          input:
            q: "{{workflow.input.q}}"
      output_mapping:
        r: "{{call.output}}"
```

Deploy-time toolset and connector hydration writes its generated entries
at the sibling level, so a workflow can end up with both lists populated.
When the same tool name appears at both, the sibling (`app_config`) entry
wins and the nested copy is dropped — the startup log names it. That
de-duplication matches on name and applies to `tool_type: builtin`
entries only; connector-backed entries (MCP, OpenAPI) declared at both
levels are both kept, and collide later at registration instead. One rule
still bites in the flat shape: `spec.tools:` beside `spec.workflow:`
works, `spec.tools:` beside `spec.appConfig:` is silently dropped.

The example above keeps a `workflow:` wrapper because it is showing the
sibling placement. That wrapper is optional: the body may also sit
directly under `appConfig:`, in which case `tools:` goes alongside
`nodes:` and `output_mapping:` there — matching the `appConfig:` field
table below, which lists all three as siblings. Both forms deploy. What
must not happen is splitting one body across the two, since anything
outside the `appConfig:` wrapper is dropped without a diff (see the top
of this page).

### `hil:` on a workflow's `tools:` entry

A `tools:` entry may carry the same `hil:` block an agent's entry takes. On a
workflow it is parsed and validated, so a malformed block fails config load,
but it is not enforced: a `type: tool` node dispatches the tool without asking
anyone. The workflow names the affected tools at startup, warns once per tool
per run when one dispatches unprompted, and records each such dispatch in the
audit log with `approvalReason: enforcement_disabled`. If a tool needs human
approval, call it from an agent node, where the gate is honoured.

See the toolset kind reference for a worked workflow example.


## Wrapper schema

Authoring fields for the "workflow" resource.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `name` | `string` | yes | len 3–255 | (no description) |
| `description` | `string` | yes | len 10–2000 | (no description) |
| `appConfig` | `object` | yes |  | (no description) |

## `appConfig:` shape

The `appConfig:` payload (the workflow definition itself) follows this shape:

Top-level workflow definition authored under a workflow resource's spec.appConfig.

| Field | Type | Description |
|---|---|---|
| `display_name` | `string` | card label; a platform deploy always overwrites it with the workflow's resource name, so omit it from spec.appConfig |
| `description` | `string` | (no description) |
| `version` | `string` | (no description) |
| `input_schema` | `object` | (no description) |
| `output_schema` | `object` | (no description) |
| `nodes` | `list<object>` | (no description) |
| `output_mapping` | `object` | (no description) |
| `skills` | `list<object>` | (no description) |
| `tools` | `list<object>` | Tools is the raw `tools:` list (one entry per declarative tool config), in the same shape agents accept. Parsed from the workflow body, then combined by the loader with any app_config-level entries, which take precedence on a name collision. Workflow tool nodes can invoke any tool registered here. Connector-produced tools share the same namespace. |
| `connectors` | `list<object>` | Connectors is the raw `connectors:` list (one entry per connector instance), in the same shape agents accept. Read from the same two levels as Tools. Each connector's tool is registered into the workflow's shared tool namespace alongside `tools:` entries. |
| `toolsets` | `list<string>` | Toolsets is the symbolic `toolsets:` list (toolset or built-in-group names, the same names agents accept in spec.toolsets), declared at the app_config level alongside `tools:`. It is a platform authoring surface: the platform expands each name into concrete `tools:` entries at deploy time and strips the key. The engine never resolves it — a statically-loaded config that still carries it gets a warning and the list is otherwise ignored (declare `tools:` directly instead). |
| `workflow_timeout` | `duration` | Timeouts. |
| `default_node_timeout` | `duration` | (no description) |
| `card_publish_interval_seconds` | `integer` | Agent card publishing. |
| `fail_fast` | `boolean` | Argo-aligned fields. |
| `max_call_depth` | `integer` | (no description) |
| `retry_strategy` | `object` | (no description) |
| `on_exit` | `object` | (no description) |

## Node types

Each node has a `type:` selecting one of the shapes below. Common fields (`id`, `type`, `depends_on`, plus the shared optional fields) are listed in every section so each node-type entry is self-contained.

## node type: agent

Agent node fields.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` |  | (no description) |
| `type` | `string` |  | selects one of the node types below |
| `depends_on` | `list<string>` |  | node IDs this node depends on |
| `when` | `string` |  | (no description) |
| `timeout` | `duration` |  | (no description) |
| `input` | `object` |  | (no description) |
| `retry_strategy` | `object` |  | (no description) |
| `instruction` | `string` |  | (no description) |
| `agent_name` | `string` |  | (no description) |
| `input_schema_override` | `object` |  | (no description) |
| `output_schema_override` | `object` |  | (no description) |

## node type: loop

Loop node fields.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` |  | (no description) |
| `type` | `string` |  | selects one of the node types below |
| `depends_on` | `list<string>` |  | node IDs this node depends on |
| `when` | `string` |  | (no description) |
| `timeout` | `duration` |  | (no description) |
| `input` | `object` |  | (no description) |
| `retry_strategy` | `object` |  | (no description) |
| `node` | `string` |  | target node ID for loop body |
| `condition` | `string` |  | (no description) |
| `max_iterations` | `integer` |  | (no description) |
| `delay` | `duration` |  | (no description) |

## node type: map

Map node fields.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` |  | (no description) |
| `type` | `string` |  | selects one of the node types below |
| `depends_on` | `list<string>` |  | node IDs this node depends on |
| `when` | `string` |  | (no description) |
| `timeout` | `duration` |  | (no description) |
| `input` | `object` |  | (no description) |
| `retry_strategy` | `object` |  | (no description) |
| `items` | `object` |  | the items to iterate: an expression string, a literal list, or an operator object that resolves to a list |
| `node` | `string` |  | target node ID for map body |
| `max_items` | `integer` |  | (no description) |
| `concurrency_limit` | `integer` |  | (no description) |

## node type: switch

Switch node fields.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` |  | (no description) |
| `type` | `string` |  | selects one of the node types below |
| `depends_on` | `list<string>` |  | node IDs this node depends on |
| `when` | `string` |  | (no description) |
| `timeout` | `duration` |  | (no description) |
| `input` | `object` |  | (no description) |
| `retry_strategy` | `object` |  | (no description) |
| `cases` | `list<object>` |  | (no description) |
| `default` | `string` |  | (no description) |

## node type: tool

Tool node fields. ToolName names a tool registered in the shared tool namespace — either declared in `tools:` or produced by a connector in `connectors:`. Tools and connectors share a single namespace.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` |  | (no description) |
| `type` | `string` |  | selects one of the node types below |
| `depends_on` | `list<string>` |  | node IDs this node depends on |
| `when` | `string` |  | (no description) |
| `timeout` | `duration` |  | (no description) |
| `input` | `object` |  | (no description) |
| `retry_strategy` | `object` |  | (no description) |
| `tool_name` | `string` |  | (no description) |
| `connector` | `string` |  | names a platform connector; the platform resolves it to a concrete tool_name at deploy time |
| `tool` | `string` |  | selects one of a multi-tool connector's tools by un-suffixed base name (e.g. slack_send_message); optional when the connector produces exactly one |

## node type: workflow

Workflow invoke fields.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` |  | (no description) |
| `type` | `string` |  | selects one of the node types below |
| `depends_on` | `list<string>` |  | node IDs this node depends on |
| `when` | `string` |  | (no description) |
| `timeout` | `duration` |  | (no description) |
| `input` | `object` |  | (no description) |
| `retry_strategy` | `object` |  | (no description) |
| `instruction` | `string` |  | (no description) |
| `workflow_name` | `string` |  | (no description) |

