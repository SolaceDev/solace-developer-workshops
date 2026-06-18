---
title: Amazon Bedrock Connectors
description: Configure the Amazon Bedrock Knowledge Base connector so agents can retrieve context from your enterprise documentation for Retrieval-Augmented Generation.
sidebar_position: 1
---

# Amazon Bedrock Connectors

The Amazon Bedrock Knowledge Base connector allows agents to retrieve context from enterprise documentation stored in Amazon Bedrock Knowledge Bases.

## Overview

The connector enables Retrieval-Augmented Generation (RAG) by connecting agents to Amazon Bedrock Knowledge Bases. When users ask questions, agents search the knowledge base for relevant information and use that context to provide accurate, company-specific responses grounded in your documentation.

The connector retrieves ranked results from the knowledge base. The agent uses these results to generate responses based on your organizational knowledge, rather than general training data alone. This approach reduces hallucinations and helps keep answers consistent with company policies, procedures, and documentation.

The connector works with all Amazon Bedrock Knowledge Base configurations, regardless of the underlying data store type. Your knowledge base can contain unstructured content from sources like Amazon S3, web crawlers, Confluence, SharePoint, or Salesforce. It can also include structured data from Amazon Redshift.

:::note
**Network Access**

This connector requires outbound HTTPS access from your Agent Mesh deployment to `bedrock-agent-runtime.{region}.amazonaws.com`.
:::

## Prerequisites

Before you create this connector, ensure you have the following:

- An Amazon Bedrock Knowledge Base
- The Knowledge Base ID
- The AWS region where the knowledge base is deployed
- AWS credentials or an IAM role with permission to retrieve from the knowledge base
- Network connectivity from Agent Mesh to Amazon Bedrock endpoints

The following sections describe each prerequisite in detail.

### Amazon Bedrock Knowledge Base

You need an existing Amazon Bedrock Knowledge Base configured with your enterprise documentation. The knowledge base must be set up in the Amazon Bedrock console with documents indexed and ready for retrieval.

### Knowledge Base ID

You need the unique identifier for your knowledge base. Find the ID in the Amazon Bedrock console on the knowledge base details page. The ID is a 10-character alphanumeric string such as `CIQYSFEKU3`.

### AWS Region

You need the AWS region where your knowledge base is deployed, such as `us-east-1` or `eu-west-1`. The connector must specify the correct region to communicate with the knowledge base.

### AWS Credentials or IAM Role

You need AWS authentication credentials to access the knowledge base. The connector supports two authentication methods:

**Static Credentials:** An AWS Access Key ID and Secret Access Key with permissions to retrieve from the knowledge base. Create these credentials in the AWS IAM console for a user or service account.

**IAM Role-Based Authentication:** When Agent Mesh runs on AWS infrastructure, the connector can use IAM roles without explicit credentials. This requires configuring the appropriate IAM role with knowledge base permissions and associating it with the Agent Mesh deployment.

### AWS Permissions

The AWS credentials or IAM role must have the `bedrock:Retrieve` permission for the specific knowledge base. The minimum IAM policy required is:

```json
{
  "Effect": "Allow",
  "Action": ["bedrock:Retrieve"],
  "Resource": "arn:aws:bedrock:REGION:ACCOUNT:knowledge-base/KB_ID"
}
```

Replace `REGION`, `ACCOUNT`, and `KB_ID` with your specific values.

### Network Connectivity

Ensure Agent Mesh can reach Amazon Bedrock endpoints over the network. Verify that firewalls and security groups allow outbound HTTPS traffic to `bedrock-agent-runtime.{region}.amazonaws.com`.

## Creating the Connector

Create the connector through the Connectors section in the Agent Mesh web interface (see `link to "Connectors"`  for the general flow), then fill in the following fields. Select **Knowledge Base** as the connector type.

### Connector Configuration

| Field                 | Required | Description                                                                                                                                                                                                  |
| --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Connector Name        | Yes      | Unique identifier for this connector within your Agent Mesh deployment. Appears when you assign connectors to agents. Must be unique across all connectors regardless of type. Can be renamed after creation |
| Description           | Yes      | 10–1000 characters. Helps the agent's language model decide when to invoke the knowledge base tool. Example: "Search company procurement policies and supplier documentation"                                |
| Knowledge Base ID     | Yes      | Amazon Bedrock Knowledge Base identifier from the AWS console. A 10-character alphanumeric string such as `CIQYSFEKU3`, not a descriptive name                                                               |
| AWS Region            | Yes      | AWS region code where the knowledge base is deployed, such as `us-east-1`, `us-west-2`, or `eu-west-1`. Must match where the knowledge base was created                                                      |
| Authentication Scheme | Yes      | `AWS Access Key` (static Access Key ID and Secret Access Key) or `AWS IAM Role Chaining` (assume an IAM role; available only when Agent Mesh runs on AWS infrastructure)                                     |

#### AWS Access Key Authentication

| Field             | Required | Description                                                                                              |
| ----------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| Access Key ID     | Yes      | AWS Access Key ID that grants the connector permission to access the knowledge base                      |
| Secret Access Key | Yes      | Secret Access Key paired with the Access Key ID. The form masks this value                               |

Create a dedicated IAM user for this connector rather than reusing personal or administrative credentials. A dedicated user lets you scope permissions tightly and audit activity in AWS CloudTrail.

#### AWS IAM Role Chaining Authentication

| Field          | Required    | Description                                                                                                                                       |
| -------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| AWS Account ID | Yes         | 12-digit AWS Account ID where the Bedrock Knowledge Base is located, such as `123456789012`                                                       |
| Role Name      | Yes         | Name of the IAM role with permissions to access the Bedrock Knowledge Base. Provide the role name only, not the full ARN. Example: `BedrockKBAccessRole` |
| Session Name   | No          | Session name for auditing the assumed role in AWS CloudTrail logs. Defaults to `solace-kb-session` if not specified                               |
| External ID    | Conditional | Security token for cross-account access. Provide this value if the IAM role's trust policy requires it. AWS uses the External ID to prevent the confused deputy problem |

:::warning
AWS IAM Role Chaining requires Agent Mesh to run on AWS infrastructure. If you deploy outside AWS and select IAM Role Chaining, authentication will fail. Use AWS Access Key authentication for non-AWS deployments.
:::

## After You Create the Connector

The connector is now available for you to assign to agents. For information about assigning, editing, and deleting connectors, see `link to "Connectors"` .

## Security Considerations

Amazon Bedrock Knowledge Base connectors use a shared credential model. For more information, see `link to "Connectors"` .

Use IAM permissions to scope knowledge base access. Create dedicated credentials per knowledge base when different agents need different document sets, and grant only the `bedrock:Retrieve` action on the specific knowledge base ARN.

## Troubleshooting

The following troubleshooting tips might help you to resolve issues with this connector.

### Connector Fails to Authenticate

Check the following:

- The AWS Access Key ID and Secret Access Key are correct and not expired
- The credentials have the `bedrock:Retrieve` permission for the knowledge base
- For IAM role-based authentication, the IAM role is properly configured and associated with the Agent Mesh deployment
- The Account ID and Role Name are correct if using role assumption
- The External ID matches the IAM role's trust policy for cross-account scenarios

### Knowledge Base Not Found

Check the following:

- The Knowledge Base ID matches the value in the Amazon Bedrock console
- The AWS Region matches where you created the knowledge base
- The knowledge base is in the `Available` state in Amazon Bedrock
- The AWS credentials have permission to access knowledge bases in the specified region

### Network Timeouts or Connection Errors

Check the following:

- Firewalls allow outbound HTTPS traffic to Amazon Bedrock endpoints
- Security groups allow egress to `bedrock-agent-runtime.{region}.amazonaws.com`
- DNS resolution works for AWS endpoints from the Agent Mesh deployment
- No firewall rules restrict outbound traffic from the Agent Mesh deployment

### No Results Are Returned for Queries

Check the following:

- The knowledge base contains indexed documents in Amazon Bedrock
- The knowledge base synchronization completed successfully
- The query is relevant to the knowledge base content
- Broader or different query terms return results
- The knowledge base configuration in AWS shows documents are properly indexed

### Unexpected Response Type Is Returned

Knowledge bases can contain different types of data sources. Unstructured document sources return text chunks with content and S3 locations. Structured data sources like Amazon Redshift return rows with column names and values.

The connector handles both response types transparently. Configure the connector description to help the language model understand what type of information the knowledge base provides.

## What Next?

You have just created an Amazon Bedrock Knowledge Base connector. Most readers next want to assign the connector to an agent, covered in `link to "Connectors"` .
