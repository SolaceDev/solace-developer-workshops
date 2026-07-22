---
title: Creating Workflows (Early Access)
description: Build a workflow, a directed acyclic graph of typed nodes run by the Agent-Workflow Executor, with Quick Build in the Agent Mesh UI.
sidebar_position: 1
---

# Creating Workflows (Early Access)

:::warning
This feature is in the Early Access stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

A workflow is a directed acyclic graph (DAG) of typed nodes that Agent Mesh runs in a defined order. Use a workflow when you want deterministic, repeatable orchestration (fixed steps, branching, parallel fan-out, and retries) rather than letting an agent decide each step at runtime. For more information about workflows and when to use one instead of an agent, see [What Are Workflows? (Early Access)](../../concepts/what-are-workflows.md).

A workflow runs inside the Agent-Workflow Executor, the same process that hosts agents. A workflow is a distinct resource from an agent: an agent is a large language model (LLM) loop that chooses its own tool calls, while a workflow follows the graph you define.

## Workflow Nodes

A workflow is built from typed nodes wired together into a graph. Each node type does one job:

- **Agent** — Delegates a step to an agent by name.
- **Switch** — Routes to one of several branches based on a condition.
- **Map** — Runs the same step once for each item in a collection.
- **Loop** — Repeats a step while a condition holds.
- **Tool** — Calls a configured tool directly, without an agent.
- **Workflow** — Runs another workflow as a nested step.

You connect nodes into a graph by declaring which nodes each node depends on. Agent Mesh runs a node after all of its dependencies have completed.

## Two Ways to Build a Workflow

You can build a workflow in either of two ways, and the result is the same deployed resource:

- **With Quick Build, from the Agent Mesh UI.** Describe the process you want in plain language, and Quick Build proposes the nodes and wiring, then deploys the workflow for you. For more information, see [Quick Build (Experimental)](../quick-build.md).
- **As declarative config.** Author the workflow as version-controllable YAML and apply it with `sam config apply`. For more information, see [Creating Workflows with the CLI (Early Access)](./cli.md).

To decide when to configure a resource and when to write custom code, see [Extending Agent Mesh: Configuration or Code](../../concepts/configured-vs-built.md).

## Building a Workflow with Quick Build

Quick Build is a guided, AI-assisted chat experience that designs, validates, and deploys a workflow from a plain-language description of the process you want. When a step delegates to an agent that does not exist yet, Quick Build proposes that agent as part of the same plan and creates it alongside the workflow.

1. In the Agent Mesh UI, select **Builder** > **Quick Build** from the navigation bar.

2. Describe the multi-step process you want to automate, name the steps, and say how they connect. Quick Build proposes a build plan that lists the workflow and any new agents its steps delegate to, and shows the workflow as a graph on the canvas.

3. Review and refine the plan, then select **Build & Activate** to deploy. The workflow and its agents come online immediately.

For the full Quick Build walkthrough, including how to review the plan, refine it through conversation, and test what you build, see [Quick Build (Experimental)](../quick-build.md).

## Viewing and Managing Workflows

A deployed workflow appears on the **Workflows** page in the Agent Mesh UI, which lists each workflow with its version and status. Select a workflow to open its detail view, which shows the workflow as a graph diagram. The diagram is a read-only visualization; to change a workflow, select **Edit** to reopen it in Quick Build, or update its declarative config and reapply.

## Define Workflows as Code Instead

Quick Build creates workflows through the Agent Mesh UI. If you prefer to describe a workflow as version-controllable YAML and reconcile it with `sam config apply` (the path that suits GitOps and automation), see [Creating Workflows with the CLI (Early Access)](./cli.md).

## What Next?

You have a workflow running in Agent Mesh. Most readers next want to give the agents a workflow delegates to richer capabilities, covered in [Creating Agents](../agents/index.md).
