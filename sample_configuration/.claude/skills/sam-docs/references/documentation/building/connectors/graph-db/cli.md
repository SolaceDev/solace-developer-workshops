---
title: Graph Database Connectors via the CLI (Experimental)
description: Define a Graph Database connector as declarative-config YAML and apply it into Agent Mesh with sam config.
sidebar_position: 2
---

# Graph Database Connectors via the CLI (Experimental)

:::warning
This feature is in the Experimental stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

To configure this connector in the Agent Mesh UI, see [Graph Database Connectors (Experimental)](./index.md). This page covers authoring the connector as version-controllable YAML, called *declarative config*: the YAML specific to the `connector` kind. For the `sam config plan`, `apply`, and `pull` workflow that applies to every kind, see [Managing Configuration as Code (Early Access)](../../declarative-config/index.md).

Each connector is one file under the `connectors/` directory of a declarative-config repo. The `spec.type` and `spec.subtype` fields select the connector schema, and `spec.values` carries the same configuration fields available in the Agent Mesh UI. Reference secret fields as `${VAR}` environment placeholders that are resolved at apply time and never written to the file.

## Neo4j

```yaml
kind: connector
name: knowledge-neo4j
description: "Neo4j connector for the knowledge graph."
spec:
  type: graph_db
  subtype: neo4j
  values:
    scheme: neo4j+s
    hostname: my-neo4j.example.com
    port: 7687
    username: neo4j
    password: ${KNOWLEDGE_NEO4J_PASSWORD}
    database: neo4j
```

### Neo4j Values

| Field | Required | Default | Description |
|---|---|---|---|
| `scheme` | No | `neo4j` | Connection scheme. `neo4j` and `neo4j+s` route connections across a cluster; `bolt` and `bolt+s` connect directly to a single instance. The `+s` variants use TLS. |
| `hostname` | Yes | — | Neo4j host or IP address, without the scheme or port. |
| `port` | No | `7687` | Bolt port. |
| `username` | Yes | — | Neo4j username. |
| `password` | Yes | — | Neo4j password. Reference as `${VAR}`. |
| `database` | No | `neo4j` | The Neo4j database to query. |

### Scheme Selection

| Scheme | Use for |
|---|---|
| `neo4j` | A Neo4j cluster or Aura instance; routes connections across available cluster members. |
| `neo4j+s` | Same as `neo4j` with TLS. Use for production clusters and Aura. |
| `bolt` | A single Neo4j instance without routing. |
| `bolt+s` | A single Neo4j instance with TLS. |

:::warning
Connecting to a Neo4j cluster with the `bolt` scheme sends connections to a single member without cluster routing. Use `neo4j` or `neo4j+s` for cluster deployments.
:::

## Amazon Neptune

The following example uses AWS Access Key authentication:

```yaml
kind: connector
name: catalog-neptune
description: "Amazon Neptune connector for the product catalog graph."
spec:
  type: graph_db
  subtype: neptune
  values:
    scheme: bolt+s
    hostname: my-cluster.cluster-abc.us-east-1.neptune.amazonaws.com
    port: 8182
    region: us-east-1
    auth_type: access_key
    aws_access_key_id: ${CATALOG_NEPTUNE_ACCESS_KEY_ID}
    aws_secret_access_key: ${CATALOG_NEPTUNE_SECRET_ACCESS_KEY}
```

The following example uses IAM Role Chaining, available only when Agent Mesh runs on AWS:

```yaml
kind: connector
name: catalog-neptune
description: "Amazon Neptune connector for the product catalog graph."
spec:
  type: graph_db
  subtype: neptune
  values:
    scheme: bolt+s
    hostname: my-cluster.cluster-abc.us-east-1.neptune.amazonaws.com
    region: us-east-1
    auth_type: iam
    role_arn: arn:aws:iam::123456789012:role/SolaceNeptuneAccess
    external_id: ${CATALOG_NEPTUNE_EXTERNAL_ID}
```

### Neptune Values

| Field | Required | Default | Description |
|---|---|---|---|
| `scheme` | No | `bolt+s` | Connection scheme. Neptune requires TLS; `bolt+s` is standard, and `neo4j+s` enables routing. |
| `hostname` | Yes | — | Neptune cluster endpoint host, without the scheme or port. Typically ends in `.neptune.amazonaws.com`. |
| `port` | No | `8182` | Neptune port. |
| `database` | No | — | Optional. Most Neptune clusters do not require a database name. |
| `region` | Yes | `us-east-1` | AWS region used for SigV4 request signing. |
| `auth_type` | Yes | `access_key` | Authentication method: `access_key` or `iam`. IAM Role Chaining is only supported when Agent Mesh runs on AWS. |
| `aws_access_key_id` | Yes (`access_key`) | — | AWS Access Key ID. Reference as `${VAR}`. |
| `aws_secret_access_key` | Yes (`access_key`) | — | AWS Secret Access Key. Reference as `${VAR}`. |
| `role_arn` | Yes (`iam`) | — | ARN of the IAM role to assume. |
| `session_name` | No (`iam`) | `solace-neptune-session` | Session name recorded in AWS CloudTrail for the assumed role. |
| `external_id` | No (`iam`) | — | Cross-account security token. Include only when the IAM role's trust policy requires it. Reference as `${VAR}`. |

## Apply and Verify

List the connector in your manifest, preview with `sam config plan -m manifest.yaml`, then apply:

```bash
sam config apply -m manifest.yaml
```

`apply` creates the connector, or updates it in place if it already exists. Provide each `${VAR}` secret as an environment variable in the shell that runs `apply`. To confirm the result, export it back into YAML with `sam config pull -o ./pulled --url http://127.0.0.1:8800 --only connector`, or open the **Connectors** page in the Agent Mesh UI. For details on the manifest format, the `plan`/`apply`/`pull` commands, and secret handling, see [Managing Configuration as Code (Early Access)](../../declarative-config/index.md).

## Troubleshooting

### Connection Refused at Startup

**Symptom:** The agent logs `failed to connect: dial tcp: connection refused` on the Bolt port.

**Most likely cause:** The database is not reachable. The host or port is wrong, or a firewall or security group blocks the Bolt port (7687 for Neo4j, 8182 for Neptune).

**Solution:** Confirm the Bolt port on the database host and that the firewall or security group permits connections from the Agent Mesh deployment. If the instance uses a non-standard port, set the `port` field explicitly.

### Neptune Authentication Fails with Forbidden

**Symptom:** The agent logs a `403 Forbidden` error when connecting to Neptune.

**Most likely cause:** The IAM credentials lack a policy permitting access to the Neptune cluster endpoint.

**Solution:** Confirm the IAM role or user has a policy granting `neptune-db:connect` on the cluster ARN (`arn:aws:neptune-db:<region>:<account>:<cluster-id>/*`), and that `region` in the connector matches the cluster's region.

### Unresolved `${VAR}` in the Connection

**Symptom:** The connector fails to connect with an error referencing a literal `${VAR}` string in the Bolt URI.

**Most likely cause:** The environment variable referenced in `spec.values` was not set in the shell that ran `sam config apply`, so the secret was stored as the literal placeholder.

**Solution:** Export the environment variable, then re-run `sam config apply`.

### IAM Role Chaining Fails Outside AWS

**Symptom:** Authentication fails with `failed to assume role` when `auth_type` is `iam`.

**Most likely cause:** The Agent Mesh deployment is not running on AWS. IAM Role Chaining requires the EC2 instance profile or EKS pod identity.

**Solution:** Set `auth_type` to `access_key` and provide explicit credentials.

## What Next?

You have a Graph Database connector defined as version-controllable YAML and applied with `sam config apply`. From here:

- To assign the connector to an agent and see the tools it exposes, see [Graph Database Connectors (Experimental)](./index.md).
- To manage every resource kind through the same workflow, see [Managing Configuration as Code (Early Access)](../../declarative-config/index.md).
- To configure the other data connectors, see [Document Database Connectors via the CLI (Experimental)](../document-db/cli.md) and [Search Connectors via the CLI (Experimental)](../search/cli.md).
- For an overview of connecting external systems, see [Configuring Connectors](../index.md).
