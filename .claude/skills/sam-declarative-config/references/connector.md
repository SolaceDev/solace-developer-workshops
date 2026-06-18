# Kind: `connector`

Manifest path: `resources.connectors`

A connector is a credentialled binding to an external system
(databases, MCP servers, message brokers). The `type` and `subtype`
fields together select the connector schema; the `values` field
carries the per-type configuration (often including secret-shaped
fields, which `sam config pull` rewrites as `${VAR}` placeholders).
Unlike skills, connectors are referenced from agents by name only —
there is no per-agent override of connector values.

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


## Wrapper schema

CreateConnectorRequest is the request body for POST /connectors.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `name` | `string` | yes | len 3–255 | (no description) |
| `description` | `string` | yes | len 10–1000 | (no description) |
| `type` | `string` | yes | max 50 | (no description) |
| `subtype` | `string` | yes | max 50 | (no description) |
| `values` | `any` | yes |  | (no description) |

## Per-(type, subtype) detail

Each connector type carries one or more subtypes. Find the `## type:` matching the `type:` field your connector uses, then drill into the right `### subtype:`.

## type: api

### subtype: openapi

**OpenAPI**

Connect to REST APIs via OpenAPI specification

> ⚠ All agents using this connector will have the same API access. Ensure the API has minimal necessary permissions.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `file_s3_key` | `string (secret)` |  |  | secret | (no description) |
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

> ⚠ All agents using this connector will have the same database access. Agent Mesh cannot restrict what queries agents execute—access control must be configured at the database level. For security, use credentials with minimal necessary permissions (e.g., read-only, scoped to a single database/collection).

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `connection_string` | `password (secret)` | yes |  | len 10–2048; matches regex; secret | MongoDB connection URI (mongodb:// or mongodb+srv://). May include the database name in the path. Leave placeholder to keep existing value. After saving, this value will no longer be displayed. |
| `database` | `string` |  |  | max len 255; matches regex | Leave blank if the database is encoded in the connection string path. |
| `collection` | `string` | yes |  | len 1–255; matches regex | MongoDB collection this connector will query. |

#### Example

```yaml
kind: connector
name: example_document_db_mongodb
description: "Example document_db/mongodb connector. Replace with a real description (10+ chars)."
spec:
  type: document_db
  subtype: mongodb
  values:
    connection_string: ${EXAMPLE_DOCUMENT_DB_MONGODB_CONNECTION_STRING}  # secret — provide via env var
    # optional: database: "..."
    collection: "x"
```

## type: email

### subtype: smtp

**SMTP Email**

Send emails via SMTP server

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

Send requests to backend microservices via a Solace event broker

> ⚠ Agents can publish messages to topics on the configured event broker. Configure appropriate ACLs on the event broker.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `broker_connection_type` | `select` | yes | `sam` | one of: sam, custom | Select an option to pre-fill connection details from the Agent Mesh event broker, or enter a custom event broker. A password is always required. |
| `broker_url` | `string` | yes |  | len 1–512 | Secured SMF URI (Public Endpoint) |
| `broker_vpn` | `string` | yes |  | len 1–128 | Message VPN name |
| `broker_username` | `string` | yes |  | len 1–128 | (no description) |
| `broker_password` | `password (secret)` | yes |  | len 1–1024; secret | Event broker password for client connections. |
| `tool_name` | `string` | yes |  | max len 64; matches regex | Name shown to the LLM (e.g., get_order_status). Must start with a lowercase letter. |
| `tool_description` | `textarea` | yes |  | len 10–2048 | Tool description given to the LLM. |
| `topic` | `string` | yes |  | len 1–512 | Topic to publish to. Use {{ param }} for parameter substitution. |
| `wait_for_response` | `select` | yes | `true` | one of: true, false | (no description) |
| `request_expiry_ms` | `number` |  | `60000` | range 1000–300000 | Request timeout in milliseconds (request-reply mode only). |
| `reply_mode` | `select` |  | `temp_queue` | one of: temp_queue, p2p_inbox | How replies are received (request-reply mode only). |
| `qos` | `select` | yes | `1` | one of: 1, 0 | How requests are delivered to the event broker. |
| `payload_format` | `select` | yes | `json` | one of: json, yaml, text | (no description) |
| `parameters` | `textarea` |  |  | max len 16384 | JSON array defining LLM-visible parameters. Each parameter can have: name, type (string/number/boolean/integer), required, description, payload_path, default, context_expression.  |

#### Example

```yaml
kind: connector
name: example_event_mesh_solace
description: "Example event_mesh/solace connector. Replace with a real description (10+ chars)."
spec:
  type: event_mesh
  subtype: solace
  values:
    broker_connection_type: "sam"
    broker_url: "tcps://broker.example.com:55443"
    broker_vpn: "x"
    broker_username: "x"
    broker_password: ${EXAMPLE_EVENT_MESH_SOLACE_BROKER_PASSWORD}  # secret — provide via env var
    tool_name: "get_order_status"
    tool_description: "Get the status of a customer order by its ID"
    topic: "myapp/v1/orders/{{ order_id }}/status"
    wait_for_response: "true"
    # optional: request_expiry_ms: 60000
    # optional: reply_mode: "temp_queue"
    qos: "1"
    payload_format: "json"
    # optional: parameters: "[\n  {\"name\": \"order_id\", \"type\": \"string\", \"required\": true, \"description\": \"Order ID to look up\", \"payload_path\": \"request.order_id\"}\n]\n"
```

## type: graph_db

### subtype: neo4j

**Neo4j**

Connect to a Neo4j graph database

> ⚠ All agents using this connector will have the same database access. Agent Mesh cannot restrict what queries agents execute—access control must be configured at the database level. For security, use credentials with minimal necessary permissions.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `connection_string` | `password (secret)` | yes |  | len 10–1024; matches regex; secret | Bolt URI: bolt://, bolt+s:// (TLS), neo4j://, or neo4j+s:// (TLS, routing). Treated as secret because Bolt URIs can embed credentials (user:pass@host). Leave placeholder to keep existing value. |
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
    connection_string: ${EXAMPLE_GRAPH_DB_NEO4J_CONNECTION_STRING}  # secret — provide via env var
    username: "x"
    password: ${EXAMPLE_GRAPH_DB_NEO4J_PASSWORD}  # secret — provide via env var
    # optional: database: "neo4j"
```

### subtype: neptune

**Amazon Neptune**

Connect to an Amazon Neptune graph database

> ⚠ Agents using this connector run queries with the configured AWS credentials. Use a least-privilege IAM role or user scoped to specific clusters.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `connection_string` | `string` | yes |  | len 10–2048; matches regex | Bolt+s URL of the Neptune cluster endpoint. Credentials embedded in the URI (user:pass@host) are ignored — Neptune authenticates via the AWS credentials configured below. |
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
    connection_string: "bolt+s://my-cluster.cluster-abc.us-east-1.neptune.amazonaws.com:8182"
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

> ⚠ All agents using this connector will have the same cluster access. Agent Mesh cannot restrict what queries agents execute—access control must be configured at the cluster level. For security, use API keys with minimal necessary permissions. Self-hosted OpenSearch clusters that expose the Elasticsearch-compatible API can also be reached through this connector.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `connection_string` | `string` |  |  | max len 2048; matches regex | Full URL of the Elasticsearch cluster. Provide either this or a Cloud ID. |
| `cloud_id` | `string` |  |  | max len 2048 | Elastic Cloud deployment ID. Provide either this or a Connection URL. |
| `api_key` | `password (secret)` | yes |  | len 10–4096; secret | Elasticsearch API key (Base64-encoded id:api_key). Leave placeholder to keep existing value. |

#### Example

```yaml
kind: connector
name: example_search_elasticsearch
description: "Example search/elasticsearch connector. Replace with a real description (10+ chars)."
spec:
  type: search
  subtype: elasticsearch
  values:
    # optional: connection_string: "https://elastic.example.com:9200"
    # optional: cloud_id: "my-deployment:dXMtZWFzdC0xLmF3cy5jbG91ZC5lcy5pbyQ..."
    api_key: ${EXAMPLE_SEARCH_ELASTICSEARCH_API_KEY}  # secret — provide via env var
```

### subtype: opensearch

**Amazon OpenSearch**

Connect to an Amazon-managed OpenSearch domain or Serverless collection

> ⚠ Agents using this connector run queries with the configured AWS credentials. Use a least-privilege IAM role or user scoped to specific domains/collections. For self-hosted OpenSearch with the Elasticsearch-compatible API, use the Elasticsearch connector instead.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `connection_string` | `string` | yes |  | len 10–2048; matches regex | Full URL of the OpenSearch domain or serverless collection. |
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
    connection_string: "https://my-domain.us-east-1.es.amazonaws.com"
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

> ⚠ All agents using this connector can send messages to any channel the bot has access to. Ensure the bot's channel access is appropriately scoped in Slack's app settings.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `slack_bot_token` | `password (secret)` | yes |  | len 10–255; secret | Slack Bot User OAuth Token. Recommended scopes: chat:write, files:write, users:read, users:read.email |

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

