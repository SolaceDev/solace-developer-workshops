---
title: What Is an Agent?
description: "An introduction to agents in Agent Mesh: what they are, what they do, and how they relate to the other building blocks."
sidebar_position: 520
---

# What Is an Agent?

An *agent* is the primary building block in Agent Mesh. You send it a task and get an answer back. Each agent has a role you give it, a language model that powers it, and a list of **tools** it can call to get work done.

You do not write code to ship an agent. You describe one through the Agent Mesh UI or as a YAML resource in your configuration. The description covers its name, its instructions, the model it uses, and the tools it can call. Agent Mesh takes it from there.

## What an Agent Does

Every task an agent receives follows the same loop:

1. A user (or another agent) sends the agent a task.
2. The agent hands the task, its instructions, and the list of available tools to a language model.
3. The model responds, either with a final answer or with tool calls for the agent to run on its behalf.
4. If there are tool calls, the agent runs each one and feeds the results back to the model.
5. The loop repeats until the model produces a final answer, which the agent returns.

The runtime owns every step of that loop: the streaming, the tool dispatch, the session memory, and the delegation to other agents. What you supply is the agent's identity, its instruction (a system prompt), and the list of tools available to it.

## How Agents Fit In

An agent sits in the middle of the picture. Users reach it through an **entrypoint**: the Web UI, Slack, Teams, email, a Model Context Protocol (MCP) client, or an event mesh topic. It gets its capabilities from **tools** such as a database query, a web search, a file conversion, or a chart renderer. It can also hand parts of a task to a **peer agent** over the Agent-to-Agent (A2A) protocol when a specialist would do a better job.

When an agent deploys, it publishes its **agent card** so peers can discover it and delegate to it. Agent Mesh stores the agent in a database, so it remains available the next time you open the Agent Mesh UI.

## How You Add an Agent

Two paths lead to the same result:

- **Agent Mesh UI.** Quick Build walks you through creating an agent from a natural-language description. It drafts the configuration, asks clarifying questions, lets you review the result, and deploys it when you approve.
- **Declarative configuration.** If you already know what you want, write the agent as a YAML resource in a `sam config` directory and run `sam config apply`. Same fields as the Agent Mesh UI, authored directly.

Neither path requires code. If your agent requires a capability that no built-in tool covers, that capability becomes a custom tool. The agent itself stays a configuration file.

## What Next?

- [Creating Agents](../building/agents/index.md) walks the hands-on flow: selecting a model, writing instructions, wiring tools, and turning on peer delegation.
- [What Is an Entrypoint?](./what-is-an-entrypoint.md) covers the other side of the picture: how users and systems reach the agents you create.
- [Architecture Overview](./architecture.md) puts agents alongside the other pieces of the runtime.
