---
title: The Event Mesh Communication Layer
description: The broker layer Agent Mesh runs on — the runtime broker connection block, the namespace tenant fence, the durable queues you will see on the broker, and what the dev and in-memory brokers give up that a production broker keeps.
sidebar_position: 530
---

# The Event Mesh Communication Layer

Every cross-process message in an Agent Mesh deployment travels on a broker. The Entrypoint Executor never calls the agent runtime (the Agent-Workflow Executor) over HTTP; the Agent-Workflow Executor never calls the Secure Tool Runtime over HTTP; peer agents never call each other over HTTP. They all publish to and subscribe to topics on the broker, and the broker decides who hears what.

This page is the operational view of that layer: the connection block you configure per component, the namespace that fences one deployment off from another, the durable queues you will see on the broker, and the production properties the dev and in-memory brokers do not provide. For the wire format carried over these topics — the JSON-RPC envelope, the full topic table, user-property headers, and the JWT trust chain — see [Agent-to-Agent Protocol](../concepts/a2a-protocol.md).

## The Broker Connection Block

Each component reads its broker connection from a `broker:` block. The block lives under the component's entry in `apps:`; a top-level `broker:` block is used as a fallback when an app declares none. If both are present, the per-app block wins and the top-level block is ignored.

```yaml
# component runtime config
...
apps:
  - name: my_agent
    broker:
      dev_mode:              ${SOLACE_DEV_MODE, false}
      broker_url:            ${SOLACE_BROKER_URL, ws://localhost:8008}
      broker_vpn:            ${SOLACE_BROKER_VPN, default}
      broker_username:       ${SOLACE_BROKER_USERNAME, default}
      broker_password:       ${SOLACE_BROKER_PASSWORD}
      reconnection_strategy: forever_retry
      retry_interval:        5000
      trust_store_path:      ${SOLACE_TLS_TRUST_STORE_DIR}
      tls_skip_verify:       false
...
```

The env-var names above (`SOLACE_BROKER_URL`, `SOLACE_BROKER_VPN`, and the rest) are a convention of the shipped configuration, not fixed by the runtime — the substitution syntax `${VAR, default}` works with any variable name you choose.

The keys the runtime reads:

| Key | Type | Default | Purpose |
|---|---|---|---|
| `dev_mode` | bool | inferred (see below) | Selects the dev broker instead of a production connection. |
| `broker_url` | string | none — required for a production connection | Broker connection URL. A `tcps://` or `wss://` scheme enables TLS. |
| `broker_vpn` | string | `default` | Message VPN name — the isolated messaging environment (a "virtual broker") on the Solace event broker that the client connects to. One physical broker hosts many, each with its own client authentication, topic space, queues, and spool quota. `default` is the built-in VPN on a fresh software broker; a managed broker (for example, Solace Cloud) assigns a specific name you take from its connection details. |
| `broker_username` | string | `default` | Client username for broker authentication. |
| `broker_password` | string | empty | Client password. Supply via an env-var placeholder — never inline. |
| `reconnection_strategy` | string | `forever_retry` | `forever_retry` reconnects indefinitely; `parametrized_retry` gives up after `retry_count` attempts. |
| `retry_count` | int | `60` | Reconnect attempts before giving up. Honored only when `reconnection_strategy: parametrized_retry`; ignored (with a warning) otherwise. |
| `retry_interval` | int (milliseconds) | `5000` | Delay between reconnect attempts. |
| `trust_store_path` | string | resolved (see [Configuring TLS](./tls.md)) | Directory of CA certificates for a TLS broker connection. |
| `tls_skip_verify` | bool | `false` | Disables broker certificate validation on a `tcps://` / `wss://` connection. Logs a warning; never set `true` in production. |

On Kubernetes the Helm chart renders these values for you from `broker.url`, `broker.vpn`, `broker.clientUsername`, and `broker.password`. Set those in your chart values rather than editing the rendered runtime config — see [Event Broker](../installing/configure.md#event-broker) and [Installing Kubernetes for Production](../installing/kubernetes/production.md).

### Choosing the Broker Implementation

`dev_mode` selects which broker a component connects to:

- `dev_mode: true` — the component connects to the dev broker (see [Three Brokers, One Interface](#three-brokers-one-interface)). It reads the dev broker's address from the `SAM_DEV_BROKER_HOST` and `SAM_DEV_BROKER_PORT` environment variables; both must be set.
- `dev_mode: false` (or absent with a non-empty `broker_url`) — the component opens a production connection to the URL in `broker_url`.
- `dev_mode` absent **and** `broker_url` empty — the component defaults to dev mode.

The URL scheme does not select the implementation; it only controls TLS on a production connection (`tcps://` and `wss://` enable it, `tcp://` and `ws://` do not). The desktop app runs the in-memory broker instead and sets these variables for its child processes automatically.

### Keys the Runtime Ignores

The following keys sometimes appear in a `broker:` block but the runtime does not act on them. Remove them to avoid implying behavior that does not exist:

- `temporary_queue` — reply channels are provisioned by the runtime directly; this key has no effect.
- `client_name` — the broker connection does not set a client name from config.
- `keepalive`, `compression`, `payload_encoding` — not honored.
- `broker_type`, `create_queue_on_start`, `queue_non_exclusive`, `max_redelivery_count` — the implementation is chosen by `dev_mode`, and queue access type and redelivery are set per queue by the runtime (see [Redelivery, TTL, and Spool Limits](#redelivery-ttl-and-spool-limits)), not by a broker-level key.

### The Event Mesh Entrypoint's Data-Plane Broker

The `broker:` block above configures the **control-plane** broker — the one every component uses for internal messaging. An Event Mesh Entrypoint additionally connects to a **data-plane** broker: the broker carrying the external business events it bridges into the mesh. That second connection is a separate `event_mesh_broker_config` block with the same connection keys (`broker_url`, `broker_vpn`, `broker_username`, `broker_password`, `tls_skip_verify`), and it can point at a different broker, VPN, and credentials than the control plane. The entrypoint's ingest queue (`<namespace>/q/eventmesh/<gatewayID>/<handlerName>`) is provisioned on that data-plane broker, not on the control-plane broker.

## The Namespace as a Tenant Fence

Every topic and queue Agent Mesh creates begins with a namespace prefix. It is set per component under `app_config`:

```yaml
# component runtime config
...
app_config:
  namespace: ${NAMESPACE, solace-agent-mesh}
...
```

The default is `solace-agent-mesh`. A single event mesh can carry several independent Agent Mesh deployments by giving each a distinct namespace — production traffic on `prod`, a staging deployment on `staging`, a developer's branch on `dev-alice`. Each deployment subscribes only inside its own prefix and is invisible to the others. This is what lets teams share one broker without seeing each other's traffic.

The namespace is a different layer from the `broker_vpn` above. The Message VPN is the broker's own isolation boundary — a virtual broker with its own authentication and quotas; the namespace is a topic-prefix *inside* one VPN. Several namespaced Agent Mesh deployments can share a single Message VPN, so choosing distinct namespaces is what keeps them apart, not separate VPNs.

The namespace is validated when each component loads its config, and a bad value fails startup rather than producing topics that escape the intended prefix. The rules:

- An empty value is allowed — the component substitutes the default `solace-agent-mesh`.
- It must not start with `/`.
- Allowed characters are letters, digits, `.`, `_`, `/`, and `-`. Any other character — including the broker wildcards `*` and `>` — is rejected.
- No `..` path-traversal segment is allowed.

On Kubernetes, set the namespace once through the chart's `global.persistence.namespaceId`, which scopes both the database users and the broker topics for the installation. Make it unique per installation so deployments sharing a broker do not collide on topics.

## The Queues You Will See on the Broker

Under a production Solace event broker, Agent Mesh provisions durable queues you can observe and monitor. Every durable queue name follows one shape:

```text
<namespace>/q/<subsystem>/<parts...>
```

The queues an operator most often needs to know about:

| Queue | Owner | Access | What it absorbs |
|---|---|---|---|
| `<namespace>/q/a2a/<agentName>` | Agent | Non-exclusive | All requests to an agent. Multiple Agent-Workflow Executor replicas of the same agent share the queue and round-robin its messages; a failed pod's unacknowledged messages are redelivered to a survivor. |
| `<namespace>/q/a2a/<workflowName>` | Workflow | Non-exclusive | All requests to a workflow-type agent. Same competing-consumer behavior as agent queues. |
| `<namespace>/q/str/<workerID>` | Secure Tool Runtime worker | Non-exclusive | Remote-tool invocations for one worker role. Replicas with the same `workerID` share the queue; a different `workerID` gets its own queue, which is how skill-bundled tool isolation works. |
| `<namespace>/q/proxy/<name>` | Agent-Workflow Executor proxy | Non-exclusive | Requests routed to a proxied external agent. |
| `<namespace>/q/gdk/gateway/<gatewayID>` | Entrypoint | Exclusive | The per-task event stream from agents — final task responses plus status and artifact updates — kept durable so an entrypoint does not lose in-flight task events across restarts. A firehose queue (see below). |
| `<namespace>/q/gdk/task_log/<gatewayID>` | Entrypoint | Exclusive | The per-entrypoint task-event log stream. A firehose queue (see below). |

Other subsystems provision durable queues under the same `<namespace>/q/<subsystem>/...` convention — `eventmesh` (per Event Mesh entrypoint handler), `gdk` (also the notification-delivery queue, alongside the entrypoint firehose queues above), `notify`, `schedule`, `platform`, and `eval`. Because every queue name carries the namespace prefix, a broker ACL profile can grant or deny queue access by prefix per deployment.

Two of these queues are provisioned as high-volume **firehose** queues — exclusive, opted into broker flow control, and capped at a fixed spool size (1024 MB each): the entrypoint event queue and the task-log queue. When their in-process buffers fill, the broker pauses delivery so the backlog parks in the durable queue rather than growing in memory, and the spool cap keeps a stalled consumer from starving the rest of the VPN. Account for these caps when you size the message spool.

### Durable Queues Versus Direct Subscriptions

Not every subscription uses a durable queue. Agent Mesh uses two delivery patterns, and the choice determines what survives a crash:

- **Durable named queues (competing consumers)** back the intake queues above. The broker delivers each message to exactly one bound consumer and holds undelivered messages across restarts. This is the mechanism behind horizontal scaling and crash safety — add a replica by binding another consumer, remove one by disconnecting, and the broker redelivers anything unacknowledged.
- **Direct subscriptions (per-replica fan-out)** back discovery cards, trust cards, peer-response reply channels, and control signals. Every subscribed replica receives every matching message, and there is no durability — if no replica is connected when a message is published, it is dropped. This is correct where every replica needs a copy (discovery, trust) or where only the replica that started a conversation can act on the reply (peer responses).

For how these patterns compose into scaling, multi-entrypoint, and multi-tenant deployments, see the conceptual companion, [The Event-Driven Mesh](../concepts/event-driven-mesh.md).

## Redelivery, TTL, and Spool Limits

The intake queues can be tuned to bound a poison-pill task — one that crashes the consumer on every delivery and would otherwise be redelivered into a freshly-restarted pod forever. Two keys under an agent's `app_config` (and the equivalent under a Secure Tool Runtime worker's config) control this:

| Key | Type | Default | Effect |
|---|---|---|---|
| `max_message_redelivery` | int | `1` | Maximum times the broker redelivers a task before dead-lettering or discarding it. `0` leaves the broker default (unlimited). |
| `respect_message_ttl` | bool | `true` | Provisions the queue to honor a per-message TTL, so a request that ages out while the agent is down is dropped instead of piling up. |

Both take effect only when the durable queue is **first provisioned**. A queue that already exists on the broker keeps its current settings until it is deprovisioned — plan a deprovision step when rolling these out to a live deployment. These settings are honored only by a production broker; the dev and in-memory brokers ignore them.

## Three Brokers, One Interface

Agent Mesh defines a single broker interface with three implementations. Every component speaks the interface and never the underlying transport; the deployment shape decides which implementation is wired in, with no source change.

| Implementation | Used for | What it provides |
|---|---|---|
| **Solace event broker** | Production. Configured with a `tcps://` or `wss://` `broker_url`. | Durable queues across crashes, redelivery on negative acknowledgement, TLS, topic ACLs, guaranteed delivery with broker-side acknowledgements. |
| **Dev broker** | Local development across multiple OS processes. A small binary that speaks a subset of the broker wire protocol over TCP. | The same interface and topic semantics. No durability across the dev broker process restarting, no TLS, no ACL enforcement. |
| **In-memory broker** | The desktop app. The same dev-broker implementation with no TCP listener. | Zero-network message routing with no persistence — messages live only as long as the process. |

The Helm chart's optional in-cluster event broker (`global.broker.embedded: true`) is a distinct thing: a real, single-node Solace event broker deployed alongside Agent Mesh for evaluation — the first row above, not the in-memory broker. Disable it (`global.broker.embedded: false`) and supply an external Solace event broker for production.

### What the Dev and In-Memory Brokers Do Not Do

The dev and in-memory brokers are faithful semantic substitutes for everything an agent loop or a tool invocation needs at the wire level. They are not production brokers. What a Solace event broker does that they do not:

- **Durability across broker restarts.** A production broker persists messages on disk; a queue survives a broker upgrade. The dev broker holds messages in process memory — if it restarts, in-flight messages are lost.
- **Redelivery on negative acknowledgement.** On a production broker, a consumer that negatively acknowledges a message — or disconnects with it unacknowledged — causes redelivery to another consumer on the same queue. The dev broker logs the negative acknowledgement and does not redeliver it.
- **TLS and broker authentication.** A production broker supports `tcps://` and `wss://` with mutual TLS; the dev broker speaks plaintext only.
- **Topic ACLs.** The trust model's safety property — that a peer agent cannot impersonate an entrypoint — depends on broker ACLs refusing a publish on the trust-card topic from anyone but the legitimate component. The dev broker enforces no ACL.

:::warning
The in-memory broker has no persistence at all — restarting loses every in-flight message and every unacknowledged event. This is by design, and its reliability does not transfer to a multi-process deployment.
:::

## What Next?

You have the operational shape of the broker layer. To wire an external broker into a Kubernetes deployment, see [Configure Your Helm Values](../installing/kubernetes/production.md#configure-your-helm-values). For the TLS trust-store details behind `trust_store_path`, see [Configuring TLS](./tls.md).
