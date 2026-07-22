---
title: Next Steps
description: After completing a Get Started on-ramp — pointers to building, deploying, and operating.
sidebar_position: 160
---

# Next Steps

You've completed one of the on-ramps and Agent Mesh is responding to prompts on your laptop. Use the following pointers to find the right place to go next. If you skipped the on-ramps because you already know what you want to do, the same pointers apply.

- [Building Your Agent Mesh](../building/index.md)—Add more agents, write a workflow, connect an MCP server as a tool, or package a skill. This is where most of the authoring work happens.
- [Understanding Agent Mesh](../concepts/index.md)—How the runtime is organized, how requests flow through it, and where the trust boundaries are.
- [Install and Deploy](../installing/index.md)—Move beyond the desktop mode you used in the on-ramp. Covers Kubernetes deployment options, configuration, and production prerequisites.
- [Administering Agent Mesh](../administering/index.md)—Observability, RBAC, secret rotation, TLS, upgrades, and troubleshooting for a deployment that's serving real traffic.

## Configuration or Code?

One distinction is worth understanding before you go further. Agents, entrypoints, workflows, and skills are all declarative. You define them through configuration, either in the Agent Mesh UI or in YAML, without writing code. Tools are the exception: you can either declare a tool in configuration or write it as a standalone binary in Go. The on-ramp you just completed required no code at all. Most use cases stay there; you only need to write a binary tool when the configuration options can't express what you need.

For more information, see [Extending Agent Mesh: Configuration or Code](../concepts/configured-vs-built.md).
