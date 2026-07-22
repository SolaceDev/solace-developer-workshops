---
title: Microsoft Teams Entrypoints with the CLI
description: Define a Microsoft Teams entrypoint as declarative-config YAML and apply it into Agent Mesh with sam config.
sidebar_position: 2
---

# Microsoft Teams Entrypoints with the CLI

To create and manage Teams entrypoints from the Agent Mesh UI, and to understand the deployment lifecycle and shared model that every entrypoint type follows, see [Microsoft Teams Entrypoints](./index.md), and [Configuring Entrypoints](../index.md). This page covers authoring a Teams entrypoint as *declarative config*: the YAML specific to the `entrypoint` kind with `type: teams`, applied to Agent Mesh with `sam config apply`.

The example on this page is the same `Company Assistant` entrypoint that the Agent Mesh UI page builds, so you can compare the two paths directly.

## Before You Start

You need a running Agent Mesh instance to apply config to. For how to install or deploy one, see [Install and Deploy](../../../installing/index.md). The Agent Mesh host must be reachable at a public HTTPS URL so the Microsoft Bot Framework Connector can call the entrypoint.

You also need the Microsoft-side setup: an Azure app registration, an Azure Bot resource, and a Teams app package installed in the Teams tenant. For the full walkthrough, see the [Prerequisites](./index.md#prerequisites) section of the Agent Mesh UI page.

The entrypoint references an agent by name. The following example routes to an `orchestrator-agent`; substitute the name of an agent already deployed in your mesh.

## Write the Entrypoint

An entrypoint is one file under the `entrypoints/` directory of a declarative-config repo, listed by name in the manifest.

```yaml
# manifest.yaml
kind: manifest
name: company-assistant
description: Company-wide Teams entrypoint.
target:
  url: http://127.0.0.1:8800
resources:
  entrypoints:
    - company-assistant
```

The following file defines the Teams entrypoint. `spec.type` is `teams`, `spec.slug` sets the URL-stable path segment used in the messaging-endpoint URL (see [Apply and Verify](#apply-and-verify)), and the Teams-specific fields go under `spec.values`.

```yaml
# entrypoints/company-assistant.yaml
kind: entrypoint
name: company-assistant
description: Teams bot that routes messages to the company-wide orchestrator agent.
spec:
  type: teams
  slug: company-assistant
  deploy: true
  values:
    default_agent_name: orchestrator-agent
    microsoft_app_id: "12345678-1234-1234-1234-123456789abc"
    microsoft_app_password: ${TEAMS_APP_PASSWORD}
    microsoft_app_tenant_id: "abcdef01-2345-6789-abcd-ef0123456789"
    initial_status_message: Processing your request...
    enable_typing_indicator: true
    max_download_file_size_mb: 100
```

The top-level `name` and `description` identify the entrypoint; `description` is required and must be 10 to 1,000 characters. The fields under `spec` map to the Teams entrypoint form in the Agent Mesh UI:

| Field | Description |
|---|---|
| `type` | The entrypoint type. Set to `teams` for a Microsoft Teams entrypoint. Immutable after creation. |
| `spec.slug` | The URL-stable path segment used in the deployed messaging-endpoint URL. When set, the entrypoint mounts at `/gw/<slug>/api/messages`. When omitted, the URL uses the entrypoint's UUID instead. Set it here so the messaging endpoint on the Azure Bot resource stays stable across delete/recreate; the Agent Mesh UI does not expose this field. |
| `values.default_agent_name` | The agent that handles every inbound message. Defaults to `Orchestrator`. |
| `values.microsoft_app_id` | The Application (client) ID from the Azure app registration. GUID format. |
| `values.microsoft_app_password` | The client-secret Value from the Azure app registration. Required. |
| `values.microsoft_app_tenant_id` | The Directory (tenant) ID from the Azure app registration. Required for single-tenant bots; leave empty for multi-tenant. |
| `values.initial_status_message` | The message posted while the agent is thinking. Defaults to `Processing your request...`. Leave empty to suppress the placeholder. |
| `values.enable_typing_indicator` | `true` (the default) shows "is typing" while the agent works. `false` disables it. YAML bool, unquoted. |
| `values.max_download_file_size_mb` | Cap on inbound file attachments in MB. Defaults to `100`; accepts values from `1` to `500`. |
| `deploy` | When `true`, apply creates the entrypoint and brings its endpoint online. Set it to `false` to save the entrypoint without exposing the endpoint. |

Reference the client secret through the environment so the YAML is safe to commit. Provide the real value when you run `sam config apply`.

To discover every field the `teams` entrypoint type accepts, run `sam config schema show entrypoint --type teams`. To print a templated starting file, run `sam config schema example entrypoint --type teams`.

## Apply and Verify

Preview the change with `sam config plan -m manifest.yaml`, then apply the manifest to create and deploy the entrypoint:

```bash
export TEAMS_APP_PASSWORD=...
sam config apply -m manifest.yaml
```

```text
Applied entrypoints:
  + company-assistant  created
Deployments:
  * company-assistant  deploy (deploy) completed
```

After the entrypoint deploys, its messaging endpoint takes the following form:

```text
https://<your-agent-mesh-host>/gw/company-assistant/api/messages
```

The `company-assistant` segment comes from the `spec.slug` field on the YAML resource; when `slug` is omitted, the URL uses the entrypoint's UUID instead. Open the Azure Bot resource in the Azure Portal, and paste the URL into **Configuration** > **Messaging endpoint**. For the full Microsoft-side setup, see [Microsoft Teams Entrypoints](./index.md).

To confirm the running state, export the entrypoint back into YAML with `sam config pull -o ./pulled --url http://127.0.0.1:8800 --only entrypoint`, or open the Agent Mesh UI and find `company-assistant` in the entrypoints list on the **Entrypoints** page.

## What Next?

You have a Teams entrypoint defined as version-controllable YAML and deployed with `sam config apply`. Most readers next want to:

- Define another entrypoint type as YAML: [Slack Entrypoints with the CLI](../slack/cli.md), [MCP Entrypoints with the CLI](../mcp/cli.md), or [Event Mesh Entrypoints with the CLI](../event-mesh/cli.md).
- Configure Teams entrypoints from the Agent Mesh UI: [Microsoft Teams Entrypoints](./index.md).
