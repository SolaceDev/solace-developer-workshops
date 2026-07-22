---
title: What Can You Build?
description: Concrete use cases for Agent Mesh, with pointers into the building documentation.
sidebar_position: 130
---

# What Can You Build?

Agent Mesh is a general-purpose platform, but a few patterns come up repeatedly. The following scenarios illustrate what teams are building with it and point you toward the documentation that takes you further.

## A Knowledge Assistant Connected to Your Own Data

You can deploy an agent that answers questions by searching your internal documentation, a SQL database, or a knowledge base—rather than relying on what the model already knows. The agent calls a tool to retrieve relevant content, uses it to ground its response, and streams the result back to the user. Teams use this pattern for internal support bots, compliance Q&A tools, and engineering knowledge bases.

## A Conversational Agent Accessible Across Multiple Channels

The same agent logic can be reached through different interfaces without any changes to the agent itself. You configure a Web UI entrypoint for browser users, a Slack entrypoint for your internal team, and a Teams entrypoint for a client-facing deployment—all routing to the same agent. This is useful when you need to meet users where they already work rather than asking them to adopt a new interface. For more information, see [Configuring Entrypoints](../building/entrypoints/index.md).

## Automated Workflows Triggered by Events

Agent Mesh can respond to events published on the event broker without a user initiating the interaction. An agent subscribed to an order topic can triage incoming orders, enrich them with data from an external API, and route them to the right downstream system. Scheduled tasks extend this further: an agent can run on a cron schedule to generate a daily report, monitor a data feed, or send a morning digest. For more information, see [Scheduling Tasks (Experimental)](../using-agent-mesh/scheduled-tasks.md).

## A Multi-Agent System Where Specialists Collaborate

You can build a system where a coordinator agent breaks down an incoming request and delegates subtasks to specialist agents—one that searches documentation, one that queries a database, one that drafts a response. Each specialist runs independently and communicates with the others over the event broker using the Agent-to-Agent protocol. This pattern is useful when no single agent and tool combination can handle the full scope of a task. For more information, see [Agent-to-Agent Protocol](../concepts/a2a-protocol.md) and [Creating Agents](../building/agents/index.md).

## Next Steps

- To start building your own agents, entrypoints, and tools, see [Building Your Agent Mesh](../building/index.md).
- To understand the runtime model behind these patterns, see [Understanding Agent Mesh](../concepts/index.md).
