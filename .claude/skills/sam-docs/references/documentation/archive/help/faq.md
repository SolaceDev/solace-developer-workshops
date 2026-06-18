---
title: FAQ
description: Frequently asked questions about Solace Agent Mesh — product fit, prerequisites, deployment shapes, and supported integrations.
sidebar_position: 1
---

# FAQ

Quick answers to the most common questions about Agent Mesh. For step-by-step setup, follow the Getting Started and Installing shelves. For day-two runbook material, see Administering. If your question is not here, the Solace Community forum is the right next stop.

## What Is Agent Mesh?

Agent Mesh is a runtime for building, running, and operating agentic systems on a Solace event mesh. It owns the full agent lifecycle — LLM interaction, tool calling, streaming, artifact handling, sessions, workflows, the A2A protocol, and the HTTP gateway. Agents are declared in YAML (or written in Go for more demanding cases) and orchestrated as a mesh of cooperating workloads. See Overview → What is Agent Mesh? for the longer answer.

## Do I Need a Solace Broker to Try It?

No. The shipped binary includes an in-process dev broker, so you can run the entire stack — agent runtime, gateway, tool runtime, broker — in a single process on a laptop with no infrastructure dependencies. The desktop app and embedded mode both use this layout. When you are ready to deploy against a real Solace broker, swap the broker configuration; nothing about the agent or tool config changes. See Getting Started → Try Agent Mesh Desktop for the fastest first run.

## Which LLM Providers Are Supported?

Agent Mesh wraps a multi-provider LLM client, so OpenAI, Anthropic, AWS Bedrock, Google Vertex AI, Azure OpenAI, and other major providers are reachable through a single configuration shape. Model strings follow a `provider/model` convention (for example, `anthropic/claude-sonnet-4-5` or `openai/gpt-4o`). Any OpenAI-compatible gateway — including local model servers and corporate inference proxies — is also reachable through the `openai/...` shape with a custom `api_base`. See Installing → Configure → LLM provider for the complete provider list, common keys, and OAuth2-secured-gateway setup.

## Can I Run Everything in a Single Process?

Yes — embedded mode runs the agent runtime, gateway, tool runtime, and dev broker as goroutines inside one process, invoked with `sam-enterprise run --embedded`. The desktop app uses the same layout with a native UI shell. Embedded mode is the recommended path for laptops, demos, and developer setups; the distributed deployment (separate processes for each workload class, against a real Solace broker) is the recommended path for production. See Installing → Deploy options for the full comparison.

## What's the GWE / AWE / STR Split?

The runtime separates three workload classes: **GWE** (Gateway Executor — runs the HTTP gateway and SSE streaming), **AWE** (Agent-Workflow Executor — runs agents and workflows), and **STR** (Secure Tool Runtime — runs tools in a sandbox). They communicate exclusively through the broker, never directly. In a distributed deployment the three classes are separate pods you can scale independently; in embedded mode they are goroutines inside one process. The split lets multiple agents share one STR (lower per-agent footprint) and lets tools run sandboxed regardless of where the agent runs. See Concepts → GWE, AWE, STR for the full picture.

## Can Go and Python Agent Mesh Agents Talk to Each Other?

Yes. The A2A protocol — the JSON-RPC 2.0 message format that agents use to exchange tasks over the broker — is wire-compatible between the Go and Python implementations. Mixed deployments are supported: a Go AWE can host an agent that delegates to a peer agent hosted on a Python AWE, and vice versa. The YAML configuration format is also compatible (the one exception is `app_exec`, which replaces Python's `app_module` for Go binaries). See Concepts → A2A protocol for the wire-format details.

## When Should I Use `sam` Versus `sam-enterprise`?

Both are builds of the same product. The `sam-enterprise` build is the recommended production build — it ships the full Agent Mesh feature surface, including authentication, RBAC, audit logging, the Platform service for agent and toolset management, and the `sam-enterprise doctor` configuration checker. The base `sam` build runs the same agent runtime and the same A2A wire format; it omits the operational helpers and the Platform service, and is used in some development contexts. When in doubt, install `sam-enterprise`. See Installing → Install for the install paths.

## How Do I Get Help If I'm Stuck?

Start with the Solace Community forum for peer-to-peer questions and design discussions, then reach out to your Sales Engineer if you need a direct conversation, and open a ticket on the Solace Support portal when the issue needs a tracked case with an SLA. The Community and Support page covers when each channel is the right fit and what to include when opening a ticket.
