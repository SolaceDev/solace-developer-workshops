---
title: "Extending Agent Mesh: Configuration or Code"
description: "When to declare a resource in YAML and when to build it in Go. The split is meaningful for tools; everything else is YAML."
sidebar_position: 5120
---

# Extending Agent Mesh: Configuration or Code

Agent Mesh authors most resources (agents, entrypoints, workflows, and skills) entirely in YAML. The one place a choice appears is for **tools**, where you can either declare a tool in YAML (the configuration path) or write it as a Go binary against `pkg/samtoolsdk` (the code path). That decision is real and worth making deliberately. Everywhere else, YAML is the customer surface.

## The Two Tool Paths

- **Configuration path (declared tool).** Declare the tool on an agent's `tools:` list as a built-in (`tool_type: builtin` with a `tool_name:` like `web_request`), a Model Context Protocol (MCP) server (`tool_type: mcp`), or an OpenAPI service (`tool_type: openapi`). No Go code; just YAML.
- **Code path (custom tool).** Write a Go binary against `pkg/samtoolsdk` (or a Python script using `sam-tool-sdk`, same idea). The runtime dispatches it through the Secure Tool Runtime at execution time. It still appears as `tool_type: builtin` on the agent's tool list; the executable behind the name is your binary.

Both paths produce a tool the agent invokes through one tool-invocation protocol. The wire format, the broker topics, and the observability surface do not change based on which path the tool came from.

## Why the Other Resource Types Don't Have a Code Path

The configuration-or-code choice does **not** extend to agents, entrypoints, workflows, or skills on the customer surface:

| Resource | What you author | Why there is no separate code path |
|---|---|---|
| **Agent** | YAML file under `configs/agents/` | The runtime owns the large language model (LLM) loop, tool dispatch, streaming, embed resolution, peer routing, session persistence, and the Agent-to-Agent (A2A) wire format. The declared surface, combined with the tool taxonomy (built-in, MCP, OpenAPI, custom), covers customer-facing flexibility. |
| **Entrypoint** | YAML file under `configs/entrypoints/` selecting one of `httpsse`, `eventmesh`, `slack`, `email`, `mcp`, `teams` | The entrypoint transports ship in the runtime. Adding a new transport is a Solace-side change, not a customer authoring path. The MCP entrypoint is the usual answer when you want to expose Agent Mesh to an integration the runtime does not ship. |
| **Workflow** | YAML using the workflow domain-specific language (DSL): `agent`, `switch`, `map`, `loop`, and nested `workflow` nodes | The DSL composes existing agent and workflow primitives. Custom node types are an internal extension point, not a customer authoring path. |
| **Skill** | A `SKILL.md` manifest plus a directory of references and assets | A skill is a bundle. The configuration-or-code choice applies to the **tools inside** the bundle, not to the bundle itself. |

If YAML cannot express what you need, the answer is almost always a custom-coded tool, not a custom agent or entrypoint.

## Choosing Between the Configuration Path and the Code Path

Pick the **configuration path** when:

- The behavior already exists as a built-in tool, an MCP server, or an OpenAPI service. If a service does what you need, wire it as `tool_type: mcp` or `tool_type: openapi`.
- You want the resource reviewable as a diff in a pull request. YAML is friendlier to code review than Go.
- You want the resource hot-reloadable through `sam config apply`.

Pick the **code path** when:

- You need behavior the built-in tools cannot provide. Examples include calling a Go library no one has wrapped, embedding compiled dependencies, calling CGO-bound code, or reaching a system the MCP and OpenAPI surfaces do not cover.
- You need typed parameter structs that survive the round-trip through the LLM more reliably than a `description:` field on a YAML tool spec. `samtoolsdk` generates the JSON schema from your Go param struct, so the tool's contract is the struct.
- You need a multi-tool binary that shares state or libraries between several closely related tools.

Custom tools cost more to ship: a compile step, a deployment image, version coupling to the runtime. Declared tools cost almost nothing: edit YAML, restart the process.

## What Both Paths Share

A declared tool and a custom tool look identical to the agent. The LLM sees the tool's name and schema and calls it. The Secure Tool Runtime handles dispatch:

- **Tool invocation envelope.** Same JSON-RPC shape for both paths.
- **Artifact I/O.** Same. A custom Go tool reads and writes artifacts through `samtoolsdk` calls that go through the Secure Tool Runtime; a declared remote tool authored in Python does the same through `sam-tool-sdk`.
- **Observability.** Logs, metrics, and the trace ID that follows a user task end-to-end flow the same way for both.
- **Configuration.** Both read per-deployment values from `tool_config:` on the agent's `tools:` entry. Credentials, endpoint URLs, and behavioral knobs all go there.

Migrating a single tool from the configuration path to the code path is a local change. You change the executable behind the tool's name; the agent stays unchanged.

## What Next?

You have the vocabulary the rest of the Building section depends on. The natural next page walks the two tool paths in depth. For how custom tools are packaged and attached to agents, see [Creating Toolsets](../building/toolsets.md).
