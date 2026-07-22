---
title: Building Your Agent Mesh
description: Author the agents your deployment runs, plus the models, entrypoints, connectors, toolsets, and skills that support them, from the Agent Mesh UI or as declarative config.
sidebar_position: 0
---

# Building Your Agent Mesh

This section covers authoring the building blocks of your deployment: the agents that do the work, and the models, entrypoints, connectors, toolsets, and skills that support them.

## Two Ways to Author

You author almost every resource in one of two ways, and you can mix them:

- **From the Agent Mesh UI.** Build and deploy from the Builder in the Agent Mesh UI, with no YAML and no restart. Every page in this section includes a UI walkthrough.
- **As declarative config.** Describe the same resources as version-controllable YAML and reconcile them with `sam config apply`, the path that suits GitOps and automation. Each resource has a companion CLI page, and the shared workflow is covered in [Managing Configuration as Code (Early Access)](./declarative-config/index.md).

For help deciding when to configure a resource and when to write custom code, see [Extending Agent Mesh: Configuration or Code](../concepts/configured-vs-built.md).

## What You Can Build

- [Quick Build (Experimental)](./quick-build.md)—Describe what you want in plain language, and the Builder designs, validates, and deploys building blocks for you.
- [Creating Agents](./agents/index.md)—Give an agent its instructions, model, tools, and agent card, then deploy it.
- [Creating Workflows (Early Access)](./workflows/index.md)—Orchestrate several agents as a deterministic, multi-step graph.
- [Connecting External Agents](./external-agents/index.md)—Bring an Agent-to-Agent (A2A) agent that runs outside Agent Mesh into your deployment.
- [Configuring Connectors](./connectors/index.md)—Give agents no-code access to databases, knowledge bases, APIs, and other systems.
- [Configuring Entrypoints](./entrypoints/index.md)—Expose agents through Slack, Microsoft Teams, Model Context Protocol (MCP), and event-mesh entrypoints.
- [Configuring Models](./models/index.md)—Register the large language model (LLM) providers and models your agents use.
- [Creating Toolsets](./toolsets.md)—Package custom tool code and attach it to your agents.
- [Creating Skills](./skills.md)—Bundle on-demand instructions and tools that agents load when needed.

## Next Steps

Most readers start by creating an agent, in one of two ways:

- To build one through a guided, AI-assisted conversation, see [Quick Build (Experimental)](./quick-build.md).
- To author one yourself, see [Creating Agents](./agents/index.md).
