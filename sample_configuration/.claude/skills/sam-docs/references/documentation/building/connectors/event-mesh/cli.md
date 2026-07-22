---
title: Event Mesh Connectors via the CLI
description: Define an Event Mesh connector as declarative-config YAML and apply it into Agent Mesh with sam config.
sidebar_position: 2
---

# Event Mesh Connectors via the CLI

To configure this connector in the Agent Mesh UI, see [Event Mesh Connectors](./index.md). This page covers authoring the connector as version-controllable YAML, called *declarative config*: the YAML specific to the `connector` kind. For the `sam config plan`, `apply`, and `pull` workflow that applies to every kind, see [Managing Configuration as Code (Early Access)](../../declarative-config/index.md).

Each connector is one file under the `connectors/` directory of a declarative-config repo. The `spec.type` and `spec.subtype` fields select the connector schema, and `spec.values` carries the same configuration fields available in the Agent Mesh UI. Reference secret fields as `${VAR}` environment placeholders that are resolved at apply time and never written to the file.

An Event Mesh connector has two parts under `spec.values`: the event broker connection, and a list of `operations`. Each operation becomes one agent tool that publishes to one topic.

## Example

The following connector connects to a Solace event broker and defines two tools: a Request-Reply tool that looks up order status, and a Publish-Subscribe tool that emits a shipping event.

```yaml
# connectors/order-service.yaml
kind: connector
name: order-service
description: "Order service operations over the event mesh."
spec:
  type: event_mesh
  subtype: solace
  values:
    broker_url: tcps://broker.example.com:55443
    broker_vpn: default
    broker_username: agent-mesh
    broker_password: ${ORDER_SERVICE_BROKER_PASSWORD}
    operations:
      - tool_name: get_order_status
        tool_description: "Get the current status of an order by its ID."
        topic: "orders/v1/{order_id}/status"
        wait_for_response: true
        payload_format: json
        request_expiry_ms: 60000
        reply_mode: temp_queue
        qos: 1
        input_schema:
          type: object
          properties:
            order_id:
              type: string
              description: "The order ID to look up."
              x-solace-payload-path: request.order_id
          required:
            - order_id
      - tool_name: notify_shipment
        tool_description: "Emit a shipping notification event for an order."
        topic: "orders/v1/{order_id}/shipped"
        wait_for_response: false
        payload_format: json
        qos: 1
        input_schema:
          type: object
          properties:
            order_id:
              type: string
              description: "The order that shipped."
            carrier:
              type: string
              description: "The shipping carrier."
              x-solace-payload-path: shipment.carrier
          required:
            - order_id
            - carrier
```

## Broker Connection Values

| Field | Required | Default | Description |
|---|---|---|---|
| `broker_url` | Yes | — | The Solace Message Format (SMF) URI of the event broker, for example, `tcps://host:55443`. The URI must start with `tcp://` or `tcps://`. |
| `broker_vpn` | Yes | — | The Message VPN the connector connects to. |
| `broker_username` | Yes | — | The client username the connector authenticates with. |
| `broker_password` | Yes | — | The client password for the client username. Reference as `${VAR}`. |

## Operation Values

Each entry in `operations` defines one tool.

| Field | Required | Default | Description |
|---|---|---|---|
| `tool_name` | Yes | — | The name shown to the language model. Lowercase letters, numbers, and underscores, starting with a letter; up to 64 characters. |
| `tool_description` | Yes | — | The description shown to the language model; drives tool selection. |
| `topic` | Yes | — | The topic the tool publishes to. Use `{property_name}` to insert a value from the operation's inputs. |
| `wait_for_response` | No | `true` | `true` for Request-Reply (publish and wait for a correlated reply); `false` for Publish-Subscribe (publish without waiting). |
| `payload_format` | No | `json` | Message body format: `json`, `yaml`, or `text`. The `text` format requires exactly one input mapped into the body. |
| `qos` | No | `1` | Delivery guarantee for the published message: `1` (Guaranteed) or `0` (Direct). |
| `request_expiry_ms` | No | `60000` | Request-Reply only. The time to wait for a reply, in ms, from `1000` to `300000`. |
| `reply_mode` | No | `temp_queue` | Request-Reply only. `temp_queue` receives the reply on a temporary queue created per call; `p2p_inbox` uses the event broker's built-in reply inbox. |
| `user_properties_reply_topic_key` | No | `__solace_ai_connector_broker_request_response_topic__` | Request-Reply, Temporary Queue only. The user-property key on the request that carries the reply destination. Change it only if your responding service reads the destination from a different key. |
| `user_properties_reply_metadata_key` | No | `__solace_ai_connector_broker_request_reply_metadata__` | Request-Reply, Temporary Queue only. The user-property key that carries the reply metadata (the `request_id` and `response_topic`) as a JSON array. |
| `input_schema` | Yes | — | JSON Schema describing the operation's inputs. For more information, see [Input Schema](#input-schema). |

In the Agent Mesh UI, these fields appear as **Response Mode** (`wait_for_response`), **Payload Schema** (`payload_format`), **Delivery Mode** (`qos`), **Timeout** (`request_expiry_ms`), and **Reply Delivery** (`reply_mode`).

For how a backend service receives a request and returns a correlated response, see [Responding to a Request-Reply Tool](./index.md#responding-to-a-request-reply-tool).

### Input Schema

The `input_schema` field is a standard JSON Schema `object`. Each property is an input the agent can supply. Two Solace extensions control how each value is used:

- `x-solace-payload-path` places the value into the message body at a dot-separated path (for example, `request.order_id`). Omit it to make the property *topic-only*, used to fill a `{property}` level of the topic but not sent in the body.
- `x-solace-context-expression` sources the value from runtime context instead of the agent. Values sourced this way are hidden from the language model and cannot be listed in `required`.

Every `{property_name}` in `topic` must be declared as a property in `input_schema`.

## Apply and Verify

List the connector in your manifest, preview with `sam config plan -m manifest.yaml`, then apply:

```bash
sam config apply -m manifest.yaml
```

The `apply` command creates the connector, or updates it in place if it already exists. Provide each `${VAR}` secret as an environment variable in the shell that runs `apply`. To confirm the result, export it back into YAML with `sam config pull -o ./pulled --url http://127.0.0.1:8800 --only connector`, or open the **Connectors** page in the Agent Mesh UI. For details on the manifest format, the `plan`/`apply`/`pull` commands, and secret handling, see [Managing Configuration as Code (Early Access)](../../declarative-config/index.md).

## Troubleshooting

If you encounter issues with the Event Mesh connector, the following tips might help.

### Event Broker Connection Refused

The agent logs `connection refused`, `no such host`, or a similar connection error when a tool runs. The most likely causes are that the `broker_url`, `broker_vpn`, or credentials are incorrect, or that a firewall or security group blocks the connection from the Agent Mesh deployment.

To resolve this issue:

1. Verify the URI scheme and port, the Message VPN name, and the client username and client password.
2. Confirm network connectivity from the Agent Mesh pod or process to the event broker's messaging port.

### Unresolved `${VAR}` in the Connection

The connector logs a connection error referencing a literal `${VAR}` string. The most likely cause is that the environment variable referenced in `spec.values` was not set in the shell that ran `sam config apply`, so the secret was stored as the literal placeholder.

To resolve this issue:

1. Export the environment variable, then re-run `sam config apply`.
2. For credentials that rotate, keep the placeholder in the file and supply the value at apply time.

### A Request-Reply Tool Times Out

A tool with `wait_for_response: true` returns no response. The most likely causes are that no backend service is subscribed to the tool's topic or replying to it, that the `request_expiry_ms` value is too short for the backend, or that the client username cannot subscribe to the connector's reply topics.

To resolve this issue:

1. Confirm that a service consumes the topic and publishes a correlated reply.
2. Increase `request_expiry_ms` if the backend needs more time to respond.
3. Grant the client username subscribe permission on the connector's reply topics.

### The Topic References an Undeclared Property

The `apply` command is rejected, or a tool fails, referencing an undeclared topic property. The most likely cause is a `{property_name}` in `topic` that is not declared in that operation's `input_schema`.

To resolve this issue:

1. Add the property to `input_schema`, and mark it `required` so the agent always supplies it.
2. Alternatively, correct the topic so it references only declared properties.

## Next Steps

- To configure the connector in the Agent Mesh UI and assign it to an agent, see [Event Mesh Connectors](./index.md).
- To manage every resource kind through the same workflow, see [Managing Configuration as Code (Early Access)](../../declarative-config/index.md).
- For the general connector workflow, see [Configuring Connectors](../index.md).
