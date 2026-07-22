---
title: What Are Tools?
description: "An introduction to tools in Agent Mesh: what they are, the types available, and how agents use them to interact with external systems."
sidebar_position: 550
---

# What Are Tools?

A *tool* is a discrete capability an agent can invoke: run a SQL query, search the internet, generate a chart, convert a PDF, send an email. Tools are how agents reach data and side effects. Everything an agent does beyond the language model's own text generation, it does by calling one.

The language model decides every tool call. The runtime shows the model the list of tools the agent has, along with a description and a parameter schema for each. When the model chooses a tool, the runtime dispatches it, captures the result, and feeds it back into the conversation so the model can decide what to do next.

## The Four Kinds of Tools

Every tool falls into one of four kinds. The kind determines where the tool runs and, for one of them, how you author it.

| Kind | What it is | Where it runs |
|---|---|---|
| Built-in | Capabilities the runtime ships by default: artifact operations, web requests, chart rendering, PDF conversion, and more. | Inside the agent, or inside the Secure Tool Runtime for shipped Python and Go binaries. |
| MCP | A tool served by an external Model Context Protocol server. The agent talks to the server; you do not author the tool. | The MCP server, wherever it lives. |
| OpenAPI | Tools generated from an OpenAPI specification. Each operation in the specification becomes a callable tool. | Inside the agent, issuing HTTP calls to the target service. |
| Custom | Code you write (a Python script or Go binary) that the runtime executes in a sandbox. | The Secure Tool Runtime, always isolated. |

Most agents mix kinds: a built-in group for artifact handling, an MCP server for a specific data source, an OpenAPI specification for a REST API the enterprise already runs, and one or two custom tools where no built-in, MCP, or OpenAPI option fits.

## Configuration or Code

Three of the four kinds are **configuration only**: built-in, MCP, and OpenAPI. You add them to an agent by declaring the kind, a name, and any credentials or filtering options. Nothing to write, nothing to compile.

The fourth kind, a custom tool, is code. You author it in Python or Go, package it, and the runtime executes it inside the Secure Tool Runtime. You reach for a custom tool when no built-in, no MCP server, and no OpenAPI service covers what your agent needs.

The full framing for the configuration-or-code choice lives in [Extending Agent Mesh: Configuration or Code](./configured-vs-built.md).

## The Secure Tool Runtime

Every custom tool executes inside the **Secure Tool Runtime**. So does every built-in tool the runtime dispatches as a subprocess. The Secure Tool Runtime is a separate workload that spawns each tool invocation as an isolated process, applies resource caps, and controls what the tool can reach on the host.

The point of the split is trust. An MCP server or a customer-authored tool is code the runtime did not necessarily review. The Secure Tool Runtime keeps that execution out of the agent's memory space, so a crash, a bug, or a malicious tool cannot reach the agent's credentials, its session state, or the language-model connection. For the workload-class picture, see [How Agent Mesh Manages Workloads](./managing-workloads.md).

## What Next?

- [Configuring Connectors](../building/connectors/index.md) is the no-code path. Attach MCP servers, OpenAPI services, and packaged data-source tools to an agent without writing anything.
- [Creating Toolsets](../building/toolsets.md) covers custom tools authored in Python or Go and packaged for reuse across agents.
- [What Are Skills?](./what-are-skills.md) covers the bundled-tool pattern: grouping tools with instructions and reference material as an on-demand package.
