---
title: Search Connectors via the CLI (Experimental)
description: Define a Search connector as declarative-config YAML and apply it into Agent Mesh with sam config.
sidebar_position: 2
---

# Search Connectors via the CLI (Experimental)

:::warning
This feature is in the Experimental stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

To configure this connector in the Agent Mesh UI, see [Search Connectors (Experimental)](./index.md). This page covers authoring the connector as version-controllable YAML, called *declarative config*: the YAML specific to the `connector` kind. For the `sam config plan`, `apply`, and `pull` workflow that applies to every kind, see [Managing Configuration as Code (Early Access)](../../declarative-config/index.md).

Each connector is one file under the `connectors/` directory of a declarative-config repo. The `spec.type` and `spec.subtype` fields select the connector schema, and `spec.values` carries the same configuration fields available in the Agent Mesh UI. Reference secret fields as `${VAR}` environment placeholders that are resolved at apply time and never written to the file.

## Elasticsearch

The following example connects to a self-hosted cluster with an API key:

```yaml
kind: connector
name: logs-elasticsearch
description: "Elasticsearch connector for the application logs cluster."
spec:
  type: search
  subtype: elasticsearch
  values:
    scheme: https
    hostname: elastic.example.com
    port: 9200
    api_key: ${LOGS_ELASTICSEARCH_API_KEY}
```

The following example connects to an Elastic Cloud deployment:

```yaml
kind: connector
name: logs-elastic-cloud
description: "Elasticsearch connector for the Elastic Cloud deployment."
spec:
  type: search
  subtype: elasticsearch
  values:
    cloud_id: "my-deployment:dXMtZWFzdC0xLmF3cy5jbG91ZC5lcy5pbyQ..."
    api_key: ${LOGS_ELASTIC_CLOUD_API_KEY}
```

### Elasticsearch Values

| Field | Required | Default | Description |
|---|---|---|---|
| `scheme` | No | `https` | Connection scheme for the host form: `https` or `http`. Ignored when a Cloud ID is provided. |
| `hostname` | No | — | Elasticsearch host, without the scheme. Provide either this or a Cloud ID. |
| `port` | No | `9200` | Elasticsearch port. Ignored when a Cloud ID is provided. |
| `cloud_id` | No | — | Elastic Cloud deployment ID. Provide either this or a host. |
| `api_key` | No | — | Base64-encoded `id:api_key` for secured clusters. Omit for an unsecured cluster or when using a username and password. Reference as `${VAR}`. |
| `username` | No | — | Basic-auth username (for example, `elastic`). Use with `password` as an alternative to an API key. |
| `password` | No | — | Basic-auth password, paired with `username`. Reference as `${VAR}`. |

You must provide either `hostname` or `cloud_id`. For an unsecured local cluster, omit `api_key`, `username`, and `password`.

:::note
Self-hosted OpenSearch clusters that expose the Elasticsearch-compatible API can connect through the `elasticsearch` subtype. For Amazon-managed OpenSearch with AWS SigV4 authentication, use the `opensearch` subtype instead.
:::

## Amazon OpenSearch

The following example uses AWS Access Key authentication:

```yaml
kind: connector
name: metrics-opensearch
description: "Amazon OpenSearch connector for the metrics domain."
spec:
  type: search
  subtype: opensearch
  values:
    scheme: https
    hostname: my-domain.us-east-1.es.amazonaws.com
    region: us-east-1
    auth_type: access_key
    aws_access_key_id: ${METRICS_OPENSEARCH_ACCESS_KEY_ID}
    aws_secret_access_key: ${METRICS_OPENSEARCH_SECRET_ACCESS_KEY}
```

The following example connects to an OpenSearch Serverless collection using IAM Role Chaining:

```yaml
kind: connector
name: metrics-opensearch-serverless
description: "Amazon OpenSearch Serverless connector for the metrics collection."
spec:
  type: search
  subtype: opensearch
  values:
    scheme: https
    hostname: my-collection.us-east-1.aoss.amazonaws.com
    region: us-east-1
    auth_type: iam
    role_arn: arn:aws:iam::123456789012:role/SolaceOpenSearchAccess
    external_id: ${METRICS_OPENSEARCH_EXTERNAL_ID}
```

### OpenSearch Values

| Field | Required | Default | Description |
|---|---|---|---|
| `scheme` | No | `https` | Connection scheme. Managed OpenSearch uses HTTPS. |
| `hostname` | Yes | — | OpenSearch domain or serverless collection host, without the scheme. Typically ends in `.es.amazonaws.com` or `.aoss.amazonaws.com`. |
| `port` | No | — | Optional. Managed OpenSearch listens on 443; leave blank unless the domain uses a non-standard port. |
| `region` | Yes | `us-east-1` | AWS region used for SigV4 request signing. |
| `auth_type` | Yes | `access_key` | Authentication method: `access_key` or `iam`. IAM Role Chaining is only supported when Agent Mesh runs on AWS. |
| `aws_access_key_id` | Yes (`access_key`) | — | AWS Access Key ID. Reference as `${VAR}`. |
| `aws_secret_access_key` | Yes (`access_key`) | — | AWS Secret Access Key. Reference as `${VAR}`. |
| `role_arn` | Yes (`iam`) | — | ARN of the IAM role to assume. |
| `session_name` | No (`iam`) | — | Session name recorded in AWS CloudTrail for the assumed role. |
| `external_id` | No (`iam`) | — | Cross-account security token. Include only when the IAM role's trust policy requires it. Reference as `${VAR}`. |

## Apply and Verify

List the connector in your manifest, preview with `sam config plan -m manifest.yaml`, then apply:

```bash
sam config apply -m manifest.yaml
```

`apply` creates the connector, or updates it in place if it already exists. Provide each `${VAR}` secret as an environment variable in the shell that runs `apply`. To confirm the result, export it back into YAML with `sam config pull -o ./pulled --url http://127.0.0.1:8800 --only connector`, or open the **Connectors** page in the Agent Mesh UI. For details on the manifest format, the `plan`/`apply`/`pull` commands, and secret handling, see [Managing Configuration as Code (Early Access)](../../declarative-config/index.md).

## Troubleshooting

### Connection Refused at Startup

**Symptom:** The agent logs `connection failed` or `dial tcp: connection refused`.

**Most likely cause:** The cluster endpoint is unreachable. The hostname or port is wrong, or a firewall, VPC setting, or security group blocks the connection.

**Solution:** Verify connectivity from the Agent Mesh pod or process to the cluster endpoint on the configured port (9200 for Elasticsearch, 443 for managed OpenSearch). For Kubernetes deployments, confirm the pod's egress network policy permits the outbound connection.

### Elasticsearch API Key Returns 401

**Symptom:** The agent receives `401 Unauthorized` from Elasticsearch.

**Most likely cause:** The API key is malformed, expired, revoked, or lacks access to the target index.

**Solution:** Regenerate the API key in the Kibana console or with the `POST /_security/api_key` API. Confirm it includes `read` privileges on the target indices, plus the `monitor` cluster privilege if schema introspection is needed.

### OpenSearch SigV4 Authentication Fails with Forbidden

**Symptom:** The agent receives `403 Forbidden` with a message such as `The security token included in the request is invalid`.

**Most likely cause:** The AWS credentials are incorrect, the configured region does not match the domain's region, or the IAM role or user has no access policy on the domain.

**Solution:** Confirm `region` matches the domain's region exactly. Verify the IAM policy grants `es:ESHttpGet` and `es:ESHttpPost` (or `es:*`) on the domain ARN. For OpenSearch Serverless, confirm the data access policy is configured in the console.

### Unresolved `${VAR}` in the Connection

**Symptom:** The connector logs a connection error referencing a literal `${VAR}` string.

**Most likely cause:** The environment variable referenced in `spec.values` was not set in the shell that ran `sam config apply`, so the secret was stored as the literal placeholder.

**Solution:** Export the environment variable, then re-run `sam config apply`.

### IAM Role Chaining Fails Outside AWS

**Symptom:** Authentication fails with `failed to assume role` when `auth_type` is `iam`.

**Most likely cause:** The Agent Mesh deployment is not running on AWS. IAM Role Chaining requires the EC2 instance profile or EKS pod identity.

**Solution:** Set `auth_type` to `access_key` and provide explicit credentials.

## What Next?

You have a Search connector defined as version-controllable YAML and applied with `sam config apply`. From here:

- To assign the connector to an agent and see the tools it exposes, see [Search Connectors (Experimental)](./index.md).
- To manage every resource kind through the same workflow, see [Managing Configuration as Code (Early Access)](../../declarative-config/index.md).
- To configure the other data connectors, see [Document Database Connectors via the CLI (Experimental)](../document-db/cli.md) and [Graph Database Connectors via the CLI (Experimental)](../graph-db/cli.md).
- For an overview of connecting external systems, see [Configuring Connectors](../index.md).
