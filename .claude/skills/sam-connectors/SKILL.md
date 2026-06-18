---
name: sam-connectors
description: Use when giving a Solace Agent Mesh agent access to external data or services without writing code — query a SQL database (PostgreSQL, MySQL, MariaDB, SQL Server, Oracle), retrieve from a knowledge base (Amazon Bedrock RAG), search Elasticsearch/OpenSearch, look up MongoDB/DynamoDB documents or Neo4j/Neptune graphs, call a REST API from an OpenAPI spec, use a remote MCP server's tools, send email or Slack messages, or publish to the Solace event mesh — and when creating, editing, or attaching connectors. Not for inbound integrations where users or events reach agents (sam-gateways), custom Go/Python tool code or toolsets (sam-tools-and-skills), or authoring the agent itself (sam-author-agent).
version: dev
---

# sam-connectors

This skill creates and manages SAM **connectors** — platform-managed, credentialed, reusable connections that give agents outbound access to data and services with **no code**. **Scope check:** if the outside world reaches *into* your agents (users chatting from Slack/Teams/email, MCP clients calling your agents, mesh events triggering tasks), that is a *gateway* → `sam-gateways`. Custom Go/Python tool code, toolsets, and skill bundles → `sam-tools-and-skills`. The agent's own instructions/behavior → `sam-author-agent`.

## What a connector is

A **named instance** of a connector type, holding connection config + credentials. Created once at the platform level, attached to agents **by name** (an agent can hold up to 5). Each attached connector contributes its tool(s) to the agent — a SQL query tool, RAG retrieval, one tool per OpenAPI operation, the remote MCP server's tools, send-email/send-Slack-message, or a publish-to-topic tool. **Connector is the default for reaching data and services; reach for custom code only when no type fits.**

## Picking the type

Route by what the agent should do (full field-level detail: [references/catalog.md](references/catalog.md)):

| The agent should… | Type (subtypes) | Availability |
|---|---|---|
| Query a relational database | `sql` (postgres, mysql, mariadb, mssql, oracle) | GA |
| Answer from a RAG knowledge base | `knowledge_base` (bedrock) | GA |
| Call a REST API you have an OpenAPI spec for | `api` (openapi) | GA |
| Use tools from a remote MCP server | `mcp` (remote) | GA |
| Post/update messages in Slack | `slack` (bot) | GA |
| Send email | `email` (smtp) | Experimental — feature flag |
| Send requests to backend services over the Solace mesh | `event_mesh` (solace) | Experimental — feature flag |
| Look up documents | `document_db` (mongodb, dynamodb) | Experimental — feature flag |
| Query a graph database | `graph_db` (neo4j, neptune) | Experimental — feature flag |
| Run full-text search | `search` (elasticsearch, opensearch) | Experimental — feature flag |

Experimental types are hidden until the operator sets the type's `SAM_FEATURE_<TYPE>_CONNECTOR=true` flag on the platform (exact keys in the catalog reference). Say this plainly — never present a gated type as generally available, and never deflect to a non-SAM workaround without first naming the in-product type and its flag.

## Paths, in teaching order

1. **Builder UI** (default). WebUI → **Connectors** → Create: pick type/subtype, fill the schema-driven form — a single Create page for most types (SQL, knowledge_base, …); some add a step, e.g. the **MCP** connector exposes a tool-selection step. Some types live-probe the connection on save; a failed probe blocks creation and shows why. Lead with this — it is also the source of truth for which fields exist.
2. **Declarative config** — a connector is its own resource kind, authored and applied via the **`sam-declarative-config`** skill (`sam config plan` / `apply`). **That skill is the only source of full YAML — this skill names types and field names only.** `sam config pull` exports existing connectors with secret fields rewritten as `${VAR}` placeholders; pulling one UI-created connector is the fastest schema oracle.
3. **REST API** — escape hatch for automation pipelines only.

## Attaching to agents & lifecycle

- **UI**: the agent builder's connectors picker. **Declarative**: the agent's spec lists connector *names* (not config). Creation order: connector first, then the agent that uses it.
- **Editing or deleting a connector automatically redeploys every agent attached to it** — flag this before changing a shared connector in production hours.

## Hard rules (each counters an observed failure)

- **Go product, Go patterns.** There is no `sam plugin add`, no `sam-sql-database`/`sam-mongodb` plugin, no `apps:`/`app_config:` authoring. Never present Python SAM mechanisms or YAML shapes.
- **Never write connector YAML from memory** — not even "illustrative" sketches; invented keys get copy-pasted. Builder UI, or `sam-declarative-config`, or pull an existing connector. When unsure of a key, look it up there; guessing is not allowed. **When the user wants YAML *right now*, the fast path is still compliant**: invoke `sam-declarative-config` for the exact shape, or `sam config pull` a UI-created connector. Urgency never licenses memory-YAML.
- **Secrets:** never inline in YAML or echo back in commands. A credential pasted into chat is exposed — say so once, advise rotation, and reference it only as `${VAR}` from then on.
- **"Look up data" asks → connector first, not an MCP server install.** MongoDB/Postgres/search asks are served by `document_db`/`sql`/`search` connectors, not by telling the user to bolt on a third-party MCP server. The MCP *connector* is for when the user already has a remote MCP server — and it is **remote-only** (SSE / streamable HTTP); there is no stdio-command connector.
- **Shared-credential model:** every attached agent gets identical access, and SAM cannot restrict what queries agents run — restrict at the external system (read-only DB user, scoped API key, minimal Slack scopes). See [references/credentials-and-security.md](references/credentials-and-security.md).
- **Outbound vs inbound:** "agent posts to Slack / sends email / publishes to the mesh" = connector (here). "People or events reach the agent from Slack / email / the mesh" = gateway (`sam-gateways`). State which one you picked and why.

## References

| Topic | File |
|---|---|
| Full type catalog — subtypes, fields, tools exposed, auth options, flags, gotchas | [references/catalog.md](references/catalog.md) |
| Credentials, secrets hygiene, shared-access model, probes, RBAC | [references/credentials-and-security.md](references/credentials-and-security.md) |
