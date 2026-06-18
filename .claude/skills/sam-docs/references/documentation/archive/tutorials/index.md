---
title: Tutorials
description: End-to-end recipes that take you from a blank repo to a working agent for a specific scenario.
sidebar_position: 0
---

# Tutorials

Each tutorial in this shelf walks one scenario from a blank repo to a working, verified deployment — installing what's needed, wiring the agent and gateway, running them, and confirming the result. Tutorials are recipes; the Building and Reference sections are the authoritative source for the reference shape of a feature: every YAML key, every HTTP route, every CLI flag.

Two distinct kinds of tutorials live on this site:

- **Build recipes (this shelf).** Read by a developer or operator who wants to take Agent Mesh and wire up a specific scenario from scratch. End-to-end, blank repo to working deployment.
- **Operator workflows.** Day-two procedures — rotating credentials, doing a pre-upgrade dry run, scaling AWE under load. These live separately in Administering → Tutorials and use cases.

When in doubt, pick the build recipe if you do not yet have the scenario running; pick the operator workflow if you do and need to change something about it.

## Available Tutorials

| Tutorial | What you build |
|---|---|
| Slack support bot | A Slack-resident support agent that listens for `@`-mentions in channels and direct messages, with thread-scoped conversation continuity and artifact uploads back into Slack. |
| REST gateway integration | A working integration of Agent Mesh into an existing application via the HTTP / SSE API, driven from `curl` so it ports to any HTTP client. |
| SQL database integration | An agent that answers natural-language questions against a SQL database, with schema introspection on startup and a production hardening path that moves from SQLite to a scoped read-only Postgres role. |
| MCP integration | An agent that gains external capabilities by attaching the official Model Context Protocol filesystem server over the `stdio` transport, with tool-name filtering and the security considerations to apply on third-party servers. |
| RBAC setup walkthrough | A deployment locked down from `authorization_service.type: none` to least-privilege RBAC — first role, IdP-claim mapping, deliberate-denial loop, hardened production default. |
| Pro-code agent deployment | An agent backed by a custom-coded toolset, taken from a blank project to a verified deployment through the Platform service — author the tool, package it, bundled-upload the agent and toolset together, preview the effective config, and iterate. |

## Prerequisites That Apply to Every Tutorial

Each tutorial assumes you have done three things before you start:

- **Installed Agent Mesh.** Walk Installing → Install end to end if you have not.
- **Configured an LLM endpoint and API key.** The agent and the gateway both consume one. Installing → Configure covers the environment-variable contract.
- **A broker the gateway and the agent can reach.** A dev broker that ships with the repo is enough for the laptop runs the tutorials walk through; for production deployments you will point both at a real Solace broker.

Tutorials cross-link aggressively into the reference and Building pages rather than restating concepts. If a tutorial mentions a piece of behavior without explaining it (an `artifact_handling_mode`, an `agent_card`, an `authorization_service`), follow the link in the surrounding text for the deep dive.

## Choosing a Starting Point

The five tutorials are independent — pick whichever matches the scenario in front of you. As a rough guide:

- If you are integrating Agent Mesh into your own application or service, the simplest entry point is REST gateway integration. It walks the HTTP and SSE surface end to end, which every other gateway type builds on.
- If you want a real-world chat-tool deployment with conversation continuity, the highest-value recipe is Slack support bot. It sets up a configured agent backed by Slack's Socket Mode — no public ingress, no reverse proxy.
- If your agent's value is answering questions over an existing database, walk SQL database integration — it covers the schema-introspection knob that makes the difference between an agent that writes correct SQL on the first try and one that guesses at column names.
- If you want to plug external tooling (filesystem operations, third-party APIs, MCP servers) into an agent, walk MCP integration. The recipe uses a local filesystem server but the wiring transfers to remote MCP servers with OAuth.
- If you have a deployment running and now need to lock it down before production, walk RBAC setup walkthrough. It takes you from permissive (`authorization_service.type: none`) to a hardened, role-driven posture in concrete steps.
- If you have written your own tool code and want to deploy an agent that uses it, walk Pro-code agent deployment. It packages a custom toolset, uploads it with the agent in one bundle, and verifies the agent calls the tool.

## What Next?

Pick one of the listed tutorials and walk it end to end. When you finish, the natural next read is Building → Agents for the full agent-authoring reference, or Administering → Production-readiness checklist once you are ready to take a tutorial deployment toward production.
