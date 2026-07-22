---
title: Amazon Bedrock Connectors via the CLI
description: Configure an Amazon Bedrock Knowledge Base connector as declarative YAML and apply it with the Agent Mesh CLI, so agents can retrieve context from your knowledge base for Retrieval-Augmented Generation.
sidebar_position: 2
---

# Amazon Bedrock Connectors via the CLI

An Amazon Bedrock Knowledge Base connector lets agents retrieve context from enterprise documentation stored in Amazon Bedrock Knowledge Bases, grounding responses in that content for Retrieval-Augmented Generation (RAG). You define the connector as a declarative config resource and apply it with the Agent Mesh CLI, instead of using the Agent Mesh UI. To configure the same connector in the UI, and to read about the required IAM permissions and authentication options in depth, see [Amazon Bedrock Connectors](./index.md).

The following sections describe the YAML shape and the `sam config` command workflow.

:::note
Amazon Bedrock Knowledge Base connectors require outbound HTTPS access from your Agent Mesh deployment to `bedrock-agent-runtime.{region}.amazonaws.com`.
:::

## Prerequisites

Before you author an Amazon Bedrock Knowledge Base connector, ensure you have the following:

- An existing Amazon Bedrock knowledge base with documents indexed and ready for retrieval
- The Knowledge Base ID, the alphanumeric identifier shown on the knowledge base details page in the Amazon Bedrock console, such as `CIQYSFEKU3`
- The AWS region where the knowledge base is deployed, such as `eu-west-1`. Agent Mesh uses `us-east-1` if you omit it
- AWS credentials with the `bedrock:Retrieve` permission on the knowledge base
- A static access key, or an IAM role to assume when Agent Mesh runs on AWS infrastructure
- The `sam` CLI installed and a declarative config directory with a `manifest.yaml`. For more information, see [Platform Service](../../../concepts/platform-service.md)

## Creating the Connector

An Amazon Bedrock Knowledge Base connector is one resource in a declarative config directory. To create the connector, perform the following steps:

1. Write the connector file under the `connectors/` directory, as described in [Connector YAML](#connector-yaml).
2. Reference any credentials through environment variables, as described in [Referencing Secrets](#referencing-secrets).
3. Add the connector to the manifest and apply it, as described in [Applying the Connector](#applying-the-connector).

### Connector YAML

A connector is a single YAML file under the `connectors/` directory. The file declares the resource envelope (`kind`, `name`, and `description`) and a `spec` block that sets `type: knowledge_base`, `subtype: bedrock`, and the connection details under `values`.

Point the connector at the knowledge base with `kb_id`, set the `region`, and choose an `auth_type`:

```yaml
# connectors/policy-kb.yaml
kind: connector
name: policy-kb
description: "Search company procurement policies and supplier guidelines."
spec:
  type: knowledge_base
  subtype: bedrock
  values:
    kb_id: "CIQYSFEKU3"
    region: "us-east-1"
    auth_type: "access_key"
    aws_access_key_id: ${AWS_ACCESS_KEY_ID}
    aws_secret_access_key: ${AWS_SECRET_ACCESS_KEY}
```

The `name` must be 3–255 characters and unique across all connectors in your deployment. The `description` is 10–1000 characters; the agent's language model reads it to decide when to search the knowledge base. The sections below list the fields `values` accepts.

#### Knowledge Base Fields

These fields identify the knowledge base to query and the AWS region that hosts it.

| Field    | Required | Default     | Description                                                                          |
| -------- | -------- | ----------- | ------------------------------------------------------------------------------------ |
| `kb_id`  | Yes      |             | Knowledge Base ID from the Amazon Bedrock console, such as `CIQYSFEKU3`              |
| `region` | Yes      | `us-east-1` | AWS region where the knowledge base is deployed. Defaults to `us-east-1` if omitted   |

#### Authentication Fields

Set `auth_type` to `access_key` or `iam`. Each value requires a different set of the fields below.

For `auth_type: access_key`:

| Field                   | Required | Description                                                              |
| ----------------------- | -------- | ------------------------------------------------------------------------ |
| `aws_access_key_id`     | Yes      | AWS access key ID that grants permission to retrieve from the knowledge base (secret) |
| `aws_secret_access_key` | Yes      | Secret access key paired with `aws_access_key_id` (secret)               |

For `auth_type: iam`:

| Field            | Required | Default             | Description                                                                                    |
| ---------------- | -------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| `aws_account_id` | Yes      |                     | 12-digit AWS Account ID where the knowledge base is located, such as `123456789012`            |
| `role_name`      | Yes      |                     | Name of the IAM role to assume, not the full ARN, such as `BedrockKBAccessRole`                |
| `session_name`   | No       | `solace-bedrock-kb-session` | Session name recorded in AWS CloudTrail logs for the assumed role                      |
| `external_id`    | No       |                     | Security token for cross-account access, required when the IAM role's trust policy demands it (secret) |

:::warning
`auth_type: iam` requires Agent Mesh to run on AWS infrastructure. If you deploy outside AWS and set `auth_type: iam`, authentication fails. Use `auth_type: access_key` for non-AWS deployments.
:::

The following example assumes an IAM role instead of using a static access key:

```yaml
# connectors/support-kb.yaml
kind: connector
name: support-kb
description: "Search the customer support runbook for troubleshooting steps."
spec:
  type: knowledge_base
  subtype: bedrock
  values:
    kb_id: "DQR7TMN2LP"
    region: "us-east-1"
    auth_type: "iam"
    aws_account_id: "123456789012"
    role_name: "BedrockKBAccessRole"
    external_id: ${BEDROCK_KB_EXTERNAL_ID}
```

### Referencing Secrets

Never write a real credential into the YAML file. The secret fields (`aws_access_key_id`, `aws_secret_access_key`, and `external_id`) take a `${VAR}` placeholder that the Agent Mesh CLI substitutes from the environment at apply time. Set the variables before you run `sam config apply`. The Agent Mesh CLI also loads a `.env` file from the nearest ancestor directory, so you can keep the values there instead of exporting them:

```bash
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
# For auth_type: iam with a trust-policy external ID:
export BEDROCK_KB_EXTERNAL_ID="your-external-id"
```

Use the `${VAR, default}` form to supply a fallback when the variable is unset. When you run `sam config pull` to export an existing connector, the Agent Mesh CLI rewrites each secret field back to a `${VAR}` placeholder, so a pulled repository never contains a live credential.

### Applying the Connector

List the connector under `resources.connectors` in the manifest, alongside any agents that use it:

```yaml
# manifest.yaml
kind: manifest
name: my-deployment
description: Connectors and the agents that use them.
target:
  url: https://platform.example.com
resources:
  connectors:
    - policy-kb
  agents:
    - my-agent
```

Validate your changes without affecting the Platform service, then apply them when you are ready:

```bash
sam config plan
sam config apply
```

`sam config plan` shows the connectors and agents that would be created, updated, or deleted. `sam config apply` reconciles the Platform service to match the manifest; it creates and updates resources but does not delete anything unless you pass `--prune`. Create the connector before the agent that references it. An agent that names a connector missing from the Platform service fails to deploy.

| Command             | Description                                                              |
| ------------------- | ---------------------------------------------------------------------- |
| `sam config plan`   | Preview the changes an apply would make, without changing the Platform service  |
| `sam config apply`  | Create and update the manifest's resources on the Platform service             |
| `sam config pull`   | Export the Platform service's live config into editable YAML, secrets redacted  |

For the full command reference, see [Platform Service](../../../concepts/platform-service.md).

## Security Considerations

Amazon Bedrock Knowledge Base connectors use a shared credential model: any user whose request reaches the agent can retrieve from the knowledge base with the connector's credentials. Grant only the `bedrock:Retrieve` action on the specific knowledge base ARN, and create dedicated credentials per knowledge base when different agents need different document sets. For more information, see [Configuring Connectors](../index.md).

## Troubleshooting

The following tips might help you resolve issues with an Amazon Bedrock Knowledge Base connector applied from the Agent Mesh CLI.

### Apply Fails to Substitute a Secret

Check the following:

- The environment variable named in each `${VAR}` placeholder is set, or defined in a `.env` file the Agent Mesh CLI loads
- You ran `sam config apply` in a shell where the variable is exported

### Connector Fails to Authenticate

Check the following:

- The credentials have the `bedrock:Retrieve` permission for the knowledge base
- For `auth_type: access_key`, the access key ID and secret access key are current, correct, and not expired
- For `auth_type: iam`, Agent Mesh runs on AWS infrastructure and the `aws_account_id` and `role_name` are correct
- For `auth_type: iam`, the `external_id` matches the IAM role's trust policy for cross-account access

### Knowledge Base Is Not Found

Check the following:

- The `kb_id` matches the value in the Amazon Bedrock console
- The `region` matches where you created the knowledge base
- The knowledge base is in the `Available` state in Amazon Bedrock

### Network Timeouts or Connection Errors Occur

Check the following:

- Firewalls allow outbound HTTPS traffic to `bedrock-agent-runtime.{region}.amazonaws.com`
- Security groups allow egress to the Amazon Bedrock endpoint
- DNS resolution works for AWS endpoints from the Agent Mesh deployment

## What Next?

After you apply an Amazon Bedrock Knowledge Base connector, reference it from an agent so the agent can retrieve context from the knowledge base during conversations. For more information, see [Creating Agents with the CLI](../../agents/cli.md).

To configure this connector in the Agent Mesh UI instead, see [Amazon Bedrock Connectors](./index.md).
