---
title: Platform Service
description: "The Agent Mesh Platform service: the HTTP control plane that exposes agents, deployments, skills, toolsets, models, RBAC, evaluations, audit logs, and the AI Assistant on top of the runtime fabric."
sidebar_position: 5110
---

# Platform Service

The Platform service is the control plane Agent Mesh deploys alongside its runtime workloads. While the Entrypoint Executor, Agent-Workflow Executor, and Secure Tool Runtime handle the request path for a user task, the Platform service sits beside them and tracks which agents and entrypoints exist, persists their configurations, drives deployments, mints role-based access control (RBAC) scopes for entrypoints to embed in JSON Web Tokens (JWTs), hosts the AI Assistant, and runs evaluation experiments. For more information about the three runtime workload classes, see [How Agent Mesh Manages Workloads](./managing-workloads.md).

An Agent Mesh deployment without the Platform service is fully functional. The entrypoint and Agent-Workflow Executors load entrypoint and agent configurations from YAML files at startup and serve user traffic as soon as the processes are ready. The Platform service adds a layer of managed state on top of those processes: hot creation and update of agents without restarting the Agent-Workflow Executor, an Agent Mesh UI for non-developers, an HTTP API for other systems to drive, an audit trail of every mutation, and the AI Assistant that authors new agents from a prompt.

## Why Use the Platform Service

Running Agent Mesh from YAML configuration produces a working runtime. The agent file is on disk, the runtime reads it, and the Agent-Workflow Executor serves traffic. Operators ship a new agent by writing a YAML file and reloading the configuration.

That model works in two scenarios: a single developer with a small set of configuration files, or a fully GitOps-driven deployment where every change lands as a pull request and a redeploy. It does not cover the cases outside the YAML-only model. The Platform service supports those cases:

- A team creates or modifies agents without rebuilding container images.
- A non-developer authors an agent from a prompt rather than writing YAML.
- A deployment has multiple engineers touching agents and must enforce who can do what.
- A compliance audit requires a trail of every change with the actor and the timestamp.
- An evaluation pipeline runs a dataset against a versioned agent without leaving an ad-hoc shell open.
- An external system registers agents or fetches the live agent catalog programmatically.

These all collapse to the same shape: a persistent, authoritative, audited record of the desired runtime state, with an API in front of it.

## What the Platform Service Manages

The Platform service exposes a set of REST resources under `/api/v1/platform/`. The following table describes each resource and where its lifecycle sits. For field-by-field references, see [Configuration Schema](../reference/config-schema.md).

| Resource | Path prefix | Description |
|---|---|---|
| Agents | `/api/v1/platform/agents` | The agent definitions registered with the deployment. Stored configuration is the desired state. Deployments determine what actually runs. |
| Workflows | `/api/v1/platform/workflows` | Directed acyclic graph (DAG) definitions that the Agent-Workflow Executor executes. Workflows are stored separately from agents because a single workflow can be wired into many agents. |
| Agent deployments | `/api/v1/platform/agentDeployments` | A specific deployment of an agent: a snapshot of the agent configuration plus the result of pushing it to the Agent-Workflow Executor. Actions are `deploy`, `update`, and `undeploy`. User-visible deployment states are `deployed`, `not_deployed`, and `deploy_failed`. |
| Workflow deployments | `/api/v1/platform/workflowDeployments` | The same shape as agent deployments, for workflows. |
| Entrypoints | `/api/v1/platform/entrypoints` | Entrypoint configurations: the Web UI entrypoint, Slack entrypoint, MCP entrypoint, and others. |
| Entrypoint deployments | `/api/v1/platform/entrypointDeployments` | Lifecycle of an entrypoint deployment. Uses the same `deploy`, `update`, and `undeploy` action set as agents. |
| Connectors | `/api/v1/platform/connectors` | External-system integrations such as OpenAPI services, MCP servers, and OAuth-fronted APIs. Connectors are cataloged at the platform level and referenced from agent configurations. |
| Remote A2A agents | `/api/v1/platform/remoteAgents` | Agents that live outside this deployment, registered as proxies so the local mesh can call them. Each remote agent becomes a proxy deployment that bridges A2A traffic to the external endpoint. |
| Skills | `/api/v1/platform/skills` | Skill bundles: a `SKILL.md` manifest plus its tools and resources. The Platform service stores the bundle, the Secure Tool Runtime loads it, and the runtime serves its contents to agents over the broker. |
| Toolsets | `/api/v1/platform/toolsets` | Named tool groupings used to package related tools and reference them from many agents. |
| Tools | `/api/v1/platform/tools` | Read-only registry of every tool the deployment knows about: built-in tools, skill-bundled tools, MCP tools, and OpenAPI tools. |
| Models | `/api/v1/platform/models` | The LLM provider catalog: model name aliases plus provider credentials. Agents reference models by alias so credentials and endpoints can rotate without touching agent configurations. |
| RBAC roles and mappings | `/api/v1/platform/rbac/roles`, `/api/v1/platform/profileProvider` | Role definitions, role-to-claim mappings, and the configured profile provider. The Platform service is the authority for these. The entrypoint calls the Platform service at JWT-mint time to resolve a user's roles into scopes. |
| Evaluation datasets, evaluators, experiments, runs | `/api/v1/platform/evaluations/datasets`, `/evaluations/evaluators`, `/evaluations/experiments`, `/evaluations/runs` | The evaluation pipeline. Datasets hold input and expected pairs. Evaluators are the scoring logic. An experiment binds a dataset and an evaluator to a target agent. A run executes the experiment. Run status lifecycle is `pending`, `running`, `completed`, `completed_with_warnings`, `failed`, and `cancelled`. |
| Builder Agent test sessions | `/api/v1/platform/builder/sessions/{sessionId}/test-agent` | Ephemeral agents the AI Assistant spawns to sanity-check a generated configuration before the user commits it. |

Every list endpoint in the preceding table returns the `PaginatedResponse[T]` envelope used across the entrypoint HTTP API: a top-level `data` array of resource objects and a `meta.pagination` object carrying `pageNumber`, `pageSize`, `count`, `totalPages`, and `nextPage`. Every single-item endpoint returns the resource data transfer object (DTO) directly. Error responses carry `{message, errorId, validationDetails}`. The `errorId` is the value to grep server logs with when a request fails.

## Configuration and Deployment Are Separate

The split between an agent and an agent deployment is deliberate. The Platform service exists in part to make this distinction first-class.

An agent is a stored configuration. Creating or updating an agent records the change in the platform database without changing what the Agent-Workflow Executor is running.

An agent deployment is a directive to the Agent-Workflow Executor to start running that agent, stop running it, or pick up an updated version. A deployment captures a snapshot of the agent configuration at the moment of the action, so the running agent and the stored configuration cannot drift unless someone explicitly issues a new deployment.

Deployment is synchronous. The Platform service issues the control-plane RPC to the Agent-Workflow Executor first and waits for the result. Only then does the Platform service persist a deployment row carrying the final outcome (`success` or `failed`). There is no transient pending state and no asynchronous transition: by the time the client receives a response, the row already reflects whether the Agent-Workflow Executor accepted the configuration. The deployment DTO exposes a user-visible status of `deployed`, `not_deployed`, or `deploy_failed`.

What happens after a successful deployment is tracked separately. Each agent carries a runtime status: `running`, `starting`, `disconnected`, or `stopped`. The runtime status reflects whether the Agent-Workflow Executor is actually serving the agent right now. The deployment record describes the moment the configuration was pushed. The runtime status describes whether the agent is up at this instant. The two are decoupled because an agent can be deployed and not running (for example, the Agent-Workflow Executor pod restarted, or a peer disconnected) without the operator having taken any deployment action.

Workflow deployments and entrypoint deployments follow the same synchronous shape. A change to an entrypoint configuration does nothing until an entrypoint deployment is issued to push the change into a running Entrypoint Executor.

## Two Input Paths to the Same State

A team driving an Agent Mesh deployment through the Platform service can reach the same REST API two ways. Both paths write to the same database, and the Platform service treats the two paths as equivalent.

Declarative config apply uses a `manifest.yaml` plus a tree of typed resource files to describe the desired state. The `sam config apply` command reads the tree, computes the diff against the live state, and submits the necessary creates, updates, and deletes through the platform REST API. The reconciler is idempotent: running `sam config apply` against an already-correct state is a no-op. Declarative config apply is the path for GitOps-driven deployments and CI/CD pipelines.

The Agent Mesh UI and direct HTTP requests call the platform REST API directly. An operator clicks a button, and the UI translates the click into a `POST` or `PATCH` request. Other systems that integrate with the Platform service (for example, an internal control plane that registers agents programmatically) use the same REST API the UI uses.

Because both paths write to the same database, the Platform service does not assume that one of them owns the state. A change made in the Agent Mesh UI is visible to the next `sam config apply` invocation. If the desired state in the manifest does not contain that change, the apply reverts it. A change made by `sam config apply` is visible to the UI immediately. The team decides which path is the source of truth for which resource. The Platform service enforces neither preference.

## The AI Assistant

The AI Assistant (informally called the Builder Agent in code paths) is a standard agent that runs on the same Agent-Workflow Executor as every other agent. It has one specialized purpose: authoring configurations through natural-language conversation.

The AI Assistant is not a special component. It is an agent like any other. Its tools include a handful of platform-aware abilities (list the existing agents, validate a generated configuration against the platform schemas, save a draft as an artifact, deploy a draft), but the rest is the regular agent loop.

The user-facing flow is:

1. The user describes what they want in plain English.
2. The Assistant asks clarifying questions, then presents a design plan as an artifact.
3. The Agent Mesh UI recognizes the artifact's MIME type, renders an approval dialog, and waits for the user to accept the plan.
4. The Assistant generates the YAML configurations, runs them through the Platform service's validation tools, and presents them as artifacts with a deploy button.
5. The user clicks deploy. The UI calls `POST /api/v1/platform/agents` to persist the configuration and `POST /api/v1/platform/agentDeployments` to push it into the Agent-Workflow Executor.

The Assistant does not write directly to the platform database. The deploy step calls the same REST API the UI and `sam config apply` use. Every action the Assistant produces flows through the same RBAC scope checks, audit log entries, and validation that a hand-authored API call does.

## Authentication, Authorization, and Audit

The Platform service authenticates every request with a JWT carried in the `Authorization: Bearer <token>` header. The signing key belongs to the entrypoint whose trust card the Platform service has received over the event broker. The same trust-manager machinery that authenticates Agent-to-Agent (A2A) messages between the Agent-Workflow Executor and the entrypoint authenticates HTTP requests from an entrypoint to the Platform service.

Authorization runs per-endpoint. Each route declares a required scope (`agent_builder:_:create`, `entrypoint:*:read`, `rbac:_:update`, and so on). The Platform service rejects the request with HTTP 403 if the JWT's scope set does not include the required scope. For the full list of platform scopes, see [RBAC Reference](../reference/rbac-reference.md).

The Platform service is also the authority for RBAC resolution. When the entrypoint mints a JWT for a new user task, the entrypoint calls the Platform service over the event broker on the `<namespace>/sam/v1/authz/lookup/<gatewayId>` topic to resolve the user's roles into a concrete scope set. The Platform service looks up the user's role assignments, the scopes those roles map to, and any IdP-claim-driven mappings, applies the configured profile provider, and returns the resolved scopes. The entrypoint embeds the result in the JWT and the rest of the system reads from the signed claims. For more information about JWT signing and trust, see [Agent-to-Agent Protocol](./a2a-protocol.md).

The Platform service audit-logs every mutation through structured logs at the `INFO` level. The record carries the action, the actor's identity, the affected resource's ID, the outcome, and a reason when the outcome is rejected. The Platform service writes audit lines to the same logging stack the rest of the runtime uses, so they ship to whichever observability system is configured. For more information about audit handling, see [Managing Audit and Compliance](../administering/audit-and-compliance.md).

## Discovery

The Platform service discovers running components the same way every other component does: by subscribing to the event broker discovery channels.

The Platform service creates a direct subscription on `<namespace>/a2a/v1/discovery/>` and receives every agent card and entrypoint card published anywhere in the namespace. The Platform service parses each card and routes it to either the in-memory agent registry or the entrypoint registry. Cards carry a `removed=true` user property when a component is shutting down, which triggers deregistration. A background TTL sweep retires cards that have not been republished within their stated lifetime.

Discovery is how the platform Agent Mesh UI distinguishes a configured-but-undeployed agent from a running agent. The former exists in the database. The latter has also published a card on the discovery topic.

## Persistence

The Platform service stores its configuration state in SQLite (the default) or PostgreSQL (for production). The pure-Go SQLite driver `modernc.org/sqlite` keeps the deployment story for the single-container case straightforward, with no native dependencies. PostgreSQL is the recommended store for multi-instance deployments because the Platform service is stateless apart from the database.

The Platform service uses goose to manage schema migrations, with the migration files embedded in the binary. The migration set runs automatically at startup; you do not need to run migrations manually.

The platform store mirrors the REST resource structure: each resource kind maps to its own table, with joining tables for many-to-many relationships. Audit records do not live in the database. Audit records live in the structured log stream, which the operator's observability pipeline persists and retains.

## Running Multiple Platform Instances

The Platform service is stateless apart from its database connection, so it scales horizontally behind a load balancer. There is one wrinkle: the RBAC authority. The `<namespace>/sam/v1/authz/lookup/>` subscription on the event broker is a request-response channel. The entrypoint requires exactly one answer per request. To enforce this, exactly one platform pod is designated the RBAC authority and binds to the lookup queue on a competing-consumer subscription.

A standalone Platform service deployment is straightforward: the single pod is the authority. A deployment that runs platform sidecars alongside the Agent-Workflow Executor for fast discovery reads designates one dedicated platform pod as the RBAC authority; the sidecars are not. The dedicated pod handles every RBAC lookup. The sidecars handle no lookups but participate fully in HTTP CRUD and discovery.

Health-check endpoints are wired the same way as every other Agent Mesh process.

## Where the Agent Mesh UI Fits

The Agent Mesh UI under `webui/` is a React application that talks to two HTTP backends: the entrypoint, for streaming task execution and Server-Sent Events (SSE), and the Platform service, for CRUD on agents, deployments, configurations, evaluations, and everything else this page describes. In a production deployment, both surfaces sit behind the same hostname. The path prefix routes the request to the right backend: anything under `/api/v1/platform/` goes to the Platform service, and the rest of `/api/v1/` (`/api/v1/agentCards`, `/api/v1/tasks/`, `/api/v1/sessions/`, `/api/v1/sse/subscribe/`, `/api/v1/artifacts/`, and so on) goes to the entrypoint.

The two-surface split lets the entrypoint scale on connection count and the Platform service scale on database load, independently. The UI feels like one application even though two processes are answering.

## Next Steps

- To configure the Platform service's broker connection, database, and identity provider, see [Configuring Agent Mesh](../installing/configure.md).
- To author RBAC roles and scope mappings, see [RBAC Reference](../reference/rbac-reference.md).
