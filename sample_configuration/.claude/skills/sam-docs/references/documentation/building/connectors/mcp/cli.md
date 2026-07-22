---
title: MCP Connectors via the CLI
description: Configure an MCP connector as declarative YAML and apply it with the Agent Mesh CLI, so agents can invoke tools served by a remote Model Context Protocol server.
sidebar_position: 2
---

# MCP Connectors via the CLI

An MCP connector lets agents discover and invoke tools served by a remote Model Context Protocol (MCP) server over Server-Sent Events (SSE) or Streamable HTTP. You define the connector as a declarative config resource and apply it with the Agent Mesh CLI, instead of using the Agent Mesh UI. To configure the same connector in the UI, and to read about the transports it supports and its authentication and tool-selection options in depth, see [MCP Connectors](./index.md).

The following sections describe the YAML shape and the `sam config` command workflow.

Agent Mesh supports remote MCP servers only. It does not support local MCP servers that communicate over stdio (standard input/output).

:::note
MCP connectors require outbound network access from your Agent Mesh deployment to reach the remote MCP server.
:::

## Prerequisites

Before you author an MCP connector, ensure you have the following:

- A running remote MCP server that supports SSE or Streamable HTTP transport and is reachable over the network from Agent Mesh
- The MCP server's URL endpoint, typically an HTTPS URL implementing the Model Context Protocol specification
- Credentials for the MCP server if it requires authentication. Provide an API key, a username and password, a bearer token, or OAuth2 client credentials. Public servers need none
- The `sam` CLI installed and a declarative config directory with a `manifest.yaml`. For more information, see [Platform Service](../../../concepts/platform-service.md)

## Creating the Connector

An MCP connector is one resource in a declarative config directory. To create the connector, perform the following steps:

1. Write the connector file under the `connectors/` directory, as described in [Connector YAML](#connector-yaml).
2. Reference any secrets through environment variables, as described in [Referencing Secrets](#referencing-secrets).
3. Add the connector to the manifest and apply it, as described in [Applying the Connector](#applying-the-connector).

### Connector YAML

A connector is a single YAML file under the `connectors/` directory. To write the file, perform the following steps:

1. Create a YAML file under the `connectors/` directory, such as `connectors/context7-mcp.yaml`.
2. Declare the resource envelope: set `kind: connector`, a `name` of 3–255 characters that is unique across all connectors in your deployment, and a `description`.
3. Under `spec`, set `type: mcp` and `subtype: remote`.
4. Under `spec.values`, set the connection fields, as described in [Connection Fields](#connection-fields).
5. Under `spec.values`, set `auth_type` and its fields, as described in [Authentication Fields](#authentication-fields).
6. Under `spec.values`, restrict which tools agents can invoke, as described in [Tool-Selection Fields](#tool-selection-fields).

The following minimal file configures a public server that needs no authentication, so it sets only the server URL and the transport:

```yaml
# connectors/context7-mcp.yaml
kind: connector
name: context7-mcp
description: "Context7 remote MCP server for up-to-date library documentation."
spec:
  type: mcp
  subtype: remote
  values:
    server_url: "https://mcp.context7.com/mcp"
    connection_type: "streamable-http"
    auth_type: "none"
```

#### Connection Fields

These fields set the remote MCP server's address and transport.

| Field             | Required | Default             | Description                                                                                  |
| ----------------- | -------- | ------------------- | -------------------------------------------------------------------------------------------- |
| `server_url`      | Yes      |                     | The remote MCP server URL, for example `https://mcp.example.com/mcp`                          |
| `connection_type` | Yes      | `streamable-http`   | The transport the server uses: `streamable-http` or `sse`                                     |
| `custom_headers`  | No       |                     | Optional HTTP headers sent with every request (for example, routing headers) |

#### Authentication Fields

Set `auth_type` to `none`, `apikey`, `http`, or `oauth`. Each value requires a different set of the fields below.

For `auth_type: apikey`:

| Field                  | Required | Default  | Description                                                     |
| ---------------------- | -------- | -------- | --------------------------------------------------------------- |
| `auth_apikey_location` | Yes      | `header` | Where the key is sent: `header` or `query`                      |
| `auth_apikey_name`     | Yes      |          | Name of the header or query parameter, such as `X-API-Key`     |
| `auth_apikey_value`    | Yes      |          | The API key value (secret)                                      |

For `auth_type: http`:

| Field                      | Required | Default | Description                                              |
| -------------------------- | -------- | ------- | -------------------------------------------------------- |
| `auth_http_scheme`         | Yes      | `basic` | The HTTP authorization scheme: `basic` or `bearer`       |
| `auth_http_basic_username` | Yes      |         | Username, when `auth_http_scheme` is `basic`             |
| `auth_http_basic_password` | Yes      |         | Password, when `auth_http_scheme` is `basic` (secret)    |
| `auth_http_bearer_token`   | Yes      |         | Bearer token, when `auth_http_scheme` is `bearer` (secret) |

For `auth_type: oauth`:

| Field                                    | Required | Default                | Description                                                                          |
| ---------------------------------------- | -------- | ---------------------- | ------------------------------------------------------------------------------------ |
| `auth_oauth_mode`                        | Yes      | `discovery`            | `discovery` reads the endpoints from the server; `manual` sets them explicitly       |
| `auth_oauth_client_id`                   | Yes      |                        | Your OAuth2 client identifier                                                        |
| `auth_oauth_client_secret`               | No       |                        | Your OAuth2 client secret; leave empty for PKCE-only flows (secret)                  |
| `auth_oauth_scopes`                      | No       |                        | Space-separated scopes to request, such as `openid email read:api`                   |
| `auth_oauth_authorization_url`           | Conditional |                     | Authorization endpoint; required when `auth_oauth_mode` is `manual`                  |
| `auth_oauth_token_url`                   | Conditional |                     | Token endpoint; required when `auth_oauth_mode` is `manual`                          |
| `auth_oauth_refresh_url`                 | No       |                        | Refresh endpoint; defaults to the token endpoint when unset                          |
| `auth_oauth_token_endpoint_auth_method`  | No       | `client_secret_basic`  | How to authenticate at the token endpoint: `client_secret_basic`, `client_secret_post`, or `none` |

#### Tool-Selection Fields

By default the connector exposes every tool the server provides. Restrict the set with exactly one of the following fields. They are mutually exclusive.

| Field              | Description                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| `tool_name`        | Expose exactly one tool from the server                                                           |
| `allow_list`       | Comma-separated tool names; agents can invoke only these tools                                    |
| `deny_list`        | Comma-separated tool names; agents can invoke every tool except these                             |
| `tool_name_prefix` | Prepended to every exposed tool name, so agents can disambiguate tools from multiple servers      |

### Referencing Secrets

Never write a real credential into the YAML file. The secret fields (`auth_apikey_value`, `auth_http_basic_password`, `auth_http_bearer_token`, and `auth_oauth_client_secret`) take a `${VAR}` placeholder that the Agent Mesh CLI substitutes from the environment at apply time:

```yaml
# connectors/github-mcp.yaml
kind: connector
name: github-mcp
description: "GitHub remote MCP server, authenticated with a bearer token."
spec:
  type: mcp
  subtype: remote
  values:
    server_url: "https://mcp.example.com/mcp"
    connection_type: "streamable-http"
    auth_type: "http"
    auth_http_scheme: "bearer"
    auth_http_bearer_token: ${GITHUB_MCP_TOKEN}
```

Set the variable before you run `sam config apply`. The Agent Mesh CLI also loads a `.env` file from the nearest ancestor directory, so you can keep the value there instead of exporting it:

```bash
export GITHUB_MCP_TOKEN="your-mcp-bearer-token"
```

Use the `${VAR, default}` form to supply a fallback when the variable is unset. When you run `sam config pull` to export an existing connector, the Agent Mesh CLI rewrites each secret field back to a `${VAR}` placeholder, so a pulled repository never contains a live credential.

### Applying the Connector

List the connector under `resources.connectors` in the manifest, alongside any agents that use it:

```yaml
# manifest.yaml
kind: manifest
name: my-deployment
description: Connectors and the agents that use them.
target:
  url: https://platform.example.com
resources:
  connectors:
    - context7-mcp
  agents:
    - my-agent
```

Validate your changes without affecting the Platform service, then apply them when you are ready:

```bash
sam config plan
sam config apply
```

`sam config plan` shows the connectors and agents that would be created, updated, or deleted. `sam config apply` reconciles the Platform service to match the manifest; it creates and updates resources but does not delete anything unless you pass `--prune`. Create the connector before the agent that references it. An agent that names a connector missing from the Platform service fails to deploy.

| Command             | Description                                                              |
| ------------------- | ---------------------------------------------------------------------- |
| `sam config plan`   | Preview the changes an apply would make, without changing the Platform service  |
| `sam config apply`  | Create and update the manifest's resources on the Platform service             |
| `sam config pull`   | Export the Platform service's live config into editable YAML, secrets redacted  |

For the full command reference, see [Platform Service](../../../concepts/platform-service.md).

## Security Considerations

MCP connectors use a shared credential model: any user whose request reaches the agent can invoke any tool the connector exposes. Scope the MCP server's credentials to the smallest set of permissions the agents need, and use `allow_list` or `deny_list` to limit which tools agents can invoke. For more information, see [Configuring Connectors](../index.md).

## Troubleshooting

The following tips might help you resolve issues with an MCP connector applied from the Agent Mesh CLI.

### Apply Fails with a Validation Error

Check the following:

- The `values` block uses the wire values from the schema: `connection_type` is `streamable-http` or `sse`, and `auth_type` is `none`, `apikey`, `http`, or `oauth`, all lowercase
- Every field required by the chosen `auth_type` is present
- Only one of `tool_name`, `allow_list`, and `deny_list` is set
- The `name` is 3–255 characters and unique across connectors

### Apply Fails to Substitute a Secret

Check the following:

- The environment variable named in each `${VAR}` placeholder is set, or defined in a `.env` file the Agent Mesh CLI loads
- You ran `sam config apply` in a shell where the variable is exported

### Tool Invocations Fail with Authentication Errors

Check the following:

- The credential works when tested against the MCP server directly
- The `auth_type` and its fields match the server's requirements
- OAuth2 tokens have not expired. Agent Mesh refreshes access tokens automatically at invocation time using the refresh token from the provider
- For `auth_oauth_mode: discovery`, the server at `server_url` is reachable and publishes a valid discovery document

### Agents Report That Tools Are Not Available

Check the following:

- The MCP server is running and responding to discovery requests
- The tool-selection fields name tools the server actually exposes
- The transport in `connection_type` matches what the server supports

## What Next?

After you apply an MCP connector, reference it from an agent so the agent can invoke the server's tools during conversations. For more information, see [Creating Agents with the CLI](../../agents/cli.md).

To configure this connector in the Agent Mesh UI instead, see [MCP Connectors](./index.md).
