---
title: What Are Workflows? (Early Access)
description: "An introduction to workflows in Agent Mesh: what they are, when to use them instead of agents, and how they fit into the system."
sidebar_position: 540
---

# What Are Workflows? (Early Access)

:::warning
This feature is in the Early Access stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

A *workflow* is a deterministic, multi-step recipe. Where an agent lets a language model decide each next step, a workflow lays the steps out in advance: this node runs first, then those two run in parallel, then that branch runs only when the previous result matches a condition. Same input, same path, every time.

Workflows are for when the choreography is what matters and you want it to be repeatable. A workflow is still made of the same building blocks as the rest of Agent Mesh. Its steps invoke agents, call tools, or delegate to other workflows.

## Workflow or Agent?

Both agents and workflows accept a task and produce a result, and both are addressable the same way over the Agent-to-Agent (A2A) protocol. The choice between them comes down to who decides what happens next.

- **Reach for a workflow** when the same input must always take the same path. Regulated processes, scheduled batch jobs, and report-generation pipelines are good candidates: anything with strict step ordering, retries per step, or parallel fan-out over a list.
- **Reach for an agent** when the path itself is a judgment call: conversations, exploratory analysis, or anything where the model must look at the current state and decide whether to ask a question, invoke a tool, or hand off to a peer.

The two often coexist. A workflow can call an agent for the parts that benefit from language-model reasoning; an agent can invoke a workflow for the parts that need deterministic execution. Mix freely.

## What a Workflow Is Made Of

A workflow is a directed acyclic graph (DAG) of typed nodes. The runtime executes each node in dependency order, passing typed inputs and outputs between them. The node types you reach for most often:

| Node type | What it does |
|---|---|
| `agent` | Sends a structured request to an agent and captures its response. |
| `tool` | Invokes a single tool directly, without a language model in the loop. |
| `switch` | Selects one of several downstream nodes based on a condition. |
| `map` | Fans a template node out across a list of items, optionally in parallel. |
| `loop` | Runs a node repeatedly until a condition becomes false. |
| `workflow` | Nests another workflow as a step. |

Nodes declare their inputs as templates that reference the workflow's own input or earlier nodes' outputs. Dependencies determine order; anything not on the dependency chain runs in parallel.

## How You Add a Workflow

You author workflows the same way you author agents: as a resource in your configuration. You describe the workflow's input and output shape, the nodes it runs, and how each node's output feeds the next.

After you deploy it, the workflow becomes addressable on the A2A protocol just like an agent. An agent can delegate to it, an entrypoint can route a user request straight to it, or another workflow can nest it as a step.

## What Next?

- [Creating Workflows (Early Access)](../building/workflows/index.md) walks the authoring flow: node types, template expressions, timeouts, retry, and exit handlers.
- [What Is an Agent?](./what-is-an-agent.md) covers the other side of the deterministic-versus-conversational choice.
- [Architecture Overview](./architecture.md) puts workflows in the context of the wider runtime.
