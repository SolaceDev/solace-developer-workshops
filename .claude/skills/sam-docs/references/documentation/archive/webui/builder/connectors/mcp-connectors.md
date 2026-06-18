---
title: MCP Connectors
description: Configure MCP connectors so agents can discover and invoke tools served by remote Model Context Protocol servers over SSE or Streamable HTTP.
sidebar_position: 1
---

# MCP Connectors

MCP connectors allow agents to communicate with remote MCP servers and access external tools.

## Overview

Model Context Protocol (MCP) is a standardized protocol that allows agents to interact with external data sources and services through a uniform interface. MCP connectors discover and invoke tools provided by MCP servers.

MCP connectors establish a connection to a remote MCP server over one of two transport protocols: Server-Sent Events (SSE) or Streamable HTTP. After the connection is established, the connector discovers the tools the server exposes, authenticates each request, and formats tool invocations on behalf of agents. Agents invoke these tools through natural language.

Agent Mesh supports remote MCP servers only. The system does not support local MCP servers that communicate over stdio (standard input/output).

:::note
**Network Access**

MCP connectors require outbound network access from your Agent Mesh deployment to reach the remote MCP server.
:::

## Prerequisites

Before you create an MCP connector, ensure you have the following:

- A running remote MCP server that supports SSE or Streamable HTTP
- The URL endpoint of the MCP server
- Credentials for the MCP server, if it requires authentication
- Network connectivity from Agent Mesh to the MCP server

The following sections describe each prerequisite in detail.

### Remote MCP Server

You need a running remote MCP server that supports either Server-Sent Events (SSE) or Streamable HTTP transport. The server must be accessible over the network from your Agent Mesh deployment.

### MCP Server URL

You need the URL endpoint of the MCP server. The URL is typically an HTTPS URL that implements the Model Context Protocol specification.

### Server Credentials (if required)

Depending on the MCP server's authentication requirements, you may need:

- API keys for servers using API key authentication
- Username and password for servers using basic authentication
- Bearer tokens for servers using token-based authentication
- OAuth2/OIDC credentials for servers using OAuth2 flows
- No credentials for public MCP servers without authentication

### Network Access

Ensure your Agent Mesh deployment can reach the MCP server over the network. Verify that firewalls and security groups allow outbound HTTPS traffic to the server.

## Creating an MCP Connector

Create the connector through the Connectors section in the Agent Mesh web interface (see `link to "Connectors"`  for the general flow), then fill in the following fields.

### Connector Configuration

| Field                | Required | Description                                                                                                                                                                                                                       |
| -------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connector Name       | Yes      | Unique identifier for this connector. 3–255 characters. Choose a descriptive name that indicates the MCP server or service (for example, `GitHub MCP`, `Atlassian MCP`, or `Canva MCP`). Must be unique across all connectors in your deployment |
| MCP Server URL       | Yes      | Complete HTTPS URL of the remote MCP server endpoint (for example, `https://mcp.example.com/v1`). The server must support either SSE or Streamable HTTP transport                                                                  |
| Transport Protocol   | Yes      | `SSE` (Server-Sent Events) or `Streamable HTTP`. Verify with your MCP server administrator which transport the server supports                                                                                                    |
| Authentication Type  | Yes      | `None`, `API Key`, `HTTP`, or `OAuth2/OIDC`. Additional fields appear based on the selection                                                                                                                                      |
| Tool Selection       | No       | Restrict which tools the server exposes to agents. For more information, see `link to "Tool Selection"`                                                                                                                     |

### Authentication Configuration

#### None

Select this option for public MCP servers that do not require authentication. No additional configuration is needed.

#### API Key

| Field            | Required | Description                                                                            |
| ---------------- | -------- | -------------------------------------------------------------------------------------- |
| Location         | Yes      | Where the connector sends the key: `Header` or `Query Parameter`                       |
| Parameter Name   | Yes      | Name of the header or query parameter that carries the key (for example, `X-API-Key`)  |
| API Key Value    | Yes      | The API key value                                                                      |

#### HTTP Authentication

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

#### OAuth2/OIDC

Configure OAuth2 or OpenID Connect authentication using either Discovery Mode or Manual Mode.

**Discovery Mode**

In Discovery Mode, the connector queries the MCP Server URL to discover the authorization endpoint, token endpoint, and supported OAuth2 flows. Discovery Mode is the recommended approach for OAuth2 and OIDC-compliant providers. You still need to provide a client ID and, unless the server uses a PKCE-only flow, a client secret.

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

### Tool Selection

After you configure the connector settings and authentication, click Next to proceed to tool selection. Agent Mesh attempts to connect to the MCP server and retrieve the list of available tools so you can choose from them. This step is best effort: if the server is unreachable or the credentials are invalid, you can still save the connector, but agents will not be able to invoke tools until the server is reachable at runtime.

You control which tools are exposed to agents using one of three options:

- **Tool Name**: Expose exactly one tool from the server
- **Allow List**: A comma-separated list of tool names. Agents can only invoke the listed tools
- **Deny List**: A comma-separated list of tool names. Agents can invoke every tool the server provides except the listed ones

These options are mutually exclusive. If you leave all three unset, agents can access every tool the server provides.

Tool selection helps you:
- Limit agents to relevant tools for their purpose
- Exclude potentially dangerous or administrative operations
- Reduce the number of tools agents must consider, improving response time and accuracy
- Control costs by limiting tool usage

If tool retrieval fails during creation, check the following:

- The MCP server URL is correct and accessible
- The transport protocol selection matches what the server supports
- Authentication credentials are valid
- Network connectivity to the server works

## After You Create the Connector

The connector is now available for you to assign to agents. For information about assigning, editing, and deleting connectors, see `link to "Connectors"` .

## Security Considerations

MCP connectors use a shared credential model. For more information, see `link to "Connectors"` .

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

You have just created an MCP connector. Most readers next want to assign the connector to an agent, covered in `link to "Connectors"` .
