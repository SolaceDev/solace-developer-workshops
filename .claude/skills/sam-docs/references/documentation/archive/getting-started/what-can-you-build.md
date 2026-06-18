---
title: What Can You Build?
description: After install, where to go next — agents, gateways, tools, workflows, governance, and the path to production.
sidebar_position: 8
---

# What Can You Build?

You have Solace Agent Mesh installed and responding to health checks. The next decision is what you want it to do — author agents, connect external surfaces, automate work, or harden the deployment for production. This page is the navigator: each section points at the documentation that takes you the rest of the way.

The shape of the system shapes the choices. Agent Mesh has three workload classes — the Agent-Workflow Executor (AWE) runs agents and workflows, the Gateway Executor (GWE) hosts gateways, and the Secure Tool Runtime (STR) executes tools. Decisions about *what to build* almost always land in one of those three places. The Concepts shelf covers the runtime model end-to-end; the rest of this page covers what to build inside it.

## Author Your First Agent

Two complementary entry points exist for getting a real agent on disk and running:

- **Build your first project** — a hand-walked starter. You scaffold a project, author one configured agent in YAML plus one Web UI gateway, run them in embedded mode, and send a task end-to-end. The fastest way to confirm the install works against your code.
- **Building — Agents** — the authoring reference for configured agents. Identity, model selection, tool attachment, the session and artifact services, the agent card, peer routing, structured input and output, and the operator-facing knobs that matter in production.

A configured agent is defined entirely in YAML, including its tool list and any embedded prompts. That is the customer authoring surface for agents. When the YAML surface cannot express what you need, the answer is usually a custom built tool — a Go binary authored against `pkg/samtoolsdk` that the agent calls through the Secure Tool Runtime. The distinction is covered once on Concepts — Configured vs. built; the building pages link back to it rather than restating it.

If you would rather describe what you want than hand-author the YAML, the **AI assistant** turns a natural-language description into a draft agent definition. You type "I want an agent that searches our internal knowledge base and answers Slack questions", and the assistant returns a suggested name, system prompt, model, tool list, skill list, connector list, and input/output modes that the Platform service uses to pre-fill the Create Agent form. The draft is editable end-to-end — the assistant is a first-draft generator, not a runtime replacement for the authoring page.

## Connect External Surfaces

A gateway is how Agent Mesh meets the outside world: HTTP, broker topics, Slack, email, MCP clients, Microsoft Teams. Each gateway runs inside GWE and routes traffic to the agent that handles it. The full surface for all six types is on **Building — Gateways**.

| Gateway type | What it does |
|---|---|
| **Web UI gateway** (`httpsse`) | Serves the React Web UI and the `/api/v1/tasks` plus `/sse/subscribe/{taskId}` HTTP+SSE API. The default for interactive users. |
| **Event Mesh gateway** (`eventmesh`) | Subscribes to broker topics, runs agents against incoming messages, publishes results back to computed output topics. No HTTP surface. |
| **Slack gateway** (`slack`) | Slack Socket-Mode bot. Each thread becomes a session; runs inside private networks with no inbound HTTP requirement. |
| **Email gateway** (`email`) | IMAP-in and SMTP-out. Incoming mail becomes a task; the agent's reply is sent as email. Supports DMARC enforcement and Microsoft 365 XOAUTH2. |
| **MCP gateway** (`mcp`) | Exposes each agent as a remote MCP tool to external MCP clients (Claude Desktop, Claude Code) with OAuth and per-tool RBAC filtering. |
| **Teams gateway** (`teams`) | Microsoft Teams bot via the Bot Framework. Channel mentions and direct messages become A2A tasks. |

Pick the type that matches how the users or systems will talk to the deployment, and configure one or more instances per type. A single deployment can host any combination — a Web UI gateway for browser users, a Slack gateway for an internal team, an Event Mesh gateway for an automated upstream system.

## Extend Agents with Tools

A tool is a single invocable capability the LLM can call. Tools are how an agent reaches beyond text: search a database, hit an API, render an image, write a file, send a notification. The full surface is on **Building — Tools**.

Four kinds of tools cover most needs:

- **Built-in tools** — Go-native tools shipped in the runtime. Artifact CRUD, web requests, image processing, time, Markdown conversion, Mermaid rendering. Attach individually, or attach a built-in group (`artifact_management`, `data_analysis`, `general_agent_tools`, `image_tools`, `web_tools`, `research`, `hil_tools`) to pull the whole family.
- **MCP tools** — tools served by an external Model Context Protocol server. The agent talks to the MCP server over its protocol; the MCP server provides the tool implementation.
- **OpenAPI tools** — tools generated automatically from an OpenAPI specification. Point the agent at an OpenAPI URL and every documented endpoint becomes a callable tool.
- **Remote tools (Python or Go binaries)** — tools you author as standalone binaries that run inside STR. Python tools use the STR Python harness; Go tools use `pkg/samtoolsdk`.

The Platform service additionally manages connector definitions (SQL, knowledge base, document database, graph database, search) that the AI assistant uses when suggesting tools for a new agent. For deployed customer-facing tools, the four tool kinds covered earlier are the surface to author against; the connector definitions are about discoverability and assistant scaffolding.

## Automate with Workflows and Schedules

Two complementary automation surfaces sit alongside agents.

**Workflows** are declarative directed-acyclic-graph orchestrations executed by AWE. A workflow contains typed nodes — `agent`, `switch`, `map`, `loop`, and nested workflow — with timeouts, retry policies, and exit handlers. Use a workflow when the path through the system needs to be deterministic and replayable, not LLM-driven. A workflow instance is addressable on the broker as a peer, so an agent can delegate to a workflow and a workflow can delegate to an agent.

**Scheduled tasks** are recurring or one-shot agent invocations managed by the gateway. Three schedule kinds (cron, interval, one-shot), webhook notification channels for downstream systems, and HTTP CRUD at `/api/v1/scheduledTasks`. Use scheduled tasks for periodic agent runs — a morning digest, an hourly summary, a daily report — without standing up an external scheduler.

The two surfaces compose. A scheduled task can trigger a workflow that in turn delegates to several agents; an agent inside the workflow can call tools, escalate to a peer agent, or write artifacts that the next scheduled run consumes.

## Govern Access

Authentication answers "who is this user?". Role-based access control answers "what may they do?". Agent Mesh's RBAC is allow-list only — a role grants scopes; the absence of a scope is a denial.

**Administering — RBAC reference** is the scope catalog. It covers the three `authorization_service.type` modes (`none` for development, `default_rbac` for normal operation, `deny_all` for hardening), the full list of Platform service scopes (`sam:agent_builder:*`, `sam:gateways:*`, `sam:toolsets:*`, and so on), per-agent and per-tool delegation scopes, and the diagnostic walkthrough for "why was this user denied?".

RBAC composes with the authentication mode your gateway uses. For the YAML wiring of OIDC providers and the three authentication patterns (off, external login, built-in OIDC), see Configure — Authentication.

## Audit and Observe

Two parallel streams of operational visibility, with distinct purposes and distinct destinations:

- **Audit and compliance** — the closed, security-relevant slog stream. Five event types: authentication outcomes, RBAC tool decisions, RBAC agent decisions, control-plane decisions, and tool execution. Shipped to the same aggregator as operational logs but tagged for separate retention and access control. This is the stream auditors and incident responders read.
- **Observability and alerting** — operational logs, OpenTelemetry metrics, and `traceID` correlation. The stream operators read to answer "is the deployment healthy?" and "what happened to this task?". Covered in the deploy-time complement on Monitor.

The two streams share the slog infrastructure but answer different questions. Set `LOG_FORMAT=json` on every component so the aggregator can parse both into structured records and route them to the right indexes.

## Ship to Production

Before flipping the load balancer over, walk the **production readiness checklist**. It is a one-checkbox-per-commitment self-audit covering deployment topology (split workloads, replicas, broker tier), RBAC, secrets handling, TLS, persistence (Postgres and durable artifact storage), observability, probes, runbooks, and rollback. Each row links into the relevant detail page so you can answer "have we done this?" without reading the whole shelf.

For ongoing day-two work — backups, log rotation, secret rotation, TLS cert renewal, upgrades, migrations, and the scenario-organized troubleshooting playbook — the Administering shelf is the home base.

## What Next?

If you have not authored a real agent yet, Build your first project is the fastest path from a fresh install to a working agent on disk. The hand-walked starter takes about thirty minutes and confirms every layer of the deployment is wired correctly.
