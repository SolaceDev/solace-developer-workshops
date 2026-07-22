---
title: Slack Entrypoints with the CLI
description: Define a Slack entrypoint as declarative-config YAML and apply it into Agent Mesh with sam config.
sidebar_position: 2
---

# Slack Entrypoints with the CLI

To create and manage Slack entrypoints from the Agent Mesh UI, and to understand the deployment lifecycle and shared model that every entrypoint type follows, see [Slack Entrypoints](./index.md), and [Configuring Entrypoints](../index.md). This page covers authoring a Slack entrypoint as *declarative config*: the YAML specific to the `entrypoint` kind with `type: slack`, applied to Agent Mesh with `sam config apply`.

The example on this page is the same `Engineering Support Bot` entrypoint that the Agent Mesh UI page builds, so you can compare the two paths directly.

## Before You Start

You need a running Agent Mesh instance to apply config to. For how to install or deploy one, see [Install and Deploy](../../../installing/index.md).

You also need the Slack app and its two tokens. For the Slack-side setup (Bot Token scopes, event subscriptions, and Socket Mode), see the [Prerequisites](./index.md#prerequisites) section of the Agent Mesh UI page.

The entrypoint references an agent by name. The following example routes to an `engineering-assistant` agent; substitute the name of an agent already deployed in your mesh.

## Write the Entrypoint

An entrypoint is one file under the `entrypoints/` directory of a declarative-config repo, listed by name in the manifest.

```yaml
# manifest.yaml
kind: manifest
name: engineering-support
description: Engineering-team Slack entrypoint.
target:
  url: http://127.0.0.1:8800
resources:
  entrypoints:
    - engineering-support-bot
```

The following file defines the Slack entrypoint. `spec.type` is `slack`, and the Slack-specific fields go under `spec.values`.

```yaml
# entrypoints/engineering-support-bot.yaml
kind: entrypoint
name: engineering-support-bot
description: Slack bot for the engineering team to interact with documentation and code-analysis agents.
spec:
  type: slack
  deploy: true
  values:
    default_agent_name: engineering-assistant
    bot_token: ${SLACK_BOT_TOKEN}
    app_token: ${SLACK_APP_TOKEN}
```

The top-level `name` and `description` identify the entrypoint; `description` is required and must be 10 to 1,000 characters. The fields under `spec` map to the Slack entrypoint form in the Agent Mesh UI:

| Field | Description |
|---|---|
| `type` | The entrypoint type. Set to `slack` for a Slack entrypoint. Immutable after creation. |
| `values.default_agent_name` | The agent that handles messages when the user does not name one inline. Defaults to `Orchestrator`. |
| `values.bot_token` | The Bot User OAuth Token from the Slack app's **OAuth & Permissions** page. Must start with `xoxb-`. Between 1 and 500 characters. |
| `values.app_token` | The App-Level Token from the Slack app's **Basic Information** page. Must start with `xapp-`. Between 1 and 500 characters. |
| `deploy` | When `true`, apply creates the entrypoint and brings it online. Set it to `false` to save the entrypoint without connecting to Slack. |

Reference both tokens as `${SLACK_BOT_TOKEN}` and `${SLACK_APP_TOKEN}` so the YAML is safe to commit. Provide the real values through the environment when you run `sam config apply`.

To discover every field the `slack` entrypoint type accepts, run `sam config schema show entrypoint --type slack`. To print a templated starting file, run `sam config schema example entrypoint --type slack`.

## Apply and Verify

Preview the change with `sam config plan -m manifest.yaml`, then apply the manifest to create and deploy the entrypoint:

```bash
export SLACK_BOT_TOKEN=xoxb-...
export SLACK_APP_TOKEN=xapp-...
sam config apply -m manifest.yaml
```

```text
Applied entrypoints:
  + engineering-support-bot  created
Deployments:
  * engineering-support-bot  deploy (deploy) completed
```

To confirm the running state, export the entrypoint back into YAML with `sam config pull -o ./pulled --url http://127.0.0.1:8800 --only entrypoint`, or open the Agent Mesh UI and find `engineering-support-bot` in the entrypoints list on the **Entrypoints** page.

## What Next?

You have a Slack entrypoint defined as version-controllable YAML and deployed with `sam config apply`. Most readers next want to:

- Define another entrypoint type as YAML: [Microsoft Teams Entrypoints with the CLI](../teams/cli.md), [MCP Entrypoints with the CLI](../mcp/cli.md), or [Event Mesh Entrypoints with the CLI](../event-mesh/cli.md).
- Configure Slack entrypoints from the Agent Mesh UI: [Slack Entrypoints](./index.md).
