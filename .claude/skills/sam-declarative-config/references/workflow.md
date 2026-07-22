# Kind: `workflow`

Manifest path: `resources.workflows`

A workflow is a deterministic DAG of agent calls, switches, maps, and
loops. The `appConfig` field carries the workflow definition itself;
its shape is documented by the workflow-engine reference rather than
this CLI surface. After apply, a workflow runs through the deploy
phase automatically unless `--no-deploy` is set.

`type: tool` nodes call tools directly (no agent, no LLM). The callable
tools come from three spec-level fields: `tools` (a raw tool list in the
same shape agents accept), `connectors` (each tool node's `connector:`
ref), and `toolsets` (toolset or built-in-group names, the same names
agents accept in `spec.toolsets:` — expanded into tools at deploy time;
a custom toolset's tools are addressed as `<toolset>__<tool>` in the
node's `tool_name:`). See the toolset kind reference for a worked
workflow example.


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
| `display_name` | `string` | user-facing name from the workflow YAML (optional) |
| `description` | `string` | (no description) |
| `version` | `string` | (no description) |
| `input_schema` | `object` | (no description) |
| `output_schema` | `object` | (no description) |
| `nodes` | `list<object>` | (no description) |
| `output_mapping` | `object` | (no description) |
| `skills` | `list<object>` | (no description) |
| `tools` | `list<object>` | Tools is the raw `tools:` list (one entry per declarative tool config), in the same shape agents accept. Populated by the loader from the app_config level. Workflow tool nodes can invoke any tool registered here. Connector-produced tools share the same namespace. |
| `connectors` | `list<object>` | Connectors is the raw `connectors:` list (one entry per connector instance), in the same shape agents accept. Each connector's tool is registered into the workflow's shared tool namespace alongside `tools:` entries. |
| `toolsets` | `list<string>` | Toolsets is the symbolic `toolsets:` list (toolset or built-in-group names, the same names agents accept in spec.toolsets), declared at the app_config level alongside `tools:`. It is a platform authoring surface: the platform expands each name into concrete `tools:` entries at deploy time and strips the key. The engine never resolves it — a statically-loaded config that still carries it gets a warning and the list is otherwise ignored (declare `tools:` directly instead). |
| `workflow_timeout` | `duration` | Timeouts. |
| `default_node_timeout` | `duration` | (no description) |
| `card_publish_interval_seconds` | `integer` | Agent card publishing. |
| `fail_fast` | `boolean` | Argo-aligned fields. |
| `max_call_depth` | `integer` | (no description) |
| `retry_strategy` | `object` | (no description) |
| `on_exit` | `object` | (no description) |

## Node types

Each node has a `type:` selecting one of the shapes below. Common fields (`id`, `type`, `depends_on`, plus the agent/workflow shared optional fields) are listed in every section so each node-type entry is self-contained.

## node type: agent

Agent node fields.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` |  | (no description) |
| `type` | `string` |  | "agent", "switch", "map", "loop", "workflow", "tool" |
| `depends_on` | `list<string>` |  | node IDs this node depends on |
| `when` | `string` |  | (no description) |
| `timeout` | `duration` |  | (no description) |
| `retry` | `object` |  | (no description) |
| `input` | `object` |  | (no description) |
| `instruction` | `string` |  | (no description) |
| `agent_name` | `string` |  | (no description) |
| `input_schema_override` | `object` |  | (no description) |
| `output_schema_override` | `object` |  | (no description) |

## node type: loop

Loop node fields.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` |  | (no description) |
| `type` | `string` |  | "agent", "switch", "map", "loop", "workflow", "tool" |
| `depends_on` | `list<string>` |  | node IDs this node depends on |
| `body_node` | `string` |  | (no description) |
| `condition` | `string` |  | (no description) |
| `max_iterations` | `integer` |  | (no description) |
| `delay` | `duration` |  | (no description) |

## node type: map

Map node fields.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` |  | (no description) |
| `type` | `string` |  | "agent", "switch", "map", "loop", "workflow", "tool" |
| `depends_on` | `list<string>` |  | node IDs this node depends on |
| `items_expression` | `object` |  | (no description) |
| `template_node` | `string` |  | target node ID for map body |
| `max_items` | `integer` |  | (no description) |
| `concurrency_limit` | `integer` |  | (no description) |

## node type: switch

Switch node fields.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` |  | (no description) |
| `type` | `string` |  | "agent", "switch", "map", "loop", "workflow", "tool" |
| `depends_on` | `list<string>` |  | node IDs this node depends on |
| `cases` | `list<object>` |  | (no description) |
| `default_case` | `string` |  | (no description) |

## node type: tool

Tool node fields. ToolName names a tool registered in the shared tool namespace — either declared in `tools:` or produced by a connector in `connectors:`. Tools and connectors share a single namespace.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` |  | (no description) |
| `type` | `string` |  | "agent", "switch", "map", "loop", "workflow", "tool" |
| `depends_on` | `list<string>` |  | node IDs this node depends on |
| `tool_name` | `string` |  | (no description) |
| `connector` | `string` |  | names a platform connector; the platform resolves it to a concrete tool_name at deploy time |
| `tool` | `string` |  | selects one of a multi-tool connector's tools by un-suffixed base name (e.g. send_email); optional when the connector produces exactly one |

## node type: workflow

Workflow invoke fields.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` |  | (no description) |
| `type` | `string` |  | "agent", "switch", "map", "loop", "workflow", "tool" |
| `depends_on` | `list<string>` |  | node IDs this node depends on |
| `when` | `string` |  | (no description) |
| `timeout` | `duration` |  | (no description) |
| `retry` | `object` |  | (no description) |
| `input` | `object` |  | (no description) |
| `instruction` | `string` |  | (no description) |
| `workflow_name` | `string` |  | (no description) |

