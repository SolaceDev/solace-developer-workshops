---
title: Document Database Connectors (Experimental)
description: Configure Document Database connectors so agents can query MongoDB collections or Amazon DynamoDB tables through natural language.
sidebar_position: 1
---

# Document Database Connectors (Experimental)

:::warning
This feature is in the Experimental stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

Document Database connectors give agents read and write access to MongoDB collections and Amazon DynamoDB tables. Each connector targets a single collection or table. The agent receives the database schema automatically at startup through schema introspection, so it can construct accurate queries without you providing schema details manually.

## When to Use a Document Database Connector

Use a MongoDB connector when your agents need to query or modify documents stored in a MongoDB collection. The connector exposes the full MongoDB aggregation pipeline for reads and supports insert, update, and delete operations.

Use a DynamoDB connector when your agents need to query or modify items in an Amazon DynamoDB table. The connector uses PartiQL, an SQL-compatible query language for DynamoDB.

If you need to query multiple collections or tables, create a separate connector for each one. The connector binds to exactly one collection or table; it does not span multiple.

## Before You Start

Before creating a Document Database connector, confirm the following:

- You have a running Agent Mesh deployment. For setup instructions, see [Install and Deploy](../../../installing/index.md).
- You have network access from the Agent Mesh deployment to your MongoDB cluster or DynamoDB table.
- For MongoDB: you have a hostname, optional port, optional credentials, a database name, and a collection name.
- For DynamoDB: you have the AWS region, table name, and either an AWS Access Key pair or an IAM role ARN with permissions to query the table.

:::warning
All agents that use the connector share the same database credentials. Agent Mesh cannot restrict what queries an agent executes. Configure the credentials with the minimum necessary permissions: read-only access when writes are not required, and access scoped to the specific collection or table.
:::

## Configuring a MongoDB Connector

To create a MongoDB connector in the Agent Mesh UI:

1. In the UI, navigate to **Connectors** and select **New Connector**.
2. Under connector type, select **Document Database**, then select **MongoDB**.
3. Fill in the fields described in the following table.
4. Select **Save**.

After saving, assign the connector to one or more agents on the agent configuration page.

### MongoDB Configuration Fields

| Field | Required | Default | Description |
|---|---|---|---|
| Scheme | No | `mongodb` | Connection scheme. Use `mongodb+srv` for DNS seedlist clusters such as MongoDB Atlas. The `mongodb+srv` scheme resolves hosts through SRV records and ignores the Port field. |
| Host | Yes | — | MongoDB host or cluster address, without the scheme or port. Accepts a hostname or IPv4 address. |
| Port | No | `27017` | MongoDB port. Ignored when Scheme is `mongodb+srv`. |
| Username | No | — | Authentication username. Leave blank for unauthenticated access. |
| Password | No | — | Authentication password. After saving, this value is no longer displayed. |
| Database Name | No | — | The authentication database and default database. Required when a Username is set. For example: `admin`. |
| Collection | Yes | — | The MongoDB collection this connector queries. |
| Connection Options | No | — | Optional URI query options, without the leading `?`. For example: `retryWrites=true&w=majority`. |

:::note
The connector creates exactly one tool per connector. To query multiple collections, create one connector per collection.
:::

### How the Agent Queries MongoDB

Each connector exposes one tool. Its name is derived from the connector: it combines the collection, `mongo_query`, and a short unique suffix, for example `events_mongo_query_a1b2c3d4`. The tool supports four operations:

- `aggregate` (default) executes an aggregation pipeline. The agent uses `[{"$match": {...}}]` for simple filters and the full pipeline syntax for more complex reads.
- `insert` inserts a JSON array of documents.
- `update` updates all documents matching a filter using MongoDB update operators such as `$set`.
- `delete` removes documents matching a filter. An empty filter is rejected to prevent accidental full-collection deletion.

Results from `aggregate` operations are written to an artifact and returned inline up to the configured inline limit. Write operations return an affected document count.

:::warning
The `update` operation applies to all documents that match the filter. There is no "update one" behavior. Confirm that the filter is specific before asking the agent to update records.
:::

### Schema Introspection

At startup, the connector samples up to 100 documents from the collection and generates a schema summary. The agent uses this summary to construct queries accurately. If introspection fails, the agent still functions but operates without schema context.

Schema introspection runs automatically; there is no per-connector toggle. If the database is unreachable at startup, the connector still loads and the agent operates without schema context.

## Configuring a DynamoDB Connector

To create a DynamoDB connector in the Agent Mesh UI:

1. Navigate to **Connectors** and select **New Connector**.
2. Under connector type, select **Document Database**, then select **DynamoDB**.
3. Fill in the fields described in the following table.
4. Select **Save**.

### DynamoDB Configuration Fields

| Field | Required | Default | Description |
|---|---|---|---|
| AWS Region | Yes | `us-east-1` | The AWS region where the DynamoDB table is located. For example: `us-west-2`. |
| Table Name | Yes | — | The DynamoDB table this connector queries. |
| Authentication Scheme | Yes | `access_key` | How to authenticate to AWS. Select **AWS Access Key** or **AWS IAM Role Chaining**. IAM Role Chaining is only available when Agent Mesh runs on AWS. |
| AWS Access Key ID | Yes (access_key) | — | The AWS Access Key ID. Visible only when Authentication Scheme is AWS Access Key. |
| AWS Secret Access Key | Yes (access_key) | — | The AWS Secret Access Key. Visible only when Authentication Scheme is AWS Access Key. |
| Role ARN | Yes (iam) | — | The ARN of the IAM role to assume. For example: `arn:aws:iam::123456789012:role/SolaceDynamoDBAccess`. Visible only when Authentication Scheme is AWS IAM Role Chaining. |
| Session Name | No | `solace-document-db-session` | Session name recorded in AWS CloudTrail for the assumed role. Visible only when Authentication Scheme is AWS IAM Role Chaining. |
| External ID | No | — | Optional security token for cross-account role assumption. Required when the IAM role trust policy includes a condition on the external ID. |

:::note
IAM Role Chaining is only supported when Agent Mesh runs on AWS infrastructure, such as an Amazon EKS cluster. In other environments, use AWS Access Key authentication.
:::

### How the Agent Queries DynamoDB

Each connector exposes one tool. Its name is derived from the connector: it combines the table name, `dynamodb_query`, and a short unique suffix, for example `orders_dynamodb_query_a1b2c3d4`. It accepts PartiQL statements and executes them against the configured table:

- `SELECT * FROM "TableName" WHERE pk = 'value'` reads items. Always include the partition key in WHERE clauses for efficient queries.
- `INSERT INTO "TableName" VALUE {'pk': 'val', 'attr': 'val'}` inserts an item.
- `UPDATE "TableName" SET attr = 'val' WHERE pk = 'val' AND sk = 'val'` updates an item.
- `DELETE FROM "TableName" WHERE pk = 'val' AND sk = 'val'` deletes an item.

SELECT results are written to an artifact and returned inline up to the configured limit. Write statements return an affected count.

### DynamoDB Schema Introspection

At startup, the connector samples up to 100 items from the table and infers a schema. The agent uses this schema to construct accurate PartiQL statements.

## Validating the Connector

After saving the connector and assigning it to an agent, test it by asking the agent a query in natural language. For MongoDB, try "Show me the first five documents in the collection." For DynamoDB, try "What are the most recent items in the table?"

If the agent returns an error or no results, check the following:

- The Agent Mesh deployment has network access to the database host or DynamoDB endpoint.
- The credentials have the necessary permissions.
- The collection or table name is correct.

For detailed troubleshooting, see the [Troubleshooting](#troubleshooting) section below.

## Troubleshooting

### Connection Fails at Startup

**Symptom:** The agent logs a message such as `failed to connect: connection refused` or `connection failed` when the connector starts.

**Most likely cause:** The Agent Mesh deployment cannot reach the database host. The hostname or port is incorrect, or a firewall or security group rule blocks the connection.

**Solution:** Verify network connectivity from the Agent Mesh pod or process to the database host on the configured port. For Kubernetes deployments, confirm that the pod's network policy and the database's security group permit inbound connections from the Agent Mesh namespace.

### Schema Introspection Fails but Agent Still Works

**Symptom:** The agent log contains `Schema introspection failed` but the connector starts successfully. Queries may produce less accurate results.

**Most likely cause:** The credentials have read access to the collection or table but the introspection query timed out or returned an error. This can occur on large collections where the sample query takes longer than the connector's startup window.

**Solution:** The agent continues to operate without schema context, though queries may be less accurate. Confirm the credentials have read access and that the database is reachable from the Agent Mesh deployment at startup so introspection can complete.

### DynamoDB Queries Scan the Entire Table

**Symptom:** DynamoDB queries are slow and AWS reports high read capacity consumption.

**Most likely cause:** The PartiQL SELECT statement does not include the partition key in the WHERE clause. DynamoDB performs a full table scan when the partition key is absent.

**Solution:** Confirm the table's partition key appears in the schema introspection summary, and ask the agent to filter by the partition key so DynamoDB runs a query rather than a full table scan.

### MongoDB Delete Rejected with Empty Filter

**Symptom:** The agent reports an error such as `delete rejected: empty filter is not allowed`.

**Most likely cause:** The agent passed an empty filter `{}` to the delete operation. The connector rejects empty filters to prevent accidental full-collection deletion.

**Solution:** The agent requires a specific filter for delete operations. Rephrase the request to be explicit about which documents to delete.

### DynamoDB IAM Role Chaining Fails Outside AWS

**Symptom:** Authentication fails with an error such as `failed to assume role` when using IAM Role Chaining.

**Most likely cause:** The Agent Mesh deployment is not running on AWS. IAM Role Chaining uses the EC2 instance profile or EKS pod identity to assume the target role. These mechanisms are not available outside AWS.

**Solution:** Switch the Authentication Scheme to AWS Access Key and provide explicit credentials.

## Define Document Database Connectors as Code Instead

The Agent Mesh UI is one way to create a connector; the `sam` CLI is the other. With declarative config you describe connectors as YAML and reconcile them into Agent Mesh with `sam config apply`, the version-controllable path that suits GitOps and automation. To create the same connector from the command line, see [Document Database Connectors via the CLI (Experimental)](./cli.md).

## Next Steps

You have a Document Database connector configured and ready to assign to an agent. From here:

- For an overview of connecting external systems, see [Configuring Connectors](../index.md).
- To query a relational database, see [SQL Connectors](../sql/index.md).
- To let agents traverse a graph database, see [Graph Database Connectors (Experimental)](../graph-db/index.md).
