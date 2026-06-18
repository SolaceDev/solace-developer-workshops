---
title: What Is Solace Agent Mesh?
description: An event-driven runtime for agentic systems — agents on a broker, controlled tool surfaces, sessions, artifacts, and observability built in.
sidebar_position: 10
---

# What Is Agent Mesh?

Agent Mesh is an **event-driven runtime for agentic systems**. It hosts the agents you build, runs the tools they call, fronts them with the gateways your users reach them through, and coordinates the whole thing over a Solace event mesh. Sessions, artifacts, authentication, RBAC, and observability are part of the runtime — not pieces you wire together yourself before you can ship the first agent that matters.

## The Problem It Solves

A single LLM that calls a single tool is not the hard problem. That fits in a script. The hard problem is what happens once a real workload arrives:

- Several agents need to coordinate over a real-time fabric, not block on each other through HTTP.
- They need to talk to external systems — databases, SaaS APIs, MCP servers, OpenAPI endpoints — through controlled, sandboxed tool surfaces.
- They need to hold a conversation across many turns, persist artifacts the conversation produces, and resume cleanly after a restart.
- They need to be observable in production: a single user task followed end-to-end across every component it touched.

Agent Mesh is the runtime for that. It exists so that the bits common to every serious agentic system live in one place, with one operational story, instead of being re-invented in every project.

## The Shape of the System

Three nouns carry most of the weight. Each has a deep-dive in Concepts; the one-line role here is the orientation.

- **Agents** are the LLM-driven workers. Each one is authored in YAML (or, when YAML is not enough, written in Go) and runs inside the **Agent-Workflow Executor (AWE)** — the process that owns the LLM loop, tool dispatch, and the workflow engine. See Concepts → GWE / AWE / STR.
- **Tools** are the discrete capabilities an agent invokes: built-in tools, MCP servers, OpenAPI endpoints, and remote tools (Python scripts or Go binaries) that execute inside the **Secure Tool Runtime (STR)** — the sandboxed subprocess host. The split between AWE and STR is the trust boundary that keeps tool code away from agent credentials and session state. See Concepts → GWE / AWE / STR.
- **The broker** is the connective tissue. Production deployments use Solace PubSub+; local development uses an in-memory or TCP dev broker. Every cross-process message in Agent Mesh travels on the broker, so the same agent and tool code runs on a laptop or a Kubernetes cluster without source change. See Concepts → Event-driven mesh.

A fourth noun — the **gateway** — sits at the edge. Each gateway terminates one transport (HTTP and SSE for the Web UI, plus Slack, Teams, Email, MCP, and Event Mesh), authenticates the user, attaches a session, and publishes onto the broker. The agents on the other side react. The long-running process that hosts gateways is the **Gateway Executor (GWE)**; one GWE can host several gateways at once.

## Two Ways Events Reach an Agent

Agent Mesh is event-driven at the core. Two patterns surface the same fact:

- **Request-driven.** A user sends a message through the Web UI, a Slack channel, an email, or an MCP client. A gateway terminates the transport, publishes onto the broker, and one or more agents handle it. The response stream returns the same way. See Building → Gateways.
- **Event-driven.** A broker topic publishes — from another system on the event mesh, from a recurring schedule, from a connected workflow — and an agent reacts directly, without a user in the loop. Scheduled work is a thin shell over this same path. See Building → Scheduled tasks.

Both paths use the same agents, the same tools, and the same A2A protocol on the broker. The gateway is one origin among several, not a privileged entry point.

## Agents Talk to Other Agents

An agent rarely works alone for long. Agent Mesh ships with a wire-level Agent-to-Agent (A2A) protocol so an agent can delegate to a **peer agent** — running in the same process, a different pod, or a different language runtime — without either side knowing where the other lives. The delegating agent publishes a request on the broker; the peer agent subscribes and responds. The wire format is identical to Python Agent Mesh, so Go and Python agents coexist on the same mesh and route to each other transparently. See Concepts → A2A protocol.

This is what makes "agent mesh" the right noun. The pattern is not a single agent at the centre of a star of tools; it is several agents on a shared fabric, each one a peer to the others.

## Who Agent Mesh Is For

Three audiences land here from different angles, and the runtime is designed for all three at once:

- **Developers** building agentic systems on top of an event mesh — not as one-off notebooks, but as services they ship. Agent Mesh gives them the LLM loop, the tool dispatch path, the streaming protocol, the session store, and the artifact store on day one.
- **Teams** standardising how their agents talk to each other across languages, codebases, and ownership boundaries — using the A2A protocol so a Go agent and a Python agent route to each other without bespoke glue.
- **Operators** who want their agent runtime to be a first-class deployable service — authentication, RBAC, audit, observability, health endpoints, Kubernetes-shaped deployment — not a script that lives until the next refresh.

The line that connects the three: Agent Mesh is **infrastructure for agentic systems**, not a hosted product or a closed framework. You install it, you run it, you build on it.

## What Next?

You know what Agent Mesh is. The next page picks the right entry point based on what you want to do — try it on a laptop, install it for a team, build with it, or migrate an existing Python deployment. See Choosing your path.
