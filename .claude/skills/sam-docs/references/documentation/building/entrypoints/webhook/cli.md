---
published: true
title: Webhook Entrypoints with the CLI
description: Define a webhook entrypoint as declarative config YAML and apply it to Agent Mesh with sam config apply.
sidebar_position: 2
---

# Webhook Entrypoints with the CLI

To create and manage webhook entrypoints from the Agent Mesh UI, and to understand the deployment lifecycle and shared model that every entrypoint type follows, see [Webhook Entrypoints](./index.md) and [Configuring Entrypoints](../index.md). This page covers authoring a webhook entrypoint as *declarative config*: the YAML specific to the `entrypoint` kind with `type: webhook`, applied to Agent Mesh with `sam config apply`.

The example on this page is the same `GitHub Event Processor` entrypoint that the Agent Mesh UI page builds, so you can compare the two paths directly.

## Before You Start

You need a running Agent Mesh instance to apply the configuration to. For more information about installing or deploying one, see [Install and Deploy](../../../installing/index.md).

You also need a hash-based message authentication code (HMAC) secret, between 16 and 1,024 characters. You configure the same value in the GitHub webhook settings after you apply this configuration. The entrypoint references an agent by name. The following example routes to a `code-review-assistant` agent already deployed in Agent Mesh.

## Write the Entrypoint

An entrypoint is one file under the `entrypoints/` directory of a declarative config repository, listed by name in the manifest.

```yaml
# manifest.yaml
kind: manifest
name: github-events
description: GitHub push event processor
target:
  url: http://127.0.0.1:8800
resources:
  entrypoints:
    - github-event-processor
```

The following file defines the webhook entrypoint. The `spec.type` field is `webhook`, and the webhook-specific configuration goes under `spec.values`.

```yaml
# entrypoints/github-event-processor.yaml
kind: entrypoint
name: github-event-processor
description: Routes GitHub push events to the code-review-assistant agent.
spec:
  type: webhook
  deploy: true
  values:
    routePath: /github-push
    method: POST
    authMode: hmac
    hmacSecret: ${GITHUB_WEBHOOK_SECRET}
    hmacHeader: X-Hub-Signature-256
    hmacAlgorithm: sha256
    hmacPrefix: "sha256="
    hmacEncoding: hex
    inputExpression: "input.payload:head_commit.message"
    targetAgentName: code-review-assistant
```

Each webhook entrypoint exposes a single route. To expose more than one path, define one webhook entrypoint per path.

The required top-level `name` and `description` identify the entrypoint. The `description` field must be between 10 and 1,000 characters. The following tables describe the fields you can set.

### Top-Level Fields

| Field | Description |
|---|---|
| `type` | The entrypoint type. Set to `webhook` for a webhook entrypoint. Immutable after creation. |
| `slug` | The URL-stable path segment used in the deployed route URL. When set, the entrypoint mounts at `/gw/<slug>/`. When omitted, the entrypoint mounts at `/gw/<uuid>/`. Set it here so the URL you register with the external system stays stable across delete and recreate. It must be 3 to 63 characters, start with a lowercase letter, end with a lowercase letter or digit, and contain only lowercase letters, digits, and dashes. The values `oauth`, `api`, `well-known`, `gw`, and `health` are reserved. The Agent Mesh UI does not expose this field. |
| `deploy` | When `true`, `sam config apply` creates the entrypoint and brings it online. Set this option to `false` to save the entrypoint without deploying it. |

Reference the HMAC secret as `${GITHUB_WEBHOOK_SECRET}` so the YAML is safe to commit. Provide the real value through the environment when you run `sam config apply`.

To discover every field the `webhook` entrypoint type accepts, run `sam config schema show entrypoint --type webhook`. To print a templated starting file, run `sam config schema example entrypoint --type webhook`.

### Value Fields

All webhook configuration is a flat set of fields under `spec.values`.

| Field | Required | Description |
|---|---|---|
| `routePath` | Yes | The HTTP path pattern, appended to the entrypoint's base URL. It must start with `/`, contain only letters, digits, and the characters `-`, `_`, `.`, `/`, or `{param}` wildcards, and be no longer than 512 characters. It supports exact paths (`/orders`), path parameters (`/orders/{id}`), and subtree prefixes with a trailing slash (`/orders/`). |
| `method` | No | The HTTP method. It must be one of `POST` (the default), `PUT`, or `PATCH`. |
| `authMode` | Yes | How the entrypoint authenticates requests. It must be one of `token` (a shared bearer token) or `hmac` (a per-payload signature). The Agent Mesh UI defaults this field to `token`, but YAML must set it explicitly. Omitting it fails validation. |
| `authToken` | Conditional | The shared token. Between 8 and 1,024 characters. Required when `authMode` is `token`. Callers must send the token in the `Authorization: Bearer <value>` header. |
| `hmacSecret` | Conditional | The HMAC shared secret. Between 16 and 1,024 characters. Required when `authMode` is `hmac`. |
| `hmacHeader` | No | The request header that carries the HMAC signature. Defaults to `X-Hub-Signature-256`. Applies when `authMode` is `hmac`. |
| `hmacAlgorithm` | No | The HMAC algorithm. It must be one of `sha256` (the default) or `sha512`. Applies when `authMode` is `hmac`. |
| `hmacPrefix` | No | A string to strip from the signature header value before decoding. Defaults to `sha256=`. Set it to the prefix your sender uses. An empty value falls back to the default, so a webhook entrypoint cannot verify a sender that transmits a bare signature. Applies when `authMode` is `hmac`. |
| `hmacEncoding` | No | The encoding of the signature bytes. It must be one of `hex` (the default), `base64`, `base64url`, `base64raw`, or `base64rawurl`. Applies when `authMode` is `hmac`. |
| `inputExpression` | Yes | An expression that produces the agent's user message text. The entrypoint evaluates it against the request context described in [Input Expression](./index.md#input-expression). |
| `targetType` | No | Which of the two target fields applies. It must be one of `agent` (the default) or `workflow`. The generated schema lists this field as required, because the Agent Mesh UI always sends it. In YAML you can omit it, and Agent Mesh infers it from whichever target name you set. |
| `targetAgentName` | Conditional | The name of the target agent. Set exactly one of `targetAgentName` or `targetWorkflowName`. |
| `targetWorkflowName` | Conditional | The name of the target workflow. Set exactly one of `targetAgentName` or `targetWorkflowName`. |
| `runAs` | No | The name of the system user this entrypoint's requests run as under enforced role-based access control (RBAC). Leave it unset to use the built-in default system user, which can invoke any agent or workflow that does not declare `required_scopes`. Set it to a scoped system user to narrow what the entrypoint can reach. See [Identity Under RBAC](./index.md#identity-under-rbac). |
| `maxBodyBytes` | No | The request body size limit in bytes. The default is 1,048,576 (1 MiB). The minimum is 1,024 and the maximum is 52,428,800 (50 MiB). |

The target you name here produces the outcome itself, through the tools and connectors you assign to it, because the entrypoint never returns the target's response to the caller. For more information, see [Where the Result Goes](./index.md#where-the-result-goes).

## Token-Authenticated Entrypoint

The following entrypoint uses a static bearer token instead of HMAC and matches a path parameter. The captured `{pipeline_id}` value is available in the input expression as `user_data.path:pipeline_id`.

```yaml
# entrypoints/ci-results.yaml
kind: entrypoint
name: ci-results
description: Routes CI pipeline results to the ci-analyzer agent.
spec:
  type: webhook
  deploy: true
  values:
    routePath: /ci/{pipeline_id}
    method: POST
    authMode: token
    authToken: ${CI_WEBHOOK_TOKEN}
    inputExpression: "input.payload:result"
    targetAgentName: ci-analyzer
```

To route to a workflow instead of an agent, set `targetWorkflowName` in place of `targetAgentName`. To pass the entire JSON body through, set `inputExpression` to `"input.payload:"`, an empty path.

The asynchronous model suits high-volume sources. The entrypoint never blocks the caller while waiting for a response: it returns `202 Accepted` as soon as it queues the task, and the target runs independently without returning its result to the caller.

## Apply and Verify

Preview the change with `sam config plan -m manifest.yaml`, then apply the manifest to create and deploy the entrypoint:

```bash
export GITHUB_WEBHOOK_SECRET=<your-secret>
sam config apply -m manifest.yaml
```

```text
Applied entrypoints:
  + github-event-processor  created
Deployments:
  * github-event-processor  deploy (deploy) completed
```

To confirm the running state, export the entrypoint back into YAML with `sam config pull -o ./pulled --url http://127.0.0.1:8800 --only entrypoint`, or open the Agent Mesh UI and find `github-event-processor` in the entrypoints list on the **Entrypoints** page. Select its row, select **Open Entrypoint**, and copy the full route URL from **API Paths** in the **Networking Details** section.

## What Next?

You have a webhook entrypoint defined as version-controllable YAML and deployed with `sam config apply`. Most readers next want to:

- Define another entrypoint type as YAML: [Slack Entrypoints with the CLI](../slack/cli.md), [Microsoft Teams Entrypoints with the CLI](../teams/cli.md), [MCP Entrypoints with the CLI](../mcp/cli.md), or [Event Mesh Entrypoints with the CLI](../event-mesh/cli.md).
- Configure webhook entrypoints from the Agent Mesh UI: [Webhook Entrypoints](./index.md).
