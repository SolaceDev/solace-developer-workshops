---
title: Event Mesh Entrypoints with the CLI
description: Define an Event Mesh entrypoint as declarative-config YAML and apply it into Agent Mesh with sam config.
sidebar_position: 2
---

# Event Mesh Entrypoints with the CLI

To create and manage Event Mesh entrypoints from the Agent Mesh UI, and to understand rules, targets, and the shared model that every entrypoint type follows, see [Event Mesh Entrypoints](./index.md), and [Configuring Entrypoints](../index.md). This page covers authoring an Event Mesh entrypoint as *declarative config*: the YAML specific to the `entrypoint` kind with `type: event_mesh`, applied to Agent Mesh with `sam config apply`.

The example on this page is the same `Order Processing Entrypoint` that the Agent Mesh UI page builds, so you can compare the two paths directly.

## Before You Start

You need a running Agent Mesh instance to apply config to. For how to install or deploy one, see [Install and Deploy](../../../installing/index.md).

You also need broker access: a reachable Solace broker, ACL permissions to subscribe to every topic listed in your rules, and network connectivity from Agent Mesh to the broker if you use a broker other than the system broker. For details, see the [Prerequisites](./index.md#prerequisites) section of the Agent Mesh UI page.

The entrypoint references an agent or a workflow by name. The following example routes to an `order-processor` agent; substitute the name of an agent or workflow already deployed in your mesh.

## Write the Entrypoint

An entrypoint is one file under the `entrypoints/` directory of a declarative-config repo, listed by name in the manifest.

```yaml
# manifest.yaml
kind: manifest
name: order-processing
description: Order-processing Event Mesh entrypoint.
target:
  url: http://127.0.0.1:8800
resources:
  entrypoints:
    - order-processing-entrypoint
```

The following file defines an Event Mesh entrypoint with one event rule. `spec.type` is `event_mesh`, and the Event-Mesh-specific fields go under `spec.values`.

```yaml
# entrypoints/order-processing-entrypoint.yaml
kind: entrypoint
name: order-processing-entrypoint
description: Routes commerce order events to the order-processor agent.
spec:
  type: event_mesh
  deploy: true
  values:
    broker_url: "tcps://commerce-broker.example.com:55443"
    broker_vpn: commerce
    broker_username: sam-entrypoint
    broker_password: ${COMMERCE_BROKER_PASSWORD}
    tls_skip_verify: "false"
    event_rules:
      - name: process_orders
        subscriptions:
          - topic: "commerce/orders/>"
        messageFormat: json
        targetAgent: order-processor
        promptTemplate: "Process the following order event: {payload}"
        acknowledgmentPolicy:
          mode: on_completion
          timeoutSeconds: 300
        successOutput:
          enabled: true
          topic: "commerce/orders/processed"
          topicType: static
          responseType: full
        errorOutput:
          enabled: true
          topic: "commerce/orders/errors"
          topicType: static
```

The top-level `name` and `description` identify the entrypoint; `description` is required and must be 10 to 1,000 characters. The fields under `spec.values` map to the Event Mesh entrypoint form in the Agent Mesh UI:

| Field | Description |
|---|---|
| `broker_url` | Broker URI with scheme and port, for example `tcps://broker.example.com:55443`. Leave empty in desktop mode to fall back to the local development broker (development and trial use only). |
| `broker_vpn`, `broker_username` | Message VPN and client username. |
| `broker_password` | Broker client password. Reference through the environment; leave the placeholder to keep the existing value on apply. |
| `tls_skip_verify` | `"false"` (the default) validates the broker's TLS certificate. `"true"` disables validation and suits development only. |
| `event_rules` | The list of rules. At least one rule is required. |

Each entry under `event_rules` has the following shape:

| Field | Description |
|---|---|
| `name` | Rule identifier, unique within the entrypoint. Allowed characters: letters, digits, `_`, and `-`. |
| `subscriptions` | List of topic objects (`- topic: "commerce/orders/>"`). `*` matches one level; `>` matches one or more levels. At least one is required. |
| `messageFormat` | Inbound payload encoding. One of `json`, `text`, `xml`, `raw_bytes`, `protobuf`, or `structured`. Defaults to `json`. |
| `targetAgent` or `targetWorkflowName` | Set exactly one. Names the agent or workflow that handles matching messages. |
| `promptTemplate` | Template rendered against the inbound message. Required when a target is set, unless the target is a workflow that uses `inputExpression`. `{payload}` expands to the full payload, `{topic}` expands to the inbound topic, and `{payload.path.to.field}` extracts a field from a JSON payload. Same syntax as the Agent Mesh UI form. |
| `defaultUserIdentity`, `userIdentityExpression` | Attribute the dispatched task to a static identity or an expression that resolves to one per message. |
| `acknowledgmentPolicy` | Object with `mode` (`on_receive` or `on_completion`), `timeoutSeconds` (defaults to 300), and `onFailure` (Action, Nack outcome). |
| `successOutput`, `errorOutput` | Object with `enabled`, `topic`, `topicType` (`static` or `dynamic`), `responseType` (`text`, `full`, `structured`, `error`, or `custom`), and `customExpression` when `responseType` is `custom`. |
| `forwardContext`, `structuredInvocation`, `artifactProcessing` | Advanced shape extensions; see [Optional Shape Extensions](./index.md#optional-shape-extensions) for the behavior. |

Reference the broker password through the environment so the YAML is safe to commit. Provide the real value when you run `sam config apply`.

To discover every field the `event_mesh` entrypoint type accepts, run `sam config schema show entrypoint --type event_mesh`. To print a templated starting file, run `sam config schema example entrypoint --type event_mesh`.

## Apply and Verify

Preview the change with `sam config plan -m manifest.yaml`, then apply the manifest to create and deploy the entrypoint:

```bash
export COMMERCE_BROKER_PASSWORD=...
sam config apply -m manifest.yaml
```

```text
Applied entrypoints:
  + order-processing-entrypoint  created
Deployments:
  * order-processing-entrypoint  deploy (deploy) completed
```

Publish a message to a topic the entrypoint subscribes to and confirm the target agent receives it. To confirm the deployed configuration, export the entrypoint back into YAML with `sam config pull -o ./pulled --url http://127.0.0.1:8800 --only entrypoint`, or open the Agent Mesh UI and find `order-processing-entrypoint` in the entrypoints list on the **Entrypoints** page.

## What Next?

You have an Event Mesh entrypoint defined as version-controllable YAML and deployed with `sam config apply`. Most readers next want to:

- Define another entrypoint type as YAML: [Slack Entrypoints with the CLI](../slack/cli.md), [Microsoft Teams Entrypoints with the CLI](../teams/cli.md), or [MCP Entrypoints with the CLI](../mcp/cli.md).
- Configure Event Mesh entrypoints from the Agent Mesh UI: [Event Mesh Entrypoints](./index.md).
