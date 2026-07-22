---
title: Creating Agents with the CLI
description: Define an agent as declarative-config YAML and apply it into Agent Mesh with sam config.
sidebar_position: 2
---

# Creating Agents with the CLI

To create and manage agents from the Agent Mesh UI, and to understand what an agent is and how it runs, see [Creating Agents](./index.md). This page covers authoring an agent as version-controllable YAML, called *declarative config*: the YAML specific to the `agent` kind. For the `sam config plan`, `apply`, and `pull` workflow that applies to every kind, see [Managing Configuration as Code (Early Access)](../declarative-config/index.md).

The example on this page is the same `release-notes-assistant` agent that the Agent Mesh UI page builds, so you can compare the two paths directly.

## Before You Start

You need a running Agent Mesh instance to apply config to. For how to install or deploy one, see [Install and Deploy](../../installing/index.md).

The agent references a model by its alias. The first time you start an instance, the setup wizard connects a large language model (LLM) provider and exposes it as the `general` model alias, the same default the Agent Mesh UI uses. The steps below assume that `general` model exists.

## Write the Agent

An agent is one file under the `agents/` directory of a declarative-config repo, listed by name in the manifest:

```yaml
# manifest.yaml
kind: manifest
name: release-notes
description: Release-notes assistant agent.
target:
  url: http://127.0.0.1:8800
resources:
  agents:
    - release-notes-assistant
```

The following file defines the release-notes assistant: the instructions in `systemPrompt`, the `general` model in `modelProvider`, and the Time Tools toolset in `toolsets`.

```yaml
# agents/release-notes-assistant.yaml
kind: agent
name: release-notes-assistant
description: Turns a list of merged changes into a grouped Markdown release-notes summary.
spec:
  systemPrompt: |
    You are a release-notes assistant for a software team. When given a list of merged
    changes, group them into Features, Fixes, and Breaking Changes, and write a concise
    Markdown summary in a friendly, professional tone. Ask a clarifying question if the
    version number or release date is missing.
  modelProvider:
    - general
  toolsets:
    - builtin_time_tools
  inputModes:
    - text
  outputModes:
    - text
  skills:
    - id: release_notes
      name: Release Notes
      description: Group a list of merged changes into a Markdown release-notes summary.
  deploy: true
```

The top-level `name` and `description` identify the agent; `description` is required and must be 10 to 1,000 characters. The fields under `spec` map to the sections of the Agent Mesh UI editor:

| Field | Description |
|---|---|
| `systemPrompt` | The instructions that define the agent's role and behavior. Required, and between 100 and 10,000 characters; the preceding example clears the minimum. |
| `modelProvider` | The model alias the agent uses for its reasoning, such as `general`. This is the **Model** picker in the Agent Mesh UI. |
| `toolsets` | The toolset IDs the agent can call. `builtin_time_tools` is the **Time Tools** toolset. For the other built-in toolsets, see [Creating Toolsets](../toolsets.md). |
| `inputModes`, `outputModes` | The communication modes the agent accepts and produces, such as `text`. |
| `skills` | The agent card capability entries other agents and entrypoints read to decide when to delegate to this agent. Each entry needs a `name` and a `description`, plus an optional `id` for stable routing. |
| `deploy` | When `true`, apply creates the agent and brings it online. Set it to `false` to save the agent without starting it, the equivalent of the Agent Mesh UI's **Create** action. |

To discover every field the `agent` kind accepts, run `sam config schema show agent`. To print a templated starting file, run `sam config schema example agent`.

## Configure Settings Not Yet Modeled as Fields

Some agent settings do not have a dedicated `spec` field yet. The `additionalConfigurations` block holds those keys, deep-merged into the agent's deploy-time configuration. Peer delegation is one example: add the following block to the agent's existing `spec` to let it delegate to any peer agent over the Agent-to-Agent (A2A) protocol.

```yaml
# agents/release-notes-assistant.yaml
...
spec:
  additionalConfigurations:
    interAgentCommunication:
      allowList:
        - "*"
...
```

Run `sam config schema show agent` to see which settings are dedicated fields and which belong under `additionalConfigurations`.

## Apply and Verify

Preview the change with `sam config plan -m manifest.yaml`, then apply the manifest to create and deploy the agent:

```bash
sam config apply -m manifest.yaml
```

```text
Applied agents:
  + release-notes-assistant  created
Deployments:
  * release-notes-assistant  deploy (deploy) completed
```

To confirm the running state, export the agent back into YAML with `sam config pull -o ./pulled --url http://127.0.0.1:8800 --only agent`, or open the Agent Mesh UI and find `release-notes-assistant` under the **Deployed** tab on the **Agent Management** page. For information about the plan and apply diff behavior, the display-only delete entries, and the `--prune` flag, see [Managing Configuration as Code (Early Access)](../declarative-config/index.md).

## What Next?

You have an agent defined as version-controllable YAML and deployed with `sam config apply`. Most readers next want to give it richer capabilities:

- To bundle reusable tools with the instructions that drive their use, see [Creating Toolsets](../toolsets.md).
- To create and manage agents from the Agent Mesh UI, see [Creating Agents](./index.md).
