---
title: Create Your First Agent
description: Create, deploy, and chat with your own agent in the Agent Mesh UI, with no code and no YAML.
sidebar_position: 150
---

# Create Your First Agent

Agent Mesh ships with built-in agents, but you typically add your own. This walkthrough creates an agent from the Agent Mesh UI, deploys it into a running Agent Mesh deployment, and chats with it, without writing any code or YAML.

You describe an agent through the UI and the runtime brings it online. To learn when a task calls for a custom-coded tool instead, see [Extending Agent Mesh: Configuration or Code](../concepts/configured-vs-built.md).

## Before You Start

You need a running Agent Mesh deployment with the Agent Mesh UI open in your browser. How you get there depends on how you installed it:

- **Desktop bundle**: launch the app and the UI opens in its own window. See [Installing the Desktop Bundle](../installing/desktop.md).
- **Kubernetes or a shared deployment**: open the UI URL your administrator gave you. See [Deploying with Kubernetes](../installing/kubernetes/index.md).

The first time you start a local instance, a setup wizard connects a large language model (LLM) provider for you. The model you choose becomes your deployment's default model, exposed as the `general` model alias, which your new agent uses. To add more models or change this one later, see [Configuring Models](../building/models/index.md).

To confirm everything is working, start a new chat, make sure **Orchestrator** is selected in the **Agent** picker, and send a message such as "What can you do?" The Orchestrator is a built-in agent that coordinates work across Agent Mesh; its reply streams back token by token.

## Create Your Agent

You create an agent of your own from the Agent Mesh UI. Agent Mesh stores it, deploys it, and makes it available to chat with. There is no YAML and no restart.

1. In the left navigation sidebar, expand **Builder** and select **Agent Management**. This page lists every agent in Agent Mesh and splits them across the **Deployed** and **Undeployed** tabs; the built-in agents (including the Orchestrator) appear under **Deployed**.

2. Select **Add Agent**, then **Create New Agent**.

   Agent Mesh can draft an agent for you from a plain-language description: type one and select **Generate**. For this walkthrough, select **Create Manually** so the steps are predictable.

3. Give the agent a **Name** and **Description**, then select **Continue**:

   - **Name**: `haiku-bot`
   - **Description**: `A cheerful assistant that answers questions and replies with a haiku when asked.`

4. The agent editor opens. Most of what a new agent needs is already filled in: the **Model** is set to **general** (your deployment's default model alias), the communication modes are **text**, and a default **Artifact Tools** toolset is attached. The one thing you must supply is the instructions.

   In the **Instructions** section, select **Add Instructions**, enter a system prompt that shapes the agent's behavior, then select **Apply**:

   ```text
   You are HaikuBot, a friendly assistant. Answer questions clearly and concisely. Whenever the user asks for a poem, reply with a traditional three-line haiku of five, seven, and five syllables on the topic they request.
   ```

   Instructions must be at least 100 characters. Until you add them, **Create and Deploy** stays disabled.

5. Select **Create and Deploy**. Agent Mesh saves the agent and brings it online: its status moves to **Running** and it appears under the **Deployed** tab.

   To save the agent without starting it yet, select **Create** instead. It lands under **Undeployed**, ready to deploy later.

6. Start a new chat, select **haiku-bot** in the **Agent** picker, and ask it for a haiku. (You can also select **Chat With Agent** directly from the agent's row in Agent Management.)

Your new agent persists to the Agent Mesh database, so it's still there the next time you open the UI.

## Define Agents as Code Instead

The Agent Mesh UI is one way to author agents; the `sam` CLI is the other. With *declarative config* you describe agents as YAML and reconcile them into Agent Mesh with `sam config apply`, the version-controllable path that suits GitOps and automation. To create the same agent from the command line, see [Creating Agents with the CLI](../building/agents/cli.md).

## Next Steps

You have an agent you built yourself, running in Agent Mesh. Most readers next want to give an agent real capabilities such as tools, skills, and peer delegation, covered in [Building Your Agent Mesh](../building/index.md).
