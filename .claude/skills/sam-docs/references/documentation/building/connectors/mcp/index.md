---
title: MCP Connectors
description: Configure MCP connectors so agents can discover and invoke tools served by remote Model Context Protocol servers over SSE or Streamable HTTP.
sidebar_position: 1
---

# MCP Connectors

MCP connectors let agents discover and invoke tools served by remote Model Context Protocol (MCP) servers. The Model Context Protocol is a standard interface for agents to interact with external data sources and services. The connector opens a connection to the server over one of two transports: Server-Sent Events (SSE) or Streamable HTTP. It then discovers the tools the server exposes, authenticates each request, and formats tool invocations on behalf of agents. Agents invoke these tools through natural language.

Agent Mesh supports remote MCP servers only. It does not support local MCP servers that communicate over stdio (standard input/output).

:::note
MCP connectors require outbound network access from your Agent Mesh deployment to reach the remote MCP server.
:::

## Prerequisites

Before you create an MCP connector, ensure you have the following:

- A running remote MCP server that supports SSE or Streamable HTTP transport and is reachable over the network from Agent Mesh
- The MCP server's URL endpoint, typically an HTTPS URL implementing the Model Context Protocol specification
- Credentials for the MCP server if it requires authentication—an API key, a username and password, a bearer token, or OAuth2/OIDC client credentials. Public servers need none
- Network connectivity from Agent Mesh to the MCP server, with firewalls and security groups permitting outbound HTTPS traffic

## Creating an MCP Connector

To create an MCP connector:

1. In the Agent Mesh UI, go to the **Connectors** page and click **Create Connector**.
2. Select **MCP** as the connector type.
3. Enter a **Connector Name** of 3–255 characters that indicates the MCP server or service, such as `GitHub MCP`. The name must be unique across all connectors in your deployment.
4. Enter the **MCP Server URL**—the complete HTTPS endpoint of the remote server, such as `https://mcp.example.com/v1`.
5. Select the **Transport Protocol** the server uses—`SSE` or `Streamable HTTP`. Verify which transport the server supports with its administrator.
6. Select the **Authentication Type** and complete the fields it reveals, as described in [Authentication Configuration](#authentication-configuration).
7. Click **Next** to configure [Tool Selection](#tool-selection), or leave it unset to expose every tool the server provides.
8. Click **Create** to save the connector.

## Authentication Configuration

### None

Select this option for public MCP servers that do not require authentication. No additional configuration is needed.

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

### OAuth2/OIDC

Configure OAuth2 or OpenID Connect authentication using either Discovery Mode or Manual Mode.

**Discovery Mode**

In Discovery Mode, the connector queries the MCP Server URL to discover the authorization endpoint, token endpoint, and supported OAuth2 flows. Discovery Mode is the recommended approach for OAuth2 and OIDC-compliant providers. You still need to provide a client ID and, unless the server uses a Proof Key for Code Exchange (PKCE)-only flow, a client secret.

| Field         | Required | Description                                                                          |
| ------------- | -------- | ------------------------------------------------------------------------------------ |
| Client ID     | Yes      | Your OAuth2 client identifier                                                        |
| Client Secret | No       | Your OAuth2 client secret. Leave empty for PKCE-only flows                           |
| Scopes        | No       | Space-separated list of OAuth2 scopes to request (for example, `read write`)         |

**Manual Mode**

Use Manual Mode when the OAuth2 provider does not support standard discovery, when you need to override specific endpoints, or when the MCP server and OAuth2 provider are at different URLs.

| Field                  | Required | Description                                                                          |
| ---------------------- | -------- | ------------------------------------------------------------------------------------ |
| Authorization Endpoint | Yes      | The URL where users authorize the application                                        |
| Token Endpoint         | Yes      | The URL where the connector obtains access tokens                                    |
| Client ID              | Yes      | Your OAuth2 client identifier                                                        |
| Client Secret          | No       | Your OAuth2 client secret. Leave empty for PKCE-only flows                           |
| Scopes                 | No       | Space-separated list of OAuth2 scopes to request (for example, `read write`)         |

The connector uses these credentials to obtain an initial access token. At runtime, when an agent invokes a tool, Agent Mesh refreshes expired tokens using the refresh token returned by the OAuth2 provider.

## Tool Selection

When you click **Next**, Agent Mesh connects to the MCP server and retrieves the list of available tools so you can choose from them. This step is best effort: if the server is unreachable or the credentials are invalid, you can still save the connector, but agents cannot invoke tools until the server is reachable at runtime. If tool retrieval fails during creation, see [Tool Discovery Fails During Creation](#tool-discovery-fails-during-creation).

Restrict which tools agents can invoke using one of three mutually exclusive options. If you leave all three unset, agents can invoke every tool the server provides:

- **Tool Name**—expose exactly one tool from the server
- **Allow List**—a comma-separated list of tool names; agents can invoke only the listed tools
- **Deny List**—a comma-separated list of tool names; agents can invoke every tool the server provides except the listed ones

Restricting tools lets you:

- Keep agents focused on the relevant operations
- Exclude dangerous or administrative operations
- Improve response time and accuracy by reducing the tools an agent must consider
- Control costs

After you create the connector, it is available to assign to agents. For information about assigning, editing, and deleting connectors, see [Configuring Connectors](../index.md).

## Security Considerations

MCP connectors use a shared credential model. For more information, see [Configuring Connectors](../index.md).

Use the allow list (or deny list) and least-privilege MCP server credentials to limit which tools agents can invoke. Any user whose request reaches the agent can invoke any tool the connector exposes, so scope server-side permissions to the smallest set the agents need.

## Troubleshooting

The following troubleshooting tips might help you to resolve issues with this connector.

### Tool Discovery Fails During Creation

Check the following:

- The MCP server URL is correct and accessible
- The transport protocol selection (SSE or Streamable HTTP) matches what the server supports
- Authentication credentials are valid and not expired
- The MCP server implements the Model Context Protocol correctly
- Network connectivity and firewall rules allow access to the server

### Tool Invocations Fail with Authentication Errors

Check the following:

- Credentials work when tested against the MCP server directly
- OAuth2 tokens have not expired. Agent Mesh refreshes access tokens automatically at invocation time using the refresh token from the provider
- The authentication method matches the server's requirements
- Credentials have sufficient permissions for the tools agents attempt to invoke
- For OAuth2 Discovery Mode, the MCP Server URL is reachable and the server publishes a valid discovery document at its well-known endpoint

### Agents Report That Tools Are Not Available

Check the following:

- The MCP server is running and responding to discovery requests
- Tool selection is configured correctly
- Connector logs show tool discovery messages
- The MCP server exposes the expected tools through the protocol

### Protocol Errors Occur

Check the following:

- The MCP server implements a compatible version of the Model Context Protocol
- The server supports the selected transport protocol (SSE or Streamable HTTP)
- Server logs do not show protocol-level errors or incompatibilities
- The server responds with valid protocol messages
- Contact the MCP server administrator if the server implementation appears incompatible

## What Next?

After you create an MCP connector, assign it to an agent so the agent can invoke the server's tools during conversations. For more information, see [Configuring Connectors](../index.md).

To configure this connector from the command line instead of the Agent Mesh UI, see [MCP Connectors via the CLI](./cli.md).
