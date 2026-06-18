---
title: Web UI
sidebar_position: 0
description: Author, deploy, and operate Solace Agent Mesh from the bundled web app.
---

# Web UI

The Solace Agent Mesh web app is available at `http://<host>:8800/` by default (see deployment options to override the port). The same app also ships as a native desktop app, where it renders in its own window instead of a browser tab. The web app serves end users who chat with deployed agents, operators who monitor live traffic, and authors who configure agents, gateways, connectors, and supporting resources without hand-writing YAML.

## What You Can Do

- Chat with any deployed agent, attach files, branch into new sessions, and replay prior conversations
- Author agents, workflows, connectors, gateways, skills, models, and toolsets visually through the Builder
- Browse the agent catalog, inspect each agent's tools and skill cards, and connect external A2A agents
- Manage projects, prompts, and scheduled tasks that drive recurring agent runs
- Watch live task execution as a step-by-step linear view, a Gantt timeline, or a raw event stream on the Activities page
- Review and download versioned artifacts produced by tools and agents
- Share session links so collaborators can view a conversation without re-running it

## Sections

- **Builder**—Visual authoring for agents, workflows, connectors, gateways, skills, models, and toolsets

## Where the Web UI Fits

- Authoring inside the Builder produces the same runtime YAML as the Building chapters. Configurations saved in the UI are applied automatically to running agents and gateways, the same way CLI-driven deployments are
- Day-two operations—observability, secrets rotation, RBAC tuning, upgrades—continue to live in Administering. The UI surfaces deployment and runtime status, but operational policy is configured at install time
- Concepts that span both the UI and the runtime—sessions, artifacts, the A2A protocol, and how agents are run—are explained in Core Concepts

## What Next?

You have just reviewed what the web UI offers. Most readers next want to author their first resource visually, covered in Builder.
