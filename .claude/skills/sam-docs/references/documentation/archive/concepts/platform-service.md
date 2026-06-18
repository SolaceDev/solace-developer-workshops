---
title: Platform Service
description: The Solace Agent Mesh Platform service — the HTTP control plane that exposes agents, deployments, projects, skills, toolsets, models, RBAC, evaluations, audit logs, and the AI Assistant on top of the runtime fabric.
sidebar_position: 8
---

# Platform Service

Concepts → GWE / AWE / STR describes the three workload classes that handle a user task. The Platform service is a fourth process that sits beside them: not on the request path, not on the broker hop between AWE and GWE, but a control plane that knows which agents and gateways exist, persists their configurations, drives deployments, mints RBAC scopes for gateways to embed in JWTs, hosts the AI Assistant, and runs evaluation experiments.

A deployment without the Platform service is fully functional. GWE and AWE load their gateway and agent configurations directly from YAML files at startup and serve user traffic the moment they are ready. What the Platform service adds is a layer of *managed* state on top of those processes: hot creation and update of agents without restarting AWE, a UI for non-developers, an HTTP API that other systems can drive, an audit trail of every mutation, and the AI Assistant that authors new agents from a prompt.

## Why a Platform Service Exists

Run a Solace Agent Mesh project as YAML and you get a perfectly good runtime. The agent file is on disk, `sam run` reads it, AWE serves traffic. Operators ship a new agent by writing a YAML file and reloading the project.

That model works in two scenarios — a small project with a single developer, or a fully GitOps-driven deployment where every change lands as a pull request and a redeploy. It does not work for everything else. The Platform service exists to support the cases that fall outside the YAML-only model:

- A team wants to create or modify agents without rebuilding container images.
- A non-developer needs to author an agent from a prompt rather than write YAML.
- A deployment has more than one engineer touching agents and must enforce who can do what.
- A compliance audit requires a trail of every change with the actor and the timestamp.
- An evaluation pipeline needs to run a dataset against a versioned agent without leaving an ad-hoc shell open.
- An external system needs to register agents or fetch the live agent catalogue programmatically.

These all collapse to the same shape: a persistent, authoritative, audited record of the desired runtime state, with an API in front of it. That is the Platform service.

## What It Manages

The service exposes a set of REST resources under `/api/v1/platform/`. The headline shape — what each resource is and where its lifecycle sits — is documented here. Field-by-field references are in Reference → Config schema.

| Resource | Path prefix | What it represents |
|---|---|---|
| Agents | `/api/v1/platform/agents` | The agent definitions the deployment knows about. Stored configuration is what *should* run; deployments are how it actually runs. |
| Workflows | `/api/v1/platform/workflows` | DAG definitions that AWE executes. Stored separately from agents because a workflow can be wired into many agents. |
| Agent deployments | `/api/v1/platform/agentDeployments` | A specific deployment of an agent — a snapshot of the agent configuration plus the result of pushing it to AWE. Actions are `deploy`, `update`, `undeploy`; user-visible deployment states are `deployed`, `not_deployed`, `deploy_failed`. |
| Workflow deployments | `/api/v1/platform/workflowDeployments` | The same shape as agent deployments, for workflows. |
| Gateways | `/api/v1/platform/gateways` | Gateway configurations — the Web UI gateway, Slack gateway, MCP gateway, and so on. |
| Gateway deployments | `/api/v1/platform/gatewayDeployments` | Lifecycle of a gateway deployment — same `deploy` / `update` / `undeploy` action set as agents. |
| Connectors | `/api/v1/platform/connectors` | External-system integrations (OpenAPI services, MCP servers, OAuth-fronted APIs). Connectors are catalogued at the platform level and referenced from agent configurations. |
| Remote A2A agents | `/api/v1/platform/remoteAgents` | Agents that live outside this deployment, registered as proxies so the local mesh can call them. Each remote agent ends up as a proxy deployment that bridges A2A traffic to the external endpoint. |
| Skills | `/api/v1/platform/skills` | Skill bundles — a `SKILL.md` manifest plus its tools and resources. The platform stores the bundle and the agent loader pulls it at runtime. |
| Toolsets | `/api/v1/platform/toolsets` | Named tool groupings — used to package related tools and reference them from many agents. |
| Tools | `/api/v1/platform/tools` | Read-only registry of every tool the deployment knows about: built-in tools, skill-bundled tools, MCP tools, OpenAPI tools. |
| Models | `/api/v1/platform/models` | The LLM provider catalogue — model name aliases plus provider credentials. Agents reference models by alias so credentials and endpoints can rotate without touching agent configurations. |
| RBAC roles and mappings | `/api/v1/platform/rbac/roles`, `/api/v1/platform/profileProvider` | Role definitions, role-to-claim mappings, and the configured profile provider. The Platform service is the authority for these; the gateway calls the Platform service at JWT-mint time to resolve a user's roles into scopes. |
| Evaluation datasets, evaluators, experiments, runs | `/api/v1/platform/datasets`, `/evaluators`, `/experiments`, `/evaluationRuns` | The evaluation pipeline. Datasets hold input/expected pairs; evaluators are the scoring logic; an experiment binds a dataset and an evaluator to a target agent; a run executes the experiment. Run status lifecycle is `pending` → `running` → `completed` / `completed_with_warnings` / `failed` / `cancelled`. |
| Builder Agent test sessions | `/api/v1/platform/builder/sessions/{sessionId}/test-agent` | Ephemeral agents the AI Assistant spawns to sanity-check a generated configuration before the user commits it. |

Every list endpoint in the preceding table returns the `PaginatedResponse[T]` envelope used across the gateway HTTP API — a top-level `data` array of resource objects and a `meta.pagination` object carrying `pageNumber`, `pageSize`, `count`, `totalPages`, and `nextPage`. Every single-item endpoint returns the resource DTO directly. Error responses carry `{message, errorId, validationDetails}` — the `errorId` is the value to grep server logs with when a request fails.

## Deployment Is a Separate Lifecycle From Configuration

The split between an *agent* and an *agent deployment* is deliberate, and it is one of the things the Platform service exists to make first-class.

An **agent** is a stored configuration. Creating or updating an agent records the change in the platform database but does not change what AWE is actually running.

An **agent deployment** is a directive to AWE to start running that agent (or stop running it, or pick up an updated version). A deployment captures a snapshot of the agent configuration at the moment of the action — so the running agent and the stored configuration cannot drift unless someone explicitly issues a new deployment.

Deployment is synchronous. The Platform service issues the control-plane RPC to AWE first and waits for the result; only then does it persist a deployment row carrying the final outcome (`success` or `failed`). There is no transient pending state and no asynchronous transition — by the time the client gets a response, the row already reflects whether AWE accepted the configuration. The user-visible status surfaced on the deployment DTO (`deployed`, `not_deployed`, `deploy_failed`) is computed from the row's underlying status and action by `MapDeploymentDisplayStatus`.

What happens *after* a successful deployment is tracked separately. Each agent carries a *runtime* status — `running`, `starting`, `disconnected`, or `stopped` — that reflects whether the AWE process is actually serving the agent right now. The deployment record describes the moment the configuration was pushed; the runtime status describes whether the agent is up at this instant. The two are decoupled because an agent can be deployed and not running (the AWE pod restarted, or a peer disconnected) without the operator having taken any deployment action.

Workflow deployments and gateway deployments follow the same synchronous shape. A change to a gateway configuration does nothing until a gateway deployment is issued to push the change into a running GWE.

## Two Input Paths, One Source of Truth

A team driving an Agent Mesh deployment through the Platform service can reach the same REST API two ways. Both write to the same database; the platform makes no distinction between them downstream.

**Declarative config apply.** A `manifest.yaml` plus a tree of typed resource files describes the desired state. `sam config apply` reads the tree, computes the diff against the live state, and submits the necessary creates / updates / deletes through the platform REST API. The reconciler is idempotent — running `sam config apply` against an already-correct state is a no-op. This is the path for GitOps-driven deployments and CI/CD pipelines.

**UI and direct HTTP.** The web UI calls the platform REST API directly. An operator clicks a button; the UI translates the click into a `POST` or `PATCH`. Other systems integrating with the Platform service (for example, an internal control-plane that wants to register agents) use the same REST API as the UI does.

Because both paths write to the same database, the Platform service makes no assumption that one of them owns the state. A change made in the UI is visible to the next `sam config apply` — if the desired state in the manifest does not contain that change, the apply will revert it. A change made by `sam config apply` is visible to the UI immediately. The team decides which path is the source of truth for which resource; the Platform service enforces neither preference.

## The AI Assistant

The AI Assistant — informally called the *Builder Agent* in code paths — is a standard agent that runs on the same AWE as every other agent, with one specialised purpose: authoring configurations through natural-language conversation.

What is interesting about the AI Assistant from a runtime perspective is that it is not a special component. It is an agent like any other. Its tools include a handful of platform-aware abilities — list the existing agents, validate a generated configuration against the platform schemas, save a draft as an artifact, deploy a draft — but the rest is the regular agent loop in Concepts → Request lifecycle.

The user-facing flow is:

1. The user describes what they want in plain English.
2. The Assistant asks clarifying questions, then presents a design plan as an artifact.
3. The UI recognises the artifact's MIME type, renders an approval dialog, and waits for the user to accept the plan.
4. The Assistant generates the YAML configurations, runs them through the Platform service's validation tools, and surfaces them as artifacts with a deploy button.
5. The user clicks deploy; the UI calls `POST /api/v1/platform/agents` to persist the configuration and `POST /api/v1/platform/agentDeployments` to push it into AWE.

The Assistant does not write directly to the platform database. The same REST API that the UI and `sam config apply` use is what the deploy step calls. Every action the Assistant produces flows through the same RBAC scope checks, audit log entries, and validation that a hand-authored API call would.

See Building → AI Assistant for the end-user workflow.

## Authentication, Authorization, and Audit

The Platform service authenticates every request with a JWT carried in the `Authorization: Bearer <token>` header. The signing key belongs to the gateway whose trust card the platform has received over the broker — the same trust-manager machinery that authenticates A2A messages between AWE and the gateway authenticates HTTP requests from a gateway to the platform.

Authorization runs per-endpoint. Each route declares a required scope — `sam:agent_builder:create`, `sam:gateways:read`, `sam:roles:update`, and so on — and the request is rejected with HTTP 403 if the JWT's scope set does not include it. The full list of platform scopes is documented in Administering → RBAC reference.

The Platform service is *also* the authority for RBAC resolution. When the gateway mints a JWT for a new user task, it calls the Platform service over the broker on the `sam/v1/authz/lookup/<requestId>` topic to resolve the user's roles into a concrete scope set. The Platform service reads its `rbac_roles`, `rbac_role_mappings`, and `rbac_claim_mappings` tables, applies the configured profile provider, and returns the resolved scopes. The gateway embeds the result in the JWT and the rest of the system reads from the signed claims — see Concepts → A2A protocol → JWT signing and trust.

Every mutation is audit-logged through structured `slog` at `INFO` level. The record carries the action, the actor's identity, the affected resource's ID, the outcome, and a reason when the outcome is rejected. Audit lines are emitted to the same logging stack the rest of the runtime uses, so they ship to whatever observability system is configured — see Administering → Audit and compliance.

## Discovery

The Platform service learns about running components the same way every other component does: by subscribing to the broker discovery channels.

The Platform service creates a direct subscription on `<namespace>/a2a/v1/discovery/>` so that it receives every agent card and every gateway card published anywhere in the namespace. Each card is parsed and routed to either the in-memory agent registry or the gateway registry. Cards carry a `removed=true` user property when a component is shutting down, which triggers deregistration; a background TTL sweep retires cards that have not been republished within their stated lifetime.

This is how the platform UI shows the difference between a configured-but-undeployed agent and a running agent — the former exists in the database; the latter has also published a card on the discovery topic.

## Persistence

The Platform service stores its configuration state in SQLite (default) or PostgreSQL (production). The pure-Go SQLite driver `modernc.org/sqlite` keeps the deployment story for the single-container case simple — no native dependencies. PostgreSQL is the recommended store for multi-instance deployments because the Platform service is stateless apart from the database.

Schema migrations are managed by goose with the migration files embedded in the binary. The migration set is run automatically at startup; manual operator action is not required.

The headline tables — `agents`, `agent_deployments`, `gateways`, `gateway_deployments`, `connectors`, `skills`, `toolsets`, `rbac_roles`, `rbac_role_mappings`, `eval_datasets`, `eval_runs`, and the joining tables — mirror the REST resource surface. Audit records do not live in the database; they live in the structured log stream, which the operator's observability pipeline persists and retains.

## Running More Than One Platform Instance

The Platform service is stateless apart from its database connection, so it scales horizontally behind a load balancer. There is one wrinkle: the RBAC authority. The broker-driven `sam/v1/authz/lookup` topic is a request-response channel; the gateway expects one answer per request, not a chorus. To enforce this, exactly one platform pod is designated the RBAC authority and binds to the lookup queue on a competing-consumer subscription.

A standalone Platform service deployment is straightforward — the single pod is the authority. A deployment that runs platform sidecars alongside AWE for fast discovery reads sets `IsRBACAuthority` to `true` on one dedicated platform pod and `false` on the sidecars. The dedicated pod handles every RBAC lookup; the sidecars handle no lookups but participate fully in HTTP CRUD and discovery.

Health-check endpoints are wired the same way as every other Agent Mesh process — see Concepts → Runtime services → Health endpoints.

## Where the UI Fits

The Agent Mesh Web UI under `webui/` is a React application that talks to two HTTP surfaces: the gateway, for streaming task execution and SSE, and the Platform service, for CRUD on agents, deployments, configurations, evaluations, and everything else this page describes. In a production deployment both surfaces sit behind the same hostname; the path prefix routes the request to the right backend — anything under `/api/v1/platform/` goes to the Platform service, anything under `/api/v1/gateway/` goes to the gateway.

This is why the UI feels like one application even though two processes are answering. The split lets the gateway scale on connection count and the Platform service scale on database load, independently.

## What Next?

You now have the control plane underneath the runtime. The user-facing surface — what an operator does in the UI, what `sam config apply` looks like in practice, how to set up the Platform service's identity provider — is covered in Installing → Configure and Administering → RBAC reference. For the AI Assistant workflow specifically, see Building → AI Assistant.
