---
title: Environment Variables
description: Every environment variable the Agent Mesh runtime reads, plus the authentication and secret placeholders that appear in shipped YAML samples, grouped by concern with defaults and related YAML keys.
sidebar_position: 1030
---

# Environment Variables

This page catalogs the environment variables Solace Agent Mesh reads at runtime, together with the authentication and secret placeholders that appear in the shipped YAML samples. Variables are grouped by operator concern, and the rows within each group are alphabetical. Per-agent and per-example credentials are not listed here, because each agent declares its own in its configuration. Some variable families are read by a third-party software development kit (SDK) rather than by Agent Mesh directly; those are summarized under [Variables Read Through an SDK](#variables-read-through-an-sdk).

Agent Mesh expands `${VAR}` references in a YAML configuration file before it parses the file. The loader recognizes the following substitution forms:

- `${VAR}` — Uses the value of `VAR`, or an empty string when `VAR` is unset. A bare reference with no default is reported as unresolved when the variable is missing.
- `${VAR, default}` — Uses the value of `VAR`, or the literal `default` when `VAR` is unset.
- `${VAR:-default}` — Uses the value of `VAR` when it is set and non-empty, or `default` otherwise.
- `${VAR:+alt}` — Uses `alt` when `VAR` is set and non-empty, or an empty string otherwise.

Defaults and alternatives are themselves expanded, so nested references resolve.

The Scope column names the workload that reads each variable:

- **Entrypoint Executor**: the process that hosts the web UI, REST, and channel entrypoints.
- **Agent-Workflow Executor**: the agent and workflow runtime.
- **Secure Tool Runtime**: the sandboxed tool-execution process.
- **Platform**: the Platform service, which handles agent management, deployment, and the AI assistant.
- **sam**: the `sam` command-line interface.
- **doctor**: the `sam-doctor` pre-flight diagnostics binary.
- **all**: shared infrastructure code that more than one workload reads.
- **yaml**: no direct read in code. The variable appears only as a `${VAR}` placeholder in a shipped YAML sample.

## Runtime

These variables set the directories the runtime uses for data, skills, tool binaries, and sandbox volumes, select the sandbox isolation mode, and toggle behavior for the agent, the Secure Tool Runtime, and the Platform.

| Name | Default | Scope | Description | Related YAML key |
|---|---|---|---|---|
| `BACKGROUND_TASKS_TIMEOUT_MS` | `3600000` | yaml | Sets the maximum wall-clock time a background task may run, in milliseconds. | `background_tasks.default_timeout_ms` |
| `ENABLE_EMBED_RESOLUTION` | `true` | yaml | Controls whether the agent resolves late-stage `«type:params»` embed tokens. | `enable_embed_resolution` |
| `SAM_AUTH_TOKEN` | — | sam | Sets the bearer token for `sam api`, `sam task send`, `sam task run`, and `sam eval`. These commands provide no `--token` flag. | — |
| `SAM_BUILTIN_SKILLS_DIR` | bundled | Secure Tool Runtime | Overrides the directory of built-in skill bundles. | — |
| `SAM_CHROMIUM_PATH` | resolves `chromium`, `chrome`, then `google-chrome` on the `PATH` | Secure Tool Runtime | Sets the path to the Chromium binary the Mermaid renderer uses. | — |
| `SAM_CONTAINER_HOST_MOUNT_SCOPE` | — | sam, Entrypoint Executor | Sets the host mount scope for container-mode tool volumes. | — |
| `SAM_DATA_DIR` | `./sam-data` | all | Sets the root directory for filesystem artifacts, SQLite databases, identity keys, and agent resources. | `artifact_service.base_path` |
| `SAM_HOME` | `$XDG_CONFIG_HOME/sam` | sam | Sets the root directory for `sam` CLI settings and wizard state. | — |
| `SAM_PLATFORM_TOKEN` | — | sam | Sets the bearer-token override for `sam config apply`, `sam manifest apply`, and `sam plan`. | — |
| `SAM_SANDBOX_DIR` | bundled with the app, with a development fallback elsewhere | sam | Sets the directory of prebuilt Linux sandbox binaries used to build the Secure Tool Runtime container image. | — |
| `SAM_SKILLS_DIR` | `<SAM_HOME>/skills` (container images use `/opt/sam/skills`) | Agent-Workflow Executor, Secure Tool Runtime, Platform | Sets the directory scanned for skill manifests. | `skills_base_path` |
| `SAM_SKILLS_LINUX_DIR` | `<SAM_HOME>/skills-linux` | sam | Sets the Linux-flavored skills directory mounted into the Secure Tool Runtime sandbox container. | — |
| `SAM_STR_PYTHON` | resolved on the `PATH` | Secure Tool Runtime | Overrides the Python interpreter the Secure Tool Runtime uses for Python tools. | — |
| `SAM_TOOLS_DIR` | `<SAM_HOME>/tools` (container images use `/opt/sam/tools`) | Secure Tool Runtime | Sets the directory scanned for tool-binary manifests. | — |
| `SAM_TOOLS_LINUX_DIR` | `<SAM_HOME>/tools-linux` | sam | Sets the Linux tool-binary directory mounted into the Secure Tool Runtime sandbox container. | — |
| `SAM_TOOL_PYTHON_VERSION` | `3.11` | sam | Sets the Python version `sam toolset package` and `sam skill package` build a bundled Python tool against. | — |
| `SAM_TOOL_TARGET_ARCH` | `arm64` | sam | Sets the target CPU architecture `sam toolset package` and `sam skill package` build for. | — |
| `SAM_TOOL_TARGET_OS` | `linux` | sam | Sets the target operating system `sam toolset package` and `sam skill package` build for. | — |
| `SAM_VOLUME_ROOT` | `<SAM_DATA_DIR>/volumes` (container images use `/app/data/volumes`) | all | Sets the persistent-volume root for stateful tools such as `claude_code`. | `volume_root` |
| `SAM_WEBUI_URL` | — | sam | Sets the base URL of the web UI entrypoint when a `sam` subcommand is given no `--target`. | — |
| `SEED_BUILTIN_AGENTS` | `true` | yaml | Controls whether the Platform seeds the built-in agents into an empty database on first run. | `seed_builtin_agents` |
| `STR_RECONCILE_INTERVAL` | `5m` | Secure Tool Runtime | Sets how often the Secure Tool Runtime reconciles its tool and skill manifests, as a Go duration such as `2m30s`. | — |
| `STR_SANDBOX_MODE` | `direct` | yaml | Selects the Secure Tool Runtime sandbox isolation strategy: `direct`, `bwrap`, or `prlimit-only`. | `sandbox.mode` |
| `STR_SECCOMP_BIND_DENY` | off | Secure Tool Runtime | Denies the `bind` syscall in the Secure Tool Runtime seccomp profile when set to `1`, `true`, `yes`, or `on`. | — |
| `STR_WORK_BASE_DIR` | `/tmp/sam-str-work` | yaml | Sets the base working directory for Secure Tool Runtime tool execution. | `sandbox.work_base_dir` |
| `USE_TEMPORARY_QUEUES` | `true` | all | Controls whether event-broker queues are temporary rather than durable. | `broker_connection.temporary_queue` |
| `VAULT_ADDR` | — | sam | Sets the HashiCorp Vault server address for manifest `!vault:` secret references. | — |
| `VAULT_TOKEN` | falls back to `~/.vault-token` | sam | Sets the Vault authentication token. | — |

## Connectivity

These variables configure the event-broker connection, the HTTP listen ports, the Transport Layer Security (TLS) material, and Model Context Protocol (MCP) connection verification. Agent Mesh honors the standard Go proxy convention (`HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`) on all outbound HTTP clients. Each agent declares its own credentials, so check an agent's configuration for the variables it expects.

| Name | Default | Scope | Description | Related YAML key |
|---|---|---|---|---|
| `ALL_PROXY` | — | all | Sets the proxy URL applied to outbound traffic when the scheme-specific variables are unset. | — |
| `FASTAPI_HTTPS_PORT` | HTTPS disabled | Entrypoint Executor | Sets the optional HTTPS listen port for the entrypoint, paired with `SSL_CERTFILE` and `SSL_KEYFILE`. | — |
| `FASTAPI_PORT` | `8800` | Entrypoint Executor | Sets the HTTP listen port for the Entrypoint Executor. | — |
| `HTTP_PROXY` | — | all | Sets the proxy URL for outbound HTTP requests. | — |
| `HTTPS_PROXY` | — | all | Sets the proxy URL for outbound HTTPS requests. | — |
| `PLATFORM_API_HOST` | `localhost` | yaml | Sets the HTTP listen host for the Platform service. | — |
| `PLATFORM_API_PORT` | `8001` | yaml | Sets the HTTP listen port for the Platform service. | — |
| `PLATFORM_SERVICE_URL` | — | yaml | Sets the Platform external base URL stamped onto connector specification URLs. Empty means the Platform is mounted behind this entrypoint. | — |
| `SAM_MCP_CONNECTOR_TLS_VERIFY` | `true` | Agent-Workflow Executor, Platform | Disables TLS verification for MCP HTTP transports when set to `false`. Per-connector configuration still takes precedence. | `ssl_config.verify` |
| `SOLACE_BROKER_PASSWORD` | `default` | all | Sets the event-broker password. | `broker_connection.broker_password` |
| `SOLACE_BROKER_URL` | `ws://localhost:8008` | all | Sets the event-broker connection URL. An empty or unset value switches the runtime to development-broker mode. | `broker_connection.broker_url` |
| `SOLACE_BROKER_USERNAME` | `default` | all | Sets the event-broker username. | `broker_connection.broker_username` |
| `SOLACE_BROKER_VPN` | `default` | all | Sets the Message VPN on the event broker. | `broker_connection.broker_vpn` |
| `SOLACE_DEV_MODE` | `false` | all | Forces the runtime into development-broker mode when `true`. | `broker_connection.dev_mode` |
| `SOLACE_TLS_TRUST_STORE_DIR` | `/etc/ssl/certs/` | all | Sets the certificate authority (CA) certificate directory for `tcps://` and `wss://` event-broker connections. On macOS the runtime materializes an embedded certificate bundle when this is unset. `TRUST_STORE` is an accepted alternative name. | — |
| `SSL_CERTFILE` | — | Entrypoint Executor | Sets the path to the TLS certificate file for the entrypoint HTTPS listener. | — |
| `SSL_KEYFILE` | — | Entrypoint Executor | Sets the path to the TLS private-key file for the entrypoint HTTPS listener. | — |
| `SSL_KEYFILE_PASSWORD` | — | Entrypoint Executor | Sets the passphrase for an encrypted TLS private key. | — |

## LLM Service and Providers

Runtime large language model (LLM) wiring is canonical: the agent reads `LLM_SERVICE_API_KEY`, `LLM_SERVICE_ENDPOINT`, and the per-purpose model names. The `LLM_SERVICE_OAUTH_*` variables cover an LLM proxy behind OAuth 2.0. Image generation, image description, speech-to-text, and text-to-speech each carry their own provider and model settings.

| Name | Default | Scope | Description | Related YAML key |
|---|---|---|---|---|
| `AUDIO_TRANSCRIPTION_API_BASE` | — | yaml | Sets the base URL for the speech-to-text service. | — |
| `AUDIO_TRANSCRIPTION_API_KEY` | — | yaml | Sets the API key for the speech-to-text service. | — |
| `AUDIO_TRANSCRIPTION_MODEL_NAME` | — | yaml | Sets the model name for the speech-to-text service. | — |
| `AZURE_SPEECH_KEY` | — | yaml | Sets the API key for Azure Speech Services. | — |
| `AZURE_SPEECH_REGION` | — | yaml | Sets the region for Azure Speech Services. | — |
| `GEMINI_API_BASE` | `https://generativelanguage.googleapis.com` | yaml | Overrides the Gemini API base URL. | — |
| `GEMINI_TTS_URL` | `https://generativelanguage.googleapis.com/v1beta` | yaml | Sets the Gemini text-to-speech endpoint. | — |
| `IMAGE_DESCRIPTION_MODEL_NAME` | — | yaml | Sets the vision model used to describe images. | — |
| `IMAGE_MODEL_NAME` | — | Platform | Sets the image-generation model. | model alias `image_gen` |
| `IMAGE_SERVICE_API_KEY` | — | Platform | Sets the API key for the image-generation service. | — |
| `IMAGE_SERVICE_ENDPOINT` | — | Platform | Sets the endpoint URL for the image-generation service. | — |
| `LLM_REPORT_MODEL_NAME` | — | Platform | Sets the model the report generator uses. | model alias `report_gen` |
| `LLM_SERVICE_API_KEY` | — | Agent-Workflow Executor, Platform | Sets the runtime LLM API key. The first-run wizard writes the matched provider key here. | `model.api_key` |
| `LLM_SERVICE_ENDPOINT` | — | Agent-Workflow Executor, Platform | Sets the LLM endpoint URL. | `model.api_base` |
| `LLM_SERVICE_GENERAL_MODEL_NAME` | — | Agent-Workflow Executor, Platform | Sets the default general-purpose model string for agents. | model alias `general` |
| `LLM_SERVICE_MAX_TOKENS` | `32000` | yaml | Sets the maximum number of output tokens per model call. | `max_tokens` |
| `LLM_SERVICE_OAUTH_CA_CERT_PATH` | — | yaml | Sets the CA bundle for an OAuth-protected LLM server with a self-signed certificate. | — |
| `LLM_SERVICE_OAUTH_CLIENT_ID` | — | yaml | Sets the OAuth 2.0 client ID for the LLM proxy. | — |
| `LLM_SERVICE_OAUTH_CLIENT_SECRET` | — | yaml | Sets the OAuth 2.0 client secret for the LLM proxy. | — |
| `LLM_SERVICE_OAUTH_ENDPOINT` | — | yaml | Sets the LLM API endpoint behind OAuth 2.0. | — |
| `LLM_SERVICE_OAUTH_GENERAL_MODEL_NAME` | — | yaml | Sets the default general model for the OAuth-protected LLM. | — |
| `LLM_SERVICE_OAUTH_PLANNING_MODEL_NAME` | — | yaml | Sets the planning model for the OAuth-protected LLM. | — |
| `LLM_SERVICE_OAUTH_SCOPE` | — | yaml | Sets the OAuth 2.0 scope requested when fetching an LLM access token. | — |
| `LLM_SERVICE_OAUTH_TOKEN_REFRESH_BUFFER_SECONDS` | `300` | yaml | Sets how many seconds before expiry the OAuth token refresh fires. | — |
| `LLM_SERVICE_OAUTH_TOKEN_URL` | — | yaml | Sets the OAuth 2.0 token endpoint for the LLM proxy. | — |
| `LLM_SERVICE_PLANNING_MODEL_NAME` | — | Agent-Workflow Executor, Platform | Sets the planning model string for agents. | model alias `planning` |
| `STT_PROVIDER` | `openai` | yaml | Selects the speech-to-text provider. | `provider` |
| `TTS_PROVIDER` | `gemini` | yaml | Selects the text-to-speech provider: `gemini`, `azure`, or `polly`. | `provider` |

The first-run wizard auto-detects standard provider variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `AZURE_OPENAI_API_KEY`, and similar) and writes the matched key into `LLM_SERVICE_API_KEY` for runtime use. In production, set `LLM_SERVICE_API_KEY` directly. The provider-specific names are used only by the wizard.

## Storage

These variables select the artifact storage backend (filesystem, Amazon S3, S3-compatible stores, Google Cloud Storage, and Azure Blob Storage), set per-component bucket overrides, and configure the database URLs for the Platform, the orchestrator, the notification service, and the web UI entrypoint session store. Static Amazon Web Services credentials are honored when present. For the wider AWS, Google Cloud, and Azure credential-discovery chains, see [Variables Read Through an SDK](#variables-read-through-an-sdk).

| Name | Default | Scope | Description | Related YAML key |
|---|---|---|---|---|
| `ARTIFACT_BASE_PATH` | `/tmp/samv2` | Platform | Sets the filesystem artifact root the Platform writes into agent configuration. | `artifact_service.base_path` |
| `ARTIFACT_BUCKET_NAME` | falls back to `OBJECT_STORAGE_BUCKET_NAME`, then `S3_BUCKET_NAME` | Agent-Workflow Executor | Overrides the artifact-storage bucket for a component. | `artifact_service.bucket_name` |
| `ARTIFACT_SERVICE_TYPE` | `filesystem` | Platform | Sets the storage type the Platform writes into agent configuration. | `artifact_service.type` |
| `AWS_ACCESS_KEY_ID` | — | all | Sets the static AWS access key ID for the S3 artifact backend. | — |
| `AWS_REGION` | `us-east-1` | all | Sets the AWS region for the S3 artifact backend. | — |
| `AWS_SECRET_ACCESS_KEY` | — | all | Sets the static AWS secret access key for the S3 artifact backend. | — |
| `AWS_SESSION_TOKEN` | — | all | Sets the temporary session token used with static AWS credentials. | — |
| `AZURE_STORAGE_ACCOUNT_KEY` | — | all | Sets the Azure Blob Storage account key. | — |
| `AZURE_STORAGE_ACCOUNT_NAME` | — | all | Sets the Azure Blob Storage account name. | — |
| `AZURE_STORAGE_CONNECTION_STRING` | — | all | Sets the full Azure Blob Storage connection string, as an alternative to account name plus key. | — |
| `AZURE_STORAGE_CONTAINER_NAME` | — | all | Sets the Azure Blob container for artifact storage. | — |
| `CONNECTOR_SPEC_BUCKET_NAME` | falls back to `OBJECT_STORAGE_BUCKET_NAME` | all | Sets the bucket for connector specification storage. | — |
| `GCS_CREDENTIALS_JSON` | — | all | Sets inline Google service-account JSON in place of a file on disk. | — |
| `GCS_PROJECT` | — | all | Sets the Google Cloud project ID for the Google Cloud Storage backend. | — |
| `GOOGLE_APPLICATION_CREDENTIALS` | — | all | Sets the path to a Google service-account credentials file for the Google Cloud Storage backend. | — |
| `NOTIFY_DATABASE_URL` | falls back to `PLATFORM_DATABASE_URL` | yaml | Sets the database URL for the notification service. | `database_url` |
| `NOTIFY_RETENTION_DAYS` | `30` | yaml | Sets how many days the notification service retains inbox entries. | `retention_days` |
| `OBJECT_STORAGE_BUCKET_NAME` | — | all | Sets the default bucket used by any component without its own override. | — |
| `OBJECT_STORAGE_FS_ROOT` | — | Platform | Sets the local filesystem root for the Platform filesystem backend, for development use. | — |
| `OBJECT_STORAGE_TYPE` | `filesystem` | all | Selects the artifact backend: `filesystem`, `s3`, `gcs`, `azure`, or `memory` (test only). The shipped configuration supplies `filesystem` through `${OBJECT_STORAGE_TYPE, filesystem}`; with no `artifact_service` block the code falls back to `s3`. | `artifact_service.type` |
| `PERSISTENCE_TYPE` | `sql` | Platform | Sets the session-store backend type the Platform writes into agent configuration. | `session_service.type` |
| `PLATFORM_DATABASE_URL` | `sqlite:///<SAM_DATA_DIR>/platform.db` | Platform | Sets the database URL for the Platform service. | `database_url` |
| `S3_BUCKET_NAME` | — | all | Sets the S3 bucket. `ARTIFACT_BUCKET_NAME` takes precedence. | — |
| `S3_ENDPOINT_URL` | — | all | Sets the S3 endpoint for S3-compatible backends such as MinIO. | `endpoint_url` |
| `S3_REGION` | `us-east-1` | Platform | Sets the S3 region the Platform writes into agent configuration. | — |
| `S3_RETRY_MAX_ATTEMPTS` | `6` | all | Sets the maximum retry attempts for S3 requests. Per-backend configuration takes precedence; a value of `0` or less leaves the SDK default in place. | `retry_max_attempts` |
| `SESSION_SERVICE_TYPE` | `sql` | yaml | Selects the session-store backend type. | `session_service.type` |
| `WEB_UI_GATEWAY_DATABASE_URL` | `sqlite:///<SAM_DATA_DIR>/sam.db` | Entrypoint Executor | Sets the session-store database URL for the web UI entrypoint. | `session_service.database_url` |
| `WEB_UI_SESSION_SERVICE_TYPE` | `sql` | yaml | Selects the session-store backend type for the web UI entrypoint. | `session_service.type` |

## Authentication and Authorization

These variables configure the OpenID Connect (OIDC) client credentials, the single sign-on (SSO) callback surface, the role-based access control (RBAC) role-mapping paths, the session-cookie signing secret, and the JSON Web Token (JWT) trust manager. Per-example-agent credentials are not listed, because each agent declares its own.

| Name | Default | Scope | Description | Related YAML key |
|---|---|---|---|---|
| `AUTHORIZATION_TYPE` | `none` | yaml | Selects the authorization backend: `default_rbac` or `none`. The Platform writes `default_rbac` into generated agent configuration. | `authorization_service.type` |
| `DEFAULT_ROLES` | — | yaml | Sets the default role set assigned under RBAC. | `authorization_service.default_roles` |
| `EXTERNAL_AUTH_CALLBACK` | `http://localhost:8800/api/v1/auth/callback` | yaml | Sets the OAuth redirect URI registered with the identity provider. | `external_auth_callback_uri` |
| `EXTERNAL_AUTH_PROVIDER` | `azure` | yaml | Names the OIDC catalog entry the entrypoint uses; the value must match an entry in your OIDC provider catalog. | `external_auth_provider` |
| `EXTERNAL_AUTH_SERVICE_URL` | `http://localhost:8080` | yaml | Sets the base URL of the external authentication service. | `external_auth_service_url` |
| `FRONTEND_REDIRECT_URI` | `http://localhost:8800` | Agent-Workflow Executor, Entrypoint Executor | Sets the tool-OAuth redirect URI fallback used when `OAUTH_TOOL_REDIRECT_URI` is unset. | — |
| `FRONTEND_REDIRECT_URL` | `/auth-callback.html` | yaml | Sets where the entrypoint sends the browser after a successful login. | `frontend_redirect_url` |
| `OAUTH_TOOL_REDIRECT_URI` | falls back to `FRONTEND_REDIRECT_URI` | Agent-Workflow Executor, Entrypoint Executor | Overrides the OAuth 2.0 redirect URI for tool-side flows. | — |
| `OIDC_CA_CERT_PATH` | — | yaml | Sets the CA bundle path for a self-signed identity-provider certificate. | `ca_cert_path` |
| `OIDC_CLIENT_ID` | — | yaml | Sets the OIDC client ID. | `client_id` |
| `OIDC_CLIENT_SECRET` | — | yaml | Sets the OIDC client secret. | `client_secret` |
| `OIDC_DEV_MODE` | `false` | yaml | Drops the `Secure` flag on the session and OAuth state cookies so they work over plain HTTP. For development only; it applies to any host, not just localhost, so keep it off in production. | `dev_mode` |
| `OIDC_INSECURE_SKIP_VERIFY` | `false` | yaml | Skips TLS verification when contacting the identity provider, for development use. | `insecure_skip_verify` |
| `OIDC_ISSUER` | — | yaml | Sets the OIDC issuer URL used for discovery. | `issuer` |
| `OIDC_REDIRECT_URI` | `http://localhost:8800/api/v1/auth/callback` | yaml | Overrides the OIDC callback URI. | `redirect_uri` |
| `ROLE_DEFINITIONS_PATH` | `config/auth/role-to-scope-definitions.yaml` | yaml | Sets the path to the role-to-scope definitions file. | `authorization_service.role_to_scope_definitions_path` |
| `SESSION_SECRET_KEY` | — | Entrypoint Executor | Signs entrypoint session cookies. The `sam` CLI wizard manages a companion `SAM_SESSION_SECRET`. | `session_secret_key` |
| `TOOL_OAUTH_CLIENT_ID` | — | Agent-Workflow Executor | Sets the tool OAuth client ID used when dynamic client registration is unavailable. | — |
| `TOOL_OAUTH_CLIENT_SECRET` | — | Agent-Workflow Executor | Sets the tool OAuth client secret used when dynamic client registration is unavailable. | — |
| `TOOL_OAUTH_INITIAL_ACCESS_TOKEN` | — | Agent-Workflow Executor | Sets the initial-access token that bootstraps OAuth 2.0 dynamic client registration. | — |
| `TRUST_CARD_PUBLISH_INTERVAL` | `10` | yaml | Sets the trust-manager card publish interval, in seconds. | `trust_manager.card_publish_interval_seconds` |
| `TRUST_MANAGER_ENABLED` | `false` | yaml | Controls whether the JWT trust manager runs. | `trust_manager.enabled` |
| `TRUST_STARTUP_WAIT_TIMEOUT` | `10` | yaml | Sets how long the trust manager waits during startup, in seconds. | `trust_manager.startup_wait_timeout_seconds` |
| `TRUST_VERIFICATION_MODE` | `strict` | yaml | Selects the JWT trust verification strategy. | `trust_manager.verification_mode` |
| `USER_ROLES_PATH` | `config/auth/user-to-role-assignments.yaml` | yaml | Sets the path to the user-to-role assignments file. | `authorization_service.user_to_role_assignments_path` |

The MCP-side tool OAuth flow also reads `MCP_CLIENT_ID`, `MCP_CLIENT_SECRET`, `MCP_AUTHORIZATION_URL`, `MCP_TOKEN_URL`, and `MCP_REFRESH_URL` as fallbacks when dynamic client registration is unavailable. Prefer the `TOOL_OAUTH_*` variables.

## Observability

These variables control the log level and format, the log file paths and rotation, the event-log and streaming queue caps, the task-logging detail, the event-broker payload and entrypoint artifact size limits, and the tokens for external observability backends.

| Name | Default | Scope | Description | Related YAML key |
|---|---|---|---|---|
| `DD_API_KEY` | — | yaml | Sets the Datadog API key for the Datadog observability integration. | — |
| `EVAL_DATASET_GEN_AGENT` | `Orchestrator` | Platform | Names the agent the evaluation data set generator delegates to. | — |
| `EVAL_DATASET_GEN_TIMEOUT` | `180` | Platform | Sets how many seconds the evaluation data set generator waits for the agent. | — |
| `GATEWAY_ARTIFACT_LIMIT_BYTES` | `10000000` | yaml | Sets the per-artifact upload cap on the entrypoint. | `gateway_artifact_content_limit_bytes` |
| `LOG_FORMAT` | `json` | all | Selects the log format: `text` for humans or `json` for cloud log aggregation. | `log.format` |
| `LOGGING_CONFIG_PATH` | — | all | Sets the path to an external YAML file whose `log:` block replaces the in-process configuration. | — |
| `MAX_MESSAGE_SIZE_BYTES` | `10000000` | yaml | Sets the maximum event-broker payload size. | `max_message_size_bytes` |
| `NR_LICENSE_KEY` | — | yaml | Sets the New Relic license key for the New Relic observability integration. | — |
| `OTEL_TOKEN` | — | yaml | Sets the authentication token for the OpenTelemetry exporter. | — |
| `SAM_AUDIT_LOG` | `true` | all | Controls whether the audit logger runs. This takes precedence over the YAML audit configuration. | `audit_log` |
| `SAM_FILE_LOG_LEVEL` | `DEBUG` | yaml | Sets the minimum level for the file logger. | `log.log_file_level` |
| `SAM_LOG_COMPRESS` | `false` | yaml | Controls whether rotated log files are compressed with gzip. | `log.compress` |
| `SAM_LOG_FILE` | `sam.log` | yaml | Sets the file path for the file logger. | `log.log_file` |
| `SAM_LOG_MAX_AGE_DAYS` | `0` | yaml | Sets the maximum age in days for rotated log files. `0` disables age-based rotation. | `log.max_age_days` |
| `SAM_LOG_MAX_BACKUPS` | `10` | yaml | Sets the number of rotated log files retained. | `log.max_backups` |
| `SAM_LOG_MAX_SIZE_MB` | `50` | yaml | Sets the size threshold in megabytes that triggers a log rotation. | `log.max_size_mb` |
| `SAM_STDOUT_LOG_LEVEL` | `INFO` | yaml | Sets the minimum level for the standard-error logger. | `log.stdout_log_level` |
| `SSE_MAX_QUEUE_SIZE` | `200` | yaml | Sets the outbound server-sent events queue cap per client. | `sse_max_queue_size` |
| `TASK_LOGGER_QUEUE_SIZE` | `600` | yaml | Sets the per-task event-log queue size. | `task_logger_queue_size` |
| `TASK_LOGGING_ARTIFACT_EVENTS` | `false` | yaml | Controls whether the task logger records artifact events. | `task_logging.log_artifact_events` |
| `TASK_LOGGING_ENABLED` | `true` | yaml | Controls whether task-event logging runs. | `task_logging.enabled` |
| `TASK_LOGGING_FILE_PARTS` | `true` | yaml | Controls whether the task logger records file parts. | `task_logging.log_file_parts` |
| `TASK_LOGGING_FLUSH_THRESHOLD` | `10` | yaml | Sets how many buffered events trigger a task-log flush. | `task_logging.hybrid_buffer.flush_threshold` |
| `TASK_LOGGING_HYBRID_BUFFER` | `true` | yaml | Controls whether the task logger uses a hybrid buffer. | `task_logging.hybrid_buffer.enabled` |
| `TASK_LOGGING_MAX_FILE_PART_SIZE` | `10240` | yaml | Sets the maximum recorded file-part size, in bytes. | `task_logging.max_file_part_size_bytes` |
| `TASK_LOGGING_MAX_PAYLOAD_TEXT_BYTES` | `16384` | yaml | Sets the maximum recorded payload-text size, in bytes. | `task_logging.max_payload_text_bytes` |
| `TASK_LOGGING_STATUS_UPDATES` | `true` | yaml | Controls whether the task logger records status updates. | `task_logging.log_status_updates` |

## Diagnostics

The `sam-doctor` pre-flight diagnostics binary runs from the Helm pre-install hook and as the `sam doctor` subcommand. It reads the following variables to control its own behavior.

| Name | Default | Scope | Description | Related YAML key |
|---|---|---|---|---|
| `SAM_DOCTOR_CONTEXT` | `local` | doctor | Selects which deployment checks run: `local`, `wheel`, or `helm`. | — |
| `SAM_DOCTOR_SKIP_CHECKS` | — | doctor | Comma-separated list of check names to skip, for example when a check does not apply to the deployment. | — |

To validate a deployment, `sam-doctor` also reads the runtime variables documented in the other sections. In addition, it inspects deployment-environment variables that the runtime itself does not read: `TLS_CERT_PATH`, `TLS_CERT`, `TLS_DNS_NAME`, `AUTHENTICATION_SERVER`, and `AUTHENTICATION_ENABLED`.

## Entrypoint and Channel

These variables configure each entrypoint: the entrypoint IDs, the web UI branding and behavior, the Cross-Origin Resource Sharing (CORS) allowlist, the topic-prefix namespace, the channel credentials for Slack, Microsoft Teams, and email, and the MCP entrypoint listen surface. Event-mesh entrypoints read their per-instance broker overrides through the `BROKER_URL_<envSuffix>` family described under [Dynamic-Name Patterns](#dynamic-name-patterns).

| Name | Default | Scope | Description | Related YAML key |
|---|---|---|---|---|
| `CORS_ALLOWED_ORIGIN_REGEX` | — | yaml | Sets the CORS allowlist regular expression for the web UI entrypoint. | `cors_allowed_origin_regex` |
| `EMAIL_EXTERNAL_BASE_URL` | — | Entrypoint Executor | Sets the external base URL for the email entrypoint. | — |
| `EMAIL_GATEWAY_ID` | configured | yaml | Identifies an email entrypoint instance. | `gateway_id` |
| `FRONTEND_BOT_NAME` | `Solace Agent Mesh` | yaml | Sets the display name shown in the web UI. | `frontend_bot_name` |
| `FRONTEND_COLLECT_FEEDBACK` | `true` | yaml | Controls whether the web UI collects thumbs-up and thumbs-down feedback. | `frontend_collect_feedback` |
| `FRONTEND_DISCLAIMER_TEXT` | empty | yaml | Sets the legal disclaimer text shown in the web UI, up to 500 characters. | `frontend_disclaimer_text` |
| `FRONTEND_SERVER_URL` | `http://localhost:8800` | yaml | Sets the entrypoint URL surfaced to the Builder agent tools. | `gateway_url` |
| `FRONTEND_USE_AUTHORIZATION` | `false` | all | Controls whether the web UI shows the authentication interface. | `frontend_use_authorization` |
| `FRONTEND_WELCOME_MESSAGE` | `How can I assist you today?` | yaml | Sets the welcome banner shown in the web UI. | `frontend_welcome_message` |
| `MCP_EXTERNAL_BASE_URL` | falls back to `<host>:<port>` | Entrypoint Executor | Sets the public URL of the MCP entrypoint used for OAuth discovery and authorize URLs. | — |
| `MCP_GATEWAY_ID` | configured | yaml | Identifies an MCP entrypoint instance. | `gateway_id` |
| `MCP_HOST` | `0.0.0.0` | yaml | Sets the bind host for the MCP entrypoint HTTP listener. | — |
| `MCP_ISSUER` | configured | yaml | Sets the OAuth 2.0 issuer URL the MCP entrypoint advertises. | `issuer` |
| `MCP_PORT` | `8800` | yaml | Sets the bind port for the MCP entrypoint HTTP listener. | — |
| `NAMESPACE` | `solace-agent-mesh` | yaml | Sets the topic-prefix namespace for Agent-to-Agent (A2A) and event-broker subscriptions. | top-level `namespace` |
| `SLACK_APP_TOKEN` | — | yaml | Sets the Slack app token for the socket-mode connection. | — |
| `SLACK_BOT_TOKEN` | — | yaml | Sets the Slack bot token. | — |
| `SLACK_DEFAULT_AGENT` | `Orchestrator` | yaml | Sets the default agent for inbound Slack messages. | `default_agent_name` |
| `SLACK_GATEWAY_ID` | configured | yaml | Identifies a Slack entrypoint instance. | `gateway_id` |
| `WEBUI_GATEWAY_ID` | `webui-gateway` | yaml | Identifies a web UI entrypoint instance. | `gateway_id` |

## Dynamic-Name Patterns

Agent Mesh constructs the following names at runtime. The concrete name depends on operator configuration, so this section documents the pattern rather than every instance.

**`BROKER_URL_<envSuffix>`** (per event-mesh entrypoint). The Platform builds each event-mesh entrypoint's broker credentials from the per-instance secrets `BROKER_URL_<envSuffix>`, `BROKER_VPN_<envSuffix>`, `BROKER_USERNAME_<envSuffix>`, and `BROKER_PASSWORD_<envSuffix>`, and falls back to the generic `SOLACE_BROKER_*` family when a per-instance override is unset. The `<envSuffix>` value is the entrypoint's record identifier upper-cased with hyphens replaced by underscores — the same transform as `<connUUID>` below — for example `BROKER_URL_7F3A82C4_B15D_4A6E_9C0B_1D2E3F4A5B6C`. Slack and Teams channels use the parallel families `SLACK_BOT_TOKEN_<suffix>`, `MICROSOFT_APP_ID_<suffix>`, and `MICROSOFT_APP_PASSWORD_<suffix>`.

**`BEARER_TOKEN_<connUUID>`** (per MCP connector). Connector credentials configured through the Platform administration interface are stored as `BEARER_TOKEN_<connUUID>`, `BASIC_USERNAME_<connUUID>`, `BASIC_PASSWORD_<connUUID>`, and `SERVER_URL_<connUUID>`, where `<connUUID>` is the connector record UUID upper-cased with hyphens replaced by underscores, following the same convention as `<envSuffix>`, for example `BEARER_TOKEN_7F3A82C4_B15D_4A6E_9C0B_1D2E3F4A5B6C`.

**`<COMPONENT>_BUCKET_NAME`** (per object-store consumer). A component that requires its own artifact bucket reads `<COMPONENT>_BUCKET_NAME` first and falls back to `OBJECT_STORAGE_BUCKET_NAME`. Known consumers include `ARTIFACT_BUCKET_NAME`, `CONNECTOR_SPEC_BUCKET_NAME`, and `STR_BUCKET_NAME`.

**`SAM_FEATURE_<UPPER_KEY>`** (per feature flag). Some capabilities are gated by feature flags rather than by a dedicated variable. Override one at the process level with `SAM_FEATURE_<UPPER_KEY>`, where `<UPPER_KEY>` is the flag key upper-cased with hyphens replaced by underscores. Truthy values are `true` and `1`. To disable a feature that is on by default, set the flag to `false`, for example `SAM_FEATURE_AUTO_TITLE_GENERATION=false`. This override is the only mechanism for feature flags; no YAML tier or `<FEATURE>_ENABLED` variable exists. Deployment configuration such as `TASK_LOGGING_ENABLED` is separate: it configures a subsystem and is not a feature flag, even where the names are similar.

## Variables Read Through an SDK

A few variable families influence the runtime through a third-party SDK rather than through an Agent Mesh read site. The authoritative reference for each is the SDK's own documentation.

- **AWS SDK**: `AWS_PROFILE`, the `AWS_ROLE_*` assume-role chain, and the workload-identity pair `AWS_WEB_IDENTITY_TOKEN_FILE` and `AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE`. The S3 backend follows the standard AWS credential-discovery chain. See the AWS SDK for Go documentation.
- **OpenTelemetry**: the `OTEL_*` family. Once an OpenTelemetry SDK is initialized, it reads these on the runtime's behalf. See the OpenTelemetry environment-variable specification.

The `bedrock-kb` tool temporarily unsets the static AWS credentials `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` while it loads its AWS configuration when it detects a workload-identity path (IAM Roles for Service Accounts or Amazon EKS Pod Identity), then restores them afterward. This forces the SDK onto the workload-identity path even when static credentials are also present in the same process.

## Next Steps

- Configure a deployment with the Helm chart: see [Helm Values Reference](./helm-values.md).
- Run and inspect the CLI that reads many of these variables: see [CLI Reference](./cli.md).
