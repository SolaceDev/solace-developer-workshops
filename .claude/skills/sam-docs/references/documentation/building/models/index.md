---
title: Configuring Models
description: Create and manage the model configurations your agents use from the Agent Mesh UI.
sidebar_position: 1
---

# Configuring Models

A model configuration tells Solace Agent Mesh how to reach a large language model (LLM): which provider hosts it, which model to call, and the credentials to authenticate with. Each configuration has a short *alias* (for example, `general`) that agents reference in place of the underlying provider details. You create and manage these configurations from the Agent Mesh UI, with no YAML to write and no restart.

This page covers creating and managing model configurations from the **Models** page in the UI. For installation instructions, see [Install and Deploy](../../installing/index.md). To manage the same configurations as version-controllable YAML instead, see [Managing Configuration as Code (Early Access)](../declarative-config/index.md).

## How Agent Mesh Uses Models

Every agent reasons with a model, but an agent does not name a provider or hold an API key itself. Instead, each agent references a model configuration by its alias through the **Model** picker in the agent editor. This indirection lets you point many agents at one configuration and change the underlying provider or model in a single place.

A model configuration is composed of a few parts:

- *Display name*: the alias agents and teammates use to reference the model, such as `general`.
- *Model provider*: the service that hosts the model, such as Anthropic, OpenAI, or a Custom OpenAI-compatible endpoint.
- *Model name*: the specific model to call, such as `claude-sonnet-4-6`.
- *Authentication*: the credentials Agent Mesh uses to reach the provider, such as an API key.
- *Parameters*: optional settings that shape responses, such as temperature, maximum tokens, and prompt caching.

Every deployment starts with two built-in model aliases:

- *general*: the model new agents and built-in AI features use.
- *planning*: the model the Orchestrator agent uses to plan and delegate work.

You connect these aliases to an LLM provider yourself, either during first-run setup or later on this page. Until a default alias is connected to a provider, it is flagged as not configured and agents cannot use it. Both aliases always carry a **Default** badge and cannot be deleted, though you can edit them to point at a different provider or model.

## Opening the Models Page

In the left navigation sidebar, expand **Builder** and select **Models**. The page lists every model configuration across three columns:

- **Name**: the configuration's alias.
- **Model**: the model name it calls.
- **Model Provider**: the provider that hosts it.

Select a column header to sort by that column. The built-in **general** and **planning** configurations carry a **Default** badge, and a default configuration that has not yet been connected to a provider is flagged so you can finish setting it up. Each row has an **Actions** menu, and **Add Model** creates a new configuration.

## Adding a Model

The following steps add a model configuration for an Anthropic model and make it available to your agents.

1. On the **Models** page, select **Add Model**.

2. Enter a **Display Name** and a **Description**. The display name is the alias agents reference, so keep it short and descriptive, such as `analysis`. The description tells teammates what the model is suited for.

3. Select a **Model Provider**. The list includes Amazon Bedrock, Anthropic, Azure OpenAI, Google AI Studio, Google Vertex AI, Ollama, OpenAI, and Custom, which covers any provider that implements the OpenAI-compatible API protocol. Select **Anthropic**.

4. Enter the connection details the provider requires:

   - **API Base URL**: the provider's endpoint.
   - **API Key**: your provider API key. Select **Show password** to reveal what you entered.

5. Set **Model Name**. Once the provider and key are valid, the list populates with the models available to your account. You can also type a model name directly.

6. Optionally, set **Max Input Tokens** to the model's context-window limit, and expand **Advanced Settings** to set **Temperature**, **Max Tokens**, a **Prompt Caching Strategy**, or provider-specific **Custom Parameters**.

7. Select **Test Connection** to confirm Agent Mesh can reach the model. A failed test shows the provider's error message inline.

8. Select **Add** to save the configuration. It appears on the **Models** page, ready for agents to reference.

:::note
Some providers, such as Custom and Ollama, add an **Authentication Type** field with **API Key**, **OAuth2**, and **None** options. For a local or self-hosted, OpenAI-compatible endpoint, select **Custom** or **Ollama**, set **Authentication Type** to **None**, and provide only the **API Base URL**; no API key is required.
:::

:::note
If **Test Connection** fails but the details are correct, you can still save the configuration: select **Add**, then **Save Anyway** in the **Connection Test Failed** dialog. This is useful when the provider is not reachable from where you are working.
:::

## Managing Models

Select a configuration's **Actions** menu to reach its lifecycle actions:

- **Open Details**: view the configuration's provider, model, and audit information.
- **Edit**: reopen the editor to change the provider, model, credentials, or parameters. Stored credentials are masked; enter a new value only to replace one.
- **Delete**: remove the configuration.

Deleting a configuration that agents reference stops those agents from working correctly, so the **Delete Model** dialog requires you to type `DELETE` to confirm. The built-in **general** and **planning** configurations are required and cannot be deleted; selecting **Delete** on either one opens an **Unable to Delete** dialog instead.

## Using a Model in an Agent

Agents choose a model in the agent editor. When you create or edit an agent, the **Model** picker lists every configuration from the **Models** page by its alias, and the agent uses whichever one you select for its reasoning. A new agent uses the **general** configuration by default. For the full agent workflow, see [Creating Agents](../agents/index.md).

## Define Models as Code Instead

The Agent Mesh UI is one way to manage model configurations; the `sam` CLI is the other. With declarative config you describe a model as YAML and reconcile it into Agent Mesh with `sam config apply`, the version-controllable path that suits GitOps and automation. To create the same model from the command line, see [Configuring Models with the CLI](./cli.md).

## Next Steps

You have model configurations that your agents can use. Most readers next want to put them to work:

- To create an agent that uses one of these models, see [Creating Agents](../agents/index.md).
- To manage model configurations as version-controlled YAML, see [Managing Configuration as Code (Early Access)](../declarative-config/index.md).
