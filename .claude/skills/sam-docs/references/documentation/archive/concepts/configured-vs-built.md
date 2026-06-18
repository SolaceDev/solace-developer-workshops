---
title: Configured vs Built
description: When to declare an artifact in YAML and when to build it in Go. The split is meaningful for tools; everything else is YAML.
sidebar_position: 9
---

# Configured vs Built

Solace Agent Mesh authors most artifacts — agents, gateways, workflows, skills — entirely in YAML. The one exception is **tools**, where you have a choice: declare the tool in YAML (**configured**) or write it in Go using `pkg/samtoolsdk` (**built**). That decision is real and worth making deliberately. Everywhere else, YAML is the customer surface.

## The Two Tool Paths

- **Configured tool** — Declare the tool on an agent's `tools:` list as a built-in (`tool_type: builtin` with a `tool_name:` like `web_request`), an MCP server (`tool_type: mcp`), or an OpenAPI service (`tool_type: openapi`). No Go code; just YAML.
- **Built tool** — Write a Go binary against `pkg/samtoolsdk` (or a Python script using `sam-tool-sdk`, same idea). The runtime dispatches it through the Secure Tool Runtime (STR) at execution time. It still appears as `tool_type: builtin` on the agent's tool list — the executable behind the name is your binary.

Both paths produce a tool the agent invokes through one tool-invocation protocol. The wire format, the broker topics, the observability surface — none of those change based on which path the tool came from.

## Why the Other Artifact Types Don't Have a Built Path

The configured-vs-built dimension does **not** extend to agents, gateways, workflows, or skills on the customer surface:

| Artifact | What you author | Why there is no separate built path |
|---|---|---|
| **Agent** | YAML file under `configs/agents/` | The runtime owns the LLM loop, tool dispatch, streaming, embed resolution, peer routing, session persistence, and the A2A wire format. The configured surface, combined with the tool taxonomy (built-in, MCP, OpenAPI, custom-built), covers customer-facing flexibility. |
| **Gateway** | YAML file under `configs/gateways/` selecting one of `httpsse`, `eventmesh`, `slack`, `email`, `mcp`, `teams` | The gateway transports ship in the runtime. Adding a new one is a Solace-side change, not a customer authoring path. The MCP gateway is the usual answer when you want to expose the agent mesh to an integration not in the box. |
| **Workflow** | YAML using the workflow DSL: `agent`, `switch`, `map`, `loop`, and nested `workflow` nodes | The DSL composes existing agent and workflow primitives. Custom node types are an internal extension point, not a customer authoring path. |
| **Skill** | A `SKILL.md` manifest plus a directory of references and assets | A skill is a bundle. The configured-vs-built distinction applies to the **tools inside** the bundle, not to the bundle itself. |

If YAML cannot express what you need, the answer is almost always a custom built tool, not a custom agent or gateway.

## Choosing Between Configured and Built Tools

Pick a **configured tool** when:

- The behavior already exists as a built-in tool, an MCP server, or an OpenAPI service. If a service does what you need, wire it as `tool_type: mcp` or `tool_type: openapi`.
- You want the artifact reviewable as a diff in a pull request. YAML is friendlier to code review than Go.
- You want the artifact hot-reloadable through `sam config apply`.

Pick a **built tool** when:

- You need behavior the in-box tools cannot provide — calling a Go library no one has wrapped, embedding compiled dependencies, calling CGO-bound code, talking to a system the MCP and OpenAPI surfaces do not cover.
- You need typed parameter structs that survive the round-trip through the LLM more reliably than a `description:` field on a YAML tool spec. `samtoolsdk` generates the JSON schema from your Go param struct, so the tool's contract is the struct.
- You need a multi-tool binary that shares state or libraries between several closely-related tools.

Built tools cost more to ship: a compile step, a deployment image, version coupling to the runtime. Configured tools cost almost nothing: edit YAML, restart the process.

## What Both Paths Share

A configured tool and a built tool look identical to the agent. The LLM sees the tool's name and schema and calls it. STR handles dispatch:

- **Tool invocation envelope** — same JSON-RPC shape for both paths.
- **Artifact I/O** — same. A built Go tool reads and writes artifacts through `samtoolsdk` calls that go through STR; a configured remote tool authored in Python does the same through `sam-tool-sdk`.
- **Observability** — logs, metrics, the trace ID that follows a user task end-to-end — flow the same way for both.
- **Configuration** — both read per-deployment values from `tool_config:` on the agent's `tools:` entry. Credentials, endpoint URLs, behavioural knobs all go there.

This is why migrating a single tool from configured to built is a local change. You change the executable behind the tool's name; the agent stays unchanged.

## A Note on Terminology

Older Python Agent Mesh contexts use "pro-code agent" to describe an agent authored in Python rather than YAML. Agent Mesh does not expose a customer authoring path for that on Go — every agent is a configured agent. The vocabulary you will see on the Go customer surface is:

- **Configured artifact** — YAML.
- **Built tool** — A Go binary authored against `pkg/samtoolsdk`, or a Python script using `sam-tool-sdk`.

If you encounter the phrase "built agent" or "pro-code agent" in Python-parity material, read it as a reference to the Python concept, not a Go customer path.

## What Next?

You have the vocabulary the rest of the Building section depends on. The natural next page is Building → Tools, which walks the configured tool path and the built tool path in depth.
