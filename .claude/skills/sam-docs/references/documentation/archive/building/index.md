---
title: Building
description: Author your own agents, gateways, tools, workflows, and skills. Configured (YAML) is the customer surface; tools also support a built (Go) path.
sidebar_position: 0
---

# Building

This section walks every artifact type Solace Agent Mesh supports. Agents, gateways, workflows, and skills are authored entirely in YAML. Tools are the one artifact type where you have a choice — declare them in YAML or write them in Go with `pkg/samtoolsdk`.

The cross-cutting distinction is explained once in Concepts → Configured vs built.

## Chapters

- **Agents** — YAML agents wired with built-in tools, MCP servers, OpenAPI services, and custom built tools.
- **Gateways** — YAML gateways for HTTP/SSE, MCP, Slack, Teams, Email, and Event Mesh.
- **Tools** — Built-in tools, MCP, OpenAPI, and remote tools (Python scripts and custom Go tools authored with `pkg/samtoolsdk` — both run inside the Secure Tool Runtime).
- **Workflows** — Configured workflows over the workflow DSL: agent, switch, map, loop, and nested nodes with timeouts, retries, and exit handlers.
- **Skills** — `SKILL.md` format, agent and STR resolution, packaging skills, and managing them as Platform resources (upload, attach, built-in skills).
- **Toolsets** — Package custom tools, upload them through the Platform service, and attach them to agents: author, package, upload, attach, iterate.
- **Scheduled tasks** — Cron-style task execution against agents.
- **AI assistant** — Authoring agents and configurations with the platform AI assistant.

Multi-feature end-to-end recipes live under Tutorials.
