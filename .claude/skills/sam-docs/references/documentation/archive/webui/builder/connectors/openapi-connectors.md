---
title: OpenAPI Connectors
description: Configure OpenAPI connectors so agents can call REST APIs described by an OpenAPI 3.0 or 3.1 specification.
sidebar_position: 2
---

# OpenAPI Connectors

OpenAPI connectors allow agents to interact with REST APIs that use OpenAPI specifications.

## Overview

OpenAPI connectors expose REST API operations as agent tools. Agents invoke these tools to make authenticated HTTP requests to external services described by an OpenAPI specification.

The connector reads your OpenAPI specification to determine the available endpoints, parameter requirements, request and response formats, content types, and security schemes. The connector then converts each operation into a tool that agents can invoke through natural language.

To change how the connector constructs a request, update the specification file and re-upload it. The form exposes three overrides that adjust runtime behavior without modifying the specification: a base URL, custom headers, and an allow list of operation IDs.

The connector supports OpenAPI 3.0 and 3.1 specifications in JSON or YAML format.

## Prerequisites

Before you create an OpenAPI connector, ensure you have the following:

- An OpenAPI 3.0 or 3.1 specification file in JSON or YAML
- API credentials, if the API requires authentication
- Network connectivity from Agent Mesh to the API endpoints

The following sections describe each prerequisite in detail.

### OpenAPI Specification File

You need an OpenAPI specification file in JSON or YAML format that describes the REST API you want to integrate. The connector supports OpenAPI 3.0 and 3.1 only. If you have an older OpenAPI 2.0 (Swagger) specification, convert it using `link to "Swagger Converter"`  or a similar tool.

### API Credentials (if required)

Depending on the API's authentication requirements, you may need:

- API key for APIs using API key authentication
- Username and password for APIs using HTTP Basic authentication
- Bearer token for APIs using HTTP Bearer authentication
- Client ID, optional client secret, and authorization and token endpoint URLs for APIs using OAuth 2.0 or OpenID Connect
- No credentials for public APIs

### Network Access

Ensure your Agent Mesh deployment can reach the API endpoints over the network. Verify that firewalls and security groups allow outbound HTTPS traffic to the API server.

## Creating an OpenAPI Connector

Create the connector through the Connectors section in the Agent Mesh web interface (see `link to "Connectors"`  for the general flow), then fill in the following fields.

### Connector Configuration

| Field                       | Required | Description                                                                                                                                                              |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OpenAPI Specification File  | Yes      | JSON or YAML file conforming to OpenAPI 3.0 or 3.1. Maximum size: 10 MB                                                                                                  |
| Base URL                    | Yes      | Base URL used for all API requests. Overrides the `servers[].url` entries in the specification (for example, `https://api.example.com/v1`)                               |
| Custom Headers              | No       | Additional HTTP headers sent with every request, one per line in the form `Header-Name: value`. Useful for tenant identifiers or routing hints not declared in the spec  |
| Allow List                  | No       | Comma-separated list of operation IDs to expose as tools. When empty, agents can invoke every operation the specification defines                                        |
| Authentication Type         | Yes      | `None`, `API Key`, `HTTP`, or `OAuth2/OIDC`. Additional fields appear based on the selection                                                                              |

:::tip
Operations without an explicit `operationId` field are still exposed as tools. The connector generates an ID from the HTTP method and path. Adding `operationId` to your specification produces clearer tool names for the language model and makes the allow list easier to maintain.
:::

### Authentication Configuration

#### None

Select this option for public APIs that do not require authentication. No additional configuration is needed.

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

#### OAuth2/OIDC Authentication

The connector uses the authorization code grant. When an agent first invokes a tool, the user is redirected to the provider to authorize the connector. Agent Mesh stores the resulting tokens and refreshes the access token at invocation time when it expires.

| Field                       | Required | Description                                                                                                                                                  |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Authorization Endpoint      | Yes      | The URL where users authorize the application                                                                                                                |
| Token Endpoint              | Yes      | The URL where the connector obtains access tokens                                                                                                            |
| Refresh URL                 | No       | The URL the connector uses to refresh expired access tokens. Defaults to the token endpoint when empty                                                       |
| Client ID                   | Yes      | Your OAuth2 client identifier                                                                                                                                |
| Client Secret               | No       | Your OAuth2 client secret. Leave empty for PKCE-only flows                                                                                                   |
| Scopes                      | No       | Space-separated list of OAuth2 scopes to request (for example, `read write` or `users:read`)                                                                 |
| Token Endpoint Auth Method  | Yes      | How the connector authenticates at the token endpoint: `Client Secret Basic` (default), `Client Secret Post`, or `None` (for PKCE-only flows)                |

## After You Create the Connector

The connector is now available for you to assign to agents. For information about assigning, editing, and deleting connectors, see `link to "Connectors"` .

## Security Considerations

OpenAPI connectors use a shared credential model. For more information, see `link to "Connectors"` .

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
- For OAuth2/OIDC, the requested scopes are valid and permitted for your client credentials

### Agents Report That Operations Are Not Available

Check the following:

- The specification contains paths with operations defined
- The allow list configuration is correct. When the allow list is set, only the listed operation IDs are exposed
- Connector logs show tool loading messages
- The specification was uploaded and processed

## What Next?

You have just created an OpenAPI connector. Most readers next want to assign the connector to an agent, covered in `link to "Connectors"` .
