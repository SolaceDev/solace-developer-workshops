# Stage 2: Onboarding — Provision Access

<img src="img/onboarding.png" alt="Onboarding" width="400"/>

Once the role is defined, connect the agent to the systems and data sources it needs to perform it. This is the direct analog to provisioning a new employee with tools, credentials, and access rights on day one. For AI agents, onboarding covers connectivity to enterprise databases via SQL, enterprise applications via APIs, MCP servers, and third-party agents via A2A protocols, as well as defining how the agent is triggered (chat, event, API call, or from another agent). Getting onboarding right means providing the right access: role-based access controls, SSO, and delegated identity ensure each agent operates only within the permissions appropriate to its defined function.

---

## Solace Agent Mesh Features used in the onboarding stage

- **SQL Connector** — Provides agents with query access to relational databases (PostgreSQL, MySQL, MariaDB).
- **MCP Connector** — Connects agents to any Model Context Protocol server via streamable-HTTP or SSE transport, exposing its tools natively to the agent.
- **API Connector (OpenAPI)** — Connects agents to any REST API described by an OpenAPI spec, with auto-detected authentication.
- **Knowledge Base Connector** — Wires agents to a managed vector knowledge base (Amazon Bedrock KB) for retrieval-augmented generation.
- **MCP Tools** — Tools exposed by external MCP servers (stdio, SSE, or streamable-HTTP) attached to an agent and discoverable at runtime.
- **HTTP SSE Gateway** — The platform-managed chat-and-streaming gateway that exposes agents to users via Server-Sent Events; handles session management, auth, and response streaming.
- **Event Mesh Gateway** — An event-driven connector that subscribes to Solace broker topics and routes real-world events (webhooks, IoT, queue messages) into agent tasks.
- **Proxy (`kind: proxy`)** — Connects external A2A-over-HTTPS agents into the mesh; handles agent card fetching, auth (static bearer / API key / OAuth 2.0), and artifact format translation.
- **RBAC (`authorization_service: default_rbac`)** — Role-based access control using YAML-defined roles and users; enforced at tool dispatch, peer delegation, and control-plane operations.
- **IdP config (`idp_claims_config`)** — Maps identity-provider group claims (e.g., OIDC `groups`) to SAM roles at authentication time, enabling SSO-driven access provisioning.
- **Session Memory (`session_service`)** — Configurable persistence backend (in-memory, SQLite, PostgreSQL) that stores conversation history and task checkpoints per agent.

## Hands-on

In this stage you will onboard your agents by giving them the access and tools they need to do their jobs. By the end you will have built:

- A [PostgreSQL connector](#create-the-postgresql-connector) wired to a live Supabase database
- A [store-data agent](#create-an-agent-that-uses-the-connector) that queries the database as part of its reasoning loop
- A [custom Go toolset](#create-a-custom-toolset) implementing Dijkstra's algorithm, published to the Secure Tool Runtime

This is the onboarding equivalent of a new employee's day one: credentials provisioned, systems connected, tools installed — ready to work.

---

## Add the database password to your .env

The connector config will reference the password as an environment variable, not as a plain-text value. 


1. Create a .env file with the following basic vars
    ```
    # LLM — LiteLLM proxy at mymaas.net
    LLM_SERVICE_ENDPOINT="https://lite-llm.mymaas.net/"
    MODEL_GENERAL_API_KEY="sk-<>"
    MODEL_PLANNING_API_KEY="sk-<>"
    DB_PASSWORD=thisisaverysecurepassword
    ```
    > Note: You can just copy the example env if you cloned this repo `cp .env_example .env`

---

## Create the PostgreSQL connector

Copy and paste the following prompt into Claude Code:

```
Create a PostgreSQL connector for my SAM project. Use the following connection string:

  postgresql://postgres.hllufzsytafdylpscgif:${DB_PASSWORD}@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres

The password should come from the environment variable DB_PASSWORD. Add the connector to my manifest and apply.
```

### What just happened

Claude Code generated a `kind: connector` YAML of subtype `sql/postgres` and wired it into your manifest. A few things worth noting:

- **The password is never in the YAML.** The connector references `${DB_PASSWORD}`, which SAM resolves from the environment at runtime. This pattern keeps credentials out of version control and is the correct pattern for all secrets in SAM.
- **The connector is now a named resource on the platform.** Your agents can be given access to it by referencing it in their toolset configuration in the next steps.
- **Least privilege starts here.** The connector exposes a SQL query interface — agents that are wired to it can only read what the database user permits. Nothing broader.

---

## Create an agent that uses the connector

With the connector live, wire up a dedicated database agent. Copy and paste the following prompt into Claude Code:

```
Create an agent called "store-data" that uses the postgres connector we just created. The agent should be a data specialist focused on querying and retrieving store data from the database. Add it to the manifest and apply.
```

### What just happened

A new agent was created with the PostgreSQL connector attached to its toolset. This agent can now issue SQL queries against the database as part of its reasoning loop — no separate integration code required. The connector is the only bridge between the agent and the database; the agent never holds credentials directly.

## Create a custom toolset

Onboarding also covers provisioning agents with custom tools — small programs the LLM can call when it cannot solve a problem with text alone. SAM's Secure Tool Runtime (STR) executes these in isolated subprocesses, so a misbehaving tool cannot affect the agent or any other running tool.

Copy and paste the following prompt into Claude Code to scaffold a Go-based toolset:

```
Using the sam cli, create a go based toolset that implements dijkstra's algorithm
```

Once the toolset is created, add it to your manifest and deploy:

```
Now update my local manifest to use this tool and deploy
```

With the new agent and toolset, interact with the agent using the following prompt: 

```
I have a weighted directed graph representing flight routes between cities.
Here is the graph:

{
  "Sydney":    {"Melbourne": 9, "Brisbane": 10, "Adelaide": 13},
  "Melbourne": {"Adelaide": 8, "Canberra": 5},
  "Brisbane":  {"Sydney": 10, "Cairns": 16},
  "Adelaide":  {"Perth": 26, "Melbourne": 8},
  "Canberra":  {"Sydney": 3},
  "Perth":     {"Adelaide": 26},
  "Cairns":    {}
}

Edge weights represent travel time in hours.

What is the shortest path (by total travel time) from Brisbane to Perth?

```

---
Working with pulled configurations: [Config Pull](./301_config_pull.md)

---

When the apply completes, the Onboarding stage is done. Your agents now have a live data connection they can query. The next stage — [Coaching](./400_Coaching.md) — is where you validate that they use it correctly before promoting to production.

