---
title: Document Database Connectors via the CLI (Experimental)
description: Define a Document Database connector as declarative-config YAML and apply it into Agent Mesh with sam config.
sidebar_position: 2
---

# Document Database Connectors via the CLI (Experimental)

:::warning
This feature is in the Experimental stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

To configure this connector in the Agent Mesh UI, see [Document Database Connectors (Experimental)](./index.md). This page covers authoring the connector as version-controllable YAML, called *declarative config*: the YAML specific to the `connector` kind. For the `sam config plan`, `apply`, and `pull` workflow that applies to every kind, see [Managing Configuration as Code (Early Access)](../../declarative-config/index.md).

Each connector is one file under the `connectors/` directory of a declarative-config repo. The `spec.type` and `spec.subtype` fields select the connector schema, and `spec.values` carries the same configuration fields available in the Agent Mesh UI. Reference secret fields as `${VAR}` environment placeholders that are resolved at apply time and never written to the file.

## MongoDB

```yaml
kind: connector
name: orders-mongodb
description: "MongoDB connector for the orders collection."
spec:
  type: document_db
  subtype: mongodb
  values:
    scheme: mongodb+srv
    hostname: cluster0.abcd.mongodb.net
    username: app-reader
    password: ${ORDERS_MONGODB_PASSWORD}
    database: orders
    collection: events
    options: "retryWrites=true&w=majority"
```

### MongoDB Values

| Field | Required | Default | Description |
|---|---|---|---|
| `scheme` | No | `mongodb` | Connection scheme. Use `mongodb+srv` for DNS-seedlist clusters such as MongoDB Atlas, which resolve hosts through SRV records and ignore the port. |
| `hostname` | Yes | — | MongoDB host or cluster address, without the scheme or port. |
| `port` | No | `27017` | MongoDB port. Ignored when `scheme` is `mongodb+srv`. |
| `username` | No | — | Authentication username. Omit for unauthenticated access. |
| `password` | No | — | Authentication password. Reference as `${VAR}`. |
| `database` | No | — | Authentication database and default database. Often required when `username` is set (for example, `admin`). |
| `collection` | Yes | — | The MongoDB collection this connector queries. |
| `options` | No | — | URI query options, without the leading `?`. For example: `retryWrites=true&w=majority`. |

## DynamoDB

The following example uses AWS Access Key authentication:

```yaml
kind: connector
name: orders-dynamodb
description: "DynamoDB connector for the Orders table."
spec:
  type: document_db
  subtype: dynamodb
  values:
    region: us-east-1
    table_name: Orders
    auth_type: access_key
    aws_access_key_id: ${ORDERS_DYNAMODB_ACCESS_KEY_ID}
    aws_secret_access_key: ${ORDERS_DYNAMODB_SECRET_ACCESS_KEY}
```

The following example uses IAM Role Chaining, available only when Agent Mesh runs on AWS:

```yaml
kind: connector
name: orders-dynamodb
description: "DynamoDB connector for the Orders table."
spec:
  type: document_db
  subtype: dynamodb
  values:
    region: us-east-1
    table_name: Orders
    auth_type: iam
    role_arn: arn:aws:iam::123456789012:role/SolaceDynamoDBAccess
    external_id: ${ORDERS_DYNAMODB_EXTERNAL_ID}
```

### DynamoDB Values

| Field | Required | Default | Description |
|---|---|---|---|
| `region` | Yes | `us-east-1` | AWS region where the DynamoDB table is located. |
| `table_name` | Yes | — | The DynamoDB table this connector queries. |
| `auth_type` | Yes | `access_key` | Authentication method: `access_key` or `iam`. IAM Role Chaining is only supported when Agent Mesh runs on AWS. |
| `aws_access_key_id` | Yes (`access_key`) | — | AWS Access Key ID. Reference as `${VAR}`. |
| `aws_secret_access_key` | Yes (`access_key`) | — | AWS Secret Access Key. Reference as `${VAR}`. |
| `role_arn` | Yes (`iam`) | — | ARN of the IAM role to assume. |
| `session_name` | No (`iam`) | `solace-document-db-session` | Session name recorded in AWS CloudTrail for the assumed role. |
| `external_id` | No (`iam`) | — | Cross-account security token. Include only when the IAM role's trust policy requires it. Reference as `${VAR}`. |

## Apply and Verify

List the connector in your manifest, preview with `sam config plan -m manifest.yaml`, then apply:

```bash
sam config apply -m manifest.yaml
```

`apply` creates the connector, or updates it in place if it already exists. Provide each `${VAR}` secret as an environment variable in the shell that runs `apply`. To confirm the result, export it back into YAML with `sam config pull -o ./pulled --url http://127.0.0.1:8800 --only connector`, or open the **Connectors** page in the Agent Mesh UI. For details on the manifest format, the `plan`/`apply`/`pull` commands, and secret handling, see [Managing Configuration as Code (Early Access)](../../declarative-config/index.md).

## Troubleshooting

### MongoDB Connection Refused

**Symptom:** The agent logs `failed to connect: connection refused` or `no such host` when the connector starts.

**Most likely cause:** The hostname or port is incorrect, or a firewall or security group rule blocks the connection from the Agent Mesh deployment.

**Solution:** Verify network connectivity from the Agent Mesh pod or process to the database host on the configured port. For Kubernetes deployments, confirm that the pod's network policy and the database's security group permit connections from the Agent Mesh namespace.

### Unresolved `${VAR}` in the Connection

**Symptom:** The connector logs a connection error referencing a literal `${VAR}` string.

**Most likely cause:** The environment variable referenced in `spec.values` was not set in the shell that ran `sam config apply`, so the secret was stored as the literal placeholder.

**Solution:** Export the environment variable, then re-run `sam config apply`. For credentials that rotate, prefer storing the connector with a placeholder and supplying the value at apply time.

### MongoDB Delete Rejected with Empty Filter

**Symptom:** The agent reports `delete rejected: empty filter is not allowed`.

**Most likely cause:** The agent passed an empty filter `{}` to the delete operation. The connector rejects empty filters to prevent accidental full-collection deletion.

**Solution:** Rephrase the request so the agent supplies a specific filter for the documents to delete.

### DynamoDB IAM Role Chaining Fails Outside AWS

**Symptom:** Authentication fails with `failed to assume role` when `auth_type` is `iam`.

**Most likely cause:** The Agent Mesh deployment is not running on AWS. IAM Role Chaining uses the EC2 instance profile or EKS pod identity to assume the target role, which is not available outside AWS.

**Solution:** Set `auth_type` to `access_key` and provide explicit credentials.

## What Next?

You have a Document Database connector defined as version-controllable YAML and applied with `sam config apply`. From here:

- To assign the connector to an agent and see the tools it exposes, see [Document Database Connectors (Experimental)](./index.md).
- To manage every resource kind through the same workflow, see [Managing Configuration as Code (Early Access)](../../declarative-config/index.md).
- To configure the other data connectors, see [Graph Database Connectors via the CLI (Experimental)](../graph-db/cli.md) and [Search Connectors via the CLI (Experimental)](../search/cli.md).
- For an overview of connecting external systems, see [Configuring Connectors](../index.md).
