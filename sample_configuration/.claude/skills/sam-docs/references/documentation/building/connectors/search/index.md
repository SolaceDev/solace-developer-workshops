---
title: Search Connectors (Experimental)
description: Configure Search connectors so agents can query Elasticsearch clusters or Amazon OpenSearch domains through natural language.
sidebar_position: 1
---

# Search Connectors (Experimental)

:::warning
This feature is in the Experimental stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

Search connectors give agents read and write access to Elasticsearch clusters and Amazon-managed OpenSearch domains. The connector introspects the cluster's index mappings at startup so the agent understands the available indices and field structure without manual configuration.

## When to Use a Search Connector

Use an Elasticsearch connector when your agents need to query an Elasticsearch cluster or a self-hosted OpenSearch cluster that exposes the Elasticsearch-compatible API. The connector uses the Elasticsearch Query DSL and supports search, aggregation, index, update, delete, and count operations.

Use an OpenSearch connector when your agents need to query an Amazon-managed OpenSearch domain or OpenSearch Serverless collection. Authentication uses AWS SigV4 request signing. For a self-hosted OpenSearch cluster with the Elasticsearch-compatible API, use the Elasticsearch connector instead.

## Before You Start

Before creating a Search connector, confirm the following:

- You have a running Agent Mesh deployment. For setup instructions, see [Install and Deploy](../../../installing/index.md).
- You have network access from the Agent Mesh deployment to your Elasticsearch cluster or OpenSearch domain endpoint.
- For Elasticsearch: you have the host and port, or an Elastic Cloud ID, and optionally an API key or username and password.
- For OpenSearch: you have the domain endpoint, AWS region, and either an AWS Access Key pair or an IAM role ARN with permissions to query the domain.

:::warning
All agents that use the connector share the same cluster credentials. Agent Mesh cannot restrict what queries an agent executes. Use API keys or IAM roles with the minimum necessary permissions scoped to the specific indices the agent requires.
:::

## Configuring an Elasticsearch Connector

To create an Elasticsearch connector in the Agent Mesh UI:

1. In the UI, navigate to **Connectors** and select **New Connector**.
2. Under connector type, select **Search**, then select **Elasticsearch**.
3. Fill in the fields described in the following table.
4. Select **Save**.

After saving, assign the connector to one or more agents on the agent configuration page.

### Elasticsearch Configuration Fields

| Field | Required | Default | Description |
|---|---|---|---|
| Scheme | No | `https` | Connection scheme for the Host form. Ignored when a Cloud ID is provided. |
| Host | No | — | Elasticsearch host, without the scheme. Provide either this or a Cloud ID. |
| Port | No | `9200` | Elasticsearch port. Defaults to 9200. Ignored when a Cloud ID is provided. |
| Cloud ID | No | — | Elastic Cloud deployment ID. Provide either this or a Host. |
| API Key | No | — | Base64-encoded `id:api_key` for secured clusters. Leave blank for an unsecured cluster or when using a username and password. |
| Username | No | — | Basic-auth username (for example, `elastic`). Use this with Password as an alternative to an API key. |
| Password | No | — | Basic-auth password, paired with Username. |

You must provide either a Host or a Cloud ID. Both cannot be blank.

:::note
Self-hosted OpenSearch clusters that expose the Elasticsearch-compatible API can connect through this connector. Use the Elasticsearch connector type and point it at the OpenSearch endpoint. For Amazon-managed OpenSearch with AWS SigV4 authentication, use the OpenSearch connector type instead.
:::

### Authentication Options

The Elasticsearch connector supports three authentication modes:

- No authentication: leave API Key, Username, and Password blank. Use for local development clusters started with security disabled.
- API key: provide the Base64-encoded `id:api_key` string. This is the recommended method for secured clusters.
- Username and password: provide both fields. This is an alternative to an API key for clusters that do not support API key authentication.

### How the Agent Queries Elasticsearch

Each connector exposes one tool. Its name combines `elasticsearch_query` with a short unique suffix, for example `elasticsearch_query_a1b2c3d4`. It accepts an index name, a Query DSL JSON body, and an optional operation. The `limit` parameter controls the maximum number of documents returned for search operations (default: 20).

Supported operations:

- `search` (default) executes a Query DSL search. For example: `{"query": {"match": {"title": "search term"}}}`
- `index` inserts a document. Set `operation` to `index` and pass the document body in `query`. Optionally set `id` to assign a specific document ID.
- `update` updates a document. Set `id` for a specific document, or pass a query body for update-by-query.
- `delete` removes a document by `id`, or by query when `id` is omitted.
- `count` returns the document count for an optional filter.

Use `_source` filtering to reduce response size when indices have large documents: `{"_source": ["field1", "field2"], "query": {...}}`.

### Schema Introspection

At startup, the connector retrieves index mappings from the cluster and generates a schema summary. The agent uses this summary to construct accurate Query DSL queries. By default, the connector introspects up to 20 indices and samples up to 100 documents per index.

## Configuring an OpenSearch Connector

To create an OpenSearch connector in the Agent Mesh UI:

1. Navigate to **Connectors** and select **New Connector**.
2. Under connector type, select **Search**, then select **Amazon OpenSearch**.
3. Fill in the fields described in the following table.
4. Select **Save**.

### OpenSearch Configuration Fields

| Field | Required | Default | Description |
|---|---|---|---|
| Scheme | No | `https` | Connection scheme. Managed OpenSearch uses HTTPS. |
| Host | Yes | — | OpenSearch domain or serverless collection host, without the scheme. Typically ends in `.es.amazonaws.com` or `.aoss.amazonaws.com`. |
| Port | No | — | Optional. Managed OpenSearch listens on 443; leave blank unless your domain uses a non-standard port. |
| AWS Region | Yes | `us-east-1` | The AWS region used for SigV4 request signing. |
| Authentication Scheme | Yes | `access_key` | How to authenticate to AWS. Select **AWS Access Key** or **AWS IAM Role Chaining**. IAM Role Chaining is only available when Agent Mesh runs on AWS. |
| AWS Access Key ID | Yes (access_key) | — | The AWS Access Key ID. |
| AWS Secret Access Key | Yes (access_key) | — | The AWS Secret Access Key. |
| Role ARN | Yes (iam) | — | The ARN of the IAM role to assume. For example: `arn:aws:iam::123456789012:role/SolaceOpenSearchAccess`. |
| Session Name | No | — | Session name recorded in AWS CloudTrail for the assumed role. |
| External ID | No | — | Optional security token for cross-account role assumption. Required when the IAM role trust policy includes a condition on the external ID. |

:::note
IAM Role Chaining is only supported when Agent Mesh runs on AWS infrastructure. In other environments, use AWS Access Key authentication.
:::

### How the Agent Queries OpenSearch

Each connector exposes one tool. Its name combines `opensearch_query` with a short unique suffix, for example `opensearch_query_a1b2c3d4`. It accepts the same index, query, operation, and limit parameters as the Elasticsearch tool. The Query DSL syntax is identical between the two connectors.

OpenSearch Serverless collections use the `.aoss.amazonaws.com` endpoint suffix and the same SigV4 authentication mechanism. Ensure the IAM role or access key has `aoss:APIAccessAll` permission on the collection, or appropriate data access policies configured in the OpenSearch Serverless console.

## Validating the Connector

After saving the connector and assigning it to an agent, test it by asking the agent to list available indices or search for documents. For example: "What indices are available?" or "Find the most recent documents in the logs index."

If the agent returns an error, check the following:

- The Agent Mesh deployment has network access to the cluster endpoint.
- The credentials have the necessary permissions.
- For OpenSearch, the domain access policy permits requests from the IAM role or access key.

For detailed troubleshooting, see the [Troubleshooting](#troubleshooting) section below.

## Troubleshooting

### Connection Fails at Startup

**Symptom:** The agent logs a message such as `connection failed` or `dial tcp: connection refused`.

**Most likely cause:** The Agent Mesh deployment cannot reach the Elasticsearch or OpenSearch endpoint. A firewall, VPC setting, or incorrect hostname is blocking the connection.

**Solution:** Verify connectivity from the Agent Mesh pod or process to the cluster endpoint on the configured port (default 9200 for Elasticsearch, 443 for OpenSearch). For Kubernetes deployments, check that the pod's network policy and the cluster's security group permit outbound connections.

### Elasticsearch API Key Rejected

**Symptom:** The agent receives a `401 Unauthorized` response.

**Most likely cause:** The API key is malformed, expired, or does not have access to the target index.

**Solution:** Regenerate the API key in the Elasticsearch Kibana console or with the `/_security/api_key` API. Confirm the key has `read` privileges on the required indices and `monitor` privileges on the cluster if schema introspection is enabled.

### OpenSearch SigV4 Authentication Fails

**Symptom:** The agent receives a `403 Forbidden` response with a message such as `The security token included in the request is invalid`.

**Most likely cause:** The AWS credentials are incorrect, the configured region does not match the domain's region, or the IAM role or user does not have an access policy on the OpenSearch domain.

**Solution:** Confirm the AWS region matches the domain's region exactly. Verify the IAM policy attached to the role or user includes an action covering `es:ESHttpGet` and `es:ESHttpPost` (or `es:*`) on the domain's ARN. For OpenSearch Serverless, confirm the data access policy is configured in the console.

### Schema Introspection Returns No Indices

**Symptom:** The agent cannot determine which indices are available and asks the user to specify an index name manually.

**Most likely cause:** The credentials do not have the `monitor` or `view_index_metadata` cluster privilege required for introspection, or the cluster has no indices.

**Solution:** Grant the API key or IAM role the `monitor` cluster privilege so introspection can retrieve index mappings. If the cluster genuinely has no indices yet, create the target index before assigning the connector to an agent.

### Agent Queries Wrong Index

**Symptom:** The agent queries an index that is not the intended target.

**Most likely cause:** The cluster has many indices and the agent selected one based on a name match that is not the correct one.

**Solution:** Name the target index explicitly in your request so the agent does not guess, or scope the connector's credentials to only the indices the agent can access.

### IAM Role Chaining Fails Outside AWS

**Symptom:** Authentication fails with `failed to assume role`.

**Most likely cause:** The Agent Mesh deployment is not running on AWS. IAM Role Chaining requires EC2 instance profile credentials or EKS pod identity.

**Solution:** Switch the Authentication Scheme to AWS Access Key.

## Define Search Connectors as Code Instead

The Agent Mesh UI is one way to create a connector; the `sam` CLI is the other. With declarative config you describe connectors as YAML and reconcile them into Agent Mesh with `sam config apply`, the version-controllable path that suits GitOps and automation. To create the same connector from the command line, see [Search Connectors via the CLI (Experimental)](./cli.md).

## Next Steps

You have a Search connector configured and ready to assign to an agent. From here:

- For an overview of connecting external systems, see [Configuring Connectors](../index.md).
- To query a document database, see [Document Database Connectors (Experimental)](../document-db/index.md).
- To let agents traverse a graph database, see [Graph Database Connectors (Experimental)](../graph-db/index.md).
