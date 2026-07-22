---
title: OpenAPI Connectors
description: Configure OpenAPI connectors so agents can call REST APIs described by an OpenAPI 3.0 or 3.1 specification.
sidebar_position: 1
---

# OpenAPI Connectors

OpenAPI connectors let agents interact with REST APIs described by an OpenAPI 3.0 or 3.1 specification, in JSON or YAML. The connector reads your specification to determine the available endpoints, parameter requirements, request and response formats, content types, and security schemes, then converts each operation into a tool that agents invoke through natural language. To change how the connector constructs a request, update the specification file and re-upload it. The form exposes three overrides that adjust runtime behavior without modifying the specification: a base URL, custom headers, and an allow list of operation IDs.

## Prerequisites

Before you create an OpenAPI connector, ensure you have the following:

- An OpenAPI 3.0 or 3.1 specification file in JSON or YAML that describes the REST API. The connector does not support OpenAPI 2.0 (Swagger); convert an older specification with the [Swagger Converter](https://converter.swagger.io/) or a similar tool
- API credentials if the API requires authentication—an API key, a username and password, a bearer token, or OAuth2/OIDC client credentials with the authorization and token endpoint URLs. Public APIs need none
- Network connectivity from Agent Mesh to the API endpoints, with firewalls and security groups permitting outbound HTTPS traffic

## Creating an OpenAPI Connector

To create an OpenAPI connector:

1. In the Agent Mesh UI, go to the **Connectors** page and click **Create Connector**.
2. Select **OpenAPI** as the connector type.
3. Enter a **Connector Name** that is unique across all connectors in your deployment.
4. Enter a **Description** of 10–1000 characters. The agent's language model uses this text to decide when to call the API.
5. Upload the **OpenAPI Specification File**—a JSON or YAML file conforming to OpenAPI 3.0 or 3.1, up to 10 MB.
6. Enter the **Base URL** used for all API requests, such as `https://api.example.com/v1`. This overrides the `servers[].url` entries in the specification.
7. Optionally add **Custom Headers** that the specification does not declare, such as tenant identifiers. Enter one per line as `Header-Name: value`.
8. Optionally set an **Allow List** of comma-separated operation IDs to expose as tools. When empty, agents can invoke every operation the specification defines.
9. Select the **Authentication Type** and complete the fields it reveals, as described in [Authentication Configuration](#authentication-configuration).
10. Click **Create** to save the connector.

:::tip
Operations without an explicit `operationId` field are still exposed as tools; the connector generates an ID from the HTTP method and path. Adding `operationId` to your specification produces clearer tool names for the language model and makes the allow list easier to maintain.
:::

## Authentication Configuration

### None

Select this option for public APIs that do not require authentication. No additional configuration is needed.

### API Key

| Field            | Required | Description                                                                            |
| ---------------- | -------- | -------------------------------------------------------------------------------------- |
| Location         | Yes      | Where the connector sends the key: `Header` or `Query Parameter`                       |
| Parameter Name   | Yes      | Name of the header or query parameter that carries the key (for example, `X-API-Key`)  |
| API Key Value    | Yes      | The API key value                                                                      |

### HTTP Authentication

Select the HTTP authentication method (`Basic` or `Bearer`).

**Basic**

| Field    | Required | Description                            |
| -------- | -------- | -------------------------------------- |
| Username | Yes      | The username for Basic authentication  |
| Password | Yes      | The password for Basic authentication  |

The connector encodes the username and password in Base64 and sends them in the `Authorization` header.

**Bearer**

| Field | Required | Description           |
| ----- | -------- | --------------------- |
| Token | Yes      | The bearer token value |

The connector sends the token in the `Authorization` header with the `Bearer` prefix.

### OAuth2/OIDC Authentication

The connector uses the authorization code grant. When an agent first invokes a tool, Agent Mesh redirects the user to the provider to authorize the connector. Agent Mesh stores the resulting tokens and refreshes the access token at invocation time when it expires.

| Field                       | Required | Description                                                                                                                                                  |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Authorization Endpoint      | Yes      | The URL where users authorize the application                                                                                                                |
| Token Endpoint              | Yes      | The URL where the connector obtains access tokens                                                                                                            |
| Refresh URL                 | No       | The URL the connector uses to refresh expired access tokens. Defaults to the token endpoint when empty                                                       |
| Client ID                   | Yes      | Your OAuth2 client identifier                                                                                                                                |
| Client Secret               | No       | Your OAuth2 client secret. Leave empty for PKCE-only flows                                                                                                   |
| Scopes                      | No       | Space-separated list of OAuth2 scopes to request (for example, `read write`)                                                                                 |
| Token Endpoint Auth Method  | Yes      | How the connector authenticates at the token endpoint: `Client Secret Basic` (default), `Client Secret Post`, or `None` (for PKCE-only flows)                |

## After You Create the Connector

The connector is available to assign to agents. For information about assigning, editing, and deleting connectors, see [Configuring Connectors](../index.md).

## Security Considerations

OpenAPI connectors use a shared credential model. For more information, see [Configuring Connectors](../index.md).

Any user whose request reaches the agent can invoke any operation the connector's credentials allow. Use read-only API credentials and the allow list to limit exposure.

## Troubleshooting

The following troubleshooting tips might help you to resolve issues with this connector.

### Connector Fails to Load the OpenAPI Specification

Check the following:

- The specification file is valid JSON or YAML
- The specification validates with a tool such as Swagger Editor or the OpenAPI CLI
- The file upload completed
- The specification conforms to OpenAPI 3.0 or 3.1

### API Calls Fail with 401 or 403 Errors

Check the following:

- API credentials work when tested directly with curl or Postman
- Credentials have not expired
- The authentication type matches what the API expects (API Key, HTTP Basic, Bearer, or OAuth2/OIDC)
- The parameter name or header name is correct
- Credentials have sufficient permissions for the operations agents attempt to invoke
- For OAuth2/OIDC, the authorization endpoint, token endpoint, client ID, and client secret (if used) are correct
- For OAuth2/OIDC, your client credentials permit the requested scopes

### Agents Report That Operations Are Not Available

Check the following:

- The specification contains paths with operations defined
- The allow list, if set, lists the operation IDs you expect to expose
- Connector logs show tool loading messages
- The specification was uploaded and processed

## What Next?

After you create an OpenAPI connector, assign it to an agent so the agent can call the API's operations during conversations. For more information, see [Configuring Connectors](../index.md).

To configure this connector from the command line instead of the Agent Mesh UI, see [OpenAPI Connectors via the CLI](./cli.md).
