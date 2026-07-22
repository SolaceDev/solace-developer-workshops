# Kind: `connector`

Manifest path: `resources.connectors`

A connector is a credentialled binding to an external system
(databases, MCP servers, message brokers). The `type` and `subtype`
fields together select the connector schema; the `values` field
carries the per-type configuration (often including secret-shaped
fields, which `sam config pull` rewrites as `${VAR}` placeholders).
Unlike skills, connectors are referenced from agents by name only —
there is no per-agent override of connector values.

Workflow `type: tool` nodes also reference connectors by name: the
node's `connector:` field names the connector, and `tool:` selects
one of a multi-tool connector's tools by un-suffixed base name
(optional when the connector produces exactly one). The platform
resolves the reference to a concrete `tool_name` at deploy time, and
connector edits or renames auto-redeploy bound workflows. See the
workflow kind reference for the node shape.

### Human-in-the-loop (HIL) on MCP tools

MCP connectors expose many tools from one binding, so HIL is authored
as a sub-map keyed by the tool name the MCP server advertises:

```yaml
spec:
  type: mcp
  values:
    server_url: "https://mcp.atlassian.com/v1/mcp"
    hil:
      tools:
        deleteJiraIssue:
          require_approval: true
          approval_message: "About to delete {{.issueKey}}. Confirm?"
          timeout: "30m"
        transitionJiraIssue:
          require_approval: true
        atlassian_rest_request:
          require_approval_when:
            - arg: method
              in: [POST, PUT, PATCH, DELETE]
          approval_message: "{{.method}} {{.path}}"
```

The keys must exactly match the MCP server's `tools/list` names — not
the prefixed names that surface after `tool_name_prefix:`. For
OAuth-gated MCP servers shipping a static `manifest:`, match the
`name:` field on each manifest entry.

`require_approval_when:` gates conditionally on the LLM-supplied arg
values rather than all-or-nothing. Useful for MCP tools that expose
multiple HTTP verbs (writes vs reads) under one tool name. A call is
gated when `require_approval` is true OR any rule matches; operators are
`eq`, `in`, `not_in`, `exists`, `not_exists`, `gt`, `lt`, `gte`, `lte`,
and `arg:` accepts dotted paths into nested maps. Missing args and type
mismatches fail open. See *Conditional gating* in
`references/design/agent-design.md` for the full operator semantics.

HIL is **not MCP-specific**. The feature works on every tool type,
including `builtin` and `sam_remote`, where each YAML entry registers
one tool and `hil:` sits directly on the entry. For the full feature
reference (fields, `{{.argName}}` template syntax, design guidance),
see `references/design/agent-design.md` → *Human-in-the-Loop (HIL)*.

### OpenAPI spec files (`api`/`openapi`)

An `api`/`openapi` connector's tool surface comes from an OpenAPI spec,
supplied one of two ways (mutually exclusive):

- `specification_url` — an external URL the deployed agent fetches live
  at startup. Requires the cluster to have egress to that URL.
- `specification_file` — a local spec file vendored in the repo that
  `sam config apply` uploads as the connector's resource. The agent
  loads it from in-cluster object storage, so it works in deployments
  with no external egress. The path resolves relative to the connector's
  YAML file; the convention is a `connectors/<name>.openapi.(yaml|json)`
  sidecar:

```yaml
kind: connector
name: figma
spec:
  type: api
  subtype: openapi
  values:
    specification_file: figma.openapi.yaml
    base_url: "https://api.figma.com"
    allow_list: "getFile, getComments"
```

Uploads are hash-diffed: an unchanged spec file is a no-op (no
re-upload, no agent redeploy); a changed file shows in `sam config
plan` as `update (spec <old> → <new>)`. `sam config pull` round-trips a
spec that was uploaded through the UI wizard by writing the sidecar
file and referencing it via `specification_file`.


## Wrapper schema

Authoring fields for the "connector" resource.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `name` | `string` | yes | len 3–255 | (no description) |
| `description` | `string` | yes | len 10–1000 | (no description) |
| `type` | `string` | yes | max 50 | (no description) |
| `subtype` | `string` | yes | max 50 | (no description) |
| `values` | `object` | yes |  | (no description) |

## Per-(type, subtype) detail

Each connector type carries one or more subtypes. Find the `## type:` matching the `type:` field your connector uses, then drill into the right `### subtype:`.

## type: api

### subtype: openapi

**OpenAPI**

Connect to REST APIs via OpenAPI specification

**Usage guidance**

Use the OpenAPI connector when the user wants to connect an agent to a
REST API that has an OpenAPI (Swagger) specification. The spec URL points
to the API's OpenAPI JSON or YAML definition. The connector will parse
the spec and expose the API's endpoints as tools.

If the user provides the spec URL, you can use the ParseOpenAPISpec tool
to detect what authentication the API requires. This helps you set the
correct auth_type and fill in what you can.

Authentication options:
- none: Public API, no auth needed
- apikey: API key sent in a header or query parameter
- http: HTTP auth (basic username/password or bearer token)
- oauth: OAuth2 flow

Always use <<__SAM_REQUIRED__>> for secret fields since these should
never appear in artifacts.

> ⚠ All agents using this connector will have the same API access. Ensure the API has minimal necessary permissions.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `file_s3_key` | `string (secret)` |  |  | secret | (no description) |
| `specification_file` | `string` |  |  |  | Declarative-config only: path to a local OpenAPI spec file that `sam config apply` uploads as the connector resource. Mutually exclusive with specification_url. |
| `specification_url` | `string` |  |  |  | URL to your OpenAPI specification (leave empty if uploading file) |
| `base_url` | `string` | yes |  | len 11–2048; matches regex | Base URL for the API server |
| `auth_type` | `select` | yes | `none` | one of: none, apikey, http, oauth | (no description) |
| `auth_apikey_location` | `select` | yes | `header` | one of: header, query | Where to include the API key (header or query parameter) |
| `auth_http_scheme` | `select` | yes | `basic` | one of: basic, bearer | Select the HTTP Authorization header scheme to use |
| `auth_apikey_name` | `string` | yes |  | len 1–200; matches regex | Name of the header or query parameter |
| `auth_http_basic_username` | `string` | yes |  | len 1–320 | Username for Basic Authentication |
| `auth_http_bearer_token` | `password (secret)` | yes |  | len 10–8192; secret | The bearer token (JWT, OAuth2 access token, API token, etc.). Leave placeholder to keep existing value. After saving, this will no longer be displayed. |
| `auth_oauth_authorization_url` | `string` | yes |  | len 11–2048; matches regex | The OAuth authorization endpoint where users grant permission |
| `auth_apikey_value` | `password (secret)` | yes |  | len 8–2048; secret | The actual API key value. Leave placeholder to keep existing value. After saving, this value will no longer be displayed. |
| `auth_http_basic_password` | `password (secret)` | yes |  | len 4–1024; secret | Password for Basic Authentication. Leave placeholder to keep existing value. After saving, this will no longer be displayed. |
| `auth_oauth_token_url` | `string` | yes |  | len 11–2048; matches regex | The OAuth token endpoint where codes are exchanged for access tokens |
| `auth_oauth_refresh_url` | `string` |  |  | len 11–2048; matches regex | The OAuth refresh endpoint. If not specified, will use the token URL. |
| `auth_oauth_client_id` | `string` | yes |  | len 1–512 | The OAuth client ID for your application |
| `auth_oauth_client_secret` | `password (secret)` |  |  | len 4–1024; secret | The OAuth client secret. Leave empty for PKCE-only flows. Leave placeholder to keep existing value. After saving, this will no longer be displayed. |
| `auth_oauth_scopes` | `string` |  |  | max len 2048 | Space-separated OAuth scopes for API access (e.g., `openid email read:api`) |
| `auth_oauth_token_endpoint_auth_method` | `select` |  | `client_secret_basic` | one of: client_secret_basic, client_secret_post, none | How to authenticate at the token endpoint |
| `custom_headers` | `key_value` |  |  |  | Optional HTTP headers sent with every request (e.g. X-Tenant-ID, routing headers) |
| `allow_list` | `text` |  |  |  | Only include these operations. Enter comma-separated operation IDs. Leave empty to allow all operations. |

#### Example

```yaml
kind: connector
name: example_api_openapi
description: "Example api/openapi connector. Replace with a real description (10+ chars)."
spec:
  type: api
  subtype: openapi
  values:
    file_s3_key: ${EXAMPLE_API_OPENAPI_FILE_S3_KEY}  # secret — provide via env var
    # optional: specification_file: "..."
    # optional: specification_url: "http://localhost:8002/openapi.json or upload file"
    base_url: "xxxxxxxxxxx"
    auth_type: "none"
    auth_apikey_location: "header"
    auth_http_scheme: "basic"
    auth_apikey_name: "x"
    auth_http_basic_username: "x"
    auth_http_bearer_token: ${EXAMPLE_API_OPENAPI_AUTH_HTTP_BEARER_TOKEN}  # secret — provide via env var
    auth_oauth_authorization_url: "xxxxxxxxxxx"
    auth_apikey_value: ${EXAMPLE_API_OPENAPI_AUTH_APIKEY_VALUE}  # secret — provide via env var
    auth_http_basic_password: ${EXAMPLE_API_OPENAPI_AUTH_HTTP_BASIC_PASSWORD}  # secret — provide via env var
    auth_oauth_token_url: "xxxxxxxxxxx"
    # optional: auth_oauth_refresh_url: "xxxxxxxxxxx"
    auth_oauth_client_id: "x"
    auth_oauth_client_secret: ${EXAMPLE_API_OPENAPI_AUTH_OAUTH_CLIENT_SECRET}  # secret — provide via env var
    # optional: auth_oauth_scopes: "..."
    # optional: auth_oauth_token_endpoint_auth_method: "client_secret_basic"
    # optional: custom_headers: null  # TODO: provide a value of type key_value
    # optional: allow_list: null  # TODO: provide a value of type text
```

## type: document_db

### subtype: dynamodb

**DynamoDB**

Connect to an Amazon DynamoDB table

**Usage guidance**

Use the DynamoDB connector when the user wants an agent to query an
Amazon DynamoDB table. Each connector targets a single table.
Authentication supports either AWS Access Keys or IAM Role Chaining
(only available when SAM is deployed on AWS). For Role Chaining,
provide the role ARN to assume.

Always use <<__SAM_REQUIRED__>> for the access key, secret key, and
external ID fields since these are AWS credentials that should never
appear in artifacts.

> ⚠ Agents using this connector run queries with the configured AWS credentials. Use a least-privilege IAM role or user scoped to specific tables. Agent Mesh cannot restrict what queries agents execute—access control must be configured at the AWS IAM level.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `region` | `string` | yes | `us-east-1` | len 1–50; matches regex | AWS region where the DynamoDB table lives. |
| `table_name` | `string` | yes |  | len 3–255; matches regex | DynamoDB table this connector will query. |
| `auth_type` | `select` | yes | `access_key` | one of: access_key, iam | Authentication method for connecting to DynamoDB. AWS IAM Role Chaining is only supported when SAM runs on AWS. |
| `aws_access_key_id` | `password (secret)` | yes |  | len 16–128; secret | (no description) |
| `aws_secret_access_key` | `password (secret)` | yes |  | len 30–255; secret | (no description) |
| `role_arn` | `string` | yes |  | len 20–2048; matches regex | ARN of the IAM role with permissions to query the DynamoDB table. |
| `session_name` | `string` |  |  | len 2–64 | Session name for auditing the assumed role in AWS CloudTrail logs. Defaults to 'solace-document-db-session'. |
| `external_id` | `password (secret)` |  |  | len 2–1224; secret | Optional security token for cross-account access. Required if configured in the IAM role's trust policy. |

#### Example

```yaml
kind: connector
name: example_document_db_dynamodb
description: "Example document_db/dynamodb connector. Replace with a real description (10+ chars)."
spec:
  type: document_db
  subtype: dynamodb
  values:
    region: "us-east-1"
    table_name: "xxx"
    auth_type: "access_key"
    aws_access_key_id: ${EXAMPLE_DOCUMENT_DB_DYNAMODB_AWS_ACCESS_KEY_ID}  # secret — provide via env var
    aws_secret_access_key: ${EXAMPLE_DOCUMENT_DB_DYNAMODB_AWS_SECRET_ACCESS_KEY}  # secret — provide via env var
    role_arn: "arn:aws:iam::123456789012:role/SolaceDynamoDBAccess"
    # optional: session_name: "solace-dynamodb-session"
    external_id: ${EXAMPLE_DOCUMENT_DB_DYNAMODB_EXTERNAL_ID}  # secret — provide via env var
```

### subtype: mongodb

**MongoDB**

Connect to a MongoDB database

**Usage guidance**

Use the MongoDB connector when the user wants to query or interact with
a MongoDB database via aggregation pipelines. The connector exposes one
collection per connector—create separate connectors for additional
collections. The user provides the host, optional credentials, a database
name, and a collection name. Choose the mongodb+srv scheme for DNS
seedlist clusters (e.g. MongoDB Atlas), which ignores the port. For the
builder, use <<__SAM_REQUIRED__>> for the password.

> ⚠ All agents using this connector will have the same database access. Agent Mesh cannot restrict what queries agents execute—access control must be configured at the database level. For security, use credentials with minimal necessary permissions (e.g., read-only, scoped to a single database/collection).

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `scheme` | `select` |  | `mongodb` | one of: mongodb, mongodb+srv | Use mongodb+srv for DNS seedlist clusters (e.g. MongoDB Atlas), which resolve hosts via SRV records and ignore the port. |
| `hostname` | `string` | yes |  | len 1–255; matches regex | MongoDB host or cluster address (without scheme or port). |
| `port` | `number` |  | `27017` | range 1–65535 | Ignored for the mongodb+srv scheme. Defaults to 27017. |
| `username` | `string` |  |  | max len 255 | Optional. Leave blank for unauthenticated access. |
| `password` | `password (secret)` |  |  | secret | Leave the placeholder to keep the existing value. After saving, this value is no longer displayed. |
| `database` | `string` |  |  | max len 255; matches regex | Authentication database and default database. Often required when a username is set (e.g. admin). |
| `collection` | `string` | yes |  | len 1–255; matches regex | MongoDB collection this connector will query. |
| `options` | `string` |  |  | max len 2048; matches regex | Optional URI query options, without the leading '?'. Examples: retryWrites=true, authSource=admin, tls=true. |

#### Example

```yaml
kind: connector
name: example_document_db_mongodb
description: "Example document_db/mongodb connector. Replace with a real description (10+ chars)."
spec:
  type: document_db
  subtype: mongodb
  values:
    # optional: scheme: "mongodb"
    hostname: "cluster0.abcd.mongodb.net"
    # optional: port: 27017
    # optional: username: "..."
    password: ${EXAMPLE_DOCUMENT_DB_MONGODB_PASSWORD}  # secret — provide via env var
    # optional: database: "..."
    collection: "x"
    # optional: options: "retryWrites=true&w=majority"
```

## type: email

### subtype: smtp

**SMTP Email**

Send emails via SMTP server

**Usage guidance**

Use the SMTP Email connector when the user wants an agent to send outbound
emails. The connector provides a send_email tool that agents can use to
compose and send emails with optional HTML bodies and attachments.

The user must provide the SMTP server host, port, and authentication
credentials. TLS should be enabled for security (STARTTLS or implicit TLS).

Authentication options:
- PLAIN/LOGIN: Traditional username/password authentication
- OAuth 2.0: Modern authentication for Microsoft 365 and Google Workspace
  - Microsoft 365: Use Azure AD app registration with SMTP.Send permission
  - Google: Use Google Cloud OAuth with Gmail API scope

IMPORTANT: The connector enforces a recipient allowlist — agents can only
send to approved domains. The envelope_from address is fixed and cannot be
changed by agents.

For passwords and credentials not provided, use <<__SAM_REQUIRED__>> as
the placeholder value.

> ⚠ The send_email tool allows agents to send emails externally. Configure the recipient allowlist carefully to prevent unauthorized outbound communication. All sent emails are logged for audit purposes.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `smtp_host` | `string` | yes |  | len 1–255; matches regex | SMTP server hostname (e.g., smtp.office365.com for Microsoft, smtp.gmail.com for Google) |
| `smtp_port` | `number` |  | `587` | range 1–65535 | SMTP port (587 for STARTTLS, 465 for implicit TLS, 25 for plain) |
| `smtp_tls` | `select` | yes | `starttls` | one of: starttls, tls, none | TLS encryption mode for SMTP connection |
| `smtp_auth_type` | `select` | yes | `plain` | one of: plain, login, oauth_microsoft, oauth_google, none | SMTP authentication method |
| `oauth_google_client_id` | `string` | yes |  | len 10–256 | OAuth 2.0 Client ID from Google Cloud Console. |
| `oauth_microsoft_tenant_id` | `string` | yes |  | len 36–36; matches regex | Your Azure AD tenant ID (directory ID). Found in Azure Portal > Azure Active Directory > Overview. |
| `smtp_username` | `string` | yes |  | len 1–320 | Username for SMTP authentication (usually your email address) |
| `smtp_username_login` | `string` | yes |  | len 1–320 | Username for SMTP authentication (usually your email address) |
| `oauth_google_client_secret` | `password (secret)` | yes |  | len 1–256; secret | OAuth 2.0 Client Secret from Google Cloud Console. Leave placeholder to keep existing value. |
| `oauth_microsoft_client_id` | `string` | yes |  | len 36–36; matches regex | Application (client) ID from your Azure AD app registration. |
| `smtp_password` | `password (secret)` | yes |  | len 1–1024; secret | Password or App Password for SMTP authentication. Leave placeholder to keep existing value. |
| `smtp_password_login` | `password (secret)` | yes |  | len 1–1024; secret | Password or App Password for SMTP authentication. Leave placeholder to keep existing value. |
| `oauth_google_refresh_token` | `password (secret)` | yes |  | len 1–1024; secret | OAuth 2.0 Refresh Token obtained through authorization flow. Leave placeholder to keep existing value. |
| `oauth_microsoft_client_secret` | `password (secret)` | yes |  | len 1–1024; secret | Client secret from your Azure AD app registration. Leave placeholder to keep existing value. |
| `oauth_google_email` | `string` | yes |  | len 5–320; matches regex | The Gmail address to send from. |
| `oauth_microsoft_email` | `string` | yes |  | len 5–320; matches regex | The email address to send from (must have SMTP.Send permission in Azure AD). |
| `envelope_from` | `string` | yes |  | len 5–320; matches regex | Fixed sender address for all emails. Agents cannot override this. For OAuth, this should match the authenticated email. |
| `envelope_from_login` | `string` | yes |  | len 5–320; matches regex | Fixed sender address for all emails. Agents cannot override this. |
| `envelope_from_none` | `string` | yes |  | len 5–320; matches regex | Fixed sender address for all emails. Agents cannot override this. |
| `recipient_allowlist` | `textarea` | yes |  | len 1–4096 | List of allowed recipient domains, one per line. Agents can only send to these domains. |
| `rate_limit_per_minute` | `number` |  | `60` | range 0–10000 | Maximum emails per minute (0 = unlimited) |
| `rate_limit_per_hour` | `number` |  | `500` | range 0–100000 | Maximum emails per hour (0 = unlimited) |
| `max_attachment_size_mb` | `number` |  | `10` | range 1–100 | Maximum size for a single attachment in megabytes |
| `max_total_attachment_size_mb` | `number` |  | `25` | range 1–100 | Maximum total size for all attachments in megabytes |

#### Example

```yaml
kind: connector
name: example_email_smtp
description: "Example email/smtp connector. Replace with a real description (10+ chars)."
spec:
  type: email
  subtype: smtp
  values:
    smtp_host: "x"
    # optional: smtp_port: 587
    smtp_tls: "starttls"
    smtp_auth_type: "plain"
    oauth_google_client_id: "xxxxxxxxxx"
    oauth_microsoft_tenant_id: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    smtp_username: "x"
    smtp_username_login: "x"
    oauth_google_client_secret: ${EXAMPLE_EMAIL_SMTP_OAUTH_GOOGLE_CLIENT_SECRET}  # secret — provide via env var
    oauth_microsoft_client_id: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    smtp_password: ${EXAMPLE_EMAIL_SMTP_SMTP_PASSWORD}  # secret — provide via env var
    smtp_password_login: ${EXAMPLE_EMAIL_SMTP_SMTP_PASSWORD_LOGIN}  # secret — provide via env var
    oauth_google_refresh_token: ${EXAMPLE_EMAIL_SMTP_OAUTH_GOOGLE_REFRESH_TOKEN}  # secret — provide via env var
    oauth_microsoft_client_secret: ${EXAMPLE_EMAIL_SMTP_OAUTH_MICROSOFT_CLIENT_SECRET}  # secret — provide via env var
    oauth_google_email: "xxxxx"
    oauth_microsoft_email: "xxxxx"
    envelope_from: "xxxxx"
    envelope_from_login: "xxxxx"
    envelope_from_none: "xxxxx"
    recipient_allowlist: "example.com\npartner.example.com"
    # optional: rate_limit_per_minute: 60
    # optional: rate_limit_per_hour: 500
    # optional: max_attachment_size_mb: 10
    # optional: max_total_attachment_size_mb: 25
```

## type: event_mesh

### subtype: solace

**Solace Event Mesh**

Connect agents to event-driven services through a Solace event broker

**Usage guidance**

Use the Event Mesh connector when agents need to interact with backend
microservices through Solace's event mesh. Supports Request-Reply and
Publish-Subscribe messaging patterns.

Each operation uses a standard JSON Schema object for its agent-facing
inputs. Its topic address can include {property_name} dynamic levels.
Add x-solace-payload-path to map a property into a nested payload and
x-solace-context-expression to source a value from runtime context.

Example input schema:
{"type":"object","properties":{"order_id":{"type":"string","description":"Order ID","x-solace-payload-path":"order.id"}},"required":["order_id"]}

When importing from Event Portal, treat the event's payload schema as a
starting point rather than the final tool input:
- Remove broker-generated envelope fields such as eventId and eventTimestamp.
- Add properties used only by the topic address, such as store_id or
  warehouse_id, and leave their payload path empty (topic-only).
- Set a payload path for every property that belongs in the message body.
- Review required fields, descriptions, enums, and defaults for agent use.
- Remove fields the agent should not provide, or source them from runtime
  context with x-solace-context-expression.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `broker_url` | `string` | yes |  | len 1–512 | Secured SMF URI (Public Endpoint) |
| `broker_vpn` | `string` | yes |  | len 1–128 | (no description) |
| `broker_username` | `string` | yes |  | len 1–128 | (no description) |
| `broker_password` | `password (secret)` | yes |  | len 1–1024; secret | (no description) |
| `operations` | `operations` | yes |  |  | One or more agent tools that share this event broker connection. |

**Inner schema for `operations` (`operations`)**:

One or more agent tools that share this event broker connection. Each operation maps a tool's JSON Schema inputs onto a Solace topic and message payload.

Each entry is an object with:

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `tool_name` | `string` | yes |  |  | Agent-facing tool name. Lowercase, digits, underscores; must start with a letter. |
| `tool_description` | `string` | yes |  |  | What the tool does and when the agent should call it (min 10 chars). |
| `topic` | `string` | yes |  |  | Solace topic to publish to. Use {property_name} for dynamic levels sourced from input_schema. |
| `wait_for_response` | `bool` | yes |  |  | true for Request-Reply (await a correlated reply); false for fire-and-forget Publish-Subscribe. |
| `payload_format` | `string` | yes |  |  | One of: json, yaml, text. |
| `input_schema` | `object` | yes |  |  | JSON Schema object. Add x-solace-payload-path to map a property into the payload; x-solace-context-expression to source it from runtime context. |
| `qos` | `number` |  |  |  | 0 (direct) or 1 (guaranteed). Defaults to 1. |
| `request_expiry_ms` | `number` |  |  |  | [advanced] Reply timeout for Request-Reply, 1000-300000. Ignored when wait_for_response is false. |
| `reply_mode` | `string` |  |  |  | [advanced] Request-Reply only: temp_queue or p2p_inbox. |


#### Example

```yaml
kind: connector
name: example_event_mesh_solace
description: "Example event_mesh/solace connector. Replace with a real description (10+ chars)."
spec:
  type: event_mesh
  subtype: solace
  values:
    broker_url: "tcps://broker.example.com:55443"
    broker_vpn: "x"
    broker_username: "x"
    broker_password: ${EXAMPLE_EVENT_MESH_SOLACE_BROKER_PASSWORD}  # secret — provide via env var
    operations:
      - tool_name: create_replenishment_command
        tool_description: "Create a replenishment command for a store SKU. Use when stock is critically low or a stockout is predicted."
        topic: "retail/ca/store/{store_id}/replenishment/command/requested/v1"
        wait_for_response: false
        payload_format: json
        qos: 1
        input_schema:
          type: object
          required: [store_id, sourceSystem, sku, quantity, priority]
          properties:
            store_id:
              type: string
              description: Store identifier (dynamic topic level, not part of the payload)
            sourceSystem:
              type: string
              description: System or process that originated this event
              x-solace-payload-path: sourceSystem
            sku:
              type: string
              description: Product SKU to replenish
              x-solace-payload-path: sku
            quantity:
              type: integer
              minimum: 1
              description: Requested replenishment quantity
              x-solace-payload-path: quantity
            priority:
              type: string
              enum: [HIGH, MEDIUM, LOW]
              description: Urgency level
              x-solace-payload-path: priority
            freeText:
              type: string
              description: Additional context for the fulfillment team
              x-solace-payload-path: freeText
            correlationId:
              type: string
              description: Links related events across the same operational cycle
              x-solace-payload-path: correlationId
      - tool_name: get_store_inventory
        tool_description: "Look up the current on-hand inventory for a SKU at a store before deciding whether replenishment is needed."
        topic: "retail/ca/store/{store_id}/inventory/query/request/v1"
        wait_for_response: true
        request_expiry_ms: 30000
        reply_mode: temp_queue
        qos: 1
        payload_format: json
        input_schema:
          type: object
          required: [store_id, sku]
          properties:
            store_id:
              type: string
              description: Store identifier (dynamic topic level, not part of the payload)
            sku:
              type: string
              description: Product SKU to query
              x-solace-payload-path: sku
```

## type: graph_db

### subtype: neo4j

**Neo4j**

Connect to a Neo4j graph database

**Usage guidance**

Use the Neo4j connector when the user wants an agent to query a Neo4j
graph database with Cypher. The user provides the host, a scheme
(bolt / bolt+s / neo4j / neo4j+s), username, password, and optionally a
database name (defaults to "neo4j"). For the builder, use
<<__SAM_REQUIRED__>> for the password.

> ⚠ All agents using this connector will have the same database access. Agent Mesh cannot restrict what queries agents execute—access control must be configured at the database level. For security, use credentials with minimal necessary permissions.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `scheme` | `select` |  | `neo4j` | one of: neo4j, neo4j+s, bolt, bolt+s | bolt / bolt+s connect to a single instance; neo4j / neo4j+s route across a cluster. The +s variants use TLS. |
| `hostname` | `string` | yes |  | len 1–255; matches regex | Neo4j host or IP address (without scheme or port). |
| `port` | `number` |  | `7687` | range 1–65535 | Bolt port. Defaults to 7687. |
| `username` | `string` | yes |  | len 1–255 | (no description) |
| `password` | `password (secret)` | yes |  | secret | Leave placeholder to keep existing value. After saving, this value will no longer be displayed. |
| `database` | `string` |  | `neo4j` | max len 255; matches regex | Defaults to 'neo4j' when not specified. |

#### Example

```yaml
kind: connector
name: example_graph_db_neo4j
description: "Example graph_db/neo4j connector. Replace with a real description (10+ chars)."
spec:
  type: graph_db
  subtype: neo4j
  values:
    # optional: scheme: "neo4j"
    hostname: "my-neo4j.example.com"
    # optional: port: 7687
    username: "x"
    password: ${EXAMPLE_GRAPH_DB_NEO4J_PASSWORD}  # secret — provide via env var
    # optional: database: "neo4j"
```

### subtype: neptune

**Amazon Neptune**

Connect to an Amazon Neptune graph database

**Usage guidance**

Use the Neptune connector when the user wants an agent to query an
Amazon Neptune graph database with openCypher. Provide the cluster
endpoint (typically ending in .neptune.amazonaws.com), AWS region,
and either AWS Access Keys or an IAM Role to assume.

Always use <<__SAM_REQUIRED__>> for the access key, secret key, and
external ID fields since these are AWS credentials that should never
appear in artifacts.

> ⚠ Agents using this connector run queries with the configured AWS credentials. Use a least-privilege IAM role or user scoped to specific clusters.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `scheme` | `select` |  | `bolt+s` | one of: bolt+s, neo4j+s, bolt, neo4j | Neptune requires TLS; bolt+s is standard. neo4j+s enables routing. |
| `hostname` | `string` | yes |  | len 1–255; matches regex | Neptune cluster endpoint host (without scheme or port). Neptune authenticates via the AWS credentials configured below. |
| `port` | `number` |  | `8182` | range 1–65535 | Neptune port. Defaults to 8182. |
| `database` | `string` |  |  | max len 255; matches regex | Optional. Most Neptune clusters do not require a database name. |
| `region` | `string` | yes | `us-east-1` | len 1–50; matches regex | (no description) |
| `auth_type` | `select` | yes | `access_key` | one of: access_key, iam | Authentication method for connecting to Neptune. AWS IAM Role Chaining is only supported when SAM runs on AWS. |
| `aws_access_key_id` | `password (secret)` | yes |  | len 16–128; secret | (no description) |
| `aws_secret_access_key` | `password (secret)` | yes |  | len 30–255; secret | (no description) |
| `role_arn` | `string` | yes |  | len 20–2048; matches regex | ARN of the IAM role with permissions to query the Neptune cluster. |
| `session_name` | `string` |  |  | len 2–64 | Session name for auditing the assumed role in AWS CloudTrail logs. Defaults to 'solace-neptune-session'. |
| `external_id` | `password (secret)` |  |  | len 2–1224; secret | Optional security token for cross-account access. Required if configured in the IAM role's trust policy. |

#### Example

```yaml
kind: connector
name: example_graph_db_neptune
description: "Example graph_db/neptune connector. Replace with a real description (10+ chars)."
spec:
  type: graph_db
  subtype: neptune
  values:
    # optional: scheme: "bolt+s"
    hostname: "my-cluster.cluster-abc.us-east-1.neptune.amazonaws.com"
    # optional: port: 8182
    # optional: database: "..."
    region: "us-east-1"
    auth_type: "access_key"
    aws_access_key_id: ${EXAMPLE_GRAPH_DB_NEPTUNE_AWS_ACCESS_KEY_ID}  # secret — provide via env var
    aws_secret_access_key: ${EXAMPLE_GRAPH_DB_NEPTUNE_AWS_SECRET_ACCESS_KEY}  # secret — provide via env var
    role_arn: "arn:aws:iam::123456789012:role/SolaceNeptuneAccess"
    # optional: session_name: "solace-neptune-session"
    external_id: ${EXAMPLE_GRAPH_DB_NEPTUNE_EXTERNAL_ID}  # secret — provide via env var
```

## type: knowledge_base

### subtype: bedrock

**Amazon Bedrock**

Connect to Amazon Bedrock Knowledge Base for RAG retrieval

**Usage guidance**

Use the Bedrock Knowledge Base connector when the user wants to give an
agent access to a knowledge base for retrieval-augmented generation (RAG).
The user needs an existing Amazon Bedrock Knowledge Base with its ID and
AWS credentials. The knowledge base ID is a unique identifier from the
AWS Bedrock console. The region defaults to us-east-1 if not specified.

Always use <<__SAM_REQUIRED__>> for the access_key and secret_key fields
since these are AWS credentials that should never appear in artifacts.

> ⚠ All agents using this connector will have access to the same Knowledge Base. Access control must be configured at the AWS IAM level. For AWS IAM Role authentication, ensure SAM is deployed on AWS.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `kb_id` | `string` | yes |  | len 1–100 | (no description) |
| `region` | `string` | yes | `us-east-1` | len 1–50; matches regex | (no description) |
| `auth_type` | `select` | yes | `access_key` | one of: iam, access_key | Authentication method for connecting to Amazon Bedrock Knowledge Base. AWS IAM Role Chaining is only supported when SAM runs on AWS. |
| `aws_access_key_id` | `password (secret)` | yes |  | len 16–128; secret | (no description) |
| `aws_secret_access_key` | `password (secret)` | yes |  | len 30–255; secret | (no description) |
| `aws_account_id` | `string` | yes |  | len 1–20; matches regex | The AWS Account ID where the Bedrock Knowledge Base is located. Required for IAM role assumption. |
| `role_name` | `string` | yes |  | len 1–64 | Name of the IAM role with permissions to access the Bedrock Knowledge Base (e.g., 'BedrockKBAccessRole') |
| `session_name` | `string` |  |  | len 2–64 | Session name for auditing the assumed role in AWS CloudTrail logs. Defaults to 'solace-kb-session'. |
| `external_id` | `password (secret)` |  |  | len 2–1224; secret | Optional security token for cross-account access. Required if configured in the IAM role's trust policy. |

#### Example

```yaml
kind: connector
name: example_knowledge_base_bedrock
description: "Example knowledge_base/bedrock connector. Replace with a real description (10+ chars)."
spec:
  type: knowledge_base
  subtype: bedrock
  values:
    kb_id: "ABC123XYZ"
    region: "us-east-1"
    auth_type: "iam"
    aws_access_key_id: ${EXAMPLE_KNOWLEDGE_BASE_BEDROCK_AWS_ACCESS_KEY_ID}  # secret — provide via env var
    aws_secret_access_key: ${EXAMPLE_KNOWLEDGE_BASE_BEDROCK_AWS_SECRET_ACCESS_KEY}  # secret — provide via env var
    aws_account_id: "123456789012"
    role_name: "SolaceBedrockKBAccess"
    # optional: session_name: "solace-kb-session"
    external_id: ${EXAMPLE_KNOWLEDGE_BASE_BEDROCK_EXTERNAL_ID}  # secret — provide via env var
```

## type: mcp

### subtype: remote

**Remote MCP**

Connect to remote MCP servers via SSE or Streamable HTTP

**Usage guidance**

Use the MCP connector when the user wants to connect to a remote tool server
implementing the Model Context Protocol (MCP). MCP servers expose tools that
agents can call over HTTP. The user needs to provide the server URL and choose
a connection type (streamable-http or SSE). Authentication is optional and
depends on the server.

If the user provides credentials (or none are needed), you can use the
DiscoverMCPTools tool to list available tools before saving. If credentials
are required but not yet provided, skip discovery — the UI will handle it
after the user fills in the <<__SAM_REQUIRED__>> placeholders.

Common MCP servers include Stripe, GitHub, Slack, and custom enterprise
tool servers. Ask the user what the MCP server provides to help write a
good connector description.

> ⚠ Remote MCP servers must be accessible and trusted. Ensure proper network security and validate the MCP server's identity before connecting.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `server_url` | `string` | yes |  | len 11–2048; matches regex | The Remote MCP Server URL (e.g., https://mcp.example.com/mcp) |
| `connection_type` | `select` | yes | `streamable-http` | one of: streamable-http, sse | Protocol for connecting to MCP server |
| `auth_type` | `select` | yes | `none` | one of: none, apikey, http, oauth | (no description) |
| `auth_apikey_location` | `select` | yes | `header` | one of: header, query | Where to include the API key (header or query parameter) |
| `auth_http_scheme` | `select` | yes | `basic` | one of: basic, bearer | Select the HTTP Authorization header scheme to use |
| `auth_oauth_mode` | `select` | yes | `discovery` | one of: discovery, manual | Choose how to configure OAuth: automatic discovery or manual setup |
| `auth_apikey_name` | `string` | yes |  | len 1–200; matches regex | Name of the header or query parameter |
| `auth_http_basic_username` | `string` | yes |  | len 1–320 | Username for Basic Authentication |
| `auth_http_bearer_token` | `password (secret)` | yes |  | len 10–8192; secret | The bearer token (JWT, OAuth2 access token, API token, etc.). Leave placeholder to keep existing value. After saving, this will no longer be displayed. |
| `auth_oauth_authorization_url` | `string` | yes |  | len 11–2048; matches regex | The OAuth authorization endpoint where users grant permission |
| `auth_apikey_value` | `password (secret)` | yes |  | len 8–2048; secret | The actual API key value. Leave placeholder to keep existing value. After saving, this value will no longer be displayed. |
| `auth_http_basic_password` | `password (secret)` | yes |  | len 4–1024; secret | Password for Basic Authentication. Leave placeholder to keep existing value. After saving, this will no longer be displayed. |
| `auth_oauth_token_url` | `string` | yes |  | len 11–2048; matches regex | The OAuth token endpoint where codes are exchanged for access tokens |
| `auth_oauth_refresh_url` | `string` |  |  | len 11–2048; matches regex | The OAuth refresh endpoint. If not specified, will use the token URL. |
| `auth_oauth_client_id` | `string` | yes |  | len 1–512 | The OAuth client ID for your application |
| `auth_oauth_client_secret` | `password (secret)` |  |  | len 4–1024; secret | The OAuth client secret. Leave empty for PKCE-only flows. Leave placeholder to keep existing value. After saving, this will no longer be displayed. |
| `auth_oauth_scopes` | `string` |  |  | max len 2048 | Space-separated OAuth scopes for API access (e.g., `openid email read:api`) |
| `auth_oauth_token_endpoint_auth_method` | `select` |  | `client_secret_basic` | one of: client_secret_basic, client_secret_post, none | How to authenticate at the token endpoint |
| `custom_headers` | `key_value` |  |  |  | Optional custom HTTP headers sent with every MCP request (e.g., routing headers, tenant IDs) |
| `tool_name` | `string` |  |  |  | Expose exactly this one MCP tool. Mutually exclusive with allow_list and deny_list. |
| `tool_name_prefix` | `string` |  |  |  | Prepended to every exposed tool name (lets the agent disambiguate tools when multiple MCP servers are bound). |
| `allow_list` | `text` |  |  |  | Comma-separated MCP tool names to expose. Mutually exclusive with tool_name and deny_list. |
| `deny_list` | `text` |  |  |  | Comma-separated MCP tool names to hide from the agent. Mutually exclusive with tool_name and allow_list. |
| `manifest` | `textarea` |  |  |  | Optional full override of the tool definitions: a list of entries with name, description, optional inputSchema/outputSchema. When set, the connector skips live discovery and registers exactly these tools. |
| `hil` | `textarea` |  |  |  | Optional per-tool approval gating. Map of tool names to HIL config under a top-level `tools:` key. Each entry supports require_approval (bool), approval_message (Go text/template string — use `{{.argName}}` to interpolate LLM-supplied args, e.g. `Update Jira issue {{.issueIdOrKey}}?`), show_args (bool), and timeout (duration string e.g. "30m"). When require_approval is true the agent pauses on tool invocation and surfaces approval_message in the UI before proceeding. |

#### Example

```yaml
kind: connector
name: example_mcp_remote
description: "Example mcp/remote connector. Replace with a real description (10+ chars)."
spec:
  type: mcp
  subtype: remote
  values:
    server_url: "https://example.com/mcp"
    connection_type: "streamable-http"
    auth_type: "none"
    auth_apikey_location: "header"
    auth_http_scheme: "basic"
    auth_oauth_mode: "discovery"
    auth_apikey_name: "x"
    auth_http_basic_username: "x"
    auth_http_bearer_token: ${EXAMPLE_MCP_REMOTE_AUTH_HTTP_BEARER_TOKEN}  # secret — provide via env var
    auth_oauth_authorization_url: "xxxxxxxxxxx"
    auth_apikey_value: ${EXAMPLE_MCP_REMOTE_AUTH_APIKEY_VALUE}  # secret — provide via env var
    auth_http_basic_password: ${EXAMPLE_MCP_REMOTE_AUTH_HTTP_BASIC_PASSWORD}  # secret — provide via env var
    auth_oauth_token_url: "xxxxxxxxxxx"
    # optional: auth_oauth_refresh_url: "xxxxxxxxxxx"
    auth_oauth_client_id: "x"
    auth_oauth_client_secret: ${EXAMPLE_MCP_REMOTE_AUTH_OAUTH_CLIENT_SECRET}  # secret — provide via env var
    # optional: auth_oauth_scopes: "..."
    # optional: auth_oauth_token_endpoint_auth_method: "client_secret_basic"
    # optional: custom_headers: null  # TODO: provide a value of type key_value
    # optional: tool_name: "..."
    # optional: tool_name_prefix: "..."
    # optional: allow_list: null  # TODO: provide a value of type text
    # optional: deny_list: null  # TODO: provide a value of type text
    # optional: manifest: "..."
    # optional: hil: "..."
```

## type: search

### subtype: elasticsearch

**Elasticsearch**

Connect to an Elasticsearch cluster

**Usage guidance**

Use the Elasticsearch connector when the user wants an agent to query
an Elasticsearch cluster (or a self-hosted OpenSearch cluster that
exposes the Elasticsearch-compatible API) with the Query DSL.
Connect via either a host (with optional port) or an Elastic Cloud ID
(Cloud ID). Authentication is via an API key for secured clusters;
leave it blank for a local or unsecured cluster (e.g. one started with
security disabled).

When an API key is supplied, use <<__SAM_REQUIRED__>> for it.

> ⚠ All agents using this connector will have the same cluster access. Agent Mesh cannot restrict what queries agents execute—access control must be configured at the cluster level. For security, use API keys with minimal necessary permissions. Self-hosted OpenSearch clusters that expose the Elasticsearch-compatible API can also be reached through this connector.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `scheme` | `select` |  | `https` | one of: https, http | Connection scheme for the host form. Ignored when a Cloud ID is provided. |
| `hostname` | `string` |  |  | max len 255; matches regex | Elasticsearch host (without scheme). Provide either this or a Cloud ID. |
| `port` | `number` |  | `9200` | range 1–65535 | Elasticsearch port. Defaults to 9200. |
| `cloud_id` | `string` |  |  | max len 2048 | Elastic Cloud deployment ID. Provide either this or a Host. |
| `api_key` | `password (secret)` |  |  | len 10–4096; secret | Elasticsearch API key (Base64-encoded id:api_key) for secured clusters. Leave blank for a local/unsecured cluster or when using a username and password. Leave the placeholder to keep an existing value. |
| `username` | `string` |  |  | max len 255 | Basic-auth username (e.g. 'elastic'). Use this with a password as an alternative to an API key. Leave blank for an API key or an unsecured cluster. |
| `password` | `password (secret)` |  |  | len 1–1024; secret | Basic-auth password, paired with the username. Leave the placeholder to keep an existing value. |

#### Example

```yaml
kind: connector
name: example_search_elasticsearch
description: "Example search/elasticsearch connector. Replace with a real description (10+ chars)."
spec:
  type: search
  subtype: elasticsearch
  values:
    # optional: scheme: "https"
    # optional: hostname: "elastic.example.com"
    # optional: port: 9200
    # optional: cloud_id: "my-deployment:dXMtZWFzdC0xLmF3cy5jbG91ZC5lcy5pbyQ..."
    api_key: ${EXAMPLE_SEARCH_ELASTICSEARCH_API_KEY}  # secret — provide via env var
    # optional: username: "..."
    password: ${EXAMPLE_SEARCH_ELASTICSEARCH_PASSWORD}  # secret — provide via env var
```

### subtype: opensearch

**Amazon OpenSearch**

Connect to an Amazon-managed OpenSearch domain or Serverless collection

**Usage guidance**

Use the OpenSearch connector when the user wants an agent to query
an Amazon-managed OpenSearch domain or OpenSearch Serverless
collection. Provide the cluster URL (typically ending in
.es.amazonaws.com or .aoss.amazonaws.com), AWS region, and either
AWS Access Keys or an IAM Role to assume. For self-hosted OpenSearch
that exposes the Elasticsearch-compatible API, use the Elasticsearch
connector instead.

Always use <<__SAM_REQUIRED__>> for the access key, secret key, and
external ID fields since these are AWS credentials that should never
appear in artifacts.

> ⚠ Agents using this connector run queries with the configured AWS credentials. Use a least-privilege IAM role or user scoped to specific domains/collections. For self-hosted OpenSearch with the Elasticsearch-compatible API, use the Elasticsearch connector instead.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `scheme` | `select` |  | `https` | one of: https, http | Connection scheme. Managed OpenSearch uses HTTPS. |
| `hostname` | `string` | yes |  | len 1–255; matches regex | OpenSearch domain or serverless collection host (without scheme). |
| `port` | `number` |  |  | range 1–65535 | Optional. Managed OpenSearch listens on 443 (leave blank). Set only for a non-standard port. |
| `region` | `string` | yes | `us-east-1` | len 1–50; matches regex | AWS region used for SigV4 request signing. |
| `auth_type` | `select` | yes | `access_key` | one of: access_key, iam | Authentication method for connecting to OpenSearch. AWS IAM Role Chaining is only supported when SAM runs on AWS. |
| `aws_access_key_id` | `password (secret)` | yes |  | len 16–128; secret | (no description) |
| `aws_secret_access_key` | `password (secret)` | yes |  | len 30–255; secret | (no description) |
| `role_arn` | `string` | yes |  | len 20–2048; matches regex | ARN of the IAM role with permissions to query the OpenSearch cluster. |
| `session_name` | `string` |  |  | len 2–64 | Session name for auditing the assumed role in AWS CloudTrail logs. |
| `external_id` | `password (secret)` |  |  | len 2–1224; secret | Optional security token for cross-account access. Required if configured in the IAM role's trust policy. |

#### Example

```yaml
kind: connector
name: example_search_opensearch
description: "Example search/opensearch connector. Replace with a real description (10+ chars)."
spec:
  type: search
  subtype: opensearch
  values:
    # optional: scheme: "https"
    hostname: "my-domain.us-east-1.es.amazonaws.com"
    # optional: port: 1
    region: "us-east-1"
    auth_type: "access_key"
    aws_access_key_id: ${EXAMPLE_SEARCH_OPENSEARCH_AWS_ACCESS_KEY_ID}  # secret — provide via env var
    aws_secret_access_key: ${EXAMPLE_SEARCH_OPENSEARCH_AWS_SECRET_ACCESS_KEY}  # secret — provide via env var
    role_arn: "arn:aws:iam::123456789012:role/SolaceOpenSearchAccess"
    # optional: session_name: "solace-opensearch-session"
    external_id: ${EXAMPLE_SEARCH_OPENSEARCH_EXTERNAL_ID}  # secret — provide via env var
```

## type: slack

### subtype: bot

**Slack**

Send messages to Slack channels

**Usage guidance**

Use the Slack connector when the user wants an agent to send messages
to Slack channels. The connector provides a slack_send_message tool.
The user needs to provide a Slack Bot Token (xoxb-...).
Use <<__SAM_REQUIRED__>> for the bot token if not mentioned in the
conversation.

> ⚠ All agents using this connector can send messages to any channel the bot has access to. Ensure the bot's channel access is appropriately scoped in Slack's app settings.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `slack_bot_token` | `password (secret)` | yes |  | len 10–255; matches regex; secret | Slack Bot User OAuth Token. Recommended scopes: chat:write, files:write, users:read, users:read.email |

#### Example

```yaml
kind: connector
name: example_slack_bot
description: "Example slack/bot connector. Replace with a real description (10+ chars)."
spec:
  type: slack
  subtype: bot
  values:
    slack_bot_token: ${EXAMPLE_SLACK_BOT_SLACK_BOT_TOKEN}  # secret — provide via env var
```

## type: sql

### subtype: mariadb

**MariaDB**

Connect to MariaDB database

**Usage guidance**

Use the MariaDB connector when the user wants to query or interact with
a MariaDB database. Same field requirements as MySQL (default port 3306).

> ⚠ All agents using this connector will have the same database access. Agent Mesh cannot restrict what queries agents execute—access control must be configured at the database level. For security, use credentials with minimal necessary permissions (e.g., read-only, limited to specific schemas).

**Connection template**: `mysql://$USERNAME:$PASSWORD@$HOSTNAME:$PORT/$DATABASE`

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `database` | `string` | yes |  | len 1–255; matches regex | Name of the MariaDB database to connect to |
| `hostname` | `string` | yes |  | len 1–255; matches regex | Database hostname or IP address |
| `port` | `number` |  | `3306` | range 1–65535 | If no value is provided, the default port number (3306) will be used. |
| `username` | `string` | yes |  | len 1–255 | (no description) |
| `password` | `password (secret)` | yes |  | secret | Leave placeholder to keep existing value. After saving, this value will no longer be displayed. |

#### Example

```yaml
kind: connector
name: example_sql_mariadb
description: "Example sql/mariadb connector. Replace with a real description (10+ chars)."
spec:
  type: sql
  subtype: mariadb
  values:
    database: "x"
    hostname: "x"
    # optional: port: 3306
    username: "x"
    password: ${EXAMPLE_SQL_MARIADB_PASSWORD}  # secret — provide via env var
```

### subtype: mssql

**Microsoft SQL Server**

Connect to Microsoft SQL Server database

**Usage guidance**

Use the MSSQL connector when the user wants to query or interact with
a Microsoft SQL Server database. The connector provides a SQL tool that
the agent can use to run read and write queries. The user needs to
provide the host, port, database name, username, and password. Default
port is 1433. Encryption is enabled by default. Use
<<__SAM_REQUIRED__>> for password and any other values not mentioned in
the conversation.

> ⚠ All agents using this connector will have the same database access. Agent Mesh cannot restrict what queries agents execute—access control must be configured at the database level. For security, use credentials with minimal necessary permissions (e.g., read-only, limited to specific schemas).

**Connection template**: `sqlserver://$USERNAME:$PASSWORD@$HOSTNAME:$PORT?database=$DATABASE`

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `database` | `string` | yes |  | len 1–255; matches regex | Name of the SQL Server database to connect to |
| `hostname` | `string` | yes |  | len 1–255; matches regex | Database hostname or IP address |
| `port` | `number` |  | `1433` | range 1–65535 | If no value is provided, the default port number (1433) will be used. |
| `username` | `string` | yes |  | len 1–255 | (no description) |
| `password` | `password (secret)` | yes |  | secret | Leave placeholder to keep existing value. After saving, this value will no longer be displayed. |
| `encrypt` | `select` |  | `yes` | one of: yes, no, strict | Encrypts data in transit using TLS between the connector and SQL Server. Strict requires encryption and always validates the server certificate (the Trust Server Certificate setting is ignored). |
| `trust_server_certificate` | `select` |  | `no` | one of: no, yes | Controls whether the connector validates the SQL Server TLS certificate (expiry, trust chain, and server name match). Disabled validates (recommended). Enabled skips validation (use only for dev/test or controlled environments with self-signed certs). |

#### Example

```yaml
kind: connector
name: example_sql_mssql
description: "Example sql/mssql connector. Replace with a real description (10+ chars)."
spec:
  type: sql
  subtype: mssql
  values:
    database: "x"
    hostname: "x"
    # optional: port: 1433
    username: "x"
    password: ${EXAMPLE_SQL_MSSQL_PASSWORD}  # secret — provide via env var
    # optional: encrypt: "yes"
    # optional: trust_server_certificate: "no"
```

### subtype: mysql

**MySQL**

Connect to MySQL database

**Usage guidance**

Use the MySQL connector when the user wants to query or interact with
a MySQL database. Same field requirements as PostgreSQL but with default
port 3306.

> ⚠ All agents using this connector will have the same database access. Agent Mesh cannot restrict what queries agents execute—access control must be configured at the database level. For security, use credentials with minimal necessary permissions (e.g., read-only, limited to specific schemas).

**Connection template**: `mysql://$USERNAME:$PASSWORD@$HOSTNAME:$PORT/$DATABASE`

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `database` | `string` | yes |  | len 1–255; matches regex | Name of the MySQL database to connect to |
| `hostname` | `string` | yes |  | len 1–255; matches regex | Database hostname or IP address |
| `port` | `number` |  | `3306` | range 1–65535 | If no value is provided, the default port number (3306) will be used. |
| `username` | `string` | yes |  | len 1–255 | (no description) |
| `password` | `password (secret)` | yes |  | secret | Leave placeholder to keep existing value. After saving, this value will no longer be displayed. |

#### Example

```yaml
kind: connector
name: example_sql_mysql
description: "Example sql/mysql connector. Replace with a real description (10+ chars)."
spec:
  type: sql
  subtype: mysql
  values:
    database: "x"
    hostname: "x"
    # optional: port: 3306
    username: "x"
    password: ${EXAMPLE_SQL_MYSQL_PASSWORD}  # secret — provide via env var
```

### subtype: oracle

**Oracle**

Connect to Oracle database

**Usage guidance**

Use the Oracle connector when the user wants to query or interact with
an Oracle database. The connector uses thin mode (no Oracle Client
libraries required). The user needs to provide the host, port, service
name, username, and password. Default port is 1521. Note: Oracle uses
a service name, not a database name. Use <<__SAM_REQUIRED__>> for
password and any other values not mentioned in the conversation.

> ⚠ All agents using this connector will have the same database access. Agent Mesh cannot restrict what queries agents execute—access control must be configured at the database level. For security, use credentials with minimal necessary permissions (e.g., read-only, limited to specific schemas).

**Connection template**: `oracle://$USERNAME:$PASSWORD@$HOSTNAME:$PORT/$SERVICE_NAME`

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `service_name` | `string` | yes |  | len 1–255; matches regex | Oracle service name (not database name) |
| `hostname` | `string` | yes |  | len 1–255; matches regex | Database hostname or IP address |
| `port` | `number` |  | `1521` | range 1–65535 | If no value is provided, the default port number (1521) will be used. |
| `username` | `string` | yes |  | len 1–255 | (no description) |
| `password` | `password (secret)` | yes |  | secret | Leave placeholder to keep existing value. After saving, this value will no longer be displayed. |

#### Example

```yaml
kind: connector
name: example_sql_oracle
description: "Example sql/oracle connector. Replace with a real description (10+ chars)."
spec:
  type: sql
  subtype: oracle
  values:
    service_name: "x"
    hostname: "x"
    # optional: port: 1521
    username: "x"
    password: ${EXAMPLE_SQL_ORACLE_PASSWORD}  # secret — provide via env var
```

### subtype: postgres

**PostgreSQL**

Connect to PostgreSQL database

**Usage guidance**

Use the PostgreSQL connector when the user wants to query or interact with
a PostgreSQL database. The connector provides a SQL tool that the agent can
use to run read and write queries. The user needs to provide the host, port,
database name, username, and password. For the builder, use
<<__SAM_REQUIRED__>> for password and any other values not mentioned in the
conversation.

> ⚠ All agents using this connector will have the same database access. Agent Mesh cannot restrict what queries agents execute—access control must be configured at the database level. For security, use credentials with minimal necessary permissions (e.g., read-only, limited to specific schemas).

**Connection template**: `postgresql://$USERNAME:$PASSWORD@$HOSTNAME:$PORT/$DATABASE`

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `database` | `string` | yes |  | len 1–255; matches regex | Name of the PostgreSQL database to connect to |
| `hostname` | `string` | yes |  | len 1–255; matches regex | Database hostname or IP address |
| `port` | `number` |  | `5432` | range 1–65535 | If no value is provided, the default port number (5432) will be used. |
| `username` | `string` | yes |  | len 1–255 | (no description) |
| `password` | `password (secret)` | yes |  | secret | Leave placeholder to keep existing value. After saving, this value will no longer be displayed. |

#### Example

```yaml
kind: connector
name: example_sql_postgres
description: "Example sql/postgres connector. Replace with a real description (10+ chars)."
spec:
  type: sql
  subtype: postgres
  values:
    database: "x"
    hostname: "x"
    # optional: port: 5432
    username: "x"
    password: ${EXAMPLE_SQL_POSTGRES_PASSWORD}  # secret — provide via env var
```

