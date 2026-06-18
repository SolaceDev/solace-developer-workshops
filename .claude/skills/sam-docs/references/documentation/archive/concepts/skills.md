---
title: Skills
description: How skills package reusable instructions and tools as agentskills.io-style bundles, the progressive-disclosure model, the discovery lifecycle, and how skills relate to STR and toolsets.
sidebar_position: 11
---

# Skills

A **skill** is a bundle of instructions, reference material, and optional tools that an agent loads on demand. It follows the open agentskills.io format: a directory with a `SKILL.md` file at the top (YAML frontmatter plus Markdown instructions) and optional `references/`, `assets/`, and `tools/` subdirectories.

Skills exist to keep an agent small at the prompt level while still reaching a large library of capabilities. Rather than packing every reference document and behavioural rule into one system prompt, you move that material into named bundles the agent pulls in only when a task calls for it. This page explains the concept, the progressive-disclosure model, and the lifecycle of a skill managed through the Platform service. For the hands-on authoring and management flow, see Building → Skills.

## Progressive Disclosure

Skills are loaded in three tiers so an agent's context window stays flat as its skill library grows:

| Tier | When loaded | What it costs |
|---|---|---|
| **Metadata** | Agent startup, always | ~100 tokens per skill — just the name and description |
| **Instructions** | When the agent calls `load_skill` | The full `SKILL.md` body, injected into the prompt; bundled tools become callable |
| **Resources** | On demand, while a skill is loaded | Individual `references/` and `assets/` files, read only when the instructions call for them |

The agent decides when to load a skill. At startup it knows only each skill's name and description (the trigger text). During a conversation the LLM calls the `load_skill` tool when a skill looks relevant, which pulls the full instructions into context and registers the skill's bundled tools. `unload_skill` reverses both. While a skill is loaded the agent can walk its resource files with `list_skill_resources`, `read_skill_resource`, and `grep_skill_resources` — these resource tools stay hidden from the LLM until at least one loaded skill actually has resources.

An agent with twenty available skills only pays the prompt-size cost of the ones it loads for a given task. Loaded skills persist across the tasks of a session, so the LLM does not re-load them on every turn.

## Skill, Toolset, and Remote Tool

A skill bundles tools, and so does a toolset — but they enter the system through different doors and serve different purposes:

| Term | What it is | How an agent uses it |
|---|---|---|
| **Remote tool** | A single Python script or Go binary that runs inside STR. | Listed on the agent's `tools:` as `tool_type: builtin`. |
| **Toolset** | A Platform resource: a zip of remote tools, always available to an agent it is attached to. | Attached by name; expands into tool entries at deploy time. See Toolsets. |
| **Skill** | An agentskills.io bundle: instructions + references + assets + optional bundled tools, loaded *on demand*. | Listed on the agent's `skills:`; the LLM loads it at runtime via `load_skill`. |

The distinction that matters: a toolset's tools are always on the agent's tool list; a skill's instructions and tools appear only after the LLM loads the skill. A skill is the right home for behavioural guidance and reference material; a toolset is the right home for capabilities the agent should always have.

## What Is in a Skill Bundle

```text
compliance-check/
  SKILL.md          # required: YAML frontmatter + Markdown instructions
  references/       # optional: documentation the agent reads on demand
  assets/           # optional: templates, lookup tables, schemas
  tools/            # optional: bundled remote tools (manifest.yaml + executables)
```

The `SKILL.md` frontmatter carries the metadata the agent uses to decide when to load the skill. The fields the runtime reads are `name`, `description`, `tags`, `examples`, `required_scopes`, and the tool-wiring fields `tools` and `toolsets`. Only `name` and `description` are needed — if `name` is omitted it defaults to the directory name, and there is no strict length or naming validation. The Markdown body after the frontmatter is the instruction set the agent receives when it loads the skill.

Bundled tools live under `tools/` with a `manifest.yaml`, in the same shape STR uses for any remote tool. They are namespaced `skillname__toolname` (double underscore, because LLM providers restrict tool names to `[a-zA-Z0-9_-]`) so two loaded skills can't collide. Agent Mesh uses this `tools/` directory in place of the agentskills.io `scripts/` directory — bundled tools get STR's sandboxing, schema discovery, and timeout handling, which raw scripts do not. A skill that uses only `SKILL.md`, `references/`, and `assets/` is fully portable to other agentskills.io consumers; a skill with `tools/` is an Agent Mesh extension.

## The Discovery Lifecycle

A skill uploaded through the Platform service moves through a `discoveryStatus` lifecycle, the same one toolsets use. The web UI renders it as a status dot.

```mermaid
stateDiagram-v2
  [*] --> created: skill record created
  created --> pending: zip uploaded, STR sync triggered
  pending --> ready: STR discovered the skill
  pending --> failed: discovery error or timeout
  ready --> pending: new zip re-uploaded
  failed --> pending: corrected zip re-uploaded
```

- **created** — The skill record exists but no zip is uploaded yet.
- **pending** — A zip is uploaded and STR is syncing it.
- **ready** — STR discovered the skill and published its metadata. Agents can load it.
- **failed** — Discovery errored. Re-uploading a corrected zip moves it back to `pending`.
- **removed** — The skill is no longer present in STR.

## How a Skill Reaches an Agent

```mermaid
flowchart LR
  dev[Developer]
  plat[Platform service]
  str[STR]
  broker[(Broker)]
  awe[AWE]

  dev -->|upload skill zip| plat
  plat -->|sync| str
  str -->|scan SKILL.md, publish init| broker
  broker -->|skill metadata| awe
  dev -->|attach skill, deploy agent| plat
  awe -->|load_skill at runtime| str
  str -->|instructions + bundled tools| awe
```

1. You upload a skill zip to the Platform service (or, in a config-file project, drop the directory under the skills path).
2. STR scans the skill, reads its `SKILL.md`, and broadcasts a skill-init message over the broker carrying the metadata (description, tags, bundled tools, whether it has resources).
3. The agent subscribes to skill-init messages and accepts the ones whose names are in its configured skill list — a strict whitelist.
4. At runtime the LLM calls `load_skill`; STR returns the full instructions and bundled-tool definitions, and the agent registers them.

The agent never reads skill files itself — STR owns the filesystem and serves content over the broker. STR rescans periodically (fingerprint-based change detection), so an edited skill is re-broadcast without an agent restart. An already-loaded skill is not hot-refreshed mid-conversation; the agent picks up changes on the next load or a new session.

## Built-In Skills

Agent Mesh ships curated built-in skills — `sam-knowledge` and `sam-docs` — that surface in the skills list and attach to an agent by name without any upload. The `sam-` name prefix is reserved for these; you cannot create a custom skill with that prefix.

## What Next?

To author a skill, attach it to an agent, and manage it through the Platform service, see Building → Skills. For the related packaging model for always-on tools, see Concepts → Toolsets.
