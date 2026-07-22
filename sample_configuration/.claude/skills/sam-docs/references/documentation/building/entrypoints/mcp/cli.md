---
title: MCP Entrypoints with the CLI
description: Define an MCP entrypoint as declarative-config YAML and apply it into Agent Mesh with sam config.
sidebar_position: 2
---

# MCP Entrypoints with the CLI

To create and manage Model Context Protocol (MCP) entrypoints from the Agent Mesh UI, and to understand the deployment lifecycle and shared model that every entrypoint type follows, see [MCP Entrypoints](./index.md), and [Configuring Entrypoints](../index.md). This page covers authoring an MCP entrypoint as *declarative config*: the YAML specific to the `entrypoint` kind with `type: mcp`, applied to Agent Mesh with `sam config apply`.

The example on this page is the same `IDE Access` entrypoint that the Agent Mesh UI page builds, so you can compare the two paths directly.

## Before You Start

You need a running Agent Mesh instance to apply config to. For how to install or deploy one, see [Install and Deploy](../../../installing/index.md). MCP clients connect inbound to the entrypoint, so the Agent Mesh host must be reachable from the clients at a stable HTTPS URL.

Decide up front whether the entrypoint runs authenticated or unauthenticated. Authenticated mode is the production default; unauthenticated mode is for local development. For the trade-off and the identity-provider setup that authenticated mode requires, see the [Prerequisites](./index.md#prerequisites) section of the Agent Mesh UI page.

## Write the Entrypoint

An entrypoint is one file under the `entrypoints/` directory of a declarative-config repo, listed by name in the manifest.

```yaml
# manifest.yaml
kind: manifest
name: ide-access
description: MCP entrypoint for developer IDEs.
target:
  url: http://127.0.0.1:8800
resources:
  entrypoints:
    - ide-access
```

The following file defines an authenticated MCP entrypoint. `spec.type` is `mcp`, `spec.slug` sets the URL-stable path segment (see [Apply and Verify](#apply-and-verify)), and the MCP-specific fields go under `spec.values`.

```yaml
# entrypoints/ide-access.yaml
kind: entrypoint
name: ide-access
description: MCP endpoint for developers to reach Agent Mesh agents from their editor.
spec:
  type: mcp
  slug: ide-access
  deploy: true
  values:
    enableAuth: "true"
    serverName: SAM MCP Entrypoint
    serverDescription: Agent Mesh agents exposed as MCP tools.
    allowedRedirectUris:
      - uri: http://127.0.0.1
      - uri: http://localhost
    includeTools: []
    excludeTools: []
    corsAllowedOrigins: []
```

The top-level `name` and `description` identify the entrypoint; `description` is required and must be 10 to 1,000 characters. The fields under `spec` map to the MCP entrypoint form in the Agent Mesh UI:

| Field | Description |
|---|---|
| `type` | The entrypoint type. Set to `mcp` for an MCP entrypoint. Immutable after creation. |
| `spec.slug` | The URL-stable path segment used in the deployed MCP URL. When set, the entrypoint mounts at `/gw/<slug>/`. When omitted, the entrypoint mounts at `/gw/<uuid>/`. Set it here for name-based URLs; the Agent Mesh UI does not expose this field. |
| `values.enableAuth` | When omitted, the entrypoint inherits the cluster's authorization posture: it requires a bearer token and joins the cluster's OAuth flow when the cluster runs RBAC (an OIDC issuer is configured), and allows unauthenticated access otherwise. Set `"true"` to require authentication explicitly, or `"false"` to opt this entrypoint out (every call is attributed to `defaultUserIdentity`). Use `"false"` for local development only. |
| `values.defaultUserIdentity` | Required when `enableAuth` is `"false"`. Every unauthenticated call is attributed to this identity. Rejected at startup when `enableAuth` is `"true"`. |
| `values.serverName` | The display name reported to MCP clients in server metadata. Defaults to `SAM MCP Entrypoint`. |
| `values.serverDescription` | The free-text description reported to MCP clients. |
| `values.allowedRedirectUris` | Allowlist of OAuth redirect URIs. Loopback hosts match any port per RFC 8252; every other value must match exactly. Empty with `enableAuth: "true"` triggers a startup warning. |
| `values.includeTools` | Allowlist of tool-name patterns to expose. Empty exposes every discovered tool. Patterns match against agent name, skill name, and final tool name. |
| `values.excludeTools` | Denylist of tool-name patterns. Takes precedence over `includeTools` when both match. |
| `values.corsAllowedOrigins` | Allowlist of browser `Origin` values for browser-based MCP clients. Empty allows any origin. |
| `deploy` | When `true`, apply creates the entrypoint and brings its endpoint online. Set it to `false` to save the entrypoint without exposing the endpoint. |

For an unauthenticated development entrypoint, set `enableAuth: "false"` and add a `defaultUserIdentity`:

```yaml
spec:
  type: mcp
  deploy: true
  values:
    enableAuth: "false"
    defaultUserIdentity: local-dev-user
```

To discover every field the `mcp` entrypoint type accepts, run `sam config schema show entrypoint --type mcp`. To print a templated starting file, run `sam config schema example entrypoint --type mcp`.

## Apply and Verify

Preview the change with `sam config plan -m manifest.yaml`, then apply the manifest to create and deploy the entrypoint:

```bash
sam config apply -m manifest.yaml
```

```text
Applied entrypoints:
  + ide-access  created
Deployments:
  * ide-access  deploy (deploy) completed
```

After the entrypoint deploys, its MCP URL takes the following form:

```text
https://<your-agent-mesh-host>/gw/ide-access
```

The `ide-access` segment comes from the `spec.slug` field on the YAML resource; when `slug` is omitted, the URL uses the entrypoint's UUID instead. For authenticated mode, add `https://<your-agent-mesh-host>/gw/ide-access/oauth/callback` to the OAuth client allowlist in your identity provider, then configure MCP clients to connect to the MCP URL.

To confirm the running state, export the entrypoint back into YAML with `sam config pull -o ./pulled --url http://127.0.0.1:8800 --only entrypoint`, or open the Agent Mesh UI and find `ide-access` in the entrypoints list on the **Entrypoints** page.

## What Next?

You have an MCP entrypoint defined as version-controllable YAML and deployed with `sam config apply`. Most readers next want to:

- Define another entrypoint type as YAML: [Slack Entrypoints with the CLI](../slack/cli.md), [Microsoft Teams Entrypoints with the CLI](../teams/cli.md), or [Event Mesh Entrypoints with the CLI](../event-mesh/cli.md).
- Configure MCP entrypoints from the Agent Mesh UI: [MCP Entrypoints](./index.md).
