# Connector type catalog (10 types / 17 subtypes)

Field names below are for **naming and recognition** — they are real keys from the live catalog, safe to mention to the user. Full YAML shape, nesting, and validation: `sam-declarative-config` (or create one connector in the builder UI and `sam config pull` it). The builder UI form is generated from the same schema, so the UI is always current. When the user needs an exact **tool name** (e.g. for agent instructions), the wizard's Select Tools step shows it — don't guess tool names this file doesn't state.

## Availability

| Always available | Experimental (off until the operator sets the flag) |
|---|---|
| `sql`, `api`, `mcp`, `knowledge_base`, `slack` | `email` → `SAM_FEATURE_EMAIL_CONNECTOR`, `event_mesh` → `SAM_FEATURE_EVENT_MESH_CONNECTOR`, `document_db` → `SAM_FEATURE_DOCUMENT_DB_CONNECTOR`, `graph_db` → `SAM_FEATURE_GRAPH_DB_CONNECTOR`, `search` → `SAM_FEATURE_SEARCH_CONNECTOR` |

Flags are environment variables set on the **platform service**. They gate *creating new* connectors (and hide the type from lists/schemas); existing instances keep working if a flag is later turned off. The five always-available types are also the ones with full pages in the SAM docs (WebUI → Builder → Connectors).

## `sql` — postgres · mysql · mariadb · mssql · oracle

Agent gets a SQL query tool (natural language → SQL over your schema). Fields: `hostname`, `port` (defaults 5432 / 3306 / 3306 / 1433 / 1521), `database`, `username`, `password`. Oracle uses `service_name` instead of `database`. MSSQL adds `encrypt` (yes / no / strict) and `trust_server_certificate`. **The tool can run any SQL the credentials allow — use a read-only DB user scoped to the needed schemas** (the UI shows this warning; repeat it).

## `knowledge_base` — bedrock

RAG retrieval from an Amazon Bedrock Knowledge Base. Fields: `kb_id`, `region`, then `auth_type`: `access_key` (`aws_access_key_id` + `aws_secret_access_key`) or `iam` role chaining (`aws_account_id` + `role_name`, optional `session_name`, optional `external_id` for cross-account). Minimum IAM permission is `bedrock:Retrieve` on the KB. Creation runs a live connectivity probe — bad credentials or an unreachable KB block the save.

## `api` — openapi

Every operation in an OpenAPI 3.x spec becomes an agent tool (operations without an `operationId` still appear, with a generated name). Spec via `specification_url` **or** file upload; `base_url` is required and overrides the spec's `servers`. Before authoring (UI or declarative), collect: the spec source, the `base_url`, and the auth scheme + where the credential goes (header/query and its name) — the user's message rarely contains all three. Options: `custom_headers`, `allow_list` (comma-separated operation IDs). `auth_type`: `none` | `apikey` (header or query: `auth_apikey_location`, `auth_apikey_name`, `auth_apikey_value`) | `http` (basic or bearer) | `oauth` (authorization/token URLs, client id/secret, scopes). The UI can auto-detect the auth scheme from the spec.

## `mcp` — remote

Exposes a **remote** MCP server's tools to the agent — SSE or streamable HTTP only (`server_url`, `connection_type`); **there is no stdio/command subtype**. If the user's MCP server only runs locally via stdio, that is not a connector. `auth_type`: `none` | `apikey` | `http` | `oauth` (`auth_oauth_mode`: `discovery` or `manual`). Tool selection: `tool_name` (exactly one) OR `allow_list` OR `deny_list` — mutually exclusive; optional `tool_name_prefix` to avoid collisions. Power options: `manifest` (inline tool manifest overriding live discovery) and `hil` (per-tool human-in-the-loop approval gating).

**Discriminator:** user already runs an MCP server the agent should consume → this type. User wants to *expose* SAM agents to MCP clients → MCP gateway (`sam-gateways`). One-agent inline MCP wiring exists in runtime YAML, but the connector is the taught path.

## `slack` — bot

Outbound posting: a send-message tool and an update-message tool (text/Markdown, threads, attachments, Block Kit). **The channel is a tool-call parameter, not connector config** — the agent supplies a channel ID, `#channel-name`, user ID, or user email per call; tell the agent its target channel in its instructions. Single config field: `slack_bot_token` (a bot token, `xoxb-…`, needing `chat:write`; invite the bot to the channel, or grant `chat:write.public` for public channels). **Inbound** — people chatting with agents from Slack — is the Slack *gateway*. Machine-triggered notifications → this connector.

## `email` — smtp *(experimental)*

`send_email` tool. Fields: `smtp_host`, `smtp_port` (default 587), `smtp_tls` (starttls / tls / none), `smtp_auth_type` (plain / login / oauth_microsoft / oauth_google / none) with matching credential fields, a fixed `envelope_from` sender, and a **required `recipient_allowlist`** (domain list) plus rate limits and attachment-size caps — the guardrails are mandatory, not optional polish. Inbound email → email gateway.

## `event_mesh` — solace *(experimental)*

The agent sends a request to backend services over the Solace broker: request/reply (`wait_for_response: true`, with `request_expiry_ms`) or fire-and-forget. Unique among connectors: **you define the tool** — `tool_name` + `tool_description` (what the LLM sees), a `topic` template with `{{ param }}` placeholders, `payload_format` (json/yaml/text), and a `parameters` declaration. Broker connection: reuse SAM's broker or custom (`broker_url`, `broker_vpn`, `broker_username`, `broker_password`). Inbound (a mesh topic triggering an agent) → eventmesh gateway.

## `document_db` — mongodb · dynamodb *(experimental)*

MongoDB: `connection_string` (`mongodb://` or `mongodb+srv://`), optional `database`, required `collection`. DynamoDB: `region`, `table_name`, `auth_type` `access_key` or `iam` (role ARN, optional session name / external id). This — not a third-party MCP server — is the product path for "let the agent look up records in Mongo/DynamoDB".

## `graph_db` — neo4j · neptune *(experimental)*

Neo4j: bolt `connection_string` (`bolt://`, `neo4j://`, `+s` variants), `username`, `password`, optional `database`. Neptune: bolt+s cluster `connection_string`, `region`, AWS `auth_type` access_key or iam.

## `search` — elasticsearch · opensearch *(experimental)*

Elasticsearch: `connection_string` or Elastic Cloud `cloud_id`, plus `api_key`. OpenSearch (managed domain or Serverless): `connection_string`, `region`, AWS `auth_type` access_key or iam.
