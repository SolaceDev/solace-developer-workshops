---
title: Connectors
description: Configure shared external data sources and services—knowledge bases, databases, MCP servers, OpenAPI endpoints—and assign them to agents in Solace Agent Mesh.
sidebar_position: 1
---

# Connectors

Connectors allow your agents to access external data sources and services. You configure each connector with credentials and connection details for a specific system. Agents use connectors to retrieve information, execute queries, and interact with external platforms through natural language conversations.

:::note
**Network Access**

Some connector types require outbound network access from your Agent Mesh deployment to reach external systems.
:::

## Connector Types

Agent Mesh provides the following connector types, grouped into Apps (purpose-built integrations for specific products) and Custom (you bring your own specification or endpoint).

### Apps

- Amazon Bedrock Knowledge Base Connector—retrieve context from Amazon Bedrock Knowledge Bases for Retrieval-Augmented Generation
- SQL Connectors—query and analyze database information using natural language
- Slack Connector—send messages and update existing messages in Slack channels

### Custom

- MCP Connectors—communicate with remote Model Context Protocol servers and access external tools
- OpenAPI Connectors—interact with REST APIs described by OpenAPI specifications

## Creating Connectors

You create connectors through the **Connectors** section of the Agent Mesh web interface:

1. Navigate to the **Connectors** page
2. Click **Create Connector**
3. Select the connector type
4. Fill in the required fields

Required fields vary by connector type, but all connectors require a unique name and connection credentials appropriate for the target system.

After you create a connector, you can assign it to any agent in your deployment. Reusing a single connector across agents avoids duplicating connection configuration.

## Shared Credential Model

All connector types in Agent Mesh implement a shared credential model. When you create a connector, you configure it with credentials such as database passwords, API keys, or service account tokens. All agents assigned to that connector use the connector's credentials and have identical access permissions to the external system.

You cannot restrict one agent to read-only access and another agent to write access if they share the same connector. Security boundaries exist at the external system level (database permissions, API scopes, and similar controls), not at the connector assignment level within Agent Mesh.

If different agents require different levels of access to the same system, you must create multiple connectors with different credentials, each having appropriate permissions configured in the external system.

## Assigning Connectors to Agents

You assign connectors to agents through Agent Builder. When creating or editing an agent, you select connectors from the available connectors list. You can assign multiple connectors to a single agent if it needs to access multiple external systems.

Changes to a connector's assignment (adding or removing it from an agent) take effect when you next deploy the agent. Changes to a connector's own configuration are different: Agent Mesh automatically redeploys the affected agents. For more information, see Editing Connectors.

## Managing Connectors

You can edit a connector's configuration or delete a connector at any time through the Connectors interface.

### Editing Connectors

You can modify connector configurations at any time through the Connectors interface. When you save changes, Agent Mesh automatically redeploys all deployed agents that use the connector. The redeployed agents use the updated configuration, including any new credentials or connection details.

You cannot change a connector's type or subtype after creation. To switch a connector to a different type, delete the existing connector and create a new one.

### Deleting Connectors

You can delete a connector at any time, even if agents are assigned to it. When you delete a connector that agents are using, Agent Mesh automatically redeploys those agents without the deleted connector's tools. The agents continue to run but can no longer access the external system that the connector provided.

The deletion process removes the connector configuration from Agent Mesh but does not affect the external system. Database users, API keys, and other external credentials remain in place, requiring separate cleanup if you no longer need them.

## Access Control

Connector operations require specific RBAC capabilities. The following table shows the capabilities and what they control:

| Capability              | Purpose                                 |
| ----------------------- | --------------------------------------- |
| `sam:connectors:create` | Create connectors                       |
| `sam:connectors:read`   | View and list connectors                |
| `sam:connectors:update` | Modify connectors and their credentials |
| `sam:connectors:delete` | Delete connectors                       |

For detailed information about configuring role-based access control and assigning capabilities to users, see RBAC Reference.

## What Next?

You have just reviewed how connectors work. Most readers next want to create their first connector and assign it to an agent, starting with SQL Connectors.
