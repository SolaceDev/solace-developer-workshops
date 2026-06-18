---
title: Environment Variables
description: Every environment variable the Solace Agent Mesh runtime reads, plus the auth and secret placeholders that appear in shipped YAML samples — grouped by concern, with defaults and related YAML keys.
sidebar_position: 3
---

# Environment Variables

This page catalogs every environment variable Agent Mesh reads at runtime, plus the auth and secret placeholders that appear in shipped YAML samples. Variables are grouped by operator concern; inside each group the rows are alphabetical. Third-party SDK conventions (full AWS, Google Cloud, and OpenTelemetry env-var families) are out of scope — see the Not catalogued here footer for pointers to their upstream documentation.

The YAML loader recognises four `${VAR}` substitution forms: `${VAR}` is required and surfaces as unresolved if missing; `${VAR, default}` uses the literal `default` when `VAR` is unset; `${VAR:-default}` is the shell-style optional-with-default form; `${VAR:+alt}` substitutes `alt` when `VAR` is set and the empty string otherwise. The *Scope* column names which workload reads the variable — `gateway`, `awe` (Agent-Workflow Executor), `str` (Secure Tool Runtime), `platform`, `sam` (the `sam` CLI), `all` (shared infrastructure code), or `yaml` (no Go read site; the variable only appears as a `${VAR}` placeholder in shipped samples).

## Runtime

Paths the runtime uses for data, skills, tool binaries, and the sandbox; mode toggles for the embedded STR and platform deployment; behavior flags that change what the agent or platform does at runtime. Per-agent feature flags shipped in YAML samples sit here too.

| Name | Default | Scope | What it does | Related YAML key |
|---|---|---|---|---|
| `AUTO_TITLE_GENERATION_ENABLED` | `true` | yaml | Whether the gateway auto-generates session titles. | gateway behaviour |
| `BACKGROUND_TASKS_ENABLED` | `true` | yaml | Permits background task processing on the gateway. | gateway behaviour |
| `BACKGROUND_TASKS_TIMEOUT_MS` | `3600000` | yaml | Maximum wall-clock time a background task may run. | gateway behaviour |
| `DEPLOYER_TYPE` | — | platform | When set to `cloud`, alters platform behaviour for hosted deployments. | — |
| `DEPLOYMENT_CHECK_INTERVAL` | `60` | yaml | Platform deployment-status poll interval in seconds. | platform polling |
| `DEPLOYMENT_TIMEOUT_MINUTES` | `5` | yaml | Maximum minutes the platform waits for a deployment to complete. | platform deployment |
| `ENABLE_EMBED_RESOLUTION` | `true` | yaml | Whether the agent resolves `«type:params»` embed tokens. | agent embed toggle |
| `HEARTBEAT_TIMEOUT_SECONDS` | `90` | yaml | Agent-discovery heartbeat timeout. | agent heartbeat |
| `PERSISTENCE_TYPE` | `sql` | platform | Session store backend type emitted into agent YAML by the platform. | `session_service.type` |
| `SAM_AUTH_TOKEN` | — | sam | Bearer token for `sam api` / `sam task send` / `sam task run` / `sam eval` (highest-priority token source; there is no `--token` flag). | — |
| `SAM_CHROMIUM_PATH` | falls back to `chromium` / `chrome` / `google-chrome` on `PATH` | str | Path to the Chromium binary used by the Mermaid renderer tool. | — |
| `SAM_COMPACTION_PERCENTAGE` | `0.25` | yaml | Conversation-history compaction trigger ratio. | agent compaction |
| `SAM_DATA_DIR` | `./sam-data` | all | Single root for filesystem artifacts, SQLite databases, identity keys, and agent resources. | `artifact_service.base_path`, `session_service.database_url` |
| `SAM_DISABLE_EMBEDDED_STR` | unset | all | When set to `1` or `true`, suppresses the embedded STR so an external `sam-str` can take tool invocations. | — |
| `SAM_HOME` | `$XDG_CONFIG_HOME/sam` (i.e. `~/.config/sam` on Linux / `~/Library/Application Support/sam` on macOS) | sam | Root directory for the `sam` CLI's settings and wizard state. | — |
| `SAM_PLATFORM_TOKEN` | — | sam | Highest-priority bearer-token override for `sam config apply` / `sam manifest apply` / `sam plan`. | — |
| `SAM_SANDBOX_DIR` | bundled with the macOS app; dev fallback elsewhere | sam, awe | Directory holding pre-built Linux sandbox binaries used to build the STR container image. | — |
| `SAM_SKILLS_DIR` | `<SAM_HOME>/skills` | awe, str | Directory the STR scans for skill manifests; agent reads from the same path. | `skills_dir`, `skills_base_path` |
| `SAM_SKILLS_LINUX_DIR` | `<SAM_HOME>/skills-linux` | str | Linux-flavoured skills directory mounted into the STR sandbox container. | — |
| `SAM_TOOLS_DIR` | `<SAM_HOME>/tools` | str | Directory the STR scans for tool-binary manifests. | — |
| `SAM_TOOLS_LINUX_DIR` | `<SAM_HOME>/tools-linux` | str | Linux tool binaries mounted into the STR sandbox container. | — |
| `SAM_TOOL_PYTHON_VERSION` | `3.13` | sam | Python version `sam toolset package` / `sam skill package` cross-installs dependencies against when building a bundled Python tool. | — |
| `SAM_TOOL_TARGET_ARCH` | `arm64` | sam | Target CPU architecture `sam toolset package` / `sam skill package` build for when the Platform service is not queried. | — |
| `SAM_TOOL_TARGET_OS` | `linux` | sam | Target OS `sam toolset package` / `sam skill package` build for when the Platform service is not queried. | — |
| `SAM_VOLUME_ROOT` | `<SAM_DATA_DIR>/volumes` | str | Persistent volume root for stateful tools such as `claude_code`. | `volume_root` |
| `SAM_WEBUI_URL` | — | sam | Base URL of the WebUI gateway when no `--target` is given to a `sam` subcommand. | — |
| `SCHEDULER_SERVICE_ENABLED` | `false` | yaml | Whether the scheduled-task service runs. | scheduler toggle |
| `STR_SANDBOX_MODE` | `direct` | yaml | Selects the STR sandbox isolation strategy: `direct`, `bwrap`, or `container`. | `sandbox.mode` |
| `TOOLSET_DISCOVERY_CHECK_INTERVAL_SEC` | `60` | platform | Toolset-discovery tick interval in seconds. | — |
| `TOOLSET_DISCOVERY_PENDING_TIMEOUT_SEC` | `120` | platform | How long a toolset may remain `pending` before the platform flags it. | — |
| `TRUST_MANAGER_ENABLED` | *configured* | yaml | Whether the JWT trust manager runs. | trust manager |
| `USE_TEMPORARY_QUEUES` | `true` | yaml | Whether broker queues are temporary (vs persistent). | broker queue behaviour |
| `VAULT_ADDR` | — | sam | HashiCorp Vault server address used by manifest `!vault:` secret references. | — |
| `VAULT_TOKEN` | falls back to `~/.vault-token` | sam | HashiCorp Vault authentication token. | — |

## Connectivity

Solace broker connection, the dev-broker overrides, HTTP/network listen ports for the gateway and platform, TLS material, and the corporate-proxy trio. Agent Mesh honours the standard Go HTTP proxy convention (`HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`) on all outbound HTTP clients.

Agents declare their own credentials. Check each agent's YAML configuration for the env vars that agent expects.

| Name | Default | Scope | What it does | Related YAML key |
|---|---|---|---|---|
| `ALL_PROXY` | — | all | Standard Go proxy URL applied to outbound traffic when scheme-specific vars are unset. | — |
| `DEV_BROKER_PORT` | `55554` | sam | Override for the dev-broker TCP port that the CLI spawns; parent-side only. | — |
| `FASTAPI_HTTPS_PORT` | — (HTTPS disabled) | gateway | Optional HTTPS listen port for the gateway; pairs with `SSL_CERTFILE` / `SSL_KEYFILE`. | dual-port TLS |
| `HEALTH_ADDR` | `:8090` | all | Listen address for the embedded runtime's `/healthz` endpoint. | — |
| `HTTP_PROXY` | — | all | Standard Go proxy URL for outbound HTTP requests. | — |
| `HTTPS_PROXY` | — | all | Standard Go proxy URL for outbound HTTPS requests. | — |
| `PLATFORM_API_HOST` | `localhost` | yaml | HTTP listen host for the platform and gateway services. *Aliases: `PLATFORM_FAST_API_HOST`, `FASTAPI_HOST`.* | platform / gateway listen host |
| `PLATFORM_API_PORT` | `8001` (platform) / `8800` (gateway) | gateway, platform | HTTP listen port for the platform and gateway services. *Aliases: `PLATFORM_FAST_API_PORT`, `FASTAPI_PORT`.* | platform / gateway listen port |
| `PLATFORM_SERVICE_URL` | computed from host and port | platform | The platform's own external base URL, stamped onto connector spec URLs (`specification_url`); falls back to its own host:port. Not used by the gateway or frontend — the platform is served same-origin behind the gateway proxy. | — |
| `SAM_DEV_BROKER_HOST` | — | all | Host name of the network dev broker; set by the embedded orchestrator so child processes can find it. | — |
| `SAM_DEV_BROKER_PORT` | — | all | Companion of `SAM_DEV_BROKER_HOST`; set by the parent and read by child processes. | — |
| `SAM_MCP_CONNECTOR_TLS_VERIFY` | `true` | awe, platform | Set to `false` to disable TLS verification for MCP HTTP transports; per-connector YAML still wins. | `ssl_config.verify` |
| `SAM_PLATFORM_ALLOW_PRIVATE_MCP` | unset (guard active) | platform | Disables the SSRF guard for MCP discovery; intended for in-cluster dev only. | — |
| `SOLACE_BROKER_PASSWORD` | — | all | Password for the Solace broker. | `broker_connection.broker_password` |
| `SOLACE_BROKER_URL` | — | all | Solace broker connection URL; an empty or unset value switches the runtime to dev-broker mode. | `broker_connection.broker_url` |
| `SOLACE_BROKER_USERNAME` | `default` | all | Username for the Solace broker. | `broker_connection.broker_username` |
| `SOLACE_BROKER_VPN` | `default` | all | Message VPN on the Solace broker. | `broker_connection.broker_vpn` |
| `SOLACE_DEV_MODE` | unset (auto for `sam run` / desktop) | all | When `true`, forces the runtime into dev-broker mode. | `broker_connection.dev_mode` |
| `SOLACE_TLS_SKIP_VERIFY` | unset | all | Disables broker TLS certificate validation; consumed via YAML by mainline broker code. | `tls_skip_verify` |
| `SOLACE_TLS_TRUST_STORE_DIR` | `/etc/ssl/certs/` | all | Path to a CA-cert directory for `tcps://` / `wss://` broker connections. | — |
| `SSL_CERTFILE` | — | gateway | Path to the TLS certificate file for the gateway's HTTPS listener. | TLS cert path |
| `SSL_KEYFILE` | — | gateway | Path to the TLS private key file for the gateway's HTTPS listener. | TLS key path |
| `SSL_KEYFILE_PASSWORD` | — | gateway | Passphrase for an encrypted TLS private key. *Aliases: `SSL_KEY_PASSWORD`.* | TLS key passphrase |

## LLM Service and Providers

Runtime LLM wiring is canonical: the agent reads `LLM_SERVICE_API_KEY`, `LLM_SERVICE_ENDPOINT`, and the per-purpose model names. The OAuth-protected variants under `LLM_SERVICE_OAUTH_*` cover enterprise LLM proxies that sit behind OAuth 2.0. Image generation, vision, speech-to-text, and text-to-speech each carry their own provider and model knobs.

| Name | Default | Scope | What it does | Related YAML key |
|---|---|---|---|---|
| `AUDIO_TRANSCRIPTION_API_BASE` | — | yaml | Base URL for the speech-to-text service. | STT endpoint |
| `AUDIO_TRANSCRIPTION_API_KEY` | — | yaml | API key for the speech-to-text service. | STT auth |
| `AUDIO_TRANSCRIPTION_MODEL_NAME` | — | yaml | Model name for the speech-to-text service. | STT model |
| `AZURE_SPEECH_KEY` | — | yaml | API key for Azure Speech Services. | speech provider auth |
| `AZURE_SPEECH_REGION` | — | yaml | Region for Azure Speech Services. | speech provider region |
| `IMAGE_DESCRIPTION_MODEL_NAME` | — | yaml | Vision model used to describe images. | vision model |
| `IMAGE_MODEL_NAME` | — | yaml | Image-generation model. | model alias `image_gen` |
| `IMAGE_SERVICE_API_KEY` | — | yaml | API key for the image-generation service. | image gen auth |
| `IMAGE_SERVICE_ENDPOINT` | — | yaml | Endpoint URL for the image-generation service. | image gen endpoint |
| `LLM_GATEWAY_API_KEY` | — | yaml | API key for an in-house LLM gateway or proxy. | site-specific |
| `LLM_REPORT_MODEL_NAME` | — | yaml | Model used by the report generator. | model alias `report_gen` |
| `LLM_SERVICE_API_KEY` | — | awe, platform | Runtime LLM API key. The first-run wizard writes the matched provider key here. | `model.api_key`, `model_configurations.api_key` |
| `LLM_SERVICE_ENDPOINT` | — | awe, platform | LLM endpoint URL. | `model.api_base` |
| `LLM_SERVICE_GENERAL_MODEL_NAME` | — | awe, platform | Default general-purpose model string for agents. | model alias `general` |
| `LLM_SERVICE_OAUTH_CA_CERT_PATH` | — | yaml | CA bundle for an OAuth-protected LLM server with a self-signed certificate. | OAuth-protected LLM |
| `LLM_SERVICE_OAUTH_CLIENT_ID` | — | yaml | OAuth 2.0 client ID for the LLM gateway. | OAuth-protected LLM |
| `LLM_SERVICE_OAUTH_CLIENT_SECRET` | — | yaml | OAuth 2.0 client secret for the LLM gateway. | OAuth-protected LLM |
| `LLM_SERVICE_OAUTH_ENDPOINT` | — | yaml | LLM API endpoint behind OAuth 2.0 authentication. | OAuth-protected LLM |
| `LLM_SERVICE_OAUTH_GENERAL_MODEL_NAME` | — | yaml | Default general model for the OAuth-protected LLM. | OAuth-protected LLM |
| `LLM_SERVICE_OAUTH_PLANNING_MODEL_NAME` | — | yaml | Planning model for the OAuth-protected LLM. | OAuth-protected LLM |
| `LLM_SERVICE_OAUTH_SCOPE` | — | yaml | OAuth 2.0 scope requested when fetching an LLM access token. | OAuth-protected LLM |
| `LLM_SERVICE_OAUTH_TOKEN_REFRESH_BUFFER_SECONDS` | `300` | yaml | Seconds before token expiry that the OAuth refresh fires. | OAuth-protected LLM |
| `LLM_SERVICE_OAUTH_TOKEN_URL` | — | yaml | OAuth 2.0 token endpoint for the LLM gateway. | OAuth-protected LLM |
| `LLM_SERVICE_PLANNING_MODEL_NAME` | — | awe, platform | Planning model string for agents. | model alias `planning` |
| `LLM_SERVICE_TITLE_MODEL_NAME` | — | yaml | Model used for auto-generated session titles. | model alias `title` |
| `MAX_TOKENS` | `16000` | yaml | Per-call maximum output tokens. | `model.max_output_tokens` |
| `TTS_PROVIDER` | `gemini` | yaml | Selects the text-to-speech provider. | `speech.tts_provider` |

The first-run wizard auto-detects standard provider env vars (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `AZURE_OPENAI_API_KEY`, and similar for Mistral, Groq, Together, DeepSeek, Cohere, Perplexity, Cerebras, OpenRouter, Hugging Face, Nebius, xAI, Replicate, Google) and writes the matched key into `LLM_SERVICE_API_KEY` for runtime use. In production, set `LLM_SERVICE_API_KEY` directly; the provider-specific names are wizard-only. Some shipped YAML samples spell the Azure key as `AZURE_API_KEY` — the canonical form is `AZURE_OPENAI_API_KEY`.

## Storage

Artifact storage backends (filesystem, S3, S3-compatible, GCS, and Azure Blob), the per-component bucket and base-path overrides, and the database URLs for the platform, orchestrator, web-UI gateway, and per-gateway session stores. Static AWS credentials (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN`) are honoured when present; broader AWS SDK conventions (`AWS_PROFILE`, `AWS_REGION`, IRSA / Pod Identity) are covered by the Not catalogued here footer.

| Name | Default | Scope | What it does | Related YAML key |
|---|---|---|---|---|
| `ARTIFACT_BASE_PATH` | `/tmp/samv2` | platform | Filesystem artifact root written into agent YAML by the platform. | `artifact_service.base_path` |
| `ARTIFACT_BUCKET_NAME` | falls through to `OBJECT_STORAGE_BUCKET_NAME`, then `S3_BUCKET_NAME` | awe | Per-component bucket override for artifact storage. | `artifact_service.bucket_name` |
| `ARTIFACT_SERVICE_TYPE` | `filesystem` | platform | Storage type written into agent YAML by the platform. | `artifact_service.type` |
| `AWS_ACCESS_KEY_ID` | — | all | Static AWS access key ID used by the S3 artifact backend. | static AWS auth |
| `AWS_SECRET_ACCESS_KEY` | — | all | Static AWS secret access key used by the S3 artifact backend. | static AWS auth |
| `AWS_SESSION_TOKEN` | — | all | Temporary STS session token used with the static AWS credentials. | static AWS auth |
| `AZURE_STORAGE_ACCOUNT_KEY` | — | all | Azure Blob storage account key. | Azure account key |
| `AZURE_STORAGE_ACCOUNT_NAME` | — | all | Azure Blob storage account name. | Azure account name |
| `AZURE_STORAGE_CONNECTION_STRING` | — | all | Full Azure Blob storage connection string (alternative to account name + key). | Azure connection string |
| `AZURE_STORAGE_CONTAINER_NAME` | — | all | Azure Blob container name for artifact storage. *Aliases: `AZURE_CONTAINER_NAME`.* | Azure container |
| `GCS_BUCKET_NAME` | — | yaml | Legacy GCS bucket name (Helm-chart compatibility). | GCS bucket |
| `GCS_CREDENTIALS_JSON` | — | all | Inline Google service-account JSON in lieu of a file on disk. | GCS auth |
| `GCS_PROJECT` | — | platform | Google Cloud project ID for the GCS artifact backend. | GCS project |
| `OBJECT_STORAGE_BUCKET_NAME` | — | all | Default bucket used by any component without its own override. | canonical default bucket |
| `OBJECT_STORAGE_FS_ROOT` | — | platform | Local filesystem root for the platform's filesystem backend (dev only). | filesystem backend root |
| `OBJECT_STORAGE_TYPE` | — | all | Selects the artifact backend: `filesystem`, `s3`, `gcs`, or `azure`. | `artifact_service.type` |
| `PLATFORM_DATABASE_URL` | `sqlite:///<SAM_DATA_DIR>/platform.db` | platform | Database URL for the platform service. | platform `database_url` |
| `S3_BUCKET_NAME` | — | all | Legacy S3 bucket name (Helm-chart compatibility); prefer `ARTIFACT_BUCKET_NAME`. | legacy S3 bucket |
| `S3_ENDPOINT_URL` | — | all | S3 endpoint override for S3-compatible backends such as MinIO. | `endpoint_url` |
| `S3_REGION` | `us-east-1` | platform | S3 region written into agent YAML by the platform. | S3 region |
| `SESSION_DATABASE_URL` | `sqlite:///session.db` | yaml | Per-gateway session database URL. *Aliases: `SESSION_DB_URL`, `SAM_DATABASE_URL`, `DATABASE_URL`.* | `session_service.database_url` |
| `WEB_UI_GATEWAY_DATABASE_URL` | — | gateway | Web-UI gateway session database URL. | gateway session DB |

## Identity and Auth

OAuth and OIDC client credentials, the SSO callback / redirect surface, RBAC role-mapping paths, the gateway session secret, and the static credentials some shipped example agents use for MCP servers and other downstream APIs. Per-example-agent credentials are not enumerated; agents declare their own.

| Name | Default | Scope | What it does | Related YAML key |
|---|---|---|---|---|
| `AUTHORIZATION_TYPE` | *configured* | yaml | Selects the authorization backend: `default_rbac` or `none`. | `authorization.type` |
| `EXTERNAL_AUTH_CALLBACK` | `http://localhost:8800/api/v1/auth/callback` | yaml | OAuth redirect URI registered with the identity provider. | `external_auth_callback_uri` |
| `EXTERNAL_AUTH_PROVIDER` | *configured* | yaml | Names the OIDC catalog entry the gateway should use. | `external_auth_provider` |
| `FRONTEND_REDIRECT_URI` | `http://localhost:8800` | awe, gateway | Tool-OAuth redirect URI fallback used when `OAUTH_TOOL_REDIRECT_URI` is unset. | — |
| `FRONTEND_REDIRECT_URL` | — | yaml | Where the gateway sends the browser after a successful login. | `frontend_redirect_url` |
| `MCP_API_KEY` | — | yaml | Static API key for an upstream MCP server. | MCP static auth |
| `MCP_AUTHORIZATION_URL` | — | awe | OAuth 2.0 authorize endpoint for an MCP server. | MCP OAuth |
| `MCP_BEARER_TOKEN` | — | yaml | Static bearer token for an upstream MCP server. | MCP static auth |
| `MCP_CLIENT_ID` | — | awe | Dynamic-client-registration fallback for MCP OAuth; prefer `TOOL_OAUTH_CLIENT_ID`. | MCP OAuth |
| `MCP_CLIENT_SECRET` | — | awe | Dynamic-client-registration fallback for MCP OAuth; prefer `TOOL_OAUTH_CLIENT_SECRET`. | MCP OAuth |
| `MCP_OAUTH_CLIENT_ID` | — | yaml | OAuth client ID an agent uses to call an MCP server. | MCP agent OAuth |
| `MCP_OAUTH_CLIENT_SECRET` | — | yaml | OAuth client secret an agent uses to call an MCP server. | MCP agent OAuth |
| `MCP_REFRESH_URL` | — | awe | OAuth 2.0 refresh endpoint for an MCP server. | MCP OAuth |
| `MCP_TOKEN_URL` | — | awe | OAuth 2.0 token endpoint for an MCP server. | MCP OAuth |
| `OAUTH_TOOL_REDIRECT_URI` | falls back to `FRONTEND_REDIRECT_URI` | awe, gateway | Overrides the OAuth 2.0 redirect URI for tool-side flows. | — |
| `OIDC_CA_CERT_PATH` | — | yaml | CA bundle path for self-signed identity-provider certificates. | OIDC catalog `ca_cert_path` |
| `OIDC_CLIENT_ID` | — | yaml | OIDC client ID. | OIDC client ID |
| `OIDC_CLIENT_SECRET` | — | yaml | OIDC client secret. | OIDC client secret |
| `OIDC_INSECURE_SKIP_VERIFY` | `false` | yaml | Skips TLS verification when talking to the identity provider; dev only. | OIDC catalog `insecure_skip_verify` |
| `OIDC_ISSUER` | — | yaml | OIDC issuer URL used for discovery. *Aliases: `OIDC_ISSUER_URL`.* | OIDC discovery URL |
| `ROLE_DEFINITIONS_PATH` | `config/auth/role-to-scope-definitions.yaml` | yaml | Path to the role-to-scope definitions file. | `authorization.role_definitions_file` |
| `SECURE_AGENT_TOKEN` | — | yaml | Identity-broker token used by agents to assert identity claims. | identity-broker token |
| `SESSION_SECRET_KEY` | — | gateway | Signs gateway session cookies. *Aliases: `SAM_SESSION_SECRET` (CLI wizard naming), `SESSION_SECRET` (older YAML samples).* | `session_secret_key` |
| `TOOL_OAUTH_CLIENT_ID` | — | awe | Tool OAuth client ID used when dynamic client registration is not available. | tool OAuth |
| `TOOL_OAUTH_CLIENT_SECRET` | — | awe | Tool OAuth client secret used when dynamic client registration is not available. | tool OAuth |
| `TOOL_OAUTH_INITIAL_ACCESS_TOKEN` | — | awe | Initial-access token used to bootstrap OAuth 2.0 dynamic client registration. | tool OAuth |
| `USER_ROLES_PATH` | `config/auth/user-to-role-assignments.yaml` | yaml | Path to the user-to-role assignments file. | `authorization.user_roles_file` |

## Observability

Logging level, format, file paths, and rotation; eval-subsystem timing and concurrency knobs; visualisation, task-event, and SSE queue caps; broker payload and gateway artifact size limits.

| Name | Default | Scope | What it does | Related YAML key |
|---|---|---|---|---|
| `EVAL_AGENT_TIMEOUT_SECONDS` | *configured* | platform | Per-example agent-call timeout used by the eval runner. | — |
| `EVAL_DATASET_GEN_AGENT` | `Orchestrator` | platform | Agent the AI dataset / example generator delegates to. | — |
| `EVAL_DATASET_GEN_TIMEOUT` | `180` | platform | Seconds the AI dataset generator waits for the orchestrator. | — |
| `EVAL_EXAMPLE_BUDGET_SECONDS` | *configured* | platform | Per-example wall-clock budget for an eval run. | — |
| `EVAL_SCORING_THREADS` | *configured* | platform | Concurrency for eval scoring (LLM-judge calls). | — |
| `EVAL_WATCHDOG_INTERVAL_SECONDS` | *configured* | platform | How often the eval watchdog checks for stuck examples. | — |
| `GATEWAY_ARTIFACT_LIMIT_BYTES` | `10000000` | yaml | Per-artifact upload cap on the gateway. | gateway upload limit |
| `LOG_FORMAT` | `text` | all | Log format: `text` for humans and `json` for cloud or Datadog. | `log.format` |
| `LOGGING_CONFIG_PATH` | — | all | Path to an external YAML containing a `log:` block that replaces the in-process config. | — |
| `MAX_MESSAGE_SIZE_BYTES` | `10000000` | yaml | Maximum broker payload size. | broker max payload |
| `SAM_FILE_LOG_LEVEL` | `DEBUG` | yaml | Minimum level for the file logger. *Aliases: `LOG_LEVEL` (combined-level placeholder used in some samples).* | `log.log_file_level` |
| `SAM_LOG_COMPRESS` | `false` | yaml | Whether rotated log files are gzipped. | `log.compress` |
| `SAM_LOG_FILE` | `sam.log` | yaml | File path for the file logger. *Aliases: `LOG_FILE`.* | `log.log_file_name` |
| `SAM_LOG_MAX_AGE_DAYS` | `0` | yaml | Maximum age in days for rotated log files; `0` disables age-based rotation. | `log.max_age_days` |
| `SAM_LOG_MAX_BACKUPS` | `10` | yaml | Number of rotated log files retained. | `log.max_backups` |
| `SAM_LOG_MAX_SIZE_MB` | `50` | yaml | Size threshold in megabytes that triggers a log rotation. | `log.max_size_mb` |
| `SAM_STDOUT_LOG_LEVEL` | `INFO` | yaml | Minimum level for the stderr logger. | `log.stdout_log_level` |
| `SSE_MAX_QUEUE_SIZE` | `200` | yaml | Outbound SSE queue cap per client. | SSE queue cap |
| `TASK_LOGGER_QUEUE_SIZE` | `600` | yaml | Per-task event-log queue size. | task-event log buffer |
| `VISUALIZATION_QUEUE_SIZE` | `1000` | yaml | Per-session visualisation event queue size. | visualisation buffer |

## Gateway and Channel

Per-gateway-type knobs: the gateway IDs, frontend branding, namespace, channel credentials (Slack, Teams, Gmail), the MCP gateway's listen surface and external base URL, and the Event Mesh data-broker overrides used when an event-mesh gateway talks to a second broker alongside the control-plane broker.

| Name | Default | Scope | What it does | Related YAML key |
|---|---|---|---|---|
| `DATA_BROKER_PASSWORD` | — | yaml | Password for the event-mesh data-plane broker. | data broker auth |
| `DATA_BROKER_URL` | — | yaml | Connection URL for the event-mesh data-plane broker. | data broker URL |
| `DATA_BROKER_USER` | — | yaml | Username for the event-mesh data-plane broker. | data broker auth |
| `DATA_BROKER_VPN` | — | yaml | Message VPN on the event-mesh data-plane broker. | data broker VPN |
| `EMAIL_DEFAULT_AGENT` | `EmailAssistant` | yaml | Default agent for inbound email. | email gateway default |
| `EMAIL_GATEWAY_ID` | *configured* | yaml | Identifier for an email gateway instance. | `gateway_id` |
| `EVENT_MESH_GATEWAY_ID` | *configured* | yaml | Identifier for an event-mesh gateway instance. | `gateway_id` |
| `FRONTEND_BOT_NAME` | `Agent Mesh` | yaml | Display name shown in the WebUI frontend. | frontend branding |
| `FRONTEND_USE_AUTHORIZATION` | `false` | yaml | Whether the WebUI shows the authentication UI. | frontend behaviour |
| `FRONTEND_WELCOME_MESSAGE` | `Welcome to Solace Agent Mesh (Go)` | yaml | Welcome banner shown in the WebUI frontend. | frontend branding |
| `GATEWAY_ID` | `my-gateway` | yaml | Generic gateway identifier used when a more specific one is not set. | `gateway_id` |
| `GMAIL_APP_PASSWORD` | — | yaml | Gmail SMTP app password for the email gateway. | Gmail SMTP auth |
| `GMAIL_POC_APP_PASSWORD` | — | yaml | Gmail app password used by POC email samples. | Gmail SMTP auth |
| `GMAIL_POC_USERNAME` | — | yaml | Gmail SMTP login used by POC email samples. | Gmail SMTP login |
| `MCP_ENDPOINT_PATH` | `/mcp` | yaml | URL path served by the MCP gateway. | MCP path |
| `MCP_EXTERNAL_BASE_URL` | falls back to `<host>:<port>` | gateway | Public URL of the MCP gateway used for OAuth discovery and authorize URLs. | — |
| `MCP_GATEWAY_ID` | *configured* | yaml | Identifier for an MCP gateway instance. | `gateway_id` |
| `MCP_HOST` | `0.0.0.0` | yaml | Bind host for the MCP gateway HTTP listener. | MCP listen host |
| `MCP_ISSUER` | *configured* | yaml | OAuth 2.0 issuer URL the MCP gateway advertises. | `issuer` |
| `MCP_PORT` | `8800` | yaml | Bind port for the MCP gateway HTTP listener. | MCP listen port |
| `NAMESPACE` | `solace-agent-mesh` | yaml | Topic-prefix namespace for A2A and broker subscriptions. Shipped YAML samples use bare `${NAMESPACE}`; the Go runtime falls back to `solace-agent-mesh` when the var is unset. | top-level `namespace` |
| `SLACK_APP_TOKEN` | — | yaml | Slack app token for socket-mode connection. | Slack `app_token` |
| `SLACK_BOT_TOKEN` | — | yaml | Slack bot token. | Slack `bot_token` |
| `SLACK_DEFAULT_AGENT` | `Orchestrator` | yaml | Default agent for inbound Slack messages. | Slack `default_agent` |
| `SLACK_FEEDBACK_ENABLED` | `false` | yaml | Whether thumbs-up / thumbs-down feedback buttons render in Slack replies. | Slack feedback toggle |
| `SLACK_GATEWAY_ID` | *configured* | yaml | Identifier for a Slack gateway instance. | `gateway_id` |
| `TEAMS_APP_ID` | — | yaml | Microsoft Teams application ID. | Teams `app_id` |
| `TEAMS_APP_PASSWORD` | — | yaml | Microsoft Teams application secret. | Teams `app_password` |
| `TEAMS_DEFAULT_AGENT` | `Orchestrator` | yaml | Default agent for inbound Teams messages. | Teams default agent |
| `TEAMS_GATEWAY_ID` | *configured* | yaml | Identifier for a Teams gateway instance. | `gateway_id` |
| `TEAMS_TENANT_ID` | — | yaml | Azure Active Directory tenant ID for the Teams app. | Teams tenant ID |
| `WEBUI_GATEWAY_ID` | *configured* | yaml | Identifier for a Web-UI gateway instance. | `gateway_id` |

## Dynamic-Name Patterns

The names below are constructed at runtime; the concrete name depends on operator configuration, so the page documents the pattern rather than every concrete instance.

**`BROKER_URL_<envSuffix>`** (per Event Mesh gateway). When an event-mesh gateway declares multiple environments, the runtime looks for `BROKER_URL_<envSuffix>`, `BROKER_VPN_<envSuffix>`, `BROKER_USERNAME_<envSuffix>`, and `BROKER_PASSWORD_<envSuffix>`, falling back to the generic `SOLACE_BROKER_*` family when an environment-specific override is unset. `<envSuffix>` is the gateway's environment ID upper-cased with non-alphanumerics replaced by underscores — for example, `BROKER_URL_PROD`.

**`BEARER_TOKEN_<connUUID>`** (per MCP connector). Connector credentials configured through the platform admin UI are stored as `BEARER_TOKEN_<connUUID>`, `BASIC_USERNAME_<connUUID>`, `BASIC_PASSWORD_<connUUID>`, and `SERVER_URL_<connUUID>`, where `<connUUID>` is the connector record's UUID with hyphens stripped — for example, `BEARER_TOKEN_7f3a82c4b15d4a6e9c0b1d2e3f4a5b6c`.

**`<COMPONENT>_BUCKET_NAME`** (per object-store consumer). Components that need their own artifact bucket read `<COMPONENT>_BUCKET_NAME` first and fall back to `OBJECT_STORAGE_BUCKET_NAME`. Known consumers are listed in the Storage table — for example, `EVAL_DATA_BUCKET_NAME`.

**`SAM_<ROLE>_HEALTH_ADDR`** (per binary). When the `sam` CLI spawns multiple service processes, each child can be given its own `/healthz` listen address by setting `SAM_<ROLE>_HEALTH_ADDR`. `<ROLE>` is the binary's role upper-cased — for example, `SAM_GATEWAY_HEALTH_ADDR`.

**`SAM_FEATURE_<UPPER_KEY>`** (per feature flag). Frontend feature flags declared in YAML under `frontend_feature_enablement` can be overridden at the process level with `SAM_FEATURE_<UPPER_KEY>`, where `<UPPER_KEY>` is the YAML key upper-cased with hyphens replaced by underscores. Truthy values are `true` and `1` — for example, `SAM_FEATURE_NEW_DASHBOARD=true`.

## Not Catalogued Here

A handful of env-var families influence the runtime through their SDKs but are owned by upstream projects; the authoritative reference for them is the SDK's own documentation.

- **AWS SDK family** — `AWS_PROFILE`, `AWS_REGION`, the `AWS_ROLE_*` assume-role chain, and the IRSA / Pod Identity pair `AWS_WEB_IDENTITY_TOKEN_FILE` and `AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE`. Agent Mesh's S3 backend honours the standard AWS credential-discovery chain; see the AWS SDK for Go documentation for the full list of variables and the resolution order.
- **OpenTelemetry** — `OTEL_EXPORTER_*` and the rest of the `OTEL_*` family. The Go runtime does not currently read OpenTelemetry env vars directly; once an OTel SDK is initialised, the SDK reads them on the runtime's behalf. See the OpenTelemetry environment-variable specification for the canonical list.
- **Google Cloud** — `GOOGLE_APPLICATION_CREDENTIALS`. Agent Mesh's GCS backend honours the standard application-default-credentials path; see the Google Cloud authentication documentation for the full discovery chain.

The `bedrock-kb` tool unsets the static AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) when it detects IRSA or EKS Pod Identity; do not set both static credentials and IRSA at the same process, since the tool will mask the static pair to force the SDK onto the workload-identity path.
