---
title: Configuring Agent Mesh
description: Wire Agent Mesh to your broker, LLM provider, artifact storage, session storage, and identity provider with YAML and environment variables.
sidebar_position: 360
---

# Configuring Agent Mesh

<!-- WRITER NOTE: Source: archive/installing/configure.md. Rewrite to Solace style. Do NOT copy/paste. -->

This page covers configuration for the CLI binary, Docker, and Kubernetes deployments. The desktop bundle uses bundled defaults and is not configurable—see [Installing the Desktop Bundle](./desktop.md).

## Event Broker Connection

<!-- WRITER NOTE: Numbered steps. Cover: the YAML block for broker connection (host, port, VPN, credentials), environment variables for credentials, TLS configuration, and how to verify the connection is working (health check or log output). -->

1. Add the broker connection block to your configuration file:

   ```yaml
   broker:
     [host]: [your-broker-host]
     [port]: [your-broker-port]
     [vpn]: [your-message-vpn]
     [username]: ${BROKER_USERNAME}
     [password]: ${BROKER_PASSWORD}
   ```

2. Export your broker credentials as environment variables:

   ```bash
   export BROKER_USERNAME=[username]
   export BROKER_PASSWORD=[password]
   ```

3. [Start or restart Agent Mesh and verify the connection — for example, run a health check or look for a successful connection log line.]

   The startup log shows a successful connection to the event broker and no connection error messages appear.

## LLM Provider

<!-- WRITER NOTE: Numbered steps. Cover: how to set the provider and model in YAML, how to pass the API key via environment variable, and how to verify the LLM connection is working. Cover multiple providers if configuration differs between them. -->

1. Set the model provider and model name in your agent configuration:

   ```yaml
   model:
     model: [provider]/[model-name]
     api_key: ${[PROVIDER_API_KEY_VAR]}
   ```

2. Export your LLM API key:

   ```bash
   export [PROVIDER_API_KEY_VAR]=[your-api-key]
   ```

3. [Verify the LLM connection — for example, send a test task or run `sam-enterprise doctor`.] The command reports the LLM provider as reachable.

## Artifact Storage

<!-- WRITER NOTE: Numbered steps. Cover: the available backends (filesystem, S3, GCS, Azure Blob), the YAML configuration for each, required credentials, and how to verify artifacts are being written correctly. Note which backend is the default. -->

1. Choose a storage backend and add the appropriate block to your configuration file:

   ```yaml
   artifact_service:
     type: [filesystem | s3 | gcs | azure_blob]
     [backend-specific settings here]
   ```

   [Describe each backend option and its settings in detail here.]

2. [For cloud storage backends, export any required credentials as environment variables.]

3. [Start or restart Agent Mesh.] Agent Mesh starts without storage errors in the log output.

## Session Storage

<!-- WRITER NOTE: Numbered steps. Cover: the available backends (SQLite, Postgres, in-memory), the YAML configuration for each, and the trade-offs between them (persistence, scalability). Note which backend is the default and when to use Postgres instead. -->

1. Choose a session storage backend and add the appropriate block to your configuration file:

   ```yaml
   session_service:
     type: [memory | sqlite | postgres]
     [backend-specific settings here]
   ```

   [Describe each backend option, its settings, and when to use it — for example, use Postgres for production deployments that require persistence and horizontal scaling.]

2. [Start or restart Agent Mesh.] Agent Mesh starts and session data is written to the configured backend.

## Authentication and RBAC

<!-- WRITER NOTE: Numbered steps. Cover: the three authorization_service.type modes (none / default_rbac / deny_all), OIDC provider wiring, and the built-in login option. Cross-reference RBAC Reference for the scope catalog. -->

1. Set the authorization mode in your configuration file:

   ```yaml
   authorization_service:
     type: [none | default_rbac | deny_all]
   ```

   [Describe when to use each mode — for example, use `none` for local development, `default_rbac` for normal operation, and `deny_all` for hardening a deployment.]

2. [If using OIDC authentication, add the identity provider configuration block and any required environment variables.]

3. [Start or restart Agent Mesh.] The Web UI login page reflects the configured authentication mode.

## Next Steps

- To set up logging and metrics, see [Monitoring Your Deployment](./monitor.md).
- For the full configuration schema, see [Configuration Schema](../reference/config-schema.md).
- For the RBAC scope catalog, see [RBAC Reference](../reference/rbac-reference.md).
