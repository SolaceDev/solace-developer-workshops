---
title: Configuration Schema
description: This page describes the startup YAML configuration that the Entrypoint Executor, Platform service, and Secure Tool Runtime read at boot, including the loading pipeline, shared blocks, and per-process field tables.
sidebar_position: 1020
---

# Configuration Schema

Solace Agent Mesh reads two distinct kinds of YAML configuration. Startup configuration is the set of files each server process reads when it boots: which event broker to connect to, which ports to listen on, where sessions and artifacts persist, and how authentication works. Declarative configuration is the set of resource files you apply to the Platform service with `sam config apply` to manage agents, entrypoints, models, and toolsets over time. This page is the field reference for the startup configuration of the Entrypoint Executor, the Platform service, and the Secure Tool Runtime. For the declarative resource files, see [Managing Configuration as Code (Early Access)](../building/declarative-config/index.md). For the CLI commands that operate on both, see [CLI Reference](./cli.md).

## The Two Configuration Layers

| Layer | Read by | Reference |
|---|---|---|
| Startup configuration | Every server process at boot | This page |
| Declarative configuration | The Platform service, through `sam config apply` | [Managing Configuration as Code (Early Access)](../building/declarative-config/index.md) |

Agent definitions do not appear in the startup files. The Platform service owns them: you create agents in the Agent Mesh UI or apply them as declarative resources, and the Platform service deploys them into the Agent-Workflow Executor at runtime. For more information, see [Creating Agents](../building/agents/index.md) and [How Agent Mesh Manages Workloads](../concepts/managing-workloads.md).

How much you edit the startup files depends on the deployment:

- On Kubernetes, the Helm chart mounts the canonical startup files into each workload, and chart values set the environment variables those files read. You configure through values, not by editing YAML. For the value reference, see [Helm Values Reference](./helm-values.md).
- The desktop bundle runs with bundled defaults and requires no startup file edits. For more information, see [Installing the Desktop Bundle](../installing/desktop.md).
- For a custom deployment that runs the server binaries directly, you pass startup files with the `--config` flag, and this page is the field reference for authoring them.

## Startup Configuration Files

Each server process reads one startup file. The container images ship the canonical files, and each binary accepts the file through its `--config` flag:

| Process | Binary | Canonical file in the container image |
|---|---|---|
| Entrypoint Executor | `sam-gwe` | `/etc/sam/configs/gwe/gwe.yaml` |
| Platform service | `sam-platform` | `/etc/sam/configs/gwe/platform.yaml` |
| Secure Tool Runtime | `sam-str` | `/etc/sam/configs/str/str.yaml` |
| Agent-Workflow Executor | `sam-awe` | `/etc/sam/configs/awe/sam.yaml` |

The Entrypoint Executor binary also accepts `--platform-config` to run the Platform service behind the same HTTP listener as the entrypoints, which is how the Kubernetes chart deploys the two. The desktop bundle loads the same files into a single process.

The Agent-Workflow Executor file is not a field reference subject on this page because you do not author it: it carries only the process-wide blocks documented in the shared sections that follow (event broker connection, trust, session store, logging), environment variables set through Helm values configure it, and the agents it hosts arrive from the Platform service at runtime.

### File Structure

Every startup file has the same outer structure: optional top-level sections that configure process-wide services, plus an `apps` list where each entry configures one component instance.

```yaml
# startup file
log:
  stdout_log_level: INFO

trust_manager:
  enabled: ${TRUST_MANAGER_ENABLED, false}

apps:
  - name: webui_backend
    broker:
      broker_url: ${SOLACE_BROKER_URL, ws://localhost:8008}
      broker_username: ${SOLACE_BROKER_USERNAME, default}
      broker_password: ${SOLACE_BROKER_PASSWORD, default}
      broker_vpn: ${SOLACE_BROKER_VPN, default}
    app_config:
      namespace: ${NAMESPACE, solace-agent-mesh}
      gateway_id: webui-gateway
```

### Top-Level Keys

| Key | Type | Description |
|---|---|---|
| `apps` | list | One entry per component instance. Required. |
| `log` | object | Process-wide logging. See [Logging Configuration](#logging-configuration). |
| `broker` | object | Process-wide event broker connection, used only when no `apps` entry declares its own. See [The `broker` Block](#the-broker-block). |
| `trust_manager` | object | Signing-key exchange and JSON Web Token (JWT) verification between processes. See [Trust and Identity Blocks](#trust-and-identity-blocks). |
| `agent_identity` | object | The identity key used for credential encryption. See [Trust and Identity Blocks](#trust-and-identity-blocks). |
| `audit_log` | object | Security audit logging. The single key `enabled` defaults to `true`. |
| `providers` | object | The OpenID Connect (OIDC) provider catalog. Entrypoint Executor only. See [The `providers` Catalog](#the-providers-catalog). |
| `tool_defaults` | object | Process-level fallback tool configuration, merged into the configuration of every tool the process hosts. Agent-Workflow Executor only; a tool's own configuration wins on key conflict. |
| `management_server` | object | The health, readiness, and metrics listener. The `port` key sets the listen port, and the `observability` and `exporters` sections enable metrics. For the full block, see [Monitoring Your Agent Mesh](../administering/observability.md). |

### `apps` Entries

Each entry in `apps` has three fields:

| Field | Type | Description |
|---|---|---|
| `name` | string | Instance name. Required; the loader skips entries without a name. |
| `broker` | object | Event broker connection for this entry. See [The `broker` Block](#the-broker-block). |
| `app_config` | object | Component-specific configuration. Required; the fields differ per process and are the subject of the per-process sections that follow. |

When several component types load into one process, as in the desktop bundle, the runtime classifies each entry by its `app_config` fields: an entry with `component_type: platform` is the Platform service, an entry with `gateway_id` is an entrypoint, an entry with `worker_id`, a `sandbox` block, or tool discovery paths is a Secure Tool Runtime worker, and everything else runs as an agent. The standalone binaries skip classification and treat every entry in their file as their own component type.

:::warning
The `namespace` value must be identical across every process in a deployment. All agent-to-agent traffic flows on event broker topics prefixed with the namespace, so a process with a different namespace silently receives nothing.
:::

## Configuration Loading

Every startup file passes through the same loading pipeline before any component reads it:

1. The loader resolves `!include` directives by inlining the referenced files.
2. The loader expands `${VAR}` environment variable references in the raw text.
3. The loader parses the result as YAML, with standard anchor, alias, and merge-key support.

### Environment Variable Expansion

The loader supports these expansion forms:

| Form | Behavior |
|---|---|
| `${VAR}` | The value if the variable is set, even when empty. Empty string otherwise. |
| `${VAR, default}` | The value if the variable is set, even when empty. The expanded default if the variable is unset. |
| `${VAR:-default}` | The value if the variable is set and non-empty. The expanded default otherwise. |
| `${VAR:+alt}` | The expanded alternative if the variable is set and non-empty. Empty string otherwise. |

The loader also expands the default itself, so nested references such as `${OUTER, ${INNER, fallback}}` resolve.

:::warning
The comma form treats an exported empty string as a real value and does not fall back. A pipeline that exports `SOLACE_BROKER_PASSWORD=""` gets an empty password, not the default. Use the `${VAR:-default}` form when an empty value must also fall back. A bare `${VAR}` whose variable is unset expands to an empty string rather than failing startup, so a missing required variable surfaces as a confusing downstream error, not a loading error.
:::

Expansion happens on the raw text before the YAML parse, which has two consequences. A value such as `true` or `8080` is parsed as a YAML boolean or integer, not a string. And a variable that supplies a list-valued field must contain YAML flow syntax, for example `'["value-a", "value-b"]'`, not a comma-separated string. Verify required variables with `sam doctor` before launch. For the verification procedure, see [Configuring Agent Mesh](../installing/configure.md).

### The `!include` Directive

The `!include path/to/other.yaml` directive inlines another file at the position and indentation of the directive. Paths resolve relative to the file that contains the directive, included files can themselves contain `!include` directives, and the loader rejects circular includes. Includes resolve before environment variable expansion, so an included file can reference `${VAR}` and the expansion still applies. The shipped Entrypoint Executor file uses this directive to pull in the OIDC provider catalog:

```yaml
!include auth/oidc_providers.yaml
```

## The `broker` Block

The `broker` block inside each `apps` entry configures the event broker connection. When the block is absent, or `dev_mode` is true, the process connects to a local development broker instead of a Solace event broker. The block can instead sit at the top level of the file; a process reads the top-level block only when no `apps` entry declares its own, and the loader never merges the two.

| Key | Type | Default | Description |
|---|---|---|---|
| `broker_url` | string | none | Event broker URL, for example `tcps://host:55443`. Required unless `dev_mode` is true. |
| `broker_vpn` | string | `default` | Message VPN name. |
| `broker_username` | string | `default` | Client username. |
| `broker_password` | string | none | Client password. |
| `dev_mode` | bool | `false` when `broker_url` is set | Use a local development broker instead of a Solace event broker. |
| `temporary_queue` | bool | `true` in the shipped files | Present for compatibility with existing configuration files. The runtime provisions its reply queues automatically. |
| `reconnection_strategy` | string | `forever_retry` | Either `forever_retry` (keep retrying until the process stops) or `parametrized_retry` (give up after `retry_count` attempts). Keep the default unless you want an unreachable event broker to eventually fail the process. An unrecognized value falls back to `forever_retry` with a warning. |
| `retry_count` | int | `60` | Reconnection attempts under `parametrized_retry`. Ignored, with a warning, under `forever_retry`. |
| `retry_interval` | int | `5000` | Delay between reconnection attempts, in milliseconds. |
| `trust_store_path` | string | none | Directory of certificate authority (CA) certificates for TLS validation. |
| `tls_skip_verify` | bool | `false` | Disable TLS certificate validation. For testing only. |

## The `model` Block

The Entrypoint Executor, the Platform service, and the Secure Tool Runtime each accept an optional `model` block in `app_config` that configures a process-level large language model (LLM) client. On the Entrypoint Executor, this client generates chat titles, serves the prompt builder, and answers the AI Assistant endpoints; on the Platform service, it scores evaluation runs; on the Secure Tool Runtime, it serves LLM callbacks from tools that reason in their own subprocess. This block seeds the process at startup; you configure the managed model catalog that agents reference by alias separately. For more information, see [Configuring Models](../building/models/index.md).

| Key | Type | Default | Description |
|---|---|---|---|
| `model` | string | none | Model identifier as `<provider>/<model-name>`, for example `anthropic/claude-sonnet-4-5`. The prefix selects the provider protocol. For the provider list, see [Configuring Agent Mesh](../installing/configure.md). |
| `api_base` | string | none | Provider endpoint URL. |
| `api_key` | string | none | Provider API key. |
| `api_key_file` | string | none | File path to read the API key from, in place of `api_key`. |
| `request_timeout_seconds` | int | provider default | Per-request timeout. |
| `num_retries` | int | provider default | Transient-error retries. An explicit `0` disables retries. |
| `extra_headers` | map | none | Additional HTTP headers sent on every request. |
| `api_ca_cert` | string | none | CA bundle path for a private-CA provider endpoint. |
| `api_skip_tls_verify` | bool | `false` | Disable TLS validation to the provider endpoint. For testing only. |

A set of `oauth_*` keys configures OAuth 2.0 client-credentials authentication to the provider in place of a static API key: `oauth_token_url`, `oauth_client_id`, and `oauth_client_secret` (all three are required together, and each also accepts a `*_file` variant that reads the value from a file), plus `oauth_scope`, `oauth_ca_cert`, `oauth_token_refresh_buffer_seconds`, `oauth_max_retries`, `oauth_allow_insecure_token_url`, and `oauth_skip_tls_verify`. Keys the runtime does not recognize pass through to the provider, which is how you supply provider-specific parameters such as an Azure API version.

## The Artifact Service Block

The Entrypoint Executor and the Secure Tool Runtime each accept an `artifact_service` block in `app_config` that selects where versioned artifacts persist. Both processes must point at the same backend so an artifact written by a tool is readable by the entrypoint. For the concept, see [Artifacts](../concepts/artifacts.md).

| Key | Type | Default | Description |
|---|---|---|---|
| `type` | string | none | One of `filesystem`, `s3`, `gcs`, `azure`, or `memory`. When the block is absent, the process disables artifact features and logs a warning at startup. |
| `base_path` | string | `SAM_DATA_DIR` or `./sam-data` | Root directory for the `filesystem` type. The service stores under an `artifacts` subdirectory of this path. |
| `bucket_name` | string | `OBJECT_STORAGE_BUCKET_NAME` | Bucket or container name for the object-store types. The `azure` type also accepts `container_name` as an alias. |
| `endpoint_url` | string | `S3_ENDPOINT_URL` | Custom endpoint for S3-compatible stores. |
| `region` | string | `AWS_REGION` or `us-east-1` | Region for the `s3` type. |
| `artifact_scope` | string | `namespace` | Storage scoping for artifact paths: `namespace` shares one artifact space across the deployment, and `agent` scopes paths to the owning component. |

Credentials resolve from the standard provider environment variables when not set in the block: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN` for S3 (the block also accepts the same keys directly), `credentials_file` or application default credentials for GCS, and `connection_string` or `account_name` for Azure. For more information about sourcing these values from a secret store, see [Managing Secrets](../administering/secrets-management.md).

:::warning
The S3 backend validates bucket access at startup and fails the process on a missing or forbidden bucket. The GCS and Azure backends defer their checks to the first read or write, so verify access independently before relying on them.
:::

## Entrypoint Executor Configuration

Each entry in the Entrypoint Executor file's `apps` list is one entrypoint instance. The optional `gateway_adapter` block selects the transport; when it is absent, the entry is the Web UI entrypoint:

```yaml
# entrypoint app_config with a transport selector
app_config:
  gateway_adapter:
    type: slack
    adapter_config:
      slack_bot_token: ${SLACK_BOT_TOKEN}
      slack_app_token: ${SLACK_APP_TOKEN}
```

The registered types are `httpsse` (the Web UI entrypoint, the default), `slack`, `teams`, `email`, `mcp`, and `eventmesh`. Most deployments manage the other entrypoint types through the Platform service rather than the startup file. For the per-transport fields, see [Configuring Entrypoints](../building/entrypoints/index.md).

The HTTP listener binds to `fastapi_host` and `fastapi_port` from the first `apps` entry that sets a `fastapi_port`; the `--listen` flag overrides both, and `:8080` applies when no entry sets a port. TLS comes from the `ssl_certfile`, `ssl_keyfile`, `ssl_keyfile_password`, and `fastapi_https_port` fields, falling back to the `SSL_CERTFILE`, `SSL_KEYFILE`, `SSL_KEYFILE_PASSWORD`, and `FASTAPI_HTTPS_PORT` environment variables. For certificate provisioning, see [Configuring TLS](../administering/tls.md).

### Core Fields

| Key | Type | Default | Description |
|---|---|---|---|
| `namespace` | string | none | Required. The event broker namespace shared by every process. |
| `gateway_id` | string | the `apps` entry name | Unique identity for this entrypoint instance; it appears on trust cards and JWTs. A missing value defaults to the `apps` entry name, and the process logs a warning. |
| `session_secret_key` | string | none | Secret for web session signing and for deriving the restart-stable trust signing key. |
| `fastapi_host` | string | `127.0.0.1` | HTTP bind address. The shipped file sets `0.0.0.0`. |
| `fastapi_port` | int | `8800` | HTTP port. A value of `0` auto-assigns a free port. When no `apps` entry sets this key at all, the listener binds `:8080` instead, as described at the start of this section. |
| `fastapi_https_port` | int | `0` | HTTPS port. When set with the `ssl_*` fields, the process serves HTTP and HTTPS on both ports. |
| `ssl_certfile`, `ssl_keyfile`, `ssl_keyfile_password` | string | none | TLS certificate, private key, and optional key passphrase. |
| `cors_allowed_origins` | list | none | Allowed CORS origins. |
| `cors_allowed_origin_regex` | string | none | Regular expression for dynamic CORS origins. |
| `sse_max_queue_size` | int | `200` | Per-connection Server-Sent Events (SSE) queue size. |
| `default_user_identity` | string | none | Fallback user identity when no authentication layer supplies one. Development only. |
| `force_user_identity` | string | none | Overrides every user identity. Development only. |

:::warning
Set `session_secret_key` to a strong, stable secret in production. The shipped file falls back to a placeholder value, and a restart with a changed or absent secret invalidates existing sessions and rotates the trust signing key.
:::

### Authentication Fields

| Key | Type | Default | Description |
|---|---|---|---|
| `frontend_use_authorization` | bool | `false` | Enable login and authorization for the Agent Mesh UI. |
| `external_auth_provider` | string | `generic` | Name of the provider entry in the `providers` catalog to authenticate with. |
| `external_auth_service_url` | string | none | Base URL of the authentication service, normally this entrypoint's own public URL. |
| `external_auth_callback_uri` | string | none | The OIDC callback URI registered with the identity provider, ending in `/api/v1/auth/callback`. |
| `frontend_auth_login_url` | string | none | Login page URL the Agent Mesh UI redirects unauthenticated users to. When authorization is enabled and this is unset, the built-in `/api/v1/auth/login` route applies. |
| `frontend_redirect_url` | string | none | Post-login redirect URL. |
| `authorization_service` | object | `type: none` | Authorization mode. See the following table. |

The `authorization_service.type` field selects how the entrypoint resolves each user's role-based access control (RBAC) scopes:

| Mode | Behavior |
|---|---|
| `none` | Login runs when configured, and every user receives the universal scope. Development default. |
| `deny_all` | Login runs, and the entrypoint denies every request. |
| `default_rbac` | The entrypoint calls the Platform service over the event broker at token-mint time and embeds the returned scopes in the JWT. Role definitions live on the Platform service. |

For the scope grammar and role authoring, see [RBAC Reference](./rbac-reference.md).

### Agent Mesh UI Fields

The `frontend_*` keys customize the Agent Mesh UI that the Web UI entrypoint serves:

| Key | Type | Default | Description |
|---|---|---|---|
| `frontend_server_url` | string | none | The public URL of this entrypoint. It appears in emitted links and serves as the trust card address. |
| `frontend_welcome_message` | string | none | Welcome message on the chat screen. |
| `frontend_bot_name` | string | none | Display name of the assistant. |
| `frontend_logo_url` | string | none | URL of a replacement logo image for the Agent Mesh UI. |
| `frontend_small_logo_url` | string | none | URL of a compact logo variant for narrow layouts. |
| `frontend_collect_feedback` | bool | `false` | Show response feedback controls. |
| `frontend_disclaimer_text` | string | none | Disclaimer shown on the welcome screen. The entrypoint truncates values over 500 characters and logs a warning. |
| `platform_service.url` | string | none | Absolute URL of a separately hosted Platform service. Leave empty when the Platform service is mounted behind this entrypoint's listener; the Agent Mesh UI then uses same-origin requests. |

### Task Handling Fields

| Key | Type | Default | Description |
|---|---|---|---|
| `system_purpose` | string | none | System purpose text injected into agent prompts. |
| `response_format` | string | none | Response formatting guidance injected into agent prompts. |
| `task_timeout_seconds` | int | `300` | Idle time before the Agent Mesh UI shows a non-terminal still-working notice. The timer resets on every streaming update. A value of `0` disables both timeout tiers. |
| `task_hard_timeout_seconds` | int | `3600` | Idle time before the entrypoint cancels the task at the agent and emits a terminal timeout. An explicit value must exceed `task_timeout_seconds` or startup fails; when you raise only `task_timeout_seconds` past this default, the hard limit lifts automatically. |
| `task_request_ttl_seconds` | int | `task_timeout_seconds` | The time-to-live (TTL) of an undelivered task request: how long it may wait on the agent's queue before the event broker discards it. A value of `0` disables the TTL. |
| `background_tasks.default_timeout_ms` | int | `3600000` | Default timeout for tasks moved to the background. |
| `enable_embed_resolution` | bool | `true` | Resolve embed directives in agent output at the entrypoint. |
| `gateway_artifact_content_limit_bytes` | int | `10000000` | Maximum artifact size for late-stage embed resolution. |
| `gateway_max_upload_size_bytes` | int | `50000000` | Maximum artifact upload size. |
| `gateway_max_project_size_bytes` | int | `50000000` | Maximum project import size. |
| `gateway_max_batch_upload_size_bytes` | int | `50000000` | Maximum batch upload size. |

### Advanced Fields

| Key | Type | Default | Description |
|---|---|---|---|
| `card_publish_interval_seconds` | int | `60` | How often this entrypoint republishes its discovery card to the event broker. A value of `0` disables periodic publishing. The nested form `gateway_card_publishing.interval_seconds` is also accepted and takes precedence. |
| `gateway_capabilities` | map | none | Boolean capability flags attached to outbound requests, overriding the values the transport advertises. |
| `async_event_log` | bool | `true` | Persist task events in background batches instead of one database write per event. Only effective with a session database. |
| `event_workers` | int | `0` | Event dispatch worker count. A value of `0` derives the count from available CPUs, and `1` serializes all event processing. |
| `task_logger_queue_size` | int | `600` | Buffered queue size for the task event logger. |

### Service Blocks

The remaining `app_config` blocks configure per-entrypoint services.

The `session_service` block selects where conversation history persists. For the concept, see [Sessions](../concepts/sessions.md).

| Key | Type | Default | Description |
|---|---|---|---|
| `type` | string | `memory` | Either `sql` (durable sessions) or `memory` (volatile, development only). |
| `database_url` | string | none | Session database connection string for the `sql` type: a `sqlite:///` path or a PostgreSQL URL. |

:::warning
Without `session_service.type: sql` and a `database_url`, the entrypoint runs a volatile in-memory session store: chat history does not survive a restart, and task logging is unavailable. The process logs a warning at startup rather than failing.
:::

The `volume_service` block enables user volumes:

| Key | Type | Default | Description |
|---|---|---|---|
| `enabled` | bool | `true` when the block is present | Set it to `false` to keep the block but turn volumes off. |
| `type` | string | `filesystem` | Either `filesystem` or `memory`. |
| `root` | string | `volumes` under the Agent Mesh home directory | Storage directory for the `filesystem` type. |
| `per_user_quota_bytes` | int | `0` | Cap on the total managed-volume bytes per user. A value of `0` means unlimited. |

Two related flat keys gate host-path access: `volumes_allow_host_paths` (default `false`) permits volumes that link to or copy from server host paths, and `volumes_require_container_mount_for_linked` (default `false`) additionally rejects a linked path that does not resolve inside a directory mounted into the tool runtime container.

The `task_logging` block controls the per-task event log behind the task monitor:

| Key | Type | Default | Description |
|---|---|---|---|
| `enabled` | bool | `false` | Record task events. The shipped file enables it. |
| `log_status_updates` | bool | `true` | Include streaming status updates. |
| `log_artifact_events` | bool | `true` | Include artifact create and update events. |
| `log_file_parts` | bool | `true` | Include file-part payloads. |
| `max_file_part_size_bytes` | int | `102400` | Cap on each recorded file part. |
| `max_payload_text_bytes` | int | `16384` | Cap on each recorded text value. A value of `0` disables the cap. |

The `scheduler_service` block controls scheduled task execution. The service is enabled by default when a session database is configured:

| Key | Type | Default | Description |
|---|---|---|---|
| `enabled` | bool | `true` | Run the scheduler. Requires a session database. |
| `default_timeout_seconds` | int | `3600` | Execution timeout for scheduled tasks that set none. |
| `max_concurrent_executions` | int | `10` | Cap on simultaneously running scheduled tasks. |
| `stale_execution_timeout_seconds` | int | `7200` | Age at which an execution row with no progress counts as stale. |
| `stale_cleanup_interval_seconds` | int | `600` | How often the scheduler sweeps for stale executions. |
| `retry_delay_seconds` | int | `60` | Delay before retrying a failed execution. |
| `execution_history_keep_count` | int | `100` | Execution history rows kept per scheduled task. |
| `misfire_grace_time_seconds` | int | `60` | How late a due run may fire before the scheduler skips it. |
| `auto_pause_after_consecutive_failures` | int | `10` | Pause a schedule after this many consecutive failures. A value of `0` disables auto-pause. |

The `speech` block configures speech-to-text and text-to-speech for voice interaction. The `speech.stt.provider` key selects `openai` or `azure`, and `speech.tts.provider` selects `gemini`, `azure`, or `polly`. Each provider reads credentials from its own sub-block, and a provider whose credentials are unresolved reports as not configured. For the user-facing feature, see [Talking to Agents with Voice](../using-agent-mesh/voice-interaction.md).

| Provider sub-block | Keys |
|---|---|
| `stt.openai` | `url`, `api_key`, `model` |
| `stt.azure`, `tts.azure` | `api_key`, `region`, plus `language` for speech-to-text and `default_voice`, `voices`, `output_format` for text-to-speech. The two blocks share credentials. |
| `tts.gemini` | `url`, `api_key`, `model`, `default_voice`, `voices` |
| `tts.polly` | `aws_access_key_id`, `aws_secret_access_key`, `region`, `engine`, `default_voice`, `voices` |

The `data_retention` block controls automatic cleanup of old task, feedback, and SSE event rows in the session database. Cleanup runs by default:

| Key | Type | Default | Description |
|---|---|---|---|
| `enabled` | bool | `true` | Run the retention sweep. |
| `task_retention_days` | int | `90` | Age at which task rows are deleted. |
| `feedback_retention_days` | int | `90` | Age at which feedback rows are deleted. |
| `sse_event_retention_days` | int | `30` | Age at which SSE event rows are deleted. |
| `cleanup_sse_events` | bool | `true` | Include SSE events in the sweep. |
| `cleanup_interval_hours` | int | `24` | How often the sweep runs. |
| `batch_size` | int | `1000` | Rows deleted per batch. |

The `feedback_publishing` block enables publishing each feedback submission to the event broker for downstream consumers. For the feature, see [Collecting and Publishing User Feedback](../administering/user-feedback.md).

| Key | Type | Default | Description |
|---|---|---|---|
| `enabled` | bool | `false` | Publish feedback events. |
| `topic` | string | `sam/feedback/v1` | Topic the events publish to. |

The `observability_monitor` block is an opt-in monitor that reacts to task failures and negative feedback by submitting background investigation tasks to a designated observability agent:

| Key | Type | Default | Description |
|---|---|---|---|
| `enabled` | bool | `false` | Turn the monitor on. |
| `target_agent` | string | `Observability Agent` | Agent that receives the investigation tasks. |
| `on_task_failure` | bool | `true` | Trigger on terminal task failures. |
| `on_negative_feedback` | bool | `true` | Trigger on negative feedback ratings. |
| `cooldown_seconds` | int | `300` | Per-failure-signature cooldown between investigations. |
| `max_concurrent` | int | `1` | Cap on in-flight investigations. |
| `system_user` | string | `sentinel-monitor` | Identity the investigations run under. |
| `notify_on_result` | bool | `false` | Deliver each investigation result as a notification. |
| `notify_recipients` | list | none | User IDs that receive result notifications. Required when `notify_on_result` is `true`. |

### The `providers` Catalog

The top-level `providers` key on the Entrypoint Executor file declares the OIDC identity providers available for login. The shipped file includes it from `auth/oidc_providers.yaml`. Each entry is keyed by provider name and referenced from `external_auth_provider`:

```yaml
# oidc provider catalog, included into the entrypoint startup file
providers:
  azure:
    issuer: "${OIDC_ISSUER}"
    client_id: "${OIDC_CLIENT_ID}"
    client_secret: "${OIDC_CLIENT_SECRET}"
    scopes: ["openid", "email", "profile", "offline_access"]
```

| Key | Type | Default | Description |
|---|---|---|---|
| `issuer` | string | none | Required. OIDC issuer URL. The catalog skips an entry without it and logs a warning. |
| `client_id` | string | none | Required. OAuth client ID. |
| `client_secret` | string | none | OAuth client secret. |
| `redirect_uri` | string | none | Override for the callback URI. |
| `scopes` | list | `openid`, `email`, `profile`, `offline_access` | Scopes requested at login. |
| `ca_cert_path` | string | none | CA bundle for a private-CA identity provider. |
| `insecure_skip_verify` | bool | `false` | Disable TLS validation to the identity provider. Development only. |
| `dev_mode` | bool | `false` | Drop the Secure flag on the state cookie so login works over plain HTTP on localhost. Development only. |

## Platform Service Configuration

The Platform service reads the first entry in its file's `apps` list. For more information about the Platform service, see [Platform Service](../concepts/platform-service.md).

| Key | Type | Default | Description |
|---|---|---|---|
| `namespace` | string | none | Required. The event broker namespace shared by every process. |
| `component_type` | string | none | Set to `platform` so a shared process classifies the entry correctly. Inert for the standalone binary. |
| `platform_id` | string | `platform` | Component identity on trust cards. |
| `database_url` | string | none | Platform database connection string: a `sqlite:///` path or a PostgreSQL URL. When unset, the service creates a SQLite database under the data directory. |
| `fastapi_host` | string | `127.0.0.1` | HTTP bind address for the standalone binary. |
| `fastapi_port` | int | `8001` | HTTP port for the standalone binary. |
| `fastapi_https_port` | int | `8444` | HTTPS port when the `ssl_*` fields are set. |
| `ssl_certfile`, `ssl_keyfile`, `ssl_keyfile_password` | string | none | TLS certificate, private key, and optional key passphrase. |
| `cors_allowed_origins` | list | none | Allowed CORS origins. Must include the Agent Mesh UI origin when the Platform service runs on its own host. |
| `cors_allowed_origin_regex` | string | none | Regular expression for dynamic CORS origins. |
| `frontend_use_authorization` | bool | `false` | Require authenticated JWTs on platform endpoints. Without it, requests run under a development identity. |
| `external_auth_service_url` | string | none | Authentication service URL shared with the entrypoint. |
| `external_auth_provider` | string | `generic` | Provider name shared with the entrypoint. |
| `authorization_service` | object | `type: deny_all` when absent | RBAC authority settings: `type` (shared with the entrypoint), `role_to_scope_definitions_path`, `user_to_role_assignments_path`, and `default_roles`. Unlike the entrypoint, the standalone Platform service denies every request when the block is absent. For role authoring, see [RBAC Reference](./rbac-reference.md). |
| `seed_builtin_agents` | bool | `true` | Seed the built-in Orchestrator into an empty platform database on first run. Set it to `false` when you apply agents declaratively. |
| `max_message_size_bytes` | int | `10000000` | Maximum event broker message size the Platform service publishes. |
| `health_check_interval_seconds` | int | `30` | Discovery registry sweep interval. |
| `health_check_ttl_seconds` | int | `90` | Time-to-live for agent and entrypoint registry entries. |
| `resource_store` | object | none | Object store for connector specifications and skill files. Same keys and types as [The Artifact Service Block](#the-artifact-service-block). |
| `str_store` | object | none | Object store for toolset packages that Secure Tool Runtime workers download. Same keys and types as [The Artifact Service Block](#the-artifact-service-block). |
| `artifact_service` | object | none | The deployment's artifact store, shared so evaluation scoring can read agent-produced artifacts. |
| `model` | object | none | LLM client for the evaluation judge. See [The `model` Block](#the-model-block). |

:::warning
The entrypoint and the Platform service must agree on `authorization_service.type`. Under `default_rbac` the entrypoint resolves every user's scopes through the Platform service, so setting the mode on only one of the two produces an entrypoint that starts but denies every request.
:::

## Secure Tool Runtime Configuration

The Secure Tool Runtime worker reads its `app_config` for the worker pool identity, tool discovery paths, and sandboxing. For more information about the Secure Tool Runtime, see [How Agent Mesh Manages Workloads](../concepts/managing-workloads.md).

| Key | Type | Default | Description |
|---|---|---|---|
| `namespace` | string | none | Required. The event broker namespace shared by every process. |
| `worker_id` | string | `builtin-tools-worker` | Worker pool name. Workers with the same `worker_id` bind the same queue as competing consumers; a worker with no value joins the default pool, and the runtime logs a warning. |
| `skills_dir` | string | none | Mutable skills directory that uploaded skill bundles unpack into. |
| `builtin_skills_dir` | string | none | Read-only bundled skills directory scanned in addition to `skills_dir`. |
| `toolsets_dir` | string | none | Directory the worker scans for toolset packages, and the target the Platform service's toolset uploads sync into. |
| `manifest_paths` | list | none | Explicit tool manifest files merged into the tool map. The `--tools-dir` flag injects discovered manifests here. |
| `default_timeout_seconds` | int | `300` | Default tool execution timeout. |
| `max_message_redelivery` | int | `1` | How many times the event broker redelivers a tool invocation that crashed the worker before discarding it. A value of `0` means the event broker default of unlimited redelivery. |
| `respect_message_ttl` | bool | `true` | Honor the per-message time-to-live on the worker queue, so the worker drops an invocation that aged out while the pool was down instead of executing it stale. |
| `reconcile_interval` | string | `5m` | How often the worker re-scans its toolset packages to repair missed sync notifications, as a duration string. The `STR_RECONCILE_INTERVAL` environment variable overrides it. |
| `tool_output_llm_return_max_bytes` | int | `102400` | Size above which the worker writes a tool result to an artifact and returns it by reference instead of inline, protecting the event broker message size limit. |
| `model` | object | none | LLM client for tool callback requests. Without it, a tool that calls the LLM from its own subprocess fails. See [The `model` Block](#the-model-block). |
| `artifact_service` | object | none | Artifact store the worker reads inputs from and writes results to. See [The Artifact Service Block](#the-artifact-service-block). |
| `volume_root` | string | none | Root directory for user volumes mounted into tool sandboxes. |

:::note
The `tools_dir` and `packages_dir` keys are deprecated aliases for `toolsets_dir`. A single alias still works, and the runtime logs a deprecation warning; startup fails when an alias is set together with `toolsets_dir`, or when both aliases are set, because the values can disagree.
:::

### The `sandbox` Block

The `sandbox` block controls how the worker isolates each tool subprocess:

| Key | Type | Default | Description |
|---|---|---|---|
| `mode` | string | `direct` | One of `direct` (no isolation), `bwrap` (Linux namespace sandbox), or `prlimit-only` (resource limits without namespaces). |
| `work_base_dir` | string | `/tmp/sam-str-work` | Staging directory for per-invocation work and artifact preload. Point it at disk-backed storage when tools stage large artifacts, because `/tmp` is often memory-backed on Kubernetes nodes. |
| `bwrap_bin` | string | `/usr/bin/bwrap` | Path to the bubblewrap binary for `bwrap` mode. |
| `prlimit_bin` | string | `/usr/bin/prlimit` | Path to the prlimit binary. |
| `default_profile` | string | `standard` | Sandbox profile applied to tools that do not declare one. |
| `default_timeout_seconds` | int | `300` | Sandbox-level execution timeout. |
| `fresh_proc` | string | `auto` | Whether `bwrap` mode mounts a fresh procfs: `auto`, `always`, or `never`. Any other value fails startup. |

:::warning
The default `direct` mode runs tool subprocesses with no filesystem or resource isolation. For production deployments on Linux, set `mode: bwrap` to isolate each invocation in its own namespace (requires the bubblewrap binary), or at minimum `prlimit-only` to apply resource limits without namespaces.
:::

The worker sizes its own concurrency, with no operator keys: the compute budget follows the container's CPU allotment, and the number of simultaneously running invocations derives from its memory limit.

## Trust and Identity Blocks

The top-level `trust_manager` section appears in every startup file, including the Agent-Workflow Executor file, and controls the signing-key card exchange that lets processes verify each other's JWTs.

:::warning
Enable the trust manager on every process or on none. A process with trust disabled cannot verify tokens minted elsewhere, so a mixed deployment rejects otherwise valid requests.
:::

| Key | Type | Default | Description |
|---|---|---|---|
| `enabled` | bool | `false` | Publish this process's signing keys and verify peers. |
| `card_publish_interval_seconds` | int | `60` | Trust card republish interval. |
| `card_expiration_days` | int | `30` | Trust card lifetime. |
| `verification_mode` | string | `strict` | Either `strict` or `permissive`. |
| `clock_skew_tolerance_seconds` | int | `300` | Allowed clock skew when validating token timestamps. |
| `jwt_default_ttl_seconds` | int | `3600` | Default lifetime of minted JWTs. |
| `jwt_max_ttl_seconds` | int | `86400` | Maximum lifetime of minted JWTs. |
| `startup_wait_timeout_seconds` | int | `120` | How long startup waits to receive peer trust cards. |
| `min_required_gateways` | int | `1` | How many entrypoint trust cards must arrive before the wait is satisfied. |
| `fail_on_timeout` | bool | `true` | Fail startup when the wait times out, instead of continuing without peer keys. |
| `key_rotation_interval_seconds` | int | `0` | Automatic signing-key rotation period. A value of `0` disables rotation. |
| `key_overlap_retention_seconds` | int | JWT default TTL | How long a rotated-out key remains valid for verification. |

The top-level `agent_identity` section configures the identity key used to encrypt stored credentials:

| Key | Type | Default | Description |
|---|---|---|---|
| `key_mode` | string | `auto` | The `auto` mode generates and persists a key; `manual` uses the key you supply. |
| `key_identity` | string | none | Hex-encoded key of at least 16 characters. Required in `manual` mode. |
| `key_persistence` | string | `keys/_agent_{name}.key` | File path where `auto` mode persists the generated key. |

## Logging Configuration

The top-level `log` section configures process logging:

| Key | Type | Default | Description |
|---|---|---|---|
| `format` | string | `json` | Either `json` or `text`. The `LOG_FORMAT` environment variable overrides the file. |
| `stdout_log_level` | string | `INFO` | Console level: `DEBUG`, `INFO`, `WARN`, or `ERROR`. When a `log` section is present without this key, the console level is `DEBUG`. |
| `log_file` | string | none | Log file path. Empty disables file logging. |
| `log_file_level` | string | `DEBUG` | File log level. |
| `max_size_mb` | int | `0` | Rotate the file at this size, in MiB. A value of `0` disables rotation, and the process warns at startup that the file grows unbounded. |
| `max_backups` | int | `10` | Rotated files to keep. An explicit `0` keeps all backups. |
| `max_age_days` | int | `0` | Maximum backup age. A value of `0` keeps backups indefinitely. |
| `compress` | bool | `false` | Compress rotated backups with gzip. |

Setting the `LOGGING_CONFIG_PATH` environment variable to a YAML file replaces the `log` section of every process that reads it, which gives a deployment one shared logging policy. For log shipping, metrics, and the trace ID correlation model, see [Monitoring Your Agent Mesh](../administering/observability.md).

## Next Steps

- [Managing Configuration as Code (Early Access)](../building/declarative-config/index.md) covers the declarative resource files and `sam config apply`.
- [Helm Values Reference](./helm-values.md) covers the chart values that drive these files on Kubernetes.
- [Environment Variables](./env-vars.md) covers the variables the shipped files read.
- [Configuring Agent Mesh](../installing/configure.md) walks through configuring a fresh install concern by concern.
- [Troubleshooting Your Installation](../installing/troubleshoot.md) covers startup failures, including configuration errors these fields can produce.
