---
name: sam-author-agent
description: Use when creating or editing Solace Agent Mesh agents or workflows — writing instructions/system prompts, enabling built-in tool groups, giving an agent an MCP server's tools, peer delegation between agents (inter_agent_communication), structured input/output schemas, agent cards/abilities, or multi-step workflow DAGs (switch/map/loop nodes). Not for creating connectors (sam-connectors), custom tools (sam-tools-and-skills), inbound entrypoints (sam-entrypoints), or choosing where Agent Mesh runs (sam-install-run / sam-deploy).
metadata:
  version: main-v2.381.3
---

# sam-author-agent

This skill creates and edits Agent Mesh **agents and workflows** (behavior: instructions, tools, delegation, structured I/O, DAGs). For reaching external data/services no-code see `sam-connectors`; for custom tool code see `sam-tools-and-skills`; for making agents reachable from outside (Slack, MCP clients, events) see `sam-entrypoints`.

**Agent or workflow?** A single assistant that converses and uses tools = agent. A multi-step pipeline with branching, iteration, or fixed sequencing ("listen → filter → store", "research → summarize → send") = workflow (a DAG that orchestrates agents and tools). Workflows compose: entrypoints trigger them, connectors act for them.

## Authoring paths — teach in this order

1. **Builder UI** (default, especially for non-technical users). Creation lives under the WebUI's **Builder** nav group — **not** the **Agents** screen, which is read-only (running-agent cards, no create control). Two entry points: **Builder → Quick Build** (the AI-assisted chat builder: describe the agent/workflow in plain language, review the plan card, **Build & Activate**) and **Builder → Agent Management** (the manual path: **Add Agent → Create New Agent → Create Manually**, fill the sectioned editor, then **Create and Deploy**). Use the UI whenever every needed control exists in it (see capability map below).
2. **Declarative config** — `sam config plan` / `apply` via the **`sam-declarative-config`** skill. The step up when a knob has no UI control, or the user wants version-controlled, repeatable config. **That skill is the only source of full YAML blocks — it regenerates from the live schemas.** This skill *names* knobs and keys (safe to mention to the user); writing out a complete config block, nesting, or any key this skill doesn't name is `sam-declarative-config`'s job. Never bridge the gap from memory.
3. **Raw runtime YAML** — escape hatch only (debugging, parity checks). Never the headline.

## Builder UI capability map (what exists — verified 2026-06)

Name & description · instructions/system prompt · model **alias selection only** (tuning lives on the model configuration, not the agent) · toolsets with per-tool exclusion and per-tool config · skills (built-in + custom) · connectors (attach existing; create MCP/others in the connector wizard, then attach) · agent card abilities (UI caps at 10; declarative config / API allow up to 20), input/output modes · deploy on save. **Workflows are authored by AI, not by hand** — the DAG canvas is a **read-only visualization** (no palette, no wiring), so structural editing happens in **Quick Build** chat or via **Edit with AI**; the manual Workflow edit page only touches name/description/version. For hand-written or precise workflow structure, go to declarative config.

**No UI control exists for** (go straight to declarative config; say so plainly — never invent a UI control):
- **Peer delegation** (`interAgentCommunication`) — see [references/peer-delegation.md](references/peer-delegation.md)
- **Structured input/output schemas** — see [references/structured-output.md](references/structured-output.md)
- Welcome message + suggestion chips, required scopes (RBAC), discovery/publishing tuning, and the advanced behavior knobs (budgets, streaming, artifact handling…) — all API-reachable via the agent's `additionalConfigurations`; author through declarative config.
- **Per-agent model tuning** (temperature, top_p, …) has no supported agent-level control. Tuning is set on the model configuration the alias points at — the **Models** page's **Advanced Settings**, or `modelParams` in declarative config — so it applies to every agent using that alias. The one supported exception is the response cap: `additionalConfigurations.maxTokens` sets `max_tokens` for this agent alone. Flag this honestly when asked.

## Hard rules (each counters an observed failure)

- **Go product, Go patterns.** Never use Python Agent Mesh shapes (`apps:`/`app_config:` files, the `solace-agent-mesh-plugin-creator` skill, ADK idioms). Runtime YAML is *compatible* with Python Agent Mesh, but it is the escape hatch, not the taught path — and "compatible" is not a license to write its keys from memory.
- **Check the built-in catalog before recommending external tools.** Web search is built in (`web_search_google` in the `web_tools` group) — do not send users to install a search MCP server for plain web lookup. See [references/builtin-tools.md](references/builtin-tools.md).
- **MCP server on an agent has a UI path**: the MCP **connector** wizard (URL, auth, tool selection). Lead with it. See [references/mcp-on-agent.md](references/mcp-on-agent.md).
- **When unsure of a key name, you are not allowed to guess** — invoke `sam-declarative-config` and look it up.

## References (Drew-depth detail)

| Topic | File |
|---|---|
| Built-in tool groups — canonical names, what's in each, UI toolsets vs runtime groups | [references/builtin-tools.md](references/builtin-tools.md) |
| Giving an agent an MCP server's tools (UI / config / runtime paths, auth, filtering) | [references/mcp-on-agent.md](references/mcp-on-agent.md) |
| Peer delegation (multi-agent hand-off) | [references/peer-delegation.md](references/peer-delegation.md) |
| Structured input/output (agent as typed function) | [references/structured-output.md](references/structured-output.md) |
| Workflows — node types, settings, composition | [references/workflows.md](references/workflows.md) |
| Data flow between steps — what `{{…}}` resolves to, and how it fails | [references/data-flow.md](references/data-flow.md) |
| Step guarantees — retry, schema validation, failure propagation | [references/step-semantics.md](references/step-semantics.md) |
| Naming files a step produces — session scope, fan-out collisions | [references/artifact-naming.md](references/artifact-naming.md) |

**Hand-authoring a workflow?** Also read the workflow **design** guide before writing nodes — it is the file with worked YAML for every node type, the tool-node reshape mechanics, and the retry/timeout rules. It ships with `sam-declarative-config` as `references/design/workflow-design.md` (invoke that skill to read it); it is not in the table above because it lives in that skill, not this one.

Skill bundles (packaging behavior for reuse) are attached here via the builder's skills picker, but *creating* them belongs to `sam-tools-and-skills`.
