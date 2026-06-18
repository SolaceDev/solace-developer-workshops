---
title: What Can You Build?
description: Concrete use cases for Solace Agent Mesh, with pointers into the tutorials and building documentation.
sidebar_position: 130
---

# What Can You Build?

Agent Mesh is a general-purpose runtime, but a few patterns come up repeatedly. The following scenarios illustrate what teams are building with it and point you toward the documentation that takes you further.

## A Knowledge Assistant Connected to Your Own Data

You can deploy an agent that answers questions by searching your internal documentation, a SQL database, or a knowledge base—rather than relying on what the model already knows. The agent calls a tool to retrieve relevant content, uses it to ground its response, and streams the result back to the user. Teams use this pattern for internal support bots, compliance Q&A tools, and engineering knowledge bases. For a hands-on walkthrough, see [Connecting to a SQL Database](../tutorials/sql-database-integration.md) and [Connecting an MCP Server](../tutorials/mcp-integration.md).

## A Conversational Agent Accessible Across Multiple Channels

The same agent logic can be reached through different interfaces without any changes to the agent itself. You configure a Web UI gateway for browser users, a Slack gateway for your internal team, and a Teams gateway for a client-facing deployment—all routing to the same agent. This is useful when you need to meet users where they already work rather than asking them to adopt a new interface. For more information, see [Configuring Gateways](../building/gateways.md) and [Building a Slack Support Bot](../tutorials/slack-support-bot.md).

## Automated Workflows Triggered by Events

Agent Mesh can respond to events published on the event broker without a user initiating the interaction. An agent subscribed to an order topic can triage incoming orders, enrich them with data from an external API, and route them to the right downstream system. Scheduled tasks extend this further: an agent can run on a cron schedule to generate a daily report, monitor a data feed, or send a morning digest. For more information, see [Creating Workflows](../building/workflows.md) and [Scheduling Tasks](../building/scheduled-tasks.md).

## A Multi-Agent System Where Specialists Collaborate

You can build a system where a coordinator agent breaks down an incoming request and delegates subtasks to specialist agents—one that searches documentation, one that queries a database, one that drafts a response. Each specialist runs independently and communicates with the others over the event broker using the Agent-to-Agent protocol. This pattern is useful when no single agent and tool combination can handle the full scope of a task. For more information, see [Agent-to-Agent Protocol](../building/a2a-protocol.md) and [Creating Agents](../building/agents.md).

## Next Steps

- To follow a complete end-to-end example, see [Tutorials and Integrations](../tutorials/index.md).
- To start building your own agents, gateways, and tools, see [Building Your Agent Mesh](../building/index.md).
- To understand the runtime model behind these patterns, see [Understanding Agent Mesh](../concepts/index.md).
