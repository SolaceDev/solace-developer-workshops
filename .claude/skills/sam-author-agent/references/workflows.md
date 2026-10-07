# Workflows (multi-step DAGs)

A workflow is a DAG that orchestrates agents and tools deterministically — branching, iteration, parallel fan-out — where a single agent's LLM-driven looping isn't enough. "Listen → filter → store" and "research → summarize → post to Slack" are workflows.

## Node types

Engine supports six: **`agent`** (invoke a named agent), **`workflow`** (nested workflow), **`tool`** (direct tool call, no LLM), **`switch`** (conditional branching via cases + default), **`loop`** (iterate body until condition / max_iterations), **`map`** (apply a template node over items, parallel fan-out). The Quick Build canvas *renders* all of these read-only; reach for the `tool` node (declarative config or an explicit chat instruction) when a step needs a deterministic tool call without an agent.

## Authoring paths

1. **Builder UI — AI-assisted, not a drag-and-drop editor.** The DAG *canvas* is a **read-only visualization** (nodes render but you cannot wire them or drag a node in from a palette — there is no palette). You author the structure through the **Quick Build chat**: describe the workflow → plan card → **Build & Activate**, or open an existing workflow and click **Edit with AI** (seeds it into the chat). The manual Workflow edit page only edits name / description / version. So the LLM writes the nodes, wiring, per-node detail (instruction override, per-node input/output schema overrides, switch cases, loop condition/max_iterations/delay, map items) and the workflow-level settings (overall + per-node-default timeouts, retry strategy, exit handlers, fail-fast, max call depth) — the detail panels *show* them read-only. When a user needs to hand-write or precisely control any of this, use declarative config.
2. **Declarative config**: workflow kind via `sam-declarative-config` (nodes, `output_mapping`, optional workflow-level `input_schema`/`output_schema`, `retry_strategy`, `on_exit`). Never write node syntax from memory. Two traps that reference covers: the body nests under `spec.appConfig` (not flat like an agent's `spec:`), and `sam config plan` checks references and tool-node argument names in the body but does **not** validate its structure — an undeclared `input:` key on a built-in fails the plan, a bad node shape does not, so still validate structure by applying to a dev target.

## Composition (the seams)

- **Trigger**: a person chatting hits the workflow like an agent; an *event* trigger (mesh topic) is an eventmesh **entrypoint** → `sam-entrypoints`. A workflow can also be started by a **scheduled task** (one-time, cron or interval). A schedule can carry structured data alongside its text, so a scheduled workflow receives typed inputs rather than a single prompt — with two limits. First, **editing a schedule's message replaces it wholesale**, discarding that structured data. Second, a stored message is fixed apart from a **closed set of four fire-time substitutions** — `{{schedule.name}}`, `{{schedule.run_date}}`, `{{schedule.run_count}}` and `{{execution.id}}` — which are applied to the text *and* to every string inside the structured data. Those four cover "which run is this"; anything else that must differ per fire has to be derived inside the workflow, from `{{workflow.run_id}}` (see [data-flow.md](data-flow.md)).
- **Actions**: reaching databases/APIs from a node = connectors/tools on the node's agent, or bound to the workflow itself for `tool` nodes. A `tool` node names its target one of two ways: `tool_name` for a built-in, MCP or STR tool (declared in the workflow's `tools:` list) or a toolset tool (`<toolset>__<tool>`, with the toolset declared as `toolsets: [<toolset>]` — the platform expands it at deploy with the toolset's config, credentials and approval settings; don't hand-write a `tools:` entry for it); or `connector: <name>` (+ optional `tool: <base_name>` to pick one operation of a multi-tool connector by its un-suffixed base name, e.g. `slack_send_message`) to reference a platform **connector** by name — the same ref model as an agent's `spec.connectors`. The `connector:` form resolves to a concrete `tool_name` at *deploy time*, so no connector config or secrets are inlined in the workflow (it requires deploying through the platform; a connector-only node run from raw YAML errors with a resolution hint). The **selector** is checked earlier than that: saving a workflow whose `connector:` node names a connector that has no such tool — or that needs a `tool:` to disambiguate a multi-tool connector and was not given one — is refused at save with a 422, on every write path (the platform API, `sam config apply`, and the Builder). Resolution still happens at deploy; only the "can this ever resolve" question moved forward, so a node that deploys today cannot start failing at save. The retired `connector_refs` app-config key is rejected. → `sam-tools-and-skills` to create connectors/toolsets.
- **Typed steps**: workflows pass structured data between nodes; per-node schema overrides + the agents' structured output (see [structured-output.md](structured-output.md)) keep steps machine-readable.
- **Advertised capabilities**: a workflow declares its A2A card skills as a top-level `skills:` array beside `nodes:` — **not** under `agent_card:`, which is where an agent puts them. Each entry needs `id`, `name` and `description`. This is what peers and entrypoints match on when routing, so a workflow that advertises nothing is reachable only by name.

## `tool` node authoring (LLM-free steps)

A `tool` node runs one tool with no agent and no LLM. Three things trip up authors of tool-only (LLM-free) workflows — none are exercised by the agent-node examples, so don't generalize from those:

- **Where the tools are declared.** Declare every tool node's source: a toolset's tools by listing the toolset under `toolsets:`; built-in and MCP tools as entries in a `tools:` list; a platform connector's tool by `connector: <name>` on the node itself. A workflow-level `connectors:` list only declares an inline engine connector, never one from the connector store: an entry that restates a node's `connector:` (same name, and not a configured inline `email` connector) is refused by the Builder's validation, Build & Activate, `sam config plan` and save, because the engine cannot build it and the workflow would fail at startup — the node's `connector:` alone is enough. A workflow whose tool nodes have no tool source at all (no `tools:`, `toolsets:` or `connectors:`, and no node-level `connector:`) is refused before it runs — by the Builder's validation, Build & Activate, `sam config plan` and deploy. A name missing from a non-empty source is not caught there and still fails at run time, with `` tool node "X" references unknown tool "Y" ``. The `tools:` and `connectors:` lists can sit in either placement: **inside the `workflow:` body, alongside `nodes:`** (what the workflow JSON schema declares), or at the **`appConfig` level as a *sibling* of `workflow:`** (where deploy-time connector/toolset hydration writes). When the same tool name appears at both levels the `appConfig` entry wins and the body's copy is dropped, with a warning naming it at startup — but only for `tool_type: builtin` entries, which are the only ones matched by name. Two connector-backed entries (MCP, OpenAPI) declared at both levels are **not** deduplicated: both are kept, and the collision surfaces later as a registration error rather than a startup warning. If a node still fails at run time with `` tool node "X" references tool "Y" but workflow declares no `tools:` or `connectors:` `` (node and tool names are double-quoted in the actual message), the list is missing or mistyped — a `tools:` value that is not a YAML list parses as no tools at all. (Exact YAML shape: `sam-declarative-config`.)
- **How args are wired — the `input:` map.** A `tool` node passes arguments through an `input:` map (arg-name → value). Three value kinds mix freely in one block: **literals** (`["car"]`); **template refs** resolved by the workflow engine (`{{workflow.input.x}}`, `{{fetch.output...}}`); and **late embeds** resolved by the *receiving* tool at execute time (`«artifact_content:FILE >>> format:datauri»`). The engine resolves `{{...}}` first, then the tool resolves `«...»` inside its own execution — so both can appear in the same `input:`. ⚠️ That depends on the tool resolving embeds itself — nothing on the calling side does it. A target that cannot, such as a connector-backed REST call, receives the literal embed text instead of the file. See `sam-connectors`.
- **Binding a connector to a tool node — MCP can't, OpenAPI can (conditionally).** `connector: <name>` only resolves when the connector's tool names are known at deploy time. An **OpenAPI/`api` connector** qualifies when it sets an `allow_list` or vendors its spec via `specification_file` (a URL-only spec is rejected). An **MCP connector cannot back a `tool` node** — its tools are enumerated at run time, so deploy fails with `connector "<name>" (type mcp) emits no directly-addressable tool names…`. For an MCP tool in a workflow, declare the server **inline** in the workflow's `tools:` list (`tool_type: mcp` + `connection_params` + `tool_name`) and bind the node by that `tool_name`. A connector-level `manifest:` does **not** make MCP tools deploy-addressable.

- **Approval gates do not apply to workflow tool nodes.** A `tools:` entry's `hil:` block (`require_approval`, `require_approval_when`) is parsed and validated on a workflow, so a malformed block still fails config load, but a `type: tool` node dispatches the tool without asking anyone. The workflow names the affected tools at startup, warns once per tool per run when one dispatches unprompted, and records each such dispatch in the audit log with `approvalReason: enforcement_disabled`. If a tool needs human approval, call it from an agent node, where the gate is honoured.

- **The shape seam — whether an LLM-free chain is even possible.** Two tool nodes chain only if the upstream tool's output shape is already what the downstream tool's parameters want, because **the template language cannot reshape a collection**: `coalesce` and `concat` take whole values, and there is no projection, field rename or unnesting. Worse, a mismatch *inside* a collection does not error — dispatch checks only top-level parameter names and types, so a typed (Go) tool unmarshals the absent inner fields to zero values and reports **success** having done nothing useful. Check the seam before writing the nodes. When it does not line up, the LLM-free fix for an MCP tool is `extract_fields` (JMESPath, which *does* project over collections) in the tool's `tool_config`, read downstream as `{{<node>.output.extracted_fields.<key>}}`; it has its own threshold and size traps. Full mechanics, worked example and diagnostics: `sam-declarative-config` → `references/design/workflow-design.md`, "Reshape Data Between Tool Nodes". Reach for an agent node in the seam only when the reshape needs judgment rather than a projection.

Four companions to this section: [data-flow.md](data-flow.md) for what `{{…}}` references resolve to and
how they fail silently; [step-semantics.md](step-semantics.md) for retry, schema validation and what
happens downstream of a failed node; [artifact-naming.md](artifact-naming.md) for naming the files a step
produces; and — before hand-authoring any workflow — `references/design/workflow-design.md` in the
`sam-declarative-config` skill, which carries the worked YAML for every node type.

## Worked decomposition ("listen → filter → store")

eventmesh entrypoint (trigger, other skill) → workflow: `switch` node on the field (or a `tool`/`agent` node if filtering needs logic) → `agent` or `tool` node writing via a sql connector. The workflow owns ordering/retries; the entrypoint and connector stay outside it.

## Rendering a document from a tool node

Producing a report does not need an agent. The built-in `instantiate_template` runs in an ordinary `tool`
node: declare it in the workflow's `tools:` list as a `builtin`, bind the node by that `tool_name`, and
pass its arguments through the node's `input:` map like any other tool. It takes the template either as a
packaged `.samt` artifact in the session (`source_artifact`) or as a skill-bundled asset (`skill_name` +
`asset`), plus `substitutions` for the template's declared `@@KEY@@` placeholders and `data_inputs` binding
its declared data artifacts. Inspect a template's contract with `read_template` first rather than guessing
those names. The tool is always registered, whether or not the runtime has a skills directory — without one it
fails at *call* time with `skill registry not configured (no skills_dir)`, so the symptom is a failing tool
call rather than a tool the model cannot see.

Three things to know.

**Guard every substitution that comes from a caller input with `coalesce`** — as a key on the value, not a
function inside the braces (see [data-flow.md](data-flow.md#helpers)). The template itself is strict about
its own placeholders: a required one left unfilled fails the render outright rather than shipping a
half-finished document. The risk is upstream of that, and a caller input the workflow never received is no
longer part of it: a substitution whose **whole** value is a `{{workflow.input.…}}` key the caller did not
supply is dropped, so the template sees an unfilled placeholder and fails loudly. What still *counts* as a
filled value is everything else — a reference that resolved to an empty string, a reference to a node that
never ran, and the literal `{{…}}` text left behind by an unresolved **embedded** reference — each
substituted verbatim and rendered as exactly that. `coalesce` with a literal fallback is what turns those
into a value you chose.

**The stored artifact is template source**: its markers resolve when the file is served to a reader, so
opening it straight from storage shows the template rather than the rendered document. Its *data*
references are version-pinned at instantiate time, so later writes to those artifacts never change a
document already produced — render again for newer data.

**Resolution is a property of the download path, not of the file.** It happens on the ordinary artifact
download, for text within the gateway's served-content limit, and it can be turned off deployment-wide.
Share links and scheduled-task artifact links **never** resolve — a recipient of one always sees raw
markers. So a document you verified by downloading yourself can reach someone else unrendered. Also treat
resolution as executing whatever the file contains: markers are substituted verbatim, against the file
owner's own artifacts, so a file whose bytes came from somewhere untrusted should not be one you hand to a
reader expecting a rendered document.
