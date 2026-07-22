---
title: Creating Workflows with the CLI (Early Access)
description: Define a workflow as declarative-config YAML and apply it into Agent Mesh with sam config.
sidebar_position: 2
---

# Creating Workflows with the CLI (Early Access)

:::warning
This feature is in the Early Access stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

To build a workflow from the Agent Mesh UI, and to understand what a workflow is and how it runs, see [Creating Workflows (Early Access)](./index.md). This page covers authoring a workflow as version-controllable YAML, called *declarative config*: the YAML specific to the `workflow` kind. For the `sam config plan`, `apply`, and `pull` workflow that applies to every kind, see [Managing Configuration as Code (Early Access)](../declarative-config/index.md).

## Before You Start

You need a running Agent Mesh instance to apply your configuration to. For how to install or deploy one, see [Install and Deploy](../../installing/index.md).

Each agent node in a workflow delegates to an agent by name, so the agents a workflow references must already exist in your deployment. Build them first, either from the Agent Mesh UI or as declarative config, as described in [Creating Agents](../agents/index.md). The following example references two agents named `paragraph-writer` and `summarizer`.

## Write the Workflow

A workflow is one file under the `workflows/` directory of a declarative-config repo, listed by name in the manifest:

```yaml
# manifest.yaml
kind: manifest
name: topic-summary
description: Topic-summary workflow.
target:
  url: http://127.0.0.1:8800
resources:
  workflows:
    - topic-summary
```

The following file defines a two-step sequential workflow under `spec.appConfig`. The `nodes` are a list; each has an `id`, a `type`, and the fields for that type. The `summarize` node declares `depends_on: [write_paragraph]`, so Agent Mesh runs it only after the first node completes. Each node's `input` and the workflow's `output_mapping` reference data with `{{...}}` templates: `{{workflow.input.<field>}}` reads a workflow input, and `{{<node-id>.output}}` reads a completed node's output.

```yaml
# workflows/topic-summary.yaml
kind: workflow
name: topic-summary
description: Writes a paragraph about a topic and then condenses it into a single sentence.
spec:
  appConfig:
    description: Two-step sequential workflow.
    output_mapping:
      summary: "{{summarize.output}}"
    nodes:
      - id: write_paragraph
        type: agent
        agent_name: paragraph-writer
        input:
          message: "Write a short factual paragraph about {{workflow.input.topic}}."
      - id: summarize
        type: agent
        agent_name: summarizer
        depends_on:
          - write_paragraph
        input:
          message: "Condense this into one sentence: {{write_paragraph.output}}"
```

The top-level `name` and `description` identify the workflow; `name` is 3 to 255 characters and `description` is 10 to 2,000. The `spec.appConfig` fields are:

| Field | Description |
|---|---|
| `description` | A description of the workflow, stored with its definition. |
| `nodes` | The list of nodes in the graph. Each entry sets `id`, `type`, and the fields for that type. |
| `output_mapping` | Required. Maps the workflow's outputs to node outputs, using `{{<node-id>.output}}` templates. |

Every node shares three fields, plus fields specific to its `type`:

| Field | Description |
|---|---|
| `id` | The node's unique identifier within the workflow. |
| `type` | The node kind: `agent`, `switch`, `map`, `loop`, `tool`, or nested `workflow`. |
| `depends_on` | The node IDs this node waits for. Agent Mesh runs a node after all of its dependencies have completed, which is how you order and branch the graph. |

An `agent` node adds `agent_name` (the agent it delegates to) and an `input` mapping. A node's `input` references workflow inputs with `{{workflow.input.<field>}}` and upstream node outputs with `{{<node-id>.output}}`. The other node types take their own fields: `switch` (`cases`, `default_case`), `map` (`items_expression`, `template_node`), `loop` (`body_node`, `condition`, `max_iterations`), `tool` (`tool_name`), and nested `workflow` (`workflow_name`, `input`).

To see every field a node type accepts, run `sam config schema show workflow --type <node-type>`, for example `sam config schema show workflow --type switch`.

## Call Tools Directly with Tool Nodes

A `tool` node calls a tool without involving an agent or an LLM. The tools a workflow can call come from three places — two `spec.appConfig` fields declared alongside `nodes`, plus connector references on the nodes themselves:

| Source | Description |
|---|---|
| `tools` | A raw tool list in the same shape agents accept, for example `tool_type: builtin` entries. |
| `toolsets` | A list of toolset names, the same names agents accept in `spec.toolsets`: your own toolsets by name, or built-in toolset IDs such as `builtin_artifact_tools`. |
| `connector:` on a tool node | A connector name in place of `tool_name`. When the connector produces more than one tool, add `tool:` to select one by its base name. |

At deploy time, Agent Mesh expands each toolset into its tools. A toolset's tools register under `<toolset>__<tool>`, which is the name a `tool` node references in `tool_name`:

```yaml
# workflows/greeter.yaml
kind: workflow
name: greeter
description: Calls a toolset tool directly, without an agent.
spec:
  appConfig:
    toolsets:
      - echo-tools
    output_mapping:
      greeting: "{{greet.output}}"
    nodes:
      - id: greet
        type: tool
        tool_name: echo-tools__greet
        input:
          name: "{{workflow.input.name}}"
```

Toolset-level configuration, such as API keys declared in the toolset's `spec.config`, is applied when the tools are expanded, so a workflow shares the same toolset configuration as the agents that use it. When you re-upload or reconfigure a toolset, Agent Mesh automatically redeploys the workflows bound to it, just as it redeploys agents.

A connector-backed node looks like this — the same connectors agents use, referenced by name (see [Configuring Connectors](../connectors/index.md)):

```yaml
    nodes:
      - id: fetch_pet
        type: tool
        connector: pets-api
        tool: getPetById
        input:
          petId: "{{workflow.input.petId}}"
```

Agent Mesh validates the connector name when you save the workflow and resolves it to the concrete tool at deploy time. Editing or renaming the connector automatically redeploys the workflows that reference it, and the reference survives the rename.

## Apply and Verify

Preview the change with `sam config plan -m manifest.yaml`, then apply the manifest to create and deploy the workflow:

```bash
sam config apply -m manifest.yaml
```

```text
Applied workflows:
  + topic-summary  created
Deployments:
  * topic-summary  deploy (deploy) completed
```

To confirm the running state, open the **Workflows** page in the Agent Mesh UI, where `topic-summary` appears, or export it back into YAML with `sam config pull -o ./pulled --url http://127.0.0.1:8800 --only workflow`. For how the plan and apply diff works, including the display-only delete entries and `--prune`, see [Managing Configuration as Code (Early Access)](../declarative-config/index.md).

## What Next?

You have a workflow defined as version-controllable YAML and deployed with `sam config apply`. Most readers next want to build the agents a workflow delegates to, covered in [Creating Agents](../agents/index.md).
