---
title: Understanding Agent Mesh
description: "The architecture narrative: the Entrypoint Executor, Agent-Workflow Executor, and Secure Tool Runtime split, the event-driven broker mesh, the A2A protocol, request lifecycle, the configuration-or-code choice for tools, runtime services, and the Platform service."
sidebar_position: 0
---

# Understanding Agent Mesh

The following sections describe how Solace Agent Mesh is put together and include information about the pieces you configure, the pieces that run, and the connections between them.

Software development experience is not required to understand the following sections, but we do assume that you know what a chat interface looks like and have a basic understanding of what a large language model (LLM) does.

If you are new to Agent Mesh, the following descriptions provide you working terminology to understand Agent Mesh.

- [What Is an Agent?](./what-is-an-agent.md) — Agents are the language-model-driven workers that answer questions and complete tasks.
- [What Is an Entrypoint?](./what-is-an-entrypoint.md) — Entrypoints are the doors into Agent Mesh: HTTP, Slack, Teams, email, Model Context Protocol (MCP), or the event mesh.
- [What Are Workflows? (Early Access)](./what-are-workflows.md) — Workflows are typed directed acyclic graphs (DAGs) that coordinate agents and tools without needing an LLM for every step.
- [What Are Tools?](./what-are-tools.md) — Tools are the individual capabilities an agent can call: search a database, call an API, generate a chart.
- [What Are Skills?](./what-are-skills.md) — Skills are reusable bundles of instructions and tools an agent loads on demand.

## The Architecture

After you build an understanding of building blocks for Agent Mesh, you can see the following information for understanding the processes that run, what they own, and how they interact with each other:

- [Architecture Overview](./architecture.md) — The high-level tour. Names the three workload classes, shows the broker between them, and points at the deep-dive pages for each.
- [How Agent Mesh Manages Workloads](./managing-workloads.md) — The Entrypoint Executor, Agent-Workflow Executor, and Secure Tool Runtime. What each owns and the trust boundaries between them.
- [The Event-Driven Mesh](./event-driven-mesh.md) — The broker fabric, the topic tree, queues versus direct subscriptions, and the three interchangeable broker backends.
- [Agent-to-Agent Protocol](./a2a-protocol.md) — The JSON-RPC wire format agents use across the broker. Envelope, topic conventions, signals, and the JSON Web Token (JWT) trust chain.

## State, Configuration, and the Control Plane

The following contains information to help you build an understanding of where the state of requests reside in the framework, how you design a deployment, and HTTP control plane that manages it all.

- [Artifacts](./artifacts.md) — Versioned blob storage every agent and tool shares. The five backends, scoping rules, and how artifacts reach the LLM.
- [Sessions](./sessions.md) — Conversation persistence, session keying per entrypoint type, and how history compaction keeps the context window bounded.
- [Toolsets](./toolsets.md) — How custom tool code is packaged as a Platform resource and attached to agents.
- [Skills](./skills.md) — The agentskills.io-style bundle format. Progressive disclosure, the discovery lifecycle, and how skills relate to the Secure Tool Runtime and toolsets.
- [Extending Agent Mesh: Configuration or Code](./configured-vs-built.md) — When to declare a tool in YAML and when to write it in Go. The split is meaningful for tools; everything else is YAML.
- [Platform Service](./platform-service.md) — The HTTP control plane that exposes agents, deployments, role-based access control (RBAC), audit, evaluations, and the AI assistant.

## What Next?

After you have an understanding of the information mentioned in this section, you can [Install and Deploy](../installing/index.md) Agent Mesh (builds a runtime) and then start [Building Your Agent Mesh](../building/index.md) to author agents.
