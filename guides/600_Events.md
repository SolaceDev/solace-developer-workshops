# Waking It Up, and Answering Back

No UI. No polling. No cron job.

An order fails somewhere in Meridian's estate. Something publishes a message saying so. The workflow you built runs, and the outcome comes back out onto the mesh where the order management system is already listening.

Nobody clicks anything. This is the section the rest of the workshop was building toward.

---

## Table of Contents

- [The topic taxonomy](#the-topic-taxonomy)
- [Hands-on: the entrypoint](#hands-on-the-entrypoint)
- [Hands-on: publish one message](#hands-on-publish-one-message)
- [The async return is pure configuration](#the-async-return-is-pure-configuration)
- [What you could add tomorrow](#what-you-could-add-tomorrow)
- [What happened?](#what-happened)

---

## The topic taxonomy

Before the YAML, the topics. This is a design decision, not an implementation detail, and getting it right is what makes everything after it easy.

| Direction | Topic | Purpose |
|---|---|---|
| In | `retail/order/exception/{region}/{store}` | Wakes the workflow |
| Out | `retail/order/remediated/{orderId}` | The outcome, for downstream systems |
| Out | `retail/order/escalated` | The error path, for human review |

The inbound topic is hierarchical on purpose. The order this workshop follows arrives on:

```
retail/order/exception/us-west/1042
```

Because the hierarchy carries meaning, a subscriber can choose its own precision without anyone reconfiguring the publisher:

- `retail/order/exception/>`: every exception, everywhere. This is what your entrypoint subscribes to.
- `retail/order/exception/us-west/>`: one region's exceptions, perhaps for a regional dashboard
- `retail/order/exception/*/1042`: one store across any region

`*` matches exactly one level. `>` matches one or more levels and only appears at the end.

That flexibility is a property of the topic design. Flatten it to `order-exceptions` and every subscriber gets everything and filters in code.

---

## Hands-on: the entrypoint

An entrypoint is how work reaches the mesh from outside. You have been using one all workshop without thinking about it: the web client is an entrypoint. This one listens to a broker instead of a browser.

1. Open [`sample_configuration/entrypoints/order-exception-events.yaml`](../sample_configuration/entrypoints/order-exception-events.yaml).

1. Read the event rule. It answers three questions, and that is the whole shape of the type:

    **What arrives:**

    ```
        subscriptions:
          - topic: "retail/order/exception/>"
        messageFormat: json
    ```

    **Who handles it:**

    ```
        targetWorkflowName: order-exception-remediation
        promptTemplate: |
          A fulfillment exception arrived on topic {topic}.
          Remediate order {payload.order.id}.
    ```

    > Note: The prompt template uses single braces. `{topic}` is the topic the message arrived on, `{payload}` is the whole body, and `{payload.order.id}` reaches into the JSON.

    **What goes back out:**

    ```
        successOutput:
          enabled: true
          topic: "retail/order/remediated/{order_id}"
          topicType: dynamic
          responseType: structured
    ```

1. Note the acknowledgment policy:

    ```
        acknowledgmentPolicy:
          mode: on_completion
          timeoutSeconds: 300
    ```

    > Note: `on_completion` acknowledges the broker only after the workflow finishes. If the task fails, the message is not lost. For a fulfillment exception, a dropped message is a customer who never hears back, so redelivery is the right trade.

1. Add the entrypoint to the manifest. This is the last resource, so every list is now populated:

    ```
      entrypoints:
        - order-exception-events
    ```

1. Plan and apply:

    ```
    export RETAIL_DB_PASSWORD=postgres
    sam config plan --manifest sample_configuration/manifests/local.yaml
    sam config apply --manifest sample_configuration/manifests/local.yaml
    ```

---

## Hands-on: publish one message

Now wake it up.

1. Open the **Solace Try-Me** extension from the VS Code activity bar. It has been installed the whole time.

1. Connect to the local broker:

    | Field | Value |
    |---|---|
    | Host | `ws://localhost:8008` |
    | VPN | `default` |
    | Username | `default` |
    | Password | `default` |

1. In the **Subscriber** panel, subscribe to `retail/order/>` so you can watch both directions at once. Click **Connect**.

1. In the **Publisher** panel, set the topic to:

    ```
    retail/order/exception/us-west/1042
    ```

1. Set the message body to:

    ```
    { "order": { "id": "ORD-10428" } }
    ```

1. Click **Publish**, then switch to the Solace Agent Mesh client and watch the Workflows tab.

The workflow is running. Nobody started it. The event arrived, the entrypoint matched it against a subscription, and a task was created.

1. When it finishes, go back to the Try-Me subscriber panel.

There is a second message there, on `retail/order/remediated/ORD-10428`, carrying the structured outcome. A subscriber that had been listening on that topic since before you started would have picked it up without knowing this workflow exists.

> Note: Publish the same message again and watch it run a second time, identically. Deterministic scoring is why that sentence is true.

---

## The async return is pure configuration

Look back at what you wrote to make the outcome come back.

```
    successOutput:
      enabled: true
      topic: "retail/order/remediated/{order_id}"
      topicType: dynamic
      responseType: structured
```

That is it. Four lines.

There is no publisher in this workshop. No connection handling, no serialization, no retry logic, no topic-building code, and no error handling around any of it. `successOutput` plus `acknowledgmentPolicy` is the entire mechanism, and `topicType: dynamic` builds a per-order topic by reading `order_id` out of the workflow's structured output.

People assume this part requires code, because in most architectures it does. It is worth sitting with for a moment: the request came from a broker, the answer went back to a broker, and the thing in the middle never knew either of them existed.

---

## What you could add tomorrow

Meridian's next problem is returns fraud. A small number of customers return a suspicious proportion of what they buy, and someone would like to catch it.

Here is what adding that costs you, given what is now running:

Write an agent. Give it a connector to whatever system holds returns history. Add an event rule subscribed to `retail/order/*/returned`. Apply it.

That is the whole list. Specifically, here is what you do **not** touch:

- `order-triage` is not modified and not redeployed
- `order-exception-remediation` is not modified
- the `substitution-scoring` toolset is not rebuilt
- the existing entrypoint's rules are unchanged
- nobody who owns any of the above needs to be involved

The new agent subscribes to a topic. The publisher is already publishing to it and does not learn that anyone new is listening. There is no registry to update, no routing table, no service discovery configuration, and no coordination meeting.

That claim is impossible to make about a request-response architecture. There, "add a consumer" means finding the producer, changing it to call one more endpoint, handling that endpoint being down, and shipping both together. The coupling that makes it hard is not accidental; it is what an HTTP call is.

This is why the mesh sits on a broker.

---

## Where to go next

Three things worth your time after today:

- **Evaluation.** [`800_Evaluation.md`](./800_Evaluation.md) is a take-home lab. Before Meridian runs this at 40x volume, replay twenty historical exceptions and score whether the substitutions were any good. The seed data has them waiting.
- **Production deployment.** Helm charts, Kubernetes, air-gapped installs. Ask about `sam-deploy`.
- **Governance.** RBAC, SSO, per-agent authorization, and the task event log. Your security team will ask about all four, and there are real answers.

---

And that's it! What happened?

You added an event mesh entrypoint, published one message, and watched the system you built handle a fulfillment exception without anyone touching it:

1. **A subscription** on `retail/order/exception/>` caught an event published to a five-level topic, using a wildcard that will keep working as Meridian adds regions and stores.

2. **A target** routed that event to the workflow rather than to an agent, so the process ran in a declared order with a deterministic scoring step in the middle.

3. **An output** published the structured outcome to a per-order topic, with no publisher code written anywhere.

Step back and look at the whole thing. Two connectors reaching two systems owned by two teams. An agent that reasons but is forbidden from guessing. A Go tool that computes what must not be guessed. A skill holding policy that belongs to Brand and Legal. A workflow declaring an order somebody already knew. An entrypoint turning a message into work.

Six parts. One assembly. It is not the only assembly those parts support, and the next problem you bring to this platform will probably want a different one.

---
Section complete! Close this file and return to the Workshop Tracker to continue.
