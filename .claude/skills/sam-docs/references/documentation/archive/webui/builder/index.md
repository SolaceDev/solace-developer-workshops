---
title: Builder
sidebar_position: 1
description: Visual authoring inside the web UI for agents, workflows, connectors, gateways, skills, models, and toolsets, backed by the platform service.
---

# Builder

The Builder is the authoring area of the Web UI, reached at `/builder`. The Builder is a spatial canvas plus chat panel for authoring agents and workflows, alongside form-driven editors for Connectors, Gateways, Skills, Models, and Toolsets, so you can create and edit the resources that make up an Agent Mesh deployment without writing YAML by hand. Every save round-trips through the platform service's REST API under `/api/v1/platform/...`, which persists the configuration, deploys the resource, and surfaces validation and deployment status back into the UI.

## Resources You Can Author

| Resource | What It Is | Page |
|----------|------------|------|
| Agents | LLM-driven agents with tools, skills, and a model binding. Includes a guided flow | Coming soon |
| Workflows | Multi-step DAGs that chain agents, switch and map nodes, and nested workflows | Coming soon |
| Connectors | External data sources and services (Amazon Bedrock Knowledge Base, MCP, OpenAPI, SQL) that agents reuse through a shared credential model | Connectors |
| Gateways | Bridges between Agent Mesh and external systems such as Slack, Microsoft Teams, and the Solace event mesh | Gateways |
| Skills | Reusable instruction bundles and tool sets that one or more agents inherit | Coming soon |
| Models | Named LLM provider configurations that agents reference by name | Coming soon |
| Toolsets | Custom remote toolsets, including uploaded archives executed by the Secure Tool Runtime | Coming soon |
| Quickbuild | A guided flow that creates an agent and its supporting connectors and skills in one pass | Coming soon |

The Builder also exposes a Test mode that spins up an ephemeral test agent against the manifest you are editing, so you can validate a configuration end-to-end before promoting it.

## Sections

- **Connectors**—Configure external data sources and services that agents reuse through the shared credential model
- **Gateways**—Connect Agent Mesh to external systems and route inbound requests to a chosen agent or workflow

## Where the Builder Fits

- The Builder writes the same YAML described in the Building chapters. Most of what you author in YAML can also be authored here, though some advanced YAML options are only available by editing the file directly
- Resource lifecycle (create, deploy, redeploy, delete) is driven by the platform service, which is the same control plane that backs the `sam` CLI
- Access to each resource type is gated by RBAC capabilities—read-only viewers see the catalog but cannot edit; authors with the right scopes can create, update, and deploy

## What Next?

You have just reviewed what the Builder lets you author. Most readers next want to configure their first external integration, covered in Connectors.
