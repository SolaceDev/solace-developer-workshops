---
title: What Is Agent Mesh?
description: An agent development and runtime platform that helps you build, test, deploy, monitor, and improve your agents and agent workflows, with sessions, artifacts, authentication, and observability built in.
sidebar_position: 110
---

# What Is Agent Mesh?

Agent Mesh is an agent development and runtime platform. It helps you build, test, deploy, monitor, and improve your agents and agent workflows. You use it when a single large language model (LLM) calling a single tool isn't enough—when you need multiple agents coordinating in real time, controlled access to external systems, and observability across every task from end to end. Agent Mesh provides that infrastructure so you can focus on building agents rather than their underlying support systems.

## How Agent Mesh Is Organized

Agent Mesh is built around four components that communicate over an event broker:

- *Agents* are the AI workers that process tasks. The Agent-Workflow Executor runs them, managing the AI processing loop, tool calls, and workflow execution. You define agents in YAML, or write them in Go for more advanced scenarios.

- *Tools* are the capabilities agents call at runtime: built-in tools, Model Context Protocol (MCP) servers, OpenAPI endpoints, and custom binaries. Tools run inside the Secure Tool Runtime, an isolated execution environment that keeps tool code separated from agent credentials and session state.

- *Entrypoints* are how users and external systems reach Agent Mesh. Each entrypoint handles one transport—the Agent Mesh UI over HTTP, or Slack, Teams, email, MCP, or Event Mesh—authenticates the caller, and routes messages onto the event broker. The Entrypoint Executor hosts entrypoints; one Entrypoint Executor can run several at once.

- The *event broker* carries every message between these components. Because all communication flows through the event broker, you can trace any user task across every agent, tool, and entrypoint it touched.

For more information, see [How Agent Mesh Manages Workloads](../concepts/managing-workloads.md).

## How Agents Work Together

Agent Mesh includes an Agent-to-Agent (A2A) protocol so an agent can delegate work to another agent—in the same process, a different pod, or a different deployment entirely—without either side knowing where the other lives. The delegating agent publishes a request on the event broker; the receiving agent subscribes and responds. For more information, see [Agent-to-Agent Protocol](../concepts/a2a-protocol.md).

## What You Can Build

Agent Mesh supports a range of use cases. You can build conversational assistants that connect to enterprise data, automate multi-step workflows across specialized agents, trigger agent responses directly from event broker topics without a user in the loop, or connect your deployment to users through Slack, Teams, email, or an MCP client. Because you add agents and tools independently of each other, your deployment grows incrementally as your needs change.

## Who Uses Agent Mesh

Agent Mesh is designed for:

- Developers who are building agentic systems as services they ship, not as one-off scripts.
- Teams that need agents to communicate consistently across code bases and ownership boundaries.
- Operators who need a runtime with authentication, role-based access control (RBAC), and Kubernetes deployment support built in.

## Next Steps

- If you're ready to choose an installation path, see [Choosing Your Installation Path](./choosing-your-path.md).
- If you want to understand the architecture in more depth before you install, see [Understanding Agent Mesh](../concepts/index.md).
- If you're ready to build something, see [Create Your First Agent](./your-first-agent.md).
