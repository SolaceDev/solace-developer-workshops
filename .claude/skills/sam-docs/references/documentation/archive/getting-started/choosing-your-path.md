---
title: Choosing Your Path
description: Match what you want to do next — try, install, build, operate, or migrate — to the right entry point in the documentation.
sidebar_position: 30
---

# Choosing Your Path

Match what you want to do next to the entry point that gets you there.

## Pick the Right Entry Point

| If you want to… | Go to | What you need |
|---|---|---|
| Try Solace Agent Mesh on your laptop in a few minutes | Get Started → Try the desktop preview | Nothing — the desktop bundle embeds everything |
| Scaffold and run a first project with the `sam` CLI | Get Started → Build your first project | A laptop and an LLM API key |
| Install Agent Mesh for a team or production | Installing | A Solace broker, an LLM provider, an artifact store, and a session store |
| Author agents, gateways, tools, workflows, or skills | Building | A running Agent Mesh deployment |
| Operate an Agent Mesh deployment already in production | Administering | A deployment that's already serving traffic |
| Migrate an existing Python Agent Mesh deployment | Migrating from Python | A running Python Agent Mesh deployment |

## Compare Deployment Shapes

| Shape | Who it's for | Broker needed | Configuration method | Complexity |
|---|---|---|---|---|
| Desktop bundle | Solo developers evaluating Agent Mesh | None (dev broker embedded) | Bundled defaults | Lowest |
| `sam` CLI | Developers building and running locally | Embedded dev broker, or any external Solace broker | YAML configs | Low |
| Docker | Single-host deployments, demos, CI environments | External (Solace Cloud or self-hosted) | YAML + env vars | Moderate |
| Kubernetes (Helm) | Team and production deployments | External, ideally an HA pair | Helm `values.yaml` | Highest |

All four shapes are covered in Installing. Before you begin lists the prerequisites that apply per shape.
