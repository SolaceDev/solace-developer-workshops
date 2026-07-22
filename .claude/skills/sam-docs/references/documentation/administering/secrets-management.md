---
title: Managing Secrets
description: Where Agent Mesh reads secrets from, the environment-variable substitution syntax that wires them into YAML, the canonical list of secret-bearing fields, and how to rotate each one without downtime.
sidebar_position: 830
---

# Managing Secrets

This page covers where Solace Agent Mesh reads secret material from, the substitution syntax that wires those values into YAML without embedding them in the file, the secret-bearing fields you track per deployment, and how to rotate each one.

## Where Agent Mesh Reads Secrets From

Every runtime process reads its secrets from the process environment. On Kubernetes, that environment is populated from a `Secret`; in a shell, it comes from exported variables. A few fields can instead read a secret from a file mounted at a path, which suits `Secret` volumes and Vault agent sidecars.

Never embed a secret value directly in YAML or commit one to version control. Keep the secret in the environment or a mounted file, and reference it from YAML with `${VAR}` substitution.

| Source | Mechanism | Best for |
|---|---|---|
| Process environment | Variables exported into the process, or a Kubernetes `Secret` projected onto the pod as environment variables | Every deployment |
| File-mounted secret | A `*_file` field on the `model:` or `artifact_service:` block points at a mounted path | Kubernetes `Secret` volumes, Vault agent sidecars |
| `.env` file (`sam` CLI only) | The `sam` CLI loads the nearest `.env` into the environment before startup | Local development |

The `.env` file is a convenience of the `sam` CLI. When you run Agent Mesh locally, the CLI walks up from the working directory to the nearest `.env` and loads it into the environment before it starts the runtime. The standalone server processes do not read `.env`; they use whatever environment the orchestrator gives them.

:::note
The `.env` loader overrides variables already set in the environment, so a value in `.env` wins over an exported shell variable of the same name. To skip `.env` loading and use only the process environment, start the CLI with the `--system-env` flag.
:::

## Substitution Syntax

The configuration loader expands `${VAR}` placeholders against the process environment before it parses the YAML, so an expanded value is typed by the parser exactly as if you had written it inline. Four forms are recognized:

| Form | Behavior |
|---|---|
| `${VAR}` | The value if `VAR` is set, even when empty; otherwise the empty string. |
| `${VAR, default}` | The value if `VAR` is set, even when empty; otherwise the expanded default. |
| `${VAR:-default}` | The value if `VAR` is set and non-empty; otherwise the expanded default. |
| `${VAR:+alt}` | The expanded alt if `VAR` is set and non-empty; otherwise the empty string. |

A variable that is set but empty satisfies `${VAR}` and `${VAR, default}` (both yield the empty value) but not `${VAR:-default}`, which falls through to the default. Whitespace is allowed around the comma in `${VAR, default}` but not around `:-` or `:+`.

Defaults and alts are themselves expanded, so a chained default works to a depth of one: `${A, ${B, fallback}}` resolves, but the innermost default in a triple nesting is not substituted.

A typical broker block:

```yaml
# agent runtime config
broker:
  broker_url: "${SOLACE_BROKER_URL}"
  broker_username: "${SOLACE_BROKER_USERNAME}"
  broker_password: "${SOLACE_BROKER_PASSWORD}"
  broker_vpn: "${SOLACE_BROKER_VPN, default}"
```

An unset `${VAR}` does not fail when the configuration is loaded. It substitutes the empty string and lets the downstream consumer reject it (for example, the OAuth2 client-credentials consumer fails with `client_secret is required`). When you want a hard failure at boot, set the variable to a known-bad sentinel rather than leaving it unset, and let the consumer reject the sentinel.

## File-Mounted Secrets

Two configuration blocks can read a secret from a file instead of an inline value. This is the recommended pattern on Kubernetes: mount a `Secret` volume at a fixed path and point the field at that path.

The `model:` block reads any field named `<key>_file` from disk and uses the file contents as `<key>`. For example, `api_key_file` supplies `api_key`:

```yaml
# agent runtime config
model:
  model: anthropic/claude-sonnet-4-5
  api_key_file: /etc/secrets/anthropic-api-key
```

The fields most often mounted this way:

| Field | Supplies | Block |
|---|---|---|
| `api_key_file` | LLM provider API key (`api_key`) | `model:` |
| `auth_credentials_file` | Vertex AI service-account JSON (`auth_credentials`) | `model:` |
| `oauth_client_secret_file` | OAuth2 client secret (`oauth_client_secret`) | `model:` |
| `credentials_file` | GCS service-account JSON | `artifact_service:` when `type: gcs` |

Within the `model:` block the pattern is general: `oauth_client_id_file` and `oauth_token_url_file` behave the same way, as does any other `<key>_file`. Outside the `model:` block, the GCS artifact store's `credentials_file` is the one file-mount field; every other block takes its secrets from the environment through `${VAR}` substitution.

## The Secret-Bearing Surfaces

Each row below is one piece of secret material Agent Mesh consumes. The YAML reads the value through `${VAR}` substitution, the file-mount alternative, or a direct environment fallback.

| Surface | How it is supplied | YAML field | Consumed by |
|---|---|---|---|
| Broker password | `SOLACE_BROKER_PASSWORD` environment variable | `broker.broker_password` | Every component |
| LLM provider key | `<PROVIDER>_API_KEY` environment variable, for example `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `GROQ_API_KEY` | `model.api_key` or `model.api_key_file` | Every agent that calls an LLM |
| Vertex AI service account | mounted file | `model.auth_credentials_file` | Vertex agents |
| Bedrock credentials | inline values, or an IAM role | `model.access_key` / `model.secret_key` | Bedrock agents |
| S3 artifact store credentials | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | `artifact_service.aws_access_key_id` / `aws_secret_access_key` | S3 artifact store |
| GCS service account | `GCS_CREDENTIALS_JSON` (inline JSON), a path in `credentials_file`, or `GOOGLE_APPLICATION_CREDENTIALS` (file path) | `artifact_service.credentials_file` | GCS artifact store |
| Azure Blob credentials | `AZURE_STORAGE_CONNECTION_STRING`, or `AZURE_STORAGE_ACCOUNT_NAME` + `AZURE_STORAGE_ACCOUNT_KEY` | `artifact_service.connection_string` (or `account_name` + `account_key`) | Azure artifact store |
| Database password | embedded in the connection URL; `DATABASE_URL` fallback | `session_service.database_url` | Entrypoints and agents with persistent sessions |
| Session cookie signing key | `SESSION_SECRET_KEY` | `session_secret_key` | HTTP/SSE entrypoint |
| OIDC client secret | referenced as `${OIDC_CLIENT_SECRET}` | `providers.<name>.client_secret` | Entrypoint with OIDC login |
| LLM-gateway OAuth2 client secret | referenced as `${VAR}`, or mounted via `oauth_client_secret_file` | `model.oauth_client_secret` | Agents behind an OAuth2-secured LLM gateway |
| Slack tokens | referenced as `${SLACK_BOT_TOKEN}` / `${SLACK_APP_TOKEN}` | `slack_bot_token` / `slack_app_token` | Slack entrypoint |
| Email IMAP password | referenced as `${VAR}` | `imap_password` | Email entrypoint |

The surfaces wire in two ways. Some are read directly by Agent Mesh as an environment fallback when the YAML value is absent: the broker password, the per-provider LLM key, the S3, GCS, and Azure storage credentials, the database URL, and the session key. The rest are substitution-only: the YAML field references a variable through `${VAR}` and the loader expands it before parsing, so the environment-variable name is yours to choose. The names in the table are the ones the shipped configurations reference.

The Slack and email tokens live in the `values:` map of the Slack and email entrypoint definitions, not in a separate block. The email entrypoint is gated behind the `SAM_FEATURE_EMAIL_GATEWAY` feature flag, and `imap_password` is its basic-authentication mode (an OAuth2 alternative exists).

Individual tools and connectors can carry their own credentials, such as a search-API or speech-API key. Those are configured on the tool or connector, wired the same way through `${VAR}` substitution or a `*_file` mount.

### Generating a Session-Cookie Key

The HTTP/SSE entrypoint signs its session cookies with `session_secret_key`. Generate a value with 32 bytes of entropy:

```bash
openssl rand -hex 32
```

:::warning
When OIDC login is enabled, the entrypoint refuses to start unless `session_secret_key` (or the `SESSION_SECRET_KEY` environment variable) is set. When OIDC is not enabled, an empty or short value is accepted at startup, and the length is never validated. Set it regardless: it signs the cookies that carry each user's access token, and a guessable key lets an attacker forge cookies for any user. Treat it like a database password.
:::

## Rotation Procedures

Rotation always has the same shape: change the underlying source, then restart the consuming process. The mechanics differ by deployment.

### Local Development

Edit `.env` and restart the local runtime. The CLI re-reads `.env` on startup.

### Kubernetes

[Configuring Agent Mesh](../installing/configure.md) covers the initial wiring, where `extraSecretEnvironmentVars` maps each environment variable to a `Secret` name and key. To rotate, update the underlying `Secret`:

```bash
kubectl create secret generic agent-mesh-secrets \
  --from-literal=ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}" \
  --dry-run=client -o yaml \
  | kubectl apply -f -
```

Then roll the Deployments that consume the value, so the pods pick up the new environment variables. The consuming workloads are the entrypoint process and the Agent-Workflow Executor process:

```bash
kubectl rollout restart deployment/<deployment-name>
```

For file-mounted secrets the kubelet propagates new contents to the volume without a restart, typically within a minute. A `kubectl rollout restart` is still the safest path, because a consumer that reads the credential once at startup does not otherwise pick up the new value.

### Per-Surface Notes

- **Broker password** — Rotate at the broker, then restart the components or let them reconnect. New connections authenticate with the new credential.
- **LLM provider key** — Issue a new key, deploy it, then revoke the old one at the provider. Most providers keep both keys live during an overlap window.
- **Object-storage credentials** — Prefer IAM roles through the cloud provider's default credential chain (`AWS_ROLE_ARN`, GCP workload identity, Azure managed identity). Those rotate transparently and need no application-side change.
- **Database password** — A rolling restart of the entrypoint and the agents that hold persistent sessions is enough; the new connection pool uses the new credential.
- **Session cookie signing key** — Changing this invalidates every active session, because existing cookies were signed with the old key. Every signed-in user is redirected to log in again on the next request. Plan for a brief sign-in surge or pick a low-traffic window.
- **OIDC client secret** — Rotate at the identity provider, update the variable, then restart the entrypoint. In-flight logins fail during the restart window. Existing logged-in sessions stay valid, because cookies are signed with `SESSION_SECRET_KEY`, not the identity provider secret.
- **LLM-gateway OAuth2 client secret** — The client caches the access token until it expires, so rotation does not take effect until the next refresh. Restart the agents to force an immediate fetch.

## Secrets in Logs

The logging surface is structured to avoid leaking secret material:

- **Database connection URLs are redacted before they reach the log handler.** A URL such as `postgres://user:PASSWORD@host/db` is emitted as `postgres://user:xxxxx@host/db`. SQLite URLs, which carry no credentials, and URLs that fail to parse are handled defensively so the raw string is never logged.
- **OAuth2 token-endpoint error bodies have two distinct treatments.** The LLM-gateway OAuth2 client-credentials path caps the logged body at 200 bytes and extracts only the RFC 6749 `error` and `error_description` fields. The OIDC user-login refresh path reads the full response body with no size cap and embeds it in the returned error, so a downstream handler that logs that error logs the full body. Filter token-endpoint response bodies at log ingest as a catch-all rather than relying on either path's behavior.
- **Audit records carry structured, security-relevant fields and no request material.** Each event emits fields identifying the user, task, tool, agent, session, and outcome (for example `userID`, `taskID`, `agentName`, `sessionID`, and `duration_ms`); the exact key set depends on the event type. `Authorization` headers, cookies, and request bodies are never part of an audit record. See [Managing Audit and Compliance](./audit-and-compliance.md) for the full event catalog.

The structured logger does not emit known secret-bearing fields by name. As an additional guard against a future change that logs a raw error chain wrapping a sensitive value, enforce a generic regex at log ingest that redacts `password=`, `client_secret=`, and bearer-token shapes.

## What Next?

Secrets are wired in and the rotation procedure is in place. The companion topic is the certificate side of the same security boundary, covered in [Configuring TLS](./tls.md).
