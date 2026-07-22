---
title: Amazon Bedrock Connectors
description: Configure the Amazon Bedrock Knowledge Base connector so agents can retrieve context from your enterprise documentation for Retrieval-Augmented Generation.
sidebar_position: 1
---

# Amazon Bedrock Connectors

The Amazon Bedrock Knowledge Base connector lets agents retrieve context from enterprise documentation stored in Amazon Bedrock Knowledge Bases, enabling Retrieval-Augmented Generation (RAG). When a user asks a question, the agent searches the knowledge base for relevant information and grounds its response in that content rather than general training data alone. This reduces hallucinations and keeps answers consistent with your company policies, procedures, and documentation.

The connector retrieves ranked results and works with any Amazon Bedrock Knowledge Base configuration, regardless of the underlying data store. Your knowledge base can hold unstructured content from many different sources.

:::note
This connector requires outbound HTTPS network access from your Agent Mesh deployment to `bedrock-agent-runtime.{region}.amazonaws.com`.
:::

## Prerequisites

Before you create this connector, ensure you have the following:

- An existing Amazon Bedrock knowledge base, configured in the Amazon Bedrock console with documents indexed and ready for retrieval
- The Knowledge Base ID—the alphanumeric identifier shown on the knowledge base details page in the Amazon Bedrock console, such as `CIQYSFEKU3`
- The AWS region where the knowledge base is deployed (for example, `us-east-1`)
- AWS authentication, using either static credentials (an Access Key ID and Secret Access Key) or, when Agent Mesh runs on AWS infrastructure, an IAM role with knowledge base permissions
- Outbound HTTPS connectivity from Agent Mesh to `bedrock-agent-runtime.{region}.amazonaws.com`, with firewalls and security groups permitting the traffic
- The `bedrock:Retrieve` permission on the knowledge base, granted to whichever identity you authenticate as

The minimum IAM policy is:

```json
{
  "Effect": "Allow",
  "Action": ["bedrock:Retrieve"],
  "Resource": "arn:aws:bedrock:REGION:ACCOUNT:knowledge-base/KB_ID"
}
```

Replace `REGION`, `ACCOUNT`, and `KB_ID` with your values.

## Creating the Connector

To create an Amazon Bedrock Knowledge Base connector, perform the following steps:

1. In the Agent Mesh UI, go to the **Connectors** page and click **Create Connector**.
2. Select **Amazon Bedrock** as the connector type.
3. Enter a **Connector Name**. This name identifies the connector when you assign it to agents and must be unique across all connectors in your deployment. You can rename it later.
4. Enter a **Description** of 10–1000 characters. The agent's language model uses this text to decide when to invoke the knowledge base, so describe what the knowledge base contains, for example, "Search company procurement policies for suppliers".
5. Enter the **Knowledge Base ID** from the Amazon Bedrock console, such as `CIQYSFEKU3`. This is the identifier, not a descriptive name.
6. Enter the **AWS Region** where the knowledge base is deployed, such as `us-east-1`. This must match the region where you created the knowledge base.
7. Select the **Authentication Scheme** and complete the fields it reveals:
   - **AWS Access Key**—authenticate with a static access key
   - **AWS IAM Role Chaining**—assume an IAM role, available only when Agent Mesh runs on AWS infrastructure
8. Click **Create** to save the connector.

If you selected **AWS Access Key**, complete these fields:

| Field          | Required | Description                                                                                              |
| -------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| AWS Access Key | Yes      | AWS Access Key ID that grants the connector permission to access the knowledge base. Use a dedicated IAM user rather than personal or administrative credentials, so you can scope permissions tightly and audit activity in AWS CloudTrail |
| AWS Secret Key | Yes      | Secret access key paired with the AWS Access Key. The form masks this value                              |

If you selected **AWS IAM Role Chaining**, complete these fields:

| Field          | Required | Description                                                                                                                                       |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| AWS Account ID | Yes      | 12-digit AWS Account ID where the knowledge base is located, such as `123456789012`                                                              |
| Role Name      | Yes      | Name of the IAM role with permissions to access the knowledge base. Provide the role name only, not the full ARN, such as `BedrockKBAccessRole` |
| Session Name   | No       | Session name for auditing the assumed role in AWS CloudTrail logs. Defaults to `solace-bedrock-kb-session` when empty                             |
| External ID    | No       | Security token for cross-account access. Provide this value if the IAM role's trust policy requires it. AWS uses the External ID to prevent the confused deputy problem. The form masks this value |

:::warning
AWS IAM Role Chaining requires Agent Mesh to run on AWS infrastructure. If you deploy outside AWS and select IAM Role Chaining, authentication fails. Use AWS Access Key authentication for non-AWS deployments.
:::

After you create the connector, it is available to assign to agents. For information about assigning, editing, and deleting connectors, see [Configuring Connectors](../index.md).

## Security Considerations

Amazon Bedrock Knowledge Base connectors use a shared credential model. For more information, see [Configuring Connectors](../index.md).

We recommend that you use IAM permissions to scope knowledge base access. Create dedicated credentials per knowledge base when different agents need different document sets, and grant only the `bedrock:Retrieve` action on the specific knowledge base ARN.

## Troubleshooting

You might experience issues with your connector. Try the following solutions for each type of issue:

- **Connector fails to authenticate.** Check the following:
  - The AWS Access Key ID and Secret Access Key are correct and not expired
  - The credentials have the `bedrock:Retrieve` permission for the knowledge base
  - For IAM role-based authentication, the IAM role is configured correctly and associated with the Agent Mesh deployment
  - The Account ID and Role Name are correct when using role assumption
  - The External ID matches the IAM role's trust policy for cross-account scenarios
- **Knowledge base is not found.** Check the following:
  - The Knowledge Base ID matches the value in the Amazon Bedrock console
  - The AWS Region matches where you created the knowledge base
  - The knowledge base is in the `Available` state in Amazon Bedrock
  - The AWS credentials have permission to access knowledge bases in the specified region
- **Network timeouts or connection errors occur.** Check the following:
  - Firewalls allow outbound HTTPS traffic to Amazon Bedrock endpoints
  - Security groups allow egress to `bedrock-agent-runtime.{region}.amazonaws.com`
  - DNS resolution works for AWS endpoints from the Agent Mesh deployment
  - No firewall rules restrict outbound traffic from the Agent Mesh deployment
- **No results are returned for queries.** Check the following:
  - The knowledge base contains indexed documents in Amazon Bedrock
  - The knowledge base synchronization completed successfully
  - The query is relevant to the knowledge base content
  - Broader or different query terms return results where a narrow query returns nothing
- **An unexpected response type is returned.** Knowledge bases can contain different types of data sources: unstructured document sources return text chunks with content and S3 locations, while structured data sources such as Amazon Redshift return rows with column names and values. The connector handles both types transparently. Configure the connector description to help the language model understand what type of information the knowledge base provides

## What Next?

After you create an Amazon Bedrock Knowledge Base connector, assign it to an agent so the agent can retrieve context from your knowledge base during conversations. For more information, see [Configuring Connectors](../index.md).

To configure this connector from the command line instead of the Agent Mesh UI, see [Amazon Bedrock Connectors via the CLI](./cli.md).
