---
title: Choosing Your Installation Path
description: Match what you want to do to the right installation path and entry point in the documentation.
sidebar_position: 120
---

# Choosing Your Installation Path

| I want to… | My path | What I need |
|---|---|---|
| Try Solace Agent Mesh in a standalone environment | [Installing the Desktop Bundle](../installing/desktop.md) | Nothing. A development event broker is included |
| Deploy Agent Mesh for a team or for production | [Deploying with Kubernetes](../installing/kubernetes/index.md) | A Solace event broker and an LLM API key |
| Use Agent Mesh as a cloud service | [Agent Mesh Cloud](https://docs.solace.com/Agent-Mesh/Cloud/agent-mesh-manager.htm) | A Solace Cloud account |

## Comparing Installation Paths

| Path | Purpose | Event broker | Configuration method | Complexity |
|---|---|---|---|---|
| Desktop bundle | Proof-of-concepts and evaluations | Development event broker included (not a production Solace event broker) | Bundled defaults | Minimal |
| Kubernetes | Production deployments | Separate external Solace event broker required | Helm `values.yaml` | High |
| Agent Mesh Cloud | Managed cloud service | Managed by Solace | Agent Mesh UI | n/a |

For the prerequisites that apply to each path, see [Before You Begin](../installing/before-you-begin.md).
