# Kind: `workflow`

Manifest path: `resources.workflows`

A workflow is a deterministic DAG of agent calls, switches, maps, and
loops. The `appConfig` field carries the workflow definition itself;
its shape is documented by the workflow-engine reference rather than
this CLI surface. After apply, a workflow runs through the deploy
phase (POST /workflowDeployments) automatically unless `--no-deploy`
is set.


## Wrapper schema

CreateWorkflowRequest is the request body for POST /workflows.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `name` | `string` | yes | len 3–255 | (no description) |
| `description` | `string` | yes | len 10–2000 | (no description) |
| `appConfig` | `map[string]any` | yes |  | (no description) |

## `appConfig:` shape

The `appConfig:` payload (the workflow definition itself) follows this shape:

WorkflowConfig is the parsed top-level workflow definition.

| Field | Type | Description |
|---|---|---|
| `display_name` | `string` | user-facing name from the workflow YAML (optional) |
| `description` | `string` | (no description) |
| `version` | `string` | (no description) |
| `input_schema` | `map[string]any` | (no description) |
| `output_schema` | `map[string]any` | (no description) |
| `nodes` | `[]*NodeConfig` | (no description) |
| `output_mapping` | `map[string]any` | (no description) |
| `skills` | `[]map[string]any` | (no description) |
| `tools` | `[]any` | Tools is the raw `tools:` list (one entry per declarative tool config), in the same shape agents accept. Populated by the loader from the app_config level. Workflow tool nodes can invoke any tool registered here. Connector-produced tools share the same namespace. |
| `connectors` | `[]any` | Connectors is the raw `connectors:` list (one entry per connector instance), in the same shape agents accept. Each entry is built by connector.DefaultRegistry().Build at workflow Init; the resulting tool is registered into the same tool.Set as `tools:` entries. |
| `workflow_timeout` | `time.Duration` | Timeouts. |
| `default_node_timeout` | `time.Duration` | (no description) |
| `card_publish_interval_seconds` | `int` | Agent card publishing. |
| `fail_fast` | `bool` | Argo-aligned fields. |
| `max_call_depth` | `int` | (no description) |
| `retry_strategy` | `*RetryStrategy` | (no description) |
| `on_exit` | `*ExitHandler` | (no description) |
| `hil_database_url` | `string` | HILDatabaseURL is the database the durable workflow_paused store opens for M4 HIL pause/resume. NOT parsed from the workflow YAML — bootstrap sets it from the app's resolved session_service.database_url (the shared deployment DB), so no new operator-facing config is introduced. Empty (or the feature flag off) disables pause: a pending tool result fails the node as before. |

## Node types

Each node has a `type:` selecting one of the shapes below. Common fields (`id`, `type`, `depends_on`, plus the agent/workflow shared optional fields) are listed in every section so each node-type entry is self-contained.

## node type: agent

Agent node fields.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` |  | (no description) |
| `type` | `string` |  | "agent", "switch", "map", "loop", "workflow", "tool" |
| `depends_on` | `[]string` |  | node IDs this node depends on |
| `when` | `string` |  | (no description) |
| `timeout` | `time.Duration` |  | (no description) |
| `retry` | `*RetryStrategy` |  | (no description) |
| `input` | `map[string]any` |  | (no description) |
| `instruction` | `string` |  | (no description) |
| `agent_name` | `string` |  | (no description) |
| `input_schema_override` | `map[string]any` |  | (no description) |
| `output_schema_override` | `map[string]any` |  | (no description) |

## node type: loop

Loop node fields.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` |  | (no description) |
| `type` | `string` |  | "agent", "switch", "map", "loop", "workflow", "tool" |
| `depends_on` | `[]string` |  | node IDs this node depends on |
| `body_node` | `string` |  | (no description) |
| `condition` | `string` |  | (no description) |
| `max_iterations` | `int` |  | (no description) |
| `delay` | `time.Duration` |  | (no description) |

## node type: map

Map node fields.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` |  | (no description) |
| `type` | `string` |  | "agent", "switch", "map", "loop", "workflow", "tool" |
| `depends_on` | `[]string` |  | node IDs this node depends on |
| `items_expression` | `any` |  | (no description) |
| `template_node` | `string` |  | target node ID for map body |
| `max_items` | `int` |  | (no description) |
| `concurrency_limit` | `int` |  | (no description) |

## node type: switch

Switch node fields.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` |  | (no description) |
| `type` | `string` |  | "agent", "switch", "map", "loop", "workflow", "tool" |
| `depends_on` | `[]string` |  | node IDs this node depends on |
| `cases` | `[]SwitchCase` |  | (no description) |
| `default_case` | `string` |  | (no description) |

## node type: tool

Tool node fields. ToolName names a tool registered in the workflow's tool.Set — either declared in `tools:` or produced by a connector in `connectors:`. Tools and connectors share a single namespace.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` |  | (no description) |
| `type` | `string` |  | "agent", "switch", "map", "loop", "workflow", "tool" |
| `depends_on` | `[]string` |  | node IDs this node depends on |
| `tool_name` | `string` |  | (no description) |

## node type: workflow

Workflow invoke fields.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` |  | (no description) |
| `type` | `string` |  | "agent", "switch", "map", "loop", "workflow", "tool" |
| `depends_on` | `[]string` |  | node IDs this node depends on |
| `when` | `string` |  | (no description) |
| `timeout` | `time.Duration` |  | (no description) |
| `retry` | `*RetryStrategy` |  | (no description) |
| `input` | `map[string]any` |  | (no description) |
| `instruction` | `string` |  | (no description) |
| `workflow_name` | `string` |  | (no description) |
| `tool_name` | `string` |  | (no description) |

