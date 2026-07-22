# Connector type catalog (10 types / 17 subtypes)

Field names below are for **naming and recognition** — they are real keys from the live catalog, safe to mention to the user. Full YAML shape, nesting, and validation: `sam-declarative-config` (or create one connector in the builder UI and `sam config pull` it). The builder UI form is generated from the same schema, so the UI is always current. When the user needs an exact **tool name** (e.g. for agent instructions), the wizard's Select Tools step shows it — don't guess tool names this file doesn't state.

## Availability

| Available by default | Off until enabled |
|---|---|
| `sql`, `api`, `mcp`, `knowledge_base`, `slack` (GA, no flag); `event_mesh` (GA, `SAM_FEATURE_EVENT_MESH_CONNECTOR`); `document_db` (`SAM_FEATURE_DOCUMENT_DB_CONNECTOR`), `graph_db` (`SAM_FEATURE_GRAPH_DB_CONNECTOR`), `search` (`SAM_FEATURE_SEARCH_CONNECTOR`) — these last three on-by-default but still experimental | `email` → `SAM_FEATURE_EMAIL_CONNECTOR` (the only off-by-default type) |

Flags are environment variables set on the **platform service**. `email` is off until its flag is set to `true`. The four flagged-but-on types (`event_mesh`, `document_db`, `graph_db`, `search`) are **kill-switches**: set `SAM_FEATURE_<TYPE>_CONNECTOR=false` to hide the type and block new instances; existing instances keep working when a type is later disabled. The five no-flag types (`sql`, `api`, `mcp`, `knowledge_base`, `slack`) are the ones with full pages in the SAM docs (WebUI → Builder → Connectors).

## `sql` — postgres · mysql · mariadb · mssql · oracle

Agent gets a SQL query tool (natural language → SQL over your schema). Fields: `hostname`, `port` (defaults 5432 / 3306 / 3306 / 1433 / 1521), `database`, `username`, `password`. Oracle uses `service_name` instead of `database`. MSSQL adds `encrypt` (yes / no / strict) and `trust_server_certificate`. **The tool can run any SQL the credentials allow — use a read-only DB user scoped to the needed schemas** (the UI shows this warning; repeat it).

## `knowledge_base` — bedrock

RAG retrieval from an Amazon Bedrock Knowledge Base. Fields: `kb_id`, `region`, then `auth_type`: `access_key` (`aws_access_key_id` + `aws_secret_access_key`) or `iam` role chaining (`aws_account_id` + `role_name`, optional `session_name`, optional `external_id` for cross-account). Minimum IAM permission is `bedrock:Retrieve` on the KB. Creation runs a live connectivity probe — bad credentials or an unreachable KB block the save.

## `api` — openapi

Every operation in an OpenAPI 3.x spec becomes an agent tool (operations without an `operationId` still appear, with a generated name). Spec via `specification_url` **or** file upload; `base_url` is required and overrides the spec's `servers`. Before authoring (UI or declarative), collect: the spec source, the `base_url`, and the auth scheme + where the credential goes (header/query and its name) — the user's message rarely contains all three. Options: `custom_headers`, `allow_list` (comma-separated operation IDs). `auth_type`: `none` | `apikey` (header or query: `auth_apikey_location`, `auth_apikey_name`, `auth_apikey_value`) | `http` (basic or bearer) | `oauth` (authorization/token URLs, client id/secret, scopes). The UI can auto-detect the auth scheme from the spec.

## `mcp` — remote

Exposes a **remote** MCP server's tools to the agent — SSE or streamable HTTP only (`server_url`, `connection_type`); **there is no stdio/command subtype**. If the user's MCP server only runs locally via stdio, that is not a connector. `auth_type`: `none` | `apikey` | `http` | `oauth` (`auth_oauth_mode`: `discovery` or `manual`). Tool selection: `tool_name` (exactly one) OR `allow_list` OR `deny_list` — mutually exclusive; optional `tool_name_prefix` to avoid collisions. Power options: `manifest` (inline tool manifest overriding live discovery) and `hil` (per-tool human-in-the-loop approval gating).

**Discriminator:** user already runs an MCP server the agent should consume → this type. User wants to *expose* SAM agents to MCP clients → MCP entrypoint (`sam-entrypoints`). One-agent inline MCP wiring exists in runtime YAML, but the connector is the taught path.

## `slack` — bot

Outbound posting: a send-message tool and an update-message tool (text/Markdown, threads, attachments, Block Kit). **The channel is a tool-call parameter, not connector config** — the agent supplies a channel ID, `#channel-name`, user ID, or user email per call; tell the agent its target channel in its instructions. Single config field: `slack_bot_token` (a bot token, `xoxb-…`; the schema recommends `chat:write`, `files:write`, `users:read`, `users:read.email`; invite the bot to the channel, or grant `chat:write.public` to post to public channels without joining). **Inbound** — people chatting with agents from Slack — is the Slack *entrypoint*. Machine-triggered notifications → this connector.

## `email` — smtp *(experimental)*

`send_email` tool. Fields: `smtp_host`, `smtp_port` (default 587), `smtp_tls` (starttls / tls / none), `smtp_auth_type` (plain / login / oauth_microsoft / oauth_google / none) with matching credential fields, a fixed `envelope_from` sender, and a **required `recipient_allowlist`** (domain list) plus rate limits and attachment-size caps — the guardrails are mandatory, not optional polish. Inbound email → email entrypoint.

## `event_mesh` — solace

The agent sends requests to backend services over a Solace broker. The broker connection is **required and custom** — all four of `broker_url`, `broker_vpn`, `broker_username`, `broker_password` (credentials are never inherited from the Agent Mesh broker). Unique among connectors: **you define the tools** — an `operations` array where each operation becomes one agent tool with `tool_name` + `tool_description` (what the LLM sees), a `topic` template with `{property_name}` placeholders (legacy `{{ param }}` still parses), `payload_format` (json/yaml/text), request/reply (`wait_for_response: true`, `request_expiry_ms`) or fire-and-forget, and an `input_schema` (JSON Schema) parameter declaration. Inbound (a mesh topic triggering an agent) → eventmesh entrypoint.

## `document_db` — mongodb · dynamodb *(experimental)*

MongoDB: `scheme` (`mongodb` / `mongodb+srv`), `hostname`, `port` (default 27017; ignored for `mongodb+srv`), `username`, `password`, optional `database`, required `collection`, optional `options`. DynamoDB: `region`, `table_name`, `auth_type` `access_key` or `iam` (`role_arn`, optional `session_name` / `external_id`). This — not a third-party MCP server — is the product path for "let the agent look up records in Mongo/DynamoDB".

## `graph_db` — neo4j · neptune *(experimental)*

Neo4j: `scheme` (`neo4j` / `neo4j+s` / `bolt` / `bolt+s`), `hostname`, `port`, `username`, `password`, optional `database`. Neptune: `scheme`, `hostname`, `port`, `region`, AWS `auth_type` access_key or iam (`role_arn`).

## `search` — elasticsearch · opensearch *(experimental)*

Elasticsearch: `scheme`, `hostname`, `port` (or Elastic Cloud `cloud_id`), plus `api_key` (or `username` / `password`). OpenSearch (managed domain or Serverless): `scheme`, `hostname`, `port`, `region`, AWS `auth_type` access_key or iam.
