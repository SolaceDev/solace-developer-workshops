---
title: Configure
description: Wire Agent Mesh to your broker, LLM provider, artifact storage, session storage, and identity provider with YAML and environment variables.
sidebar_position: 2
---

# Configure

You have Agent Mesh installed. Configuration is what makes it talk to your environment: which broker carries the events, which LLM answers the prompts, where artifacts and sessions persist, how users authenticate, and where secrets come from.

This page covers each of those concerns as a focused section. Each section shows the minimum-viable YAML, lists the keys with their defaults, and points at deeper references. For the full field-by-field schema, see Config schema. For a runnable starting point, scaffold a project with `sam config init` — it lays down a working `manifest.yaml`, `models/`, and `agents/` you can edit.

## What to Configure First

| Concern | What it controls | Required for |
|---|---|---|
| Broker | Solace PubSub+, dev broker, or in-memory transport | Every deployment |
| LLM provider | Which model the agent calls and how it authenticates | Every agent that talks to an LLM |
| Artifact storage | Where versioned blobs (documents, images) persist | Any agent that produces artifacts |
| Session storage | Where conversation history persists | Multi-turn chats and resumable tasks |
| Authentication | Who can use the gateway and what they can do | Non-local deployments |
| Secrets | How API keys, tokens, and credentials are sourced | Every deployment |

A single-process embedded deployment can use the in-memory broker, an in-memory session store, the filesystem artifact backend, and no authentication. A production deployment needs at minimum: a Solace broker, a real LLM provider, durable artifact + session storage, and an identity provider.

## Broker

The broker carries every agent-to-agent and agent-to-gateway message. Three transport options:

| Type | When to use |
|---|---|
| Solace PubSub+ | Production. Real broker, durable subscriptions, TLS, ACL. |
| Dev broker | Local development with multi-process layouts. TCP listener; lightweight Go reimplementation of the Solace wire protocol. |
| In-memory broker | Single-process embedded mode, desktop mode, and tests. No network, no shared state across processes. |

Every app inside a runtime config carries the same `broker:` block:

```yaml
# configs/agent.yaml
apps:
  - name: my_agent
    broker:
      dev_mode: ${SOLACE_DEV_MODE, false}
      broker_url: ${SOLACE_BROKER_URL}
      broker_username: ${SOLACE_BROKER_USERNAME, default}
      broker_password: ${SOLACE_BROKER_PASSWORD}
      broker_vpn: ${SOLACE_BROKER_VPN, default}
      temporary_queue: true
    app_config:
      # component-specific fields follow
```

| Key | Default | Description |
|---|---|---|
| `dev_mode` | `false` | When `true`, the app connects to the in-process dev broker instead of the URL. Use for `sam run` multi-process layouts where the dev broker is started by the same `sam` invocation. |
| `broker_url` | (required when `dev_mode=false`) | Solace broker URL. Common forms: `tcps://broker.example.com:55443` (production TLS), `ws://localhost:8008` (dev broker default). |
| `broker_username` | `default` | Username on the broker. |
| `broker_password` | (no default) | Password for `broker_username`. Always source from an environment variable. |
| `broker_vpn` | `default` | Solace Message VPN name. |
| `temporary_queue` | `true` | Carried for Python Solace Agent Mesh compatibility. The Go runtime does not act on this flag — queue durability is decided per-subscription by the agent and gateway code, not by this key. |

Embedded mode honours `broker:` settings exactly like the multi-process layouts do. With `dev_mode: true` (or no `broker:` section), the orchestrator creates an in-process dev broker and every component subscribes to it directly — `broker_url` is ignored in that case. With `dev_mode: false`, the orchestrator dials the configured `broker_url` like AWE and the gateway do in split-process layouts. See Deploy options for the topology choices.

## LLM Provider

Agents (and the gateway's system agent, when present) declare a `model:` block. The model string follows the LiteLLM convention `<provider>/<model-name>`. Bifrost handles the per-provider HTTP details under the hood.

```yaml
app_config:
  model:
    model: anthropic/claude-sonnet-4-5
    api_key: ${ANTHROPIC_API_KEY}
```

If `api_key` is omitted, Agent Mesh reads from the provider-specific environment variable (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, etc.).

### Provider Prefixes

| Prefix | Provider | Notes |
|---|---|---|
| `openai/` | OpenAI direct, or any OpenAI-compatible endpoint via `api_base`. | The default when no prefix is given. |
| `anthropic/` | Anthropic Claude direct. | Auto-inferred from any model name containing `claude` or `anthropic`. |
| `azure/` | Azure OpenAI. | Requires `endpoint`, `api_version`, and a `deployments:` map. |
| `bedrock/` | AWS Bedrock. | Requires `access_key`, `secret_key`, `region`. |
| `vertex/` (alias: `vertex_ai/`) | Google Vertex AI. | Requires `project_id`, `region`, and ADC or `auth_credentials_file`. |
| `google/` (alias: `gemini/`) | Google Generative AI direct. | Auto-inferred from any model name containing `gemini`. |
| `ollama/` | Local Ollama. | Requires `api_base: http://localhost:11434` (or wherever Ollama is listening). |
| `huggingface/`, `replicate/` | Hugging Face Inference and Replicate. | Standard `api_key` pattern. |
| `groq/`, `mistral/`, `cohere/`, `xai/`, `openrouter/`, `perplexity/`, `cerebras/`, `nebius/` | Other Bifrost-supported providers. | Standard `api_key` pattern. `cerebras` and `nebius` are recognized but have not been tested end-to-end. |

### Common Keys

| Key | Description |
|---|---|
| `model` | Required. The `<provider>/<model-name>` string. |
| `api_key` | API key. Falls back to the provider-specific env var when omitted. |
| `api_key_file` | Path to a file containing the API key. Useful for Kubernetes secret mounts. |
| `api_base` | Custom endpoint URL. Set for proxies, gateways, and self-hosted endpoints. |
| `api_ca_cert` | Path to a PEM-encoded CA bundle trusted for the LLM endpoint. |
| `api_skip_tls_verify` | `true` to disable TLS verification on the LLM endpoint. Development only. |
| `request_timeout_seconds` | HTTP timeout. Default `600`. |
| `extra_headers` | Map of additional headers on every request. |

Provider-specific keys that are not in this list pass through to Bifrost. For example, Azure's `endpoint`, `api_version`, and `deployments` are Bifrost passthrough; AWS Bedrock's `arn` is too.

### OpenAI-Compatible Gateways

Any LiteLLM, vLLM, or other OpenAI-compatible endpoint works with the `openai/` prefix plus an `api_base`:

```yaml
model:
  model: openai/gpt-4o
  api_base: https://litellm.example.com
  api_key: ${LLM_SERVICE_API_KEY}
```

The prefix tells Bifrost which API protocol to use, not which backend model is running. An OpenAI-compatible proxy fronting an Anthropic Claude model still uses the `openai/` prefix.

### OAuth2-Secured LLM Gateways

For LLM gateways fronted by an OAuth2 provider (Keycloak, Azure AD, Okta), set the OAuth2 keys instead of `api_key`:

```yaml
model:
  model: openai/gpt-4o
  api_base: https://llm-gateway.example.com
  oauth_token_url: https://auth.example.com/oauth2/token
  oauth_client_id: ${OAUTH_CLIENT_ID}
  oauth_client_secret: ${OAUTH_CLIENT_SECRET}
  oauth_scope: api://llm-gateway/.default
```

All three of `oauth_token_url`, `oauth_client_id`, and `oauth_client_secret` are required together. Setting only one or two emits a warning and the OAuth2 path is skipped, falling back to `api_key` if present. Agent Mesh fetches and caches tokens, refreshes proactively before expiry, and falls back to `api_key` if the token fetch fails. The token URL must be HTTPS in production; set `oauth_allow_insecure_token_url: true` for local development with `http://`.

## Artifact Storage

The artifact service holds versioned blobs that agents produce or consume (documents, images, generated reports). Five backends:

| Type | When to use |
|---|---|
| `filesystem` | Local development, desktop mode, embedded mode. Default. |
| `s3` | Production on AWS, or any S3-compatible store (MinIO, R2, etc.). |
| `gcs` | Production on Google Cloud. |
| `azure` | Production on Azure. |
| `memory` | Tests only. Lost on process restart. |

Every artifact backend lives inside an `app_config.artifact_service:` block.

### Filesystem

```yaml
app_config:
  artifact_service:
    type: filesystem
    base_path: ${SAM_DATA_DIR, ./sam-data}
    artifact_scope: namespace
```

`base_path` is the directory root. Artifacts go under `<base_path>/artifacts/`. If `base_path` is empty, Agent Mesh falls back to `SAM_DATA_DIR` and then `./sam-data`.

### S3 and S3-Compatible

```yaml
app_config:
  artifact_service:
    type: s3
    bucket_name: ${ARTIFACT_BUCKET_NAME}
    region: ${AWS_REGION, us-east-1}
    artifact_scope: namespace
```

| Key | Description |
|---|---|
| `bucket_name` | S3 bucket. Falls back to `OBJECT_STORAGE_BUCKET_NAME` then `S3_BUCKET_NAME`. |
| `region` | AWS region. |
| `endpoint_url` | Custom endpoint for S3-compatible services (MinIO, R2). Falls back to `S3_ENDPOINT_URL`. Setting this triggers path-style addressing. |
| `aws_access_key_id`, `aws_secret_access_key`, `aws_session_token` | Static credentials. Each falls back to its matching `AWS_*` env var and then to the AWS default credential chain. |

Agent Mesh validates S3 bucket access at startup. A missing or forbidden bucket fails the agent before it accepts traffic. The GCS and Azure backends defer credential and container checks to the first read or write — verify access independently (`sam doctor` or a manual probe) to catch a misconfigured bucket before it surfaces under load.

### GCS

```yaml
app_config:
  artifact_service:
    type: gcs
    bucket_name: ${GCS_BUCKET_NAME}
    project: ${GCP_PROJECT}
    artifact_scope: namespace
```

| Key | Description |
|---|---|
| `bucket_name` | GCS bucket. Falls back to `OBJECT_STORAGE_BUCKET_NAME` then `GCS_BUCKET_NAME`. |
| `project` | GCP project ID. Falls back to `GCS_PROJECT`. |
| `credentials_file` | Path to a service-account JSON file. |

Credentials default to Application Default Credentials (`GOOGLE_APPLICATION_CREDENTIALS`). For inline service-account JSON, set `GCS_CREDENTIALS_JSON` in the environment; it takes priority over `credentials_file`.

### Azure Blob Storage

```yaml
app_config:
  artifact_service:
    type: azure
    bucket_name: ${AZURE_CONTAINER_NAME}
    artifact_scope: namespace
```

| Key | Description |
|---|---|
| `bucket_name` | Azure Blob container name. Falls back to `OBJECT_STORAGE_BUCKET_NAME` then `AZURE_STORAGE_CONTAINER_NAME`. The legacy key `container_name` is also accepted. |
| `connection_string` | Full connection string. Falls back to `AZURE_STORAGE_CONNECTION_STRING`. |
| `account_name`, `account_key` | Shared-key credentials. Fall back to `AZURE_STORAGE_ACCOUNT_NAME` / `AZURE_STORAGE_ACCOUNT_KEY`. |

Auth priority: connection string first, then shared-key, then `account_name` alone falls through to the Azure DefaultAzureCredential chain (managed identity, env vars, dev CLI).

### Scope

`artifact_scope` controls how artifacts are partitioned:

| Value | Behavior |
|---|---|
| `namespace` (default) | Artifacts namespaced by the app's `namespace`. Agents in the same namespace share artifacts. |
| `agent` | Artifacts namespaced by the agent's own name. Each agent's artifacts stay isolated. |

Any value other than `namespace` falls through to the per-agent scope.

## Session Storage

The session service holds the conversation history and task checkpoints that let an agent resume across requests. Three backends:

| Type | When to use |
|---|---|
| `memory` (default) | Tests, embedded mode. Lost on process restart. |
| `sqlite` (with a `path` field) | Local development and single-machine deployments. |
| `sql` (with a `database_url`) | Production. Backs onto SQLite via `sqlite:///path` or Postgres via `postgres://...`. |

### SQLite

```yaml
app_config:
  session_service:
    type: sql
    database_url: "sqlite:///${SAM_DATA_DIR}/sam.db"
    default_behavior: PERSISTENT
```

Or the shorthand `sqlite` type with a `path:` field:

```yaml
app_config:
  session_service:
    type: sqlite
    path: /var/lib/agent-mesh/sessions.db
    default_behavior: PERSISTENT
```

### Postgres

```yaml
app_config:
  session_service:
    type: sql
    database_url: "postgres://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:5432/agent_mesh?sslmode=require"
    default_behavior: PERSISTENT
```

Migrations run automatically on first connect. Use Postgres for multi-pod deployments where session affinity at the load balancer is not an option.

### Session Behavior

`default_behavior: PERSISTENT` keeps the full conversation history for the session. Peer-to-peer delegations and workflow invocations override this on a per-message basis by tagging the request with `sessionBehavior: RUN_BASED`, which scopes state to the originating task instead of persisting it. Operators rarely change `default_behavior` because the per-message override handles the routing decisions that matter; leave it at `PERSISTENT` unless you have a specific reason not to.

## Authentication

Authentication is a property of the gateway, not the agents. The Web UI gateway has three modes:

| Mode | Field | When to use |
|---|---|---|
| Off | `frontend_use_authorization: false` | Local development; embedded mode for a single user. |
| External login | `frontend_use_authorization: true` plus an external login URL | Front the gateway with an OAuth2 proxy or reverse proxy that handles login. |
| Built-in OIDC | `frontend_use_authorization: true` plus an OIDC provider catalog | Production. Agent Mesh handles the OIDC handshake directly. |

For built-in OIDC, the gateway loads a provider catalog from a separate YAML file via `!include`:

```yaml
# configs/gwe/auth/oidc_providers.yaml
providers:
  azure:
    issuer: "${OIDC_ISSUER}"
    client_id: "${OIDC_CLIENT_ID}"
    client_secret: "${OIDC_CLIENT_SECRET}"
    scopes: ["openid", "email", "profile", "offline_access"]
    ca_cert_path: "${OIDC_CA_CERT_PATH, }"
    insecure_skip_verify: ${OIDC_INSECURE_SKIP_VERIFY, false}
```

| Key | Description |
|---|---|
| `issuer` | The OIDC issuer URL. The provider's discovery document lives at `<issuer>/.well-known/openid-configuration`. |
| `client_id` | OAuth2 client ID registered with the IdP. |
| `client_secret` | OAuth2 client secret. Source from an environment variable. |
| `scopes` | OAuth2 scopes to request. `offline_access` enables refresh tokens. |
| `ca_cert_path` | Path to a PEM CA bundle when the IdP uses a private CA. |
| `insecure_skip_verify` | `true` disables TLS verification on the IdP. Development only. |

Multiple providers can coexist in the catalog. The user picks one at login.

For role-based access control (which authenticated identity can do what), see Administering → RBAC reference. RBAC is a separate concern from authentication: authentication answers "who is this?", RBAC answers "what may they do?"

## Secrets

Three sourcing patterns. Pick the one that matches your deployment surface.

### Environment Variables

The default. Every secret in a config is a `${VAR}` placeholder. Set the variable in the process environment before launch.

```yaml
broker_password: ${SOLACE_BROKER_PASSWORD}
api_key: ${ANTHROPIC_API_KEY}
oauth_client_secret: ${OIDC_CLIENT_SECRET}
```

Four expansion forms are supported. The set-but-empty case is the one to watch — `${VAR, default}` does not fall back when `VAR` is exported empty.

| Form | Behavior |
|---|---|
| `${VAR}` | Value if set (even when empty); empty string otherwise. |
| `${VAR, default}` | Value if set (even when empty); `default` if `VAR` is unset. |
| `${VAR:-default}` | Value if set and non-empty; `default` otherwise (unset or empty). |
| `${VAR:+alt}` | `alt` if set and non-empty; empty string otherwise. |

A bare `${VAR}` with no default expands to an empty string, not a startup error. Use the comma form when only an unset variable should fall back; use the `:-` form when an exported-but-empty value should fall back too. Verify critical secrets with `sam-enterprise doctor` (the `doctor` subcommand ships with the `-enterprise` build only) or by inspecting the rendered config before launch. See Config schema for the same table in the shared-mechanics section.

### File References

For Kubernetes secret mounts and Docker secrets, the `*_file` suffix on LLM provider keys reads the file contents at startup:

```yaml
model:
  model: openai/gpt-4o
  api_key_file: /var/run/secrets/llm/api_key
```

Supported `_file` keys today: `api_key_file`, `oauth_token_url_file`, `oauth_client_id_file`, `oauth_client_secret_file`. Bifrost-level passthrough keys also accept the `_file` suffix (Vertex AI's `auth_credentials_file`, for example).

### Manifest Variables

For `sam config apply` workflows, the `manifest.yaml` declares variables that are substituted into per-resource YAML at apply time:

```yaml
# manifests/prod.yaml
kind: manifest
name: production
target:
  url: https://platform.example.com
  auth:
    type: bearer_token
    envVar: SAM_PLATFORM_TOKEN
variables:
  region: us-east-1
  artifact_bucket: agent-mesh-artifacts-prod
```

Environment variables override manifest variables of the same name at apply time. See Reference → CLI → `sam config apply`.

## Validate the Configuration

Three commands confirm the configuration is well-formed before the first task arrives.

### Plan the Declarative Apply

If you author resources via `sam config apply`, run a plan first to confirm what the apply would change:

```bash
sam config plan
```

A clean plan with no diff means the manifest matches the platform state. Any error here means the manifest has a structural problem; resolve it before applying.

### Doctor

The `sam-enterprise` CLI ships a `doctor` subcommand that runs broker connectivity, LLM reachability, object-storage credentials, and TLS certificate checks against the current environment. The `SAM_DOCTOR_CONTEXT` variable selects the rule set (`local` for a developer laptop, `helm` for a Kubernetes install, `wheel` for a Python-distribution context).

```bash
SAM_DOCTOR_CONTEXT=local sam-enterprise doctor -v
```

A non-zero exit means at least one check failed. The output names the specific check and the remediation step. The `doctor` subcommand ships with the `-enterprise` build only; when running the base `sam` build, validate the configuration by inspecting the rendered YAML and exercising the broker and LLM endpoints manually.

### Health Check

Two health endpoints are served. The gateway proxy at `:8800/health` returns a plain `ok` body for liveness probes. The dedicated health server at `:8090/health` returns the component-aware JSON envelope:

```bash
curl -fsS http://localhost:8090/health
```

A `200 OK` with `{"status":"healthy"}` means every component reported healthy. `{"status":"unhealthy","error":"..."}` names the failing component.

## What Next?

The system is configured. The natural next step depends on whether you are deploying or building:

- If you are choosing a deployment topology (single-pod vs split, Docker vs Kubernetes, embedded vs distributed), see Deploy options.
- If you are ready to author your first agent or gateway, see Building → Agents.
