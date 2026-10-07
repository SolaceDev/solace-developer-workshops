---
published: true
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
| `values.enableAuth` | Controls whether the entrypoint requires authentication. When omitted, the entrypoint inherits the cluster's authentication setting: it requires a bearer token and joins the cluster's OAuth flow when the cluster requires authentication (`frontend_use_authorization: true`), and allows unauthenticated access otherwise. Set `"true"` to require a bearer token, or `"false"` to accept calls without one. Every unauthenticated call runs as `values.defaultUserIdentity`, or as the entrypoint's system user when that field is empty. Use `"false"` for local development only. |
| `values.defaultUserIdentity` | Optional. Every unauthenticated call runs as this identity instead of as the entrypoint's system user. Under enforced role-based access control (RBAC) the identity holds only the scopes granted to it, which are normally none, so leave it empty to keep the invoke scopes the system user carries. The value must not begin with `system:`. To name a system user, set `values.runAs` instead. `sam config plan` and `sam config apply` reject the entrypoint when `enableAuth` is `"true"`. |
| `values.runAs` | Optional. The system user that unauthenticated calls run as when `values.defaultUserIdentity` is empty. Leave it empty for the built-in default system user, which can invoke any agent or workflow that does not declare `required_scopes`; name a custom system user to narrow what the entrypoint reaches. This field applies to unauthenticated calls only: when `enableAuth` is `"false"`, or when `enableAuth` is omitted and the cluster allows unauthenticated access. The Agent Mesh UI does not expose this field. |
| `values.serverName` | The display name reported to MCP clients in server metadata. Defaults to `SAM MCP Entrypoint`. |
| `values.serverDescription` | The free-text description reported to MCP clients. |
| `values.allowedRedirectUris` | Allowlist of OAuth redirect URIs. Loopback hosts match any port per RFC 8252; every other value must match exactly. Empty with `enableAuth: "true"` triggers a startup warning. |
| `values.includeTools` | Allowlist of tool-name patterns to expose. Empty exposes every discovered tool. Each pattern is tested against the name on the agent's card, the skill name, and the tool name; Agent Mesh composes the tool name and generates the card name for a component created in Agent Mesh. A non-empty list exposes only the tools its patterns match. When no pattern matches, Agent Mesh exposes no tools and reports no error. For more information, see the [Filtering Which Agents Are Exposed](./index.md#filtering-which-agents-are-exposed) section of the Agent Mesh UI page. |
| `values.excludeTools` | Denylist of tool-name patterns. A pattern that matches nothing has no effect, and Agent Mesh reports no error. This list takes precedence over `includeTools`, with one exception. Agent Mesh applies exact patterns before regular expressions, so an exact `includeTools` pattern exposes a tool that an `excludeTools` regular expression also matches. For more information about how the two lists interact, see the [Filtering Which Agents Are Exposed](./index.md#filtering-which-agents-are-exposed) section of the Agent Mesh UI page. |
| `values.corsAllowedOrigins` | Allowlist of browser `Origin` values for browser-based MCP clients. Empty allows any origin. |
| `deploy` | When `true`, apply creates the entrypoint and brings its endpoint online. Set it to `false` to save the entrypoint without exposing the endpoint. |

:::warning
The `values.enableAuth` field controls authentication only. Setting it to `"false"` does not opt the entrypoint out of RBAC. On a deployment that enforces RBAC, Agent Mesh still authorizes every call against the scopes held by the system user or default user identity that the call runs as, and narrows the entrypoint's `tools/list` response to match. Setting `values.defaultUserIdentity` there normally leaves the entrypoint with no scopes, and therefore no reachable agents.
:::

The following example configures an unauthenticated development entrypoint, where unauthenticated calls run as the entrypoint's system user:

```yaml
spec:
  type: mcp
  deploy: true
  values:
    enableAuth: "false"
```

To attribute those calls to a named user instead, add a `defaultUserIdentity`. To narrow what the entrypoint can reach, set `runAs` to a custom system user.

To list the fields the `mcp` entrypoint type exposes, run `sam config schema show entrypoint --type mcp`. To print a templated starting file, run `sam config schema example entrypoint --type mcp`.

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
