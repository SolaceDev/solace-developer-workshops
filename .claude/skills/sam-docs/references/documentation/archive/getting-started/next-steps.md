---
title: Next Steps
description: After the Get Started on-ramps — pointers to authoring more agents and tools, operating a deployment, or migrating an existing Python deployment.
sidebar_position: 4
---

# Next Steps

You finished one of the two on-ramps — either the desktop preview or the first project on disk. Solace Agent Mesh is responding to prompts on your laptop. Pick the direction below that matches where you want to go next.

If you skipped the on-ramps because you already knew you wanted to deploy, build, or operate, the same pointers work — every shelf below is a real entry point.

## Pick a Direction

- **Author more agents and tools** — Add a second agent, write a workflow, plug an MCP server in as a tool, or package a skill that ships alongside your agent. The Building chapters walk every artifact type, configured (YAML) first and built (Go) second. Most developers spend their first week here.
- **Understand the architecture in depth** — The runtime is made of three workload classes — the **Agent-Workflow Executor (AWE)**, the **Gateway Executor (GWE)**, and the **Secure Tool Runtime (STR)** — that meet on an event mesh. In a production deployment each runs as its own process; in the embedded and desktop modes you just used, all three plus an in-memory broker run as goroutines in one binary. The Concepts shelf has a deep-dive page for each one, plus how the A2A protocol carries agent-to-agent traffic and where the trust boundaries land.
- **Deploy for real** — The embedded mode you ran is one of several topologies. The Deploy Options page covers the trade-offs between single-process embedded, multi-container Docker, and split-pod Kubernetes deployments — including which gives you persistence, RBAC, and observability out of the box, and which need extra wiring.
- **Operate a running deployment** — Once Agent Mesh leaves your laptop, the day-two questions kick in: observability, RBAC, secret rotation, TLS rotation, upgrades, and scenario-based troubleshooting for the failures that surface in production. The Administering shelf is the operator's home.
- **Migrate an existing Python deployment** — If you already run Python Agent Mesh in production, the migration shelf covers the config deltas, behavior deltas, and tool / gateway / deployment porting paths to bring it across. New deployments do not need this shelf and can skip it.

## One Distinction Worth Knowing as You Go

Agents, gateways, workflows, and skills in Agent Mesh are authored entirely in YAML (**configured**). Tools are the one artifact type where you have a choice: declare them in YAML, or write them in Go using `pkg/samtoolsdk` (**built**). The walkthrough you just finished was the configured path; most developers stay there indefinitely and reach for a built tool only when YAML cannot express what they need.

The split is explained in full in Configured vs built. Knowing when to reach for a built tool is the single most useful piece of orientation as you read the rest of the documentation.
