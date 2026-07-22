---
title: OpenAPI Connectors via the CLI
description: Configure an OpenAPI connector as declarative YAML and apply it with the Agent Mesh CLI, so agents can call the operations of a REST API described by an OpenAPI specification.
sidebar_position: 2
---

# OpenAPI Connectors via the CLI

An OpenAPI connector turns each operation in an OpenAPI 3.0 or 3.1 specification into a tool that agents invoke through natural language. You define the connector as a declarative config resource and apply it with the Agent Mesh CLI, instead of using the Agent Mesh UI. To configure the same connector in the UI, and to read about how the connector reads the specification and its authentication options in depth, see [OpenAPI Connectors](./index.md).

The following sections describe the YAML shape and the `sam config` command workflow.

:::note
OpenAPI connectors require outbound network access from your Agent Mesh deployment to reach the API endpoints, and to reach the specification URL if you host the specification remotely.
:::

## Prerequisites

Before you author an OpenAPI connector, ensure you have the following:

- An OpenAPI 3.0 or 3.1 specification in JSON or YAML, reachable at a URL that Agent Mesh can fetch. The connector does not support OpenAPI 2.0 (Swagger)
- The base URL for the API, which overrides the `servers[].url` entries in the specification
- API credentials if the API requires authentication. Provide an API key, a username and password, a bearer token, or OAuth2 client credentials. Public APIs need none
- The `sam` CLI installed and a declarative config directory with a `manifest.yaml`. For more information, see [Platform Service](../../../concepts/platform-service.md)

## Creating the Connector

An OpenAPI connector is one resource in a declarative config directory. To create the connector, perform the following steps:

1. Write the connector file under the `connectors/` directory, as described in [Connector YAML](#connector-yaml).
2. Reference any secrets through environment variables, as described in [Referencing Secrets](#referencing-secrets).
3. Add the connector to the manifest and apply it, as described in [Applying the Connector](#applying-the-connector).

### Connector YAML

A connector is a single YAML file under the `connectors/` directory. The file declares the resource envelope (`kind`, `name`, and `description`) and a `spec` block that sets `type: api`, `subtype: openapi`, and the connection details under `values`.

Point the connector at the specification with `specification_url` and set the `base_url` for all API requests:

```yaml
# connectors/potterdb-api.yaml
kind: connector
name: potterdb-api
description: "PotterDB REST API exposed from its OpenAPI 3 specification."
spec:
  type: api
  subtype: openapi
  values:
    specification_url: "https://api.example.com/openapi.json"
    base_url: "https://api.potterdb.com"
    auth_type: "none"
```

The `name` must be 3–255 characters and unique across all connectors in your deployment. The `description` is 10–1000 characters; the agent's language model reads it to decide when to call the API. The sections below list the fields `values` accepts.

#### Specification and Request Fields

These fields point the connector at the OpenAPI specification and set how it calls the API.

| Field               | Required | Description                                                                                                       |
| ------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `specification_url` | Yes*     | URL to the OpenAPI specification that Agent Mesh fetches at apply time                                            |
| `base_url`          | Yes      | Base URL used for all API requests, such as `https://api.example.com/v1`. Overrides the `servers` in the spec    |
| `custom_headers`    | No       | HTTP headers the specification does not declare, sent with every request, such as `X-Tenant-ID`                  |
| `allow_list`        | No       | Comma-separated operation IDs to expose as tools. When empty, every operation the specification defines is exposed |

*The Agent Mesh UI accepts a file upload instead of a URL. From the Agent Mesh CLI, host the specification at a URL the Platform service can reach and set `specification_url`.

:::tip
Operations without an explicit `operationId` field are still exposed as tools; the connector generates an ID from the HTTP method and path. Adding `operationId` to the specification produces clearer tool names and makes `allow_list` easier to maintain.
:::

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
| `auth_oauth_authorization_url`           | Yes      |                        | The authorization endpoint where users authorize the application                     |
| `auth_oauth_token_url`                   | Yes      |                        | The token endpoint where codes are exchanged for access tokens                        |
| `auth_oauth_refresh_url`                 | No       |                        | Refresh endpoint; defaults to the token endpoint when unset                          |
| `auth_oauth_client_id`                   | Yes      |                        | Your OAuth2 client identifier                                                        |
| `auth_oauth_client_secret`               | No       |                        | Your OAuth2 client secret; leave empty for PKCE-only flows (secret)                  |
| `auth_oauth_scopes`                      | No       |                        | Space-separated scopes to request, such as `read write`                              |
| `auth_oauth_token_endpoint_auth_method`  | No       | `client_secret_basic`  | How to authenticate at the token endpoint: `client_secret_basic`, `client_secret_post`, or `none` |

### Referencing Secrets

Never write a real credential into the YAML file. The secret fields (`auth_apikey_value`, `auth_http_basic_password`, `auth_http_bearer_token`, and `auth_oauth_client_secret`) take a `${VAR}` placeholder that the Agent Mesh CLI substitutes from the environment at apply time:

```yaml
# connectors/weather-api.yaml
kind: connector
name: weather-api
description: "Weather REST API, authenticated with an API key header."
spec:
  type: api
  subtype: openapi
  values:
    specification_url: "https://api.example.com/openapi.json"
    base_url: "https://api.example.com/v1"
    auth_type: "apikey"
    auth_apikey_location: "header"
    auth_apikey_name: "X-API-Key"
    auth_apikey_value: ${WEATHER_API_KEY}
```

Set the variable before you run `sam config apply`. The Agent Mesh CLI also loads a `.env` file from the nearest ancestor directory, so you can keep the value there instead of exporting it:

```bash
export WEATHER_API_KEY="your-api-key"
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
    - potterdb-api
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

OpenAPI connectors use a shared credential model: any user whose request reaches the agent can invoke any operation the connector's credentials allow. Use read-only API credentials and the `allow_list` to limit which operations agents can invoke. For more information, see [Configuring Connectors](../index.md).

## Troubleshooting

The following tips might help you resolve issues with an OpenAPI connector applied from the Agent Mesh CLI.

### Apply Fails to Load the Specification

Check the following:

- The `specification_url` is reachable from Agent Mesh and returns the specification
- The specification is valid JSON or YAML and conforms to OpenAPI 3.0 or 3.1
- The `base_url` is a complete URL, at least 11 characters long

### Apply Fails to Substitute a Secret

Check the following:

- The environment variable named in each `${VAR}` placeholder is set, or defined in a `.env` file the Agent Mesh CLI loads
- You ran `sam config apply` in a shell where the variable is exported

### API Calls Fail with 401 or 403 Errors

Check the following:

- The credential works when tested directly against the API
- The `auth_type` and its fields match what the API expects
- The `auth_apikey_name` matches the header or query parameter the API requires
- For `auth_type: oauth`, the authorization endpoint, token endpoint, client ID, and client secret are correct

### Agents Report That Operations Are Not Available

Check the following:

- The specification contains paths with operations defined
- The `allow_list`, if set, names the operation IDs you expect to expose
- The connector applied successfully and the agent that references it deployed

## What Next?

After you apply an OpenAPI connector, reference it from an agent so the agent can call the API's operations during conversations. For more information, see [Creating Agents with the CLI](../../agents/cli.md).

To configure this connector in the Agent Mesh UI instead, see [OpenAPI Connectors](./index.md).
