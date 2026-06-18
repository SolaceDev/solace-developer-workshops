# Workflows (multi-step DAGs)

A workflow is a DAG that orchestrates agents and tools deterministically — branching, iteration, parallel fan-out — where a single agent's LLM-driven looping isn't enough. "Listen → filter → store" and "research → summarize → email me" are workflows.

## Node types

Engine supports six: **`agent`** (invoke a named agent), **`workflow`** (nested workflow), **`tool`** (direct tool call, no LLM), **`switch`** (conditional branching via cases + default), **`loop`** (iterate body until condition / max_iterations), **`map`** (apply a template node over items, parallel fan-out). The visual builder surfaces agent / workflow / switch / loop / map; the `tool` node is config-level (declarative config) — mention it when a step needs a deterministic tool call without an agent.

## Authoring paths

1. **Builder UI**: visual canvas — add nodes, wire dependencies, per-node detail (instruction override, per-node input/output schema overrides, switch cases, loop condition/max_iterations/delay, map items). Workflow-level settings: timeouts (overall + per-node default), retry strategy, exit handlers, fail-fast, max call depth. The AI-assisted chat builder can draft the whole DAG from a plain-language description → plan card → Build & Activate.
2. **Declarative config**: workflow kind via `sam-declarative-config` (nodes, `output_mapping`, optional workflow-level `input_schema`/`output_schema`, `retry_strategy`, `on_exit`). Never write node syntax from memory.

## Composition (the seams)

- **Trigger**: a person chatting hits the workflow like an agent; an *event* trigger (mesh topic) is an eventmesh **gateway** → `sam-gateways`.
- **Actions**: reaching databases/APIs from a node = connectors/tools on the node's agent (or workflow-level connectors) → `sam-tools-and-skills` to create them.
- **Typed steps**: workflows pass structured data between nodes; per-node schema overrides + the agents' structured output (see [structured-output.md](structured-output.md)) keep steps machine-readable.

## Worked decomposition ("listen → filter → store")

eventmesh gateway (trigger, other skill) → workflow: `switch` node on the field (or a `tool`/`agent` node if filtering needs logic) → `agent` or `tool` node writing via a sql connector. The workflow owns ordering/retries; the gateway and connector stay outside it.
