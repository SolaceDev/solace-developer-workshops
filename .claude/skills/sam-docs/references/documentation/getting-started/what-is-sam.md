---
title: What Is Solace Agent Mesh?
description: An event-driven runtime for agentic systems — agents on an event broker, controlled tool surfaces, sessions, artifacts, and observability built in.
sidebar_position: 110
---

# What Is Solace Agent Mesh?

Solace Agent Mesh is an event-driven runtime for agentic systems. You use it when a single large language model (LLM) calling a single tool isn't enough—when you need multiple agents coordinating in real time, controlled access to external systems, and observability across every task from end to end. Agent Mesh provides that infrastructure so you can focus on building agents rather than their underlying support systems.

## How Agent Mesh Is Organized

Agent Mesh is built around four components that communicate over an event broker:

- *Agents* are the AI workers that process tasks. The Agent-Workflow Executor (AWE) runs them, managing the AI processing loop, tool calls, and workflow execution. You define agents in YAML, or write them in Go for more advanced scenarios.

- *Tools* are the capabilities agents call at runtime: built-in tools, Model Context Protocol (MCP) servers, OpenAPI endpoints, and custom binaries. Tools run inside the Secure Tool Runtime (STR), an isolated execution environment that keeps tool code separated from agent credentials and session state.

- *Gateways* are how users and external systems reach Agent Mesh. Each gateway handles one transport—the Web UI over HTTP, or Slack, Teams, email, MCP, or Event Mesh—authenticates the caller, and routes messages onto the event broker. The Gateway Executor (GWE) hosts gateways; one GWE can run several at once.

- The *event broker* carries every message between these components. Because all communication flows through the event broker, you can trace any user task across every agent, tool, and gateway it touched.

For more information, see [How Agent Mesh Manages Workloads](../concepts/gwe-awe-str.md).

## How Agents Work Together

Agent Mesh includes an Agent-to-Agent (A2A) protocol so an agent can delegate work to another agent—in the same process, a different pod, or a different deployment entirely—without either side knowing where the other lives. The delegating agent publishes a request on the event broker; the receiving agent subscribes and responds. For more information, see [Agent-to-Agent Protocol](../building/a2a-protocol.md).

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
- If you're ready to get something running, see [Building Your First Project](./build-your-first-project.md).
