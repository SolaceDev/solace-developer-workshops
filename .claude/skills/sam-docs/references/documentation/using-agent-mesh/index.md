---
title: Using Agent Mesh
sidebar_position: 0
description: "Chat with agents, manage projects and prompts, schedule tasks, and monitor live activity from the Agent Mesh UI."
---

# Using Agent Mesh

You perform these tasks in the Agent Mesh UI.

The Agent Mesh UI is the application for working with a running deployment. It serves end users who chat with agents, authors who build and configure agents and supporting resources, and operators who watch live task execution. The same application also ships as a desktop application, where it renders in its own window instead of a browser tab.

If you use Agent Mesh through Solace Cloud, the Agent Mesh UI is your only interface to Agent Mesh. You chat, build, and monitor entirely in this application, so this section covers everything you need to operate your deployment. For other deployments, the UI gives you the same authoring and monitoring as the command line, in a visual form.

By default, the Agent Mesh UI is available at `http://<host>:8800/`. The Web UI entrypoint, the `httpsse` entrypoint that fronts the application, sets this port. To create, deploy, and chat with your own agent, see [Create Your First Agent](../getting-started/your-first-agent.md).

## What You Can Do Here

The Agent Mesh UI brings four activities together in one application:

- Chat with any agent in the deployment, attach files, branch a conversation into a personal copy, and download the artifacts an agent produces.
- Browse an agent catalog to see which agents are available, inspect each agent's skill cards, and select one to talk to.
- Manage projects, saved prompts, and scheduled tasks that group related work and drive recurring agent runs.
- Monitor activity by following a live task as a step-by-step view, a timeline, or a raw event stream.

To build and configure agents, entrypoints, connectors, tools, and skills, see [Building Your Agent Mesh](../building/index.md). For the distinction between configuring a resource and building one in Go, see [Extending Agent Mesh: Configuration or Code](../concepts/configured-vs-built.md).

## Sections

- [Chatting with Agents](./chatting.md) — Send messages to agents, manage sessions, attach files, and download artifacts.
- [Managing Projects](./managing-projects.md) — Group work into projects and set up saved prompts and scheduled tasks.
- [Prompts](./prompts.md) — Save and re-use prompts across conversations.
- [Sharing Prompts](./sharing-prompts.md) — Share a saved prompt with colleagues, select Viewer or Editor access, and manage or revoke access.
- [Scheduling Tasks (Experimental)](./scheduled-tasks.md) — Set up recurring or one-shot agent runs.
- [Monitoring Activity](./monitoring-activity.md) — Watch live task execution and review the artifacts a task produces.
- [Talking to Agents with Voice](./voice-interaction.md) — Use speech input and hear responses spoken back.

:::note
The controls available to you depend on how your deployment is configured and on the access your account has been granted. Some features described in this section appear only when an operator has enabled them.
:::

## What Next?

You have just reviewed what the Agent Mesh UI offers. Next, you might want to send your first message to an agent. For more information, see [Chatting with Agents](./chatting.md).
