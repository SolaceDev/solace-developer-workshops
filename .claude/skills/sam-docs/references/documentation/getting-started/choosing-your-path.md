---
title: Choosing Your Installation Path
description: Match what you want to do to the right installation path and entry point in the documentation.
sidebar_position: 120
---

# Choosing Your Installation Path

| I want to… | My path | What I need |
|---|---|---|
| Try Agent Mesh without committing to a setup | [Installing the Desktop Bundle](../installing/desktop.md) | Nothing—a development event broker is included |
| Build and develop agents locally | [Installing the CLI Binary](../installing/binary.md) | An LLM API key (a development event broker is included, or connect your own) |
| Deploy Agent Mesh for a team or for production | [Deploying with Docker](../installing/docker.md) or [Deploying with Kubernetes](../installing/kubernetes/index.md) | An event broker and an LLM API key |
| Use Agent Mesh as a cloud service | [Solace Agent Mesh Cloud](https://docs.solace.com/Agent-Mesh/Cloud/agent-mesh-manager.htm) | A Solace Cloud account |

## Comparing Installation Paths

| Path | Who it's for | Event broker | Configuration method | Complexity |
|---|---|---|---|---|
| Desktop bundle | Evaluating, no commitment | Development event broker included (not a production Solace event broker) | Bundled defaults | Minimal |
| CLI binary | Local development, building agents | Development event broker included, or connect your own | YAML files | Low |
| Docker | Team deployment, CI/CD | External event broker required | YAML files and environment variables | Medium |
| Kubernetes | Production deployments | External event broker required | Helm `values.yaml` | High |
| Agent Mesh Cloud | Managed cloud service | Managed by Solace | Web UI | n/a |

For the prerequisites that apply to each path, see [Before You Begin](../installing/before-you-begin.md).
