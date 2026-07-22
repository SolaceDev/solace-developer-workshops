---
title: Quick Build (Experimental)
description: Describe what you want in plain language and have Quick Build design, validate, and deploy building blocks such as agents, workflows, entrypoints, connectors, skills, and external agents for you from the Agent Mesh UI.
sidebar_position: 1
---

# Quick Build (Experimental)

:::warning
This feature is in the Experimental stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

Quick Build is a guided, AI-assisted chat experience in the Agent Mesh UI. You describe what you want in plain language, and Quick Build proposes a build plan, generates the configuration, and deploys the result for you. It can create several kinds of building blocks from a single conversation, such as agents, workflows, entrypoints, connectors, skills, and external agents. You can review each proposal, refine it through further conversation, and test what you build before you rely on it.

Quick Build takes you from an idea to a running resource in a single conversation. If you prefer to fill in each field yourself, you can author the same resources manually. For more information about the manual path for agents, see [Creating Agents](./agents/index.md). To decide when to configure a resource and when to write custom code, see [Extending Agent Mesh: Configuration or Code](../concepts/configured-vs-built.md).

## How Quick Build Works

Quick Build turns a conversation into deployed resources through four stages:

1. **Describe** — You tell Quick Build what you want in plain language. You can describe a use case, a problem to solve, a role to fill, or a process to automate.
2. **Review the plan** — Quick Build responds with a build plan that lists the components to create and how they fit together. Each component appears both in the plan and on the canvas, the visual workspace beside the chat.
3. **Refine** — You approve the plan without changes, or continue the conversation to change names, instructions, tools, or the set of components. Quick Build updates the plan in place.
4. **Build and activate** — Quick Build generates the configuration for every component, validates it, and deploys it. Agents, workflows, entrypoints, and external agents come online immediately; connectors and skills are saved for you to attach to an agent.

After a build is deployed, you can switch into Test mode to exercise it with sample input without leaving the page. Because each build is a saved conversation, you can reopen it later to extend or adjust what you created.

Quick Build stores and deploys resources through the Platform service, the same service that backs the manual authoring pages. A resource you create with Quick Build is managed exactly like one you author by hand: an agent or external agent you build appears on the **Agent Management** page, a workflow on the **Workflows** page, an entrypoint on the **Entrypoints** page, a connector on the **Connectors** page, and a skill on the **Skills** page.

## Prerequisites

If authentication and role-based access control (RBAC) are enabled on your Agent Mesh, **Builder** > **Quick Build** may not be available in the navigation bar, and building or testing a resource may be restricted. You may need to contact your Agent Mesh administrator to configure access for you. For more information, see [RBAC Reference](../reference/rbac-reference.md).

## Building a Resource with Quick Build

The following steps show how to build and deploy an agent that has no external dependencies. You can reproduce them on a default installation.

1. In the Agent Mesh UI, select **Builder** > **Quick Build** from the navigation bar.

2. In the chat input, describe what you want in plain language, then send your message. For example:
   ```text
   Create an agent named haiku-helper that writes a single three-line haiku about any topic the user gives. Keep the tone friendly and concise, and if the user does not give a topic, ask them for one.
   ```

   :::tip
   If you are not sure how to phrase your request, starter prompts suggest common ways to begin, such as building an agent, creating a workflow, or connecting to an external system.
   :::

3. Review the build plan. Quick Build responds with a plan that names each component, describes what it does, and lists it under **Components**. The same components appear on the canvas beside the chat. Select a component in the plan or on the canvas to inspect its proposed details, such as an agent's instructions.

4. Refine the plan if you want to change anything. To adjust a name, the instructions, the tools, or the set of components, continue the conversation to describe the change. Quick Build updates the plan in place. Select **Keep Editing** to make more changes before you deploy.

5. When the plan is ready, select **Build & Activate**, then confirm in the **Build & Activate Plan** dialog. Quick Build generates the configuration for each component, validates it, and deploys it. On the canvas, each component moves from **Draft** to **Creating** to **Ready** (validated) to **Active** (deployed), and Quick Build confirms when the build is ready.

   :::note
   A skill shows **Available** rather than **Active**, because a skill is attached to an agent rather than deployed on its own.
   :::

Your agent is now deployed and available to you and to other agents. To use it in a normal conversation, start a new chat. For more information, see [Chatting with Agents](../using-agent-mesh/chatting.md).

## Testing Your Build

After a build is deployed, you can test it without leaving the page. Testing lets you exercise the deployed resource with sample input and see what a user would receive.

To test a build:

1. Select **Switch to Test Mode**, then confirm in the dialog. Quick Build preserves your building conversation, so you can switch back to **Build** at any time.

2. In Test mode, the input shows which resource you are testing, indicated by **Testing:** followed by the resource name. Enter a sample prompt and send it, or select one of the suggested test options.

3. Review the response. The canvas highlights the resource that handled the request so you can follow what ran.

When you are satisfied, switch back to **Build** to make further changes, or leave Quick Build. The resource stays deployed.

## Iterating on a Build

A build is a saved conversation, so you can return to it to extend or change what you created. Reopen the build from **Recent Chats** in the sidebar, then describe the change you want. Quick Build proposes an updated plan, and you deploy the changes the same way you deployed the original build.

A skill is a special case: because a skill does not run on its own, Quick Build confirms when it is built, and you can add it to an agent so that it takes effect. For more information about skills, see [Creating Skills](./skills.md).

## Define Your Resources as Code Instead

Quick Build and the manual authoring pages both create resources through the Agent Mesh UI. If you prefer to describe your resources as version-controllable YAML and reconcile them with `sam config apply` (the path that suits GitOps and automation), see [Managing Configuration as Code (Early Access)](./declarative-config/index.md).

## What Next?

You have built and deployed a resource with Quick Build. Most readers next want to use the agent they created in a conversation, covered in [Chatting with Agents](../using-agent-mesh/chatting.md).
