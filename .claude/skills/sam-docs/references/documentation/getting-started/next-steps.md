---
title: Next Steps
description: After completing a Get Started on-ramp — pointers to building, deploying, operating, and migrating.
sidebar_position: 160
---

# Next Steps

You've completed one of the on-ramps and Agent Mesh is responding to prompts on your laptop. Use the following pointers to find the right place to go next. If you skipped the on-ramps because you already know what you want to do, the same pointers apply.

- [Building Your Agent Mesh](../building/index.md)—Add more agents, write a workflow, connect an MCP server as a tool, or package a skill. This is where most of the authoring work happens.
- [Understanding Agent Mesh](../concepts/index.md)—How the runtime is organized, how requests flow through it, and where the trust boundaries are.
- [Install and Deploy](../installing/index.md)—Move beyond the embedded mode you used in the on-ramp. Covers Docker and Kubernetes deployment options, configuration, and production prerequisites.
- [Administering Solace Agent Mesh](../administering/index.md)—Observability, RBAC, secret rotation, TLS, upgrades, and troubleshooting for a deployment that's serving real traffic.
- [Migrations](../migrations/index.md)—If you're bringing an existing deployment across to this version of Agent Mesh, the migration guides cover configuration differences, behavior changes, and porting paths.

## Configured or Built?

One distinction is worth understanding before you go further. Agents, gateways, workflows, and skills are all defined in YAML—this is the configured path. Tools are the exception: you can either declare a tool in YAML or write it as a standalone binary in Go. The on-ramp you just completed used the configured path. Most use cases stay there; you only need to write a binary tool when the YAML options can't express what you need.

For more information, see [Extending Agent Mesh: Configuration or Code](../concepts/configured-vs-built.md).
