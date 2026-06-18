---
name: sam-concepts
description: Core concepts of Solace Agent Mesh — component types, how they relate, agent anatomy, tool ecosystem, workflow nodes, and when to use what.
tags:
  - builder
  - concepts
  - architecture
  - sam
---

# SAM Core Concepts

## What is Solace Agent Mesh

Solace Agent Mesh (SAM) is an event-driven AI agent platform. Agents communicate through a message broker rather than calling each other directly. This decoupled architecture means any component — an agent, a gateway, a workflow — can be added, removed, or replaced independently without affecting the rest of the system.

All inter-component communication uses the A2A (Agent-to-Agent) protocol over the event mesh. Components discover each other automatically: agents announce their capabilities, and other components find them dynamically through agent card publishing. There is no manual wiring required.

SAM supports real-time event-driven work (reacting to things as they happen) and scheduled work (recurring tasks on a timetable). Most real-world agents handle both.

---

## Component Types

### Agent

An agent is an LLM-powered processing unit. It is the core building block of SAM. An agent has:

- An instruction (system prompt) that defines its personality, expertise, and constraints
- One or more skills (knowledge bundles) and capabilities (public descriptions for discovery)
- Tools that let it take actions in the world
- An agent card that serves as its public identity for discovery
- A model configuration specifying which LLM to use and its parameters
- Session handling for conversation memory
- Artifact access for file and data storage

Agents are autonomous: they receive a task, reason about it using the LLM, call tools as needed, and produce a response. They can operate independently or collaborate with other agents through peer delegation.

### Skill

A skill is a loadable knowledge bundle for an agent. It contains reference documents (documentation, schemas, examples) and optionally associated tools that are only added to the agent's context when the skill is loaded. This keeps the agent's base context small — large bodies of reference material are deferred until actually needed.

Skills are distinct from **capabilities** (see below). A skill is internal to the agent — it's how the agent accesses knowledge. A capability is external — it's how other agents discover what this agent can do.

A well-designed skill has focused, non-overlapping content. Associated tools on a skill reduce context further — the agent doesn't carry those tools until the skill is loaded.

### Capability (Agent Card Entry)

A capability is a public description of something an agent can do, listed on the agent's card for discovery by other agents, the orchestrator, and gateways. When another agent needs help with a specific task, it finds the right peer by matching the task to capability descriptions.

**Important terminology note**: In the YAML configuration, capabilities are defined under the `skills` field on the agent card (this is the A2A protocol field name). Throughout this documentation we use "capability" to avoid confusion with knowledge-base skills, but the config field remains `skills`.

Capability descriptions should be:

- **Accurate**: Describe what the agent can actually do, not what it aspires to
- **Distinct**: Each capability should cover a clearly different area
- **Searchable**: Use keywords that other agents would look for when seeking help

### Workflow

A workflow is a directed acyclic graph (DAG) of nodes that executes a multi-step process with explicit, deterministic control flow. Use workflows when you need predictable ordering, branching, parallelism, or retry logic — situations where you want the structure of the process defined ahead of time rather than decided by an LLM at runtime.

Workflows are discovered as agents: they publish an agent card and receive tasks through the same A2A protocol. To the rest of the system, a workflow looks like any other agent.

Workflow node types are described in the Workflow Node Types section below.

### Gateway

A gateway bridges external protocols into the SAM mesh. Users and external systems interact with agents through gateways. A gateway handles:

- Protocol translation (HTTP/SSE, REST, webhooks, Slack, Teams, etc.)
- Authentication and authorization
- Message formatting and response streaming
- Session management for multi-turn conversations

The most common gateway is the HTTP SSE gateway, which provides a streaming chat interface. Other gateways (Slack, Teams, Event Mesh) are available as plugins.

#### Event Mesh Gateway

The event mesh gateway is particularly important for building autonomous, background-running agents. It connects agents to real-world events flowing through the Solace event broker — messages from IoT devices, application events, database change notifications, webhook payloads, or any other event source.

An event mesh gateway configuration defines:

- **Topic subscriptions**: Which broker topics to listen on for incoming events
- **Message mapping**: How to transform incoming event payloads into agent requests
- **Routing**: Which agent should handle events from which topics
- **Output handling**: How to publish agent responses back to the event mesh

This is the key component for building agents that operate autonomously without human interaction — reacting to events as they happen, processing data streams, and triggering actions based on real-time conditions. Without an event mesh gateway, agents can only respond to user-initiated chat requests.

For configuration details, refer to the `sam-gateway-schema` skill.

You typically do not need to create custom gateways unless you are bridging a new external protocol. The built-in HTTP SSE gateway covers most interactive use cases. For event-driven use cases, use an event mesh gateway (see below).

For design guidance on event mesh gateways, refer to `sam-event-mesh-design`. For configuration details, refer to `sam-event-mesh-schema`.

### Proxy

A proxy connects external A2A-over-HTTPS agents into the SAM mesh. It translates between the A2A/HTTPS protocol used by external agents and the A2A/Solace protocol used internally.

A single proxy can manage multiple external agents. It handles:

- Agent card fetching and publishing to mesh discovery
- Authentication (static bearer, API key, or OAuth 2.0)
- Artifact resolution between external and internal formats
- Task lifecycle management (initiation, cancellation, completion)

Use proxies when you need to integrate agents hosted outside your SAM deployment — third-party agents, agents in other organizations, or agents running on different infrastructure.

### Plugin

A plugin is a packaged, distributable SAM component. Plugins wrap agents, gateways, or custom functionality into installable units that can be shared across projects and teams.

Plugin types:

- **Agent plugins**: Package an agent with its tools, skills, and configuration
- **Gateway plugins**: Package a gateway with its protocol adapters
- **Custom plugins**: Package arbitrary functionality (tools, service providers, etc.)

Plugins are the mechanism for reuse and distribution. Build a standalone agent first for prototyping, then package it as a plugin when it needs to be shared or deployed in multiple environments.

### Project

A project is a workspace that groups chat sessions and their associated artifacts. Projects provide organizational structure:

- Group related conversations together
- Maintain project-specific knowledge and instructions
- Set a default agent for the project
- Search across sessions within a project

Projects are organizational — they do not affect how agents run or communicate. They help users manage their interactions with agents.

### Prompt

A prompt is a reusable template with variable substitution. Prompts let users save commonly used messages and fill in variables at use time.

- Prompt groups contain one or more versioned prompts
- Variables use `{{Variable Name}}` syntax (title case with spaces)
- Prompts can be accessed via shortcuts in the chat interface

Prompts are user-facing conveniences — they make it easier to interact with agents consistently.

---

## How Components Relate

Agents are the fundamental unit. Everything else either composes agents, exposes agents, or supports agents:

- **Workflows compose agents**: A workflow's agent nodes invoke agents as steps. The workflow controls the order and logic; the agents do the actual work.
- **Gateways expose agents**: Users reach agents through gateways. The gateway translates the user's protocol (HTTP, Slack, etc.) into A2A messages.
- **Proxies bridge agents**: External agents become available on the mesh through proxies, appearing as regular agents to everything else.
- **Plugins package agents**: A plugin wraps an agent (or gateway, or tool) for distribution and reuse.
- **Skills provide agent knowledge**: Skills are loadable knowledge bundles with reference material and optional associated tools, loaded on demand.
- **Capabilities describe agent expertise**: Listed on the agent card, capabilities tell other components what this agent can do.
- **Tools extend agent reach**: Tools are how agents take actions — calling APIs, querying databases, managing artifacts, delegating to peers.

### Communication Model

All inter-component communication goes through the broker using the A2A protocol. Components never call each other directly. This means:

- Components can be deployed independently on different machines or processes
- Multiple instances of the same component can run for scaling
- Components can be added or removed without restarting others
- Communication is reliable — the broker handles delivery guarantees

### Discovery

Agent discovery is automatic. Every agent (and workflow) publishes an agent card to the broker at regular intervals. The agent card contains:

- Agent name and description
- List of capabilities with descriptions (defined as `skills` in the config YAML)
- Supported input and output modes (text, file, etc.)
- Provider information

Other components — including gateways, other agents, and the orchestrator — subscribe to agent card announcements and maintain a live directory of available capabilities. When an agent needs to delegate a task, it searches this directory to find the right peer.

---

## Agent Anatomy

### Instruction

The instruction is the agent's system prompt. It defines who the agent is, what it's good at, what constraints it operates under, and how it should behave. A good instruction is:

- **Specific**: Clearly states the agent's role and domain
- **Bounded**: Defines what the agent should and should not do
- **Contextual**: Provides enough background for the LLM to make good decisions
- **Skill-aware**: References the agent's skills and when to use them

### Capabilities on the Agent Card

The agent card's capability list is the agent's public interface. Other agents and the orchestrator use these descriptions to decide whether to route a task to this agent. See the Capability section under Component Types for guidance on writing good capability descriptions.

Note: In the YAML config, capabilities are defined under the `skills` field on the agent card (A2A protocol convention).

### Tools

Tools are the agent's hands — they let it interact with the world beyond generating text. See the Tool Ecosystem section below for the full taxonomy.

An agent's tool set should match its capabilities. If a capability promises the agent can "manage artifacts," the agent needs artifact management tools. If a capability promises "web research," it needs web request tools.

### Model Configuration

Each agent specifies which LLM to use and with what parameters (temperature, max tokens, etc.). Different agents can use different models — a simple routing agent might use a fast, cheap model while a complex analysis agent uses a more capable one.

### Session Handling

Agents maintain conversation history through sessions. Each user-agent interaction gets a session that tracks the back-and-forth messages, allowing multi-turn conversations. Session storage backends include in-memory (ephemeral), SQLite, and PostgreSQL.

### Artifacts

Artifacts are versioned files that agents can create, read, update, and share. They serve as the persistent data layer — reports, generated code, analysis results, uploaded files. Artifacts are stored through pluggable backends (filesystem, S3, GCS, in-memory).

---

## Tool Ecosystem

Agents use tools to take actions. SAM supports four categories of tools:

### Built-in Tools

Go-native tools that run in-process with the agent. They are fast, reliable, and always available. Built-in tool groups include:

- **Artifact management**: Create, read, update, search-replace, extract, and append to artifacts
- **Web requests**: Make HTTP requests to external APIs and services
- **Image processing**: Analyze, transform, and generate images
- **Data analysis**: Process and visualize data
- **General utilities**: Time, Markdown conversion, Mermaid diagrams

Built-in tools are configured by referencing their group name in the agent config.

### Custom Python Tools

User-written Python tools that run in the Secure Tool Runtime (STR) sandbox. Use custom tools when you need functionality not covered by built-in tools — integrating with a specific API, running domain-specific logic, processing specialized data formats.

Custom tools are defined with:

- A tool name and description
- Input parameters with types and descriptions
- A Python function that implements the tool logic

The STR provides a secure execution environment with resource isolation.

### MCP Tools

Tools exposed by external Model Context Protocol (MCP) servers. MCP is a standard protocol for connecting LLMs to external tool providers. SAM agents can connect to any MCP server via stdio, SSE, or HTTP transport.

Use MCP tools when you want to leverage existing MCP-compatible tool servers — database access, code execution environments, third-party integrations that already have MCP support.

### Peer Agents

Other agents can serve as tools through peer delegation. When an agent encounters a task outside its expertise, it can delegate to a peer agent that has the right skills. The delegation happens transparently through the A2A protocol.

Peer delegation is automatic when the agent has peer routing enabled — the agent discovers available peers through their agent cards and routes tasks based on skill matching. No explicit configuration of peer-to-peer connections is needed.

---

## Workflow Node Types

Workflows are built from five node types:

### Agent Node

Invokes an agent with a prompt. The prompt can use template expressions to inject data from the workflow input or from previous nodes' outputs.

Template variables:
- `{{workflow.input}}` — the original workflow input
- `{{node_id.output}}` — the output of a previously completed node
- `{{_map_item}}` — the current item when inside a map node

### Switch Node

Conditional branching. Evaluates a condition expression and routes execution to one of several branches. Condition expressions support safe operators: `==`, `!=`, `<`, `>`, `<=`, `>=`, `and`, `or`, `not`, `in`, `contains`.

### Map Node

Parallel iteration over a collection. Takes a list and executes a subgraph for each item in parallel. Each iteration receives the current item as `{{_map_item}}`.

### Loop Node

Repeated execution with a termination condition. Runs a subgraph repeatedly until a condition is met or a maximum iteration count is reached.

### Workflow Node (Nested)

Invokes another workflow as a node. Enables composition of workflows — complex processes can be broken into smaller, reusable sub-workflows.

### Workflow Execution Features

- **Dependencies**: Nodes declare `depends_on` to define execution order. Nodes with no dependencies run in parallel.
- **Retry**: Configurable retry strategy with exponential backoff per node.
- **Exit handlers**: `on_success`, `on_failure`, `on_cancel`, `always` — cleanup or notification logic that runs after the workflow completes.
- **Fail-fast**: By default, the workflow stops on the first node failure. This can be disabled for workflows where partial completion is acceptable.
- **Timeouts**: Per-node and per-workflow timeout configuration.

---

## When to Use What

For detailed guidance on mapping requirements to SAM components, refer to the `sam-best-practices` skill. The brief guidance is:

| Need | Component |
|------|-----------|
| Flexible reasoning about a task, tool use, conversation | Agent |
| Deterministic multi-step process with explicit control flow | Workflow |
| Expose agents to users or external systems | Gateway |
| Integrate an agent hosted outside your deployment | Proxy |
| Package a component for reuse and distribution | Plugin |
| Organize user sessions and artifacts | Project |
| Save reusable message templates | Prompt |
| Provide loadable knowledge and associated tools to an agent | Skill |
| React to external events with AI processing | Event Mesh Gateway |

**Agent vs. Workflow**: Use an agent when the LLM should decide what to do next. Use a workflow when you know the sequence of steps ahead of time and want deterministic execution. Workflows often contain agents as nodes — the workflow controls the process, the agents handle the reasoning within each step.

**Single agent vs. Multi-agent**: Start with a single agent. Add more agents only when responsibilities are clearly distinct and a single agent's instruction would become unfocused. Multi-agent systems add complexity — each agent boundary is a potential point of miscommunication.

**Built-in tool vs. Custom tool vs. MCP tool**: Prefer built-in tools when available (fastest, no external dependencies). Use custom Python tools for domain-specific logic. Use MCP tools to leverage existing MCP servers. Use peer delegation when the "tool" is really another agent's expertise.

---

## Configuration

All SAM components are defined as YAML configuration. Each component type has a specific schema that defines its required and optional fields.

For exact field definitions, required fields, and annotated examples, refer to the schema skills:
- `sam-agent-schema` — agent configuration schema
- `sam-workflow-schema` — workflow configuration schema
- `sam-tool-schema` — tool definition schema
- `sam-event-mesh-schema` — event mesh gateway configuration schema
- `sam-gateway-schema` — full gateway configuration schema (HTTP SSE and event mesh gateways)

When building components through the SAM builder, configurations are stored in the platform database and deployed through the platform service's control protocol. You do not need to manage config files directly.
