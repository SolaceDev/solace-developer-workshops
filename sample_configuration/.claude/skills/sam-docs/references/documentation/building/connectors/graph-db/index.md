---
title: Graph Database Connectors (Experimental)
description: Configure Graph Database connectors so agents can query Neo4j or Amazon Neptune graph databases using Cypher through natural language.
sidebar_position: 1
---

# Graph Database Connectors (Experimental)

:::warning
This feature is in the Experimental stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

Graph Database connectors give agents the ability to query Neo4j and Amazon Neptune graph databases using Cypher. The connector introspects the graph schema at startup, so the agent understands the node labels, relationship types, and property structure without manual configuration.

## When to Use a Graph Database Connector

Use a Neo4j connector when your agents need to traverse or query a self-hosted or cloud-hosted Neo4j graph database. The connector uses the Bolt protocol and supports the full Cypher query language.

Use a Neptune connector when your agents need to query an Amazon-managed Neptune graph database. Neptune supports openCypher, which is a compatible subset of Cypher. Neptune-specific features such as APOC procedures are not available.

## Before You Start

Before creating a Graph Database connector, confirm the following:

- You have a running Agent Mesh deployment. For setup instructions, see [Install and Deploy](../../../installing/index.md).
- You have network access from the Agent Mesh deployment to your Neo4j instance or Neptune cluster endpoint.
- For Neo4j: you have a hostname, port, username, password, and optionally a database name.
- For Neptune: you have the cluster endpoint, AWS region, and either an AWS Access Key pair or an IAM role ARN with permissions to query the cluster.

:::warning
All agents that use the connector share the same database credentials. Agent Mesh cannot restrict what queries an agent executes. Use credentials with the minimum necessary permissions: read-only access when writes are not required.
:::

## Configuring a Neo4j Connector

To create a Neo4j connector in the Agent Mesh UI:

1. In the UI, navigate to **Connectors** and select **New Connector**.
2. Under connector type, select **Graph Database**, then select **Neo4j**.
3. Fill in the fields described in the following table.
4. Select **Save**.

After saving, assign the connector to one or more agents on the agent configuration page.

### Neo4j Configuration Fields

| Field | Required | Default | Description |
|---|---|---|---|
| Scheme | No | `neo4j` | Connection scheme. `neo4j` and `neo4j+s` route connections across a cluster; `bolt` and `bolt+s` connect directly to a single instance. The `+s` variants use TLS. |
| Host | Yes | — | Neo4j host or IP address, without the scheme or port. |
| Port | No | `7687` | Bolt port. |
| Username | Yes | — | Neo4j username. |
| Password | Yes | — | Neo4j password. After saving, this value is no longer displayed. |
| Database Name | No | `neo4j` | The Neo4j database to query. Defaults to `neo4j` when not specified. |

### Scheme Selection

| Scheme | Use for |
|---|---|
| `neo4j` | A Neo4j cluster or Aura instance; routes connections across available cluster members. |
| `neo4j+s` | Same as `neo4j` with TLS. Use for production clusters and Aura. |
| `bolt` | A single Neo4j instance without routing. |
| `bolt+s` | A single Neo4j instance with TLS. |

### How the Agent Queries Neo4j

Each connector exposes one tool. Its name is derived from the connector: it combines the database name, `neo4j_query`, and a short unique suffix, for example `movies_neo4j_query_a1b2c3d4`. It accepts Cypher queries and an optional parameter map for parameterized queries. The `limit` parameter controls the maximum number of records returned (default: 20).

Supported Cypher patterns include:

- `MATCH` traverses and reads data: `MATCH (n:Person)-[:KNOWS]->(f) RETURN f.name`
- `CREATE` creates nodes or relationships: `CREATE (n:Person {name: $name})`
- `MERGE` creates a node if it does not already exist: `MERGE (n:Person {email: $email}) SET n.name = $name`
- `SET` updates properties: `MATCH (n:Person {name: $name}) SET n.age = $age`
- `DELETE` removes nodes or relationships: `MATCH (n:Person {name: $name}) DELETE n`

Use `$paramName` syntax in queries and pass values through the `params` field to avoid query injection.

### Schema Introspection

At startup, the connector introspects the graph schema by sampling up to 100 nodes per label and 50 labels. The agent uses this schema to construct accurate Cypher queries. If introspection fails, the agent still functions but operates without schema context.

Schema introspection runs automatically; there is no per-connector toggle. If the database is unreachable at startup, the connector still loads and the agent operates without schema context.

## Configuring a Neptune Connector

To create a Neptune connector in the Agent Mesh UI:

1. Navigate to **Connectors** and select **New Connector**.
2. Under connector type, select **Graph Database**, then select **Amazon Neptune**.
3. Fill in the fields described in the following table.
4. Select **Save**.

### Neptune Configuration Fields

| Field | Required | Default | Description |
|---|---|---|---|
| Scheme | No | `bolt+s` | Connection scheme. Neptune requires TLS; `bolt+s` is standard. `neo4j+s` enables routing. |
| Cluster Endpoint | Yes | — | Neptune cluster endpoint host, without the scheme. Typically ends in `.neptune.amazonaws.com`. |
| Port | No | `8182` | Neptune port. Defaults to 8182. |
| Database Name | No | — | Optional. Most Neptune clusters do not require a database name. |
| AWS Region | Yes | `us-east-1` | The AWS region of the Neptune cluster. |
| Authentication Scheme | Yes | `access_key` | How to authenticate to AWS. Select **AWS Access Key** or **AWS IAM Role Chaining**. IAM Role Chaining is only available when Agent Mesh runs on AWS. |
| AWS Access Key ID | Yes (access_key) | — | The AWS Access Key ID. |
| AWS Secret Access Key | Yes (access_key) | — | The AWS Secret Access Key. |
| Role ARN | Yes (iam) | — | The ARN of the IAM role to assume. For example: `arn:aws:iam::123456789012:role/SolaceNeptuneAccess`. |
| Session Name | No | `solace-neptune-session` | Session name recorded in AWS CloudTrail for the assumed role. |
| External ID | No | — | Optional security token for cross-account role assumption. Required when the IAM role trust policy includes a condition on the external ID. |

:::note
IAM Role Chaining is only supported when Agent Mesh runs on AWS infrastructure. In other environments, use AWS Access Key authentication.
:::

### Neptune Differences From Neo4j

Neptune supports openCypher, which is compatible with most common Cypher patterns but does not support:

- APOC procedures (`apoc.*`)
- Neo4j-specific graph algorithms
- Some advanced Cypher features available only in Neo4j Enterprise

The agent receives instructions specific to Neptune at startup, which guide it away from unsupported syntax.

### How the Agent Queries Neptune

Each connector exposes one tool. Its name is derived from the connector: it combines the database name, `neptune_query`, and a short unique suffix, for example `catalog_neptune_query_a1b2c3d4`. When no database is set, the name omits that prefix. It accepts openCypher queries using the same parameter structure as the Neo4j tool. The `limit` parameter controls the maximum number of records returned (default: 20).

## Validating the Connector

After saving the connector and assigning it to an agent, test it by asking the agent a natural language question about the graph. For example: "Show me the first ten nodes in the graph" or "List all relationship types."

If the agent returns an error, check the following:

- The Agent Mesh deployment has network access to the database host or cluster endpoint on the configured port.
- The credentials have the necessary permissions.
- For Neptune, the security group permits inbound connections from the Agent Mesh deployment on port 8182.

For detailed troubleshooting, see the [Troubleshooting](#troubleshooting) section below.

## Troubleshooting

### Connection Fails at Startup

**Symptom:** The agent logs a message such as `failed to connect: connection refused` or `connection failed`.

**Most likely cause:** The Agent Mesh deployment cannot reach the database host on the configured port. A firewall, security group, or VPC configuration is blocking the connection.

**Solution:** Verify network connectivity from the Agent Mesh pod or process to the host on the Bolt port (default 7687 for Neo4j, 8182 for Neptune). For Kubernetes deployments, confirm that the pod's network policy and the database security group permit inbound connections from the Agent Mesh namespace.

### Neo4j Authentication Fails

**Symptom:** The agent logs a message such as `authentication failed` or `The client is unauthorized due to authentication failure`.

**Most likely cause:** The username or password is incorrect, or the user does not have access to the specified database.

**Solution:** Verify the credentials against the Neo4j browser or `cypher-shell`. Confirm that the user has access to the database name configured in the connector.

### Schema Introspection Returns Incomplete Results

**Symptom:** The agent constructs queries using incorrect label names or missing properties.

**Most likely cause:** The graph has more labels than the introspection limit (50 by default), or the sampled nodes do not represent the full property set.

**Solution:** The introspection limits (50 labels, 100 nodes sampled per label) are fixed. If the summary is incomplete, the agent can still run correct Cypher when you name the labels and properties in your request, or scope the connector to a database that contains only the relevant subgraph.

### Neptune Queries Fail with Unsupported Cypher

**Symptom:** The agent attempts to use `apoc.*` procedures or other Neo4j-specific syntax and receives an error.

**Most likely cause:** The agent was not configured with Neptune-specific instructions, or the schema summary does not indicate Neptune as the backend.

**Solution:** Confirm that the connector subtype is set to `neptune`, not `neo4j`. The subtype determines which instruction set the agent receives and steers it away from unsupported syntax.

### IAM Role Chaining Fails Outside AWS

**Symptom:** Authentication fails with an error such as `failed to assume role`.

**Most likely cause:** The Agent Mesh deployment is not running on AWS. IAM Role Chaining requires EC2 instance profile credentials or EKS pod identity.

**Solution:** Switch the Authentication Scheme to AWS Access Key.

## Define Graph Database Connectors as Code Instead

The Agent Mesh UI is one way to create a connector; the `sam` CLI is the other. With declarative config you describe connectors as YAML and reconcile them into Agent Mesh with `sam config apply`, the version-controllable path that suits GitOps and automation. To create the same connector from the command line, see [Graph Database Connectors via the CLI (Experimental)](./cli.md).

## Next Steps

You have a Graph Database connector configured and ready to assign to an agent. From here:

- For an overview of connecting external systems, see [Configuring Connectors](../index.md).
- To query a document database, see [Document Database Connectors (Experimental)](../document-db/index.md).
- To run full-text search queries, see [Search Connectors (Experimental)](../search/index.md).
