---
title: Concepts
description: The architecture narrative — the GWE/AWE/STR split, the event-driven broker mesh, the A2A protocol, request lifecycle, the configured-versus-built dimension, runtime services, and the Platform service.
sidebar_position: 0
---

# Concepts

This section explains how Solace Agent Mesh is put together at a level that supports decision-making, without diving into implementation detail.

## Pages in This Section

- **GWE / AWE / STR** — The three workload classes and what each owns.
- **Event-driven mesh** — The broker fabric: topic tree, queue versus direct subscriptions, three interchangeable broker implementations.
- **A2A protocol** — The agent-to-agent wire format: JSON-RPC envelope, topic conventions, signal taxonomy, JWT trust chain.
- **Request lifecycle** — End-to-end data flow when a user sends a message.
- **Configured vs built** — When to declare a tool in YAML and when to write it in Go.
- **Toolsets** — Packaging custom tools as a Platform resource: the tool/agent split, the discovery lifecycle, and the path from upload to a running agent.
- **Skills** — agentskills.io-style bundles loaded on demand: progressive disclosure, the discovery lifecycle, built-in skills, and how skills relate to toolsets.
- **Runtime services** — The shared runtime layer every Agent Mesh process is built on.
- **Artifacts** — Versioned blob storage every tool and agent shares: backends, scoping, lifecycle.
- **Sessions** — Conversation persistence and history compaction: backends, session keying, what stays in the LLM context window.
- **Platform service** — The HTTP control plane: agents, deployments, RBAC, audit, AI Assistant, evaluations.
