---
title: Secrets Management
description: Where Solace Agent Mesh reads secrets from, the env-var substitution syntax that wires them into YAML, the canonical list of secret-bearing fields, and how to rotate each one without downtime.
sidebar_position: 4
---

# Secrets Management

This page covers where Agent Mesh reads secret material from, the substitution syntax that wires those values into YAML without ever embedding them in the file, the secret-bearing surfaces you need to track per deployment, and the rotation procedure for each.

TLS certificate material, CA bundles, and cert-expiry monitoring live under TLS. Audit-log retention is in Audit and compliance. Who can reach a secret-bearing endpoint is governed by RBAC reference.

## Where Agent Mesh Reads Secrets From

Three sources, in roughly increasing order of how production-ready they are:

| Source | Mechanism | Best for |
|---|---|---|
| `.env` file | Loaded automatically from the project root when present | Local development. |
| Process environment | `export VAR=value`, `docker run -e VAR=value`, or a Kubernetes `Secret` projected to env vars | Docker, ad-hoc shells, CI runners |
| File-mounted secret | A `*_file` field on the consuming block points at a mounted path | Kubernetes `Secret` volumes, Docker Swarm secrets, Vault agent sidecars |

Never embed secret values directly in YAML or commit them to version control. The pattern is: store secrets outside the YAML, reference them with `${VAR}` substitution.

## Substitution Syntax

The config loader expands `${VAR}` placeholders against the process environment before YAML parsing. Four forms are recognised:

| Form | Behavior |
|---|---|
| `${VAR}` | Value if `VAR` is set (even if empty); otherwise empty string. Bare references are collected so callers can require them. |
| `${VAR, default}` | Value if set; otherwise the expanded default. |
| `${VAR:-default}` | Value if set **and non-empty**; otherwise the expanded default. |
| `${VAR:+alt}` | Expanded alt if set and non-empty; otherwise empty. |

Defaults and alts are themselves expanded, so chained defaults work, but only to depth 1. `${A, ${B, fallback}}` resolves; `${A, ${B, ${C, x}}}` resolves the outer two only.

A typical broker block:

```yaml
# configs/agent.yaml
...
broker:
  broker_url: ${SOLACE_BROKER_URL}
  broker_username: ${SOLACE_BROKER_USERNAME, default}
  broker_password: ${SOLACE_BROKER_PASSWORD}
  broker_vpn: ${SOLACE_BROKER_VPN, default}
...
```

**Behavior to plan for** — `${VAR}` for an unset variable does not fail loudly at config load. It substitutes an empty string and lets the downstream consumer reject it (`oauth2cc: client_secret is required`). When you want fail-fast at boot, set the variable explicitly to a known-bad sentinel rather than leaving it unset, and let the consumer reject the sentinel.

## File-Mounted Secrets

Any field with a `*_file` sibling reads its value from the file at the configured path instead of taking a literal value. This is the recommended pattern on Kubernetes because the chart can mount a `Secret` volume to a fixed path and the YAML references that path:

```yaml
# configs/agent.yaml
...
model:
  model: anthropic/claude-sonnet-4-5
  api_key_file: /etc/secrets/anthropic-api-key
...
```

The three common file-mount fields:

| Field | Reads | Used by |
|---|---|---|
| `api_key_file` | LLM provider API key | `model:` block on every agent |
| `auth_credentials_file` | Vertex AI service-account JSON | `model:` block on Vertex agents |
| `credentials_file` | GCS service-account JSON | `artifact_service:` block when `type: gcs` |

`oauth_*` fields follow the same pattern — `oauth_client_secret_file` is recognised wherever `oauth_client_secret` is.

## The Secret-Bearing Surfaces

Each row below is one piece of secret material Agent Mesh consumes. Use the env-var name as the canonical identifier; the YAML reads it via `${VAR}` substitution unless you use the file-mount alternative.

| Surface | Env var | YAML field | Used by |
|---|---|---|---|
| Broker password | `SOLACE_BROKER_PASSWORD` | `broker.broker_password` | Every component |
| LLM provider key | `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` / `GROQ_API_KEY` / others | `model.api_key` (or implicit, picked up by Bifrost) | Every agent that calls an LLM |
| Vertex AI service account | path in `auth_credentials_file` | `model.auth_credentials_file` | Vertex agents |
| AWS Bedrock and S3 credentials | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | `model.access_key` / `artifact_service.aws_access_key_id` | Bedrock agents, S3 artifact store |
| GCS service account | `GCS_CREDENTIALS_JSON` (inline) or path in `credentials_file` | `artifact_service.credentials_file` | GCS artifact store |
| Azure Blob credentials | `AZURE_STORAGE_CONNECTION_STRING` | `artifact_service.connection_string` | Azure artifact store |
| Database password | embedded in the connection URL | `session_service.database_url` | Gateway, agents with persistent sessions |
| Session cookie signing key | `SESSION_SECRET_KEY` | `gateway.session_secret_key` | Web UI gateway |
| OIDC client secret | `OIDC_CLIENT_SECRET` | `providers.<name>.client_secret` in the OIDC catalog | Gateway with built-in OIDC |
| LLM gateway OAuth2 client secret | `LLM_SERVICE_OAUTH_CLIENT_SECRET` | `model.oauth_client_secret` | Agents talking to an OAuth2-secured LLM gateway |
| Slack tokens | `SLACK_APP_TOKEN`, `SLACK_BOT_TOKEN` | `app_config:` on the Slack gateway | Slack gateway |
| Email gateway IMAP password | `GMAIL_POC_APP_PASSWORD` (or your provider equivalent) | `app_config.imap_password` on the Email gateway | Email gateway |

### Generating a Session-Cookie Key

The Web UI gateway signs its session cookies with `session_secret_key`. The Helm chart, the embedded mode, and the multi-process layout all require this to be set. Generate a value with 32 bytes of entropy:

```bash
openssl rand -hex 32
```

A short or empty value is accepted at boot but means an attacker who guesses the key can forge cookies for any user. Treat this the same as a database password.

## Rotation Procedures

Rotation always has the same shape — change the underlying source, then restart the consuming process. The mechanics differ by deployment.

### Local Development

Edit `.env` in the project root and restart `sam run`. The CLI re-reads `.env` on startup.

### Docker

Update the `-e VAR=newvalue` flag or the `--env-file` path, then restart the container:

```bash
docker restart agent-mesh
```

In a multi-container layout, restart every container that consumes the rotated secret. A broker password rotation hits the gateway and every AWE container; an LLM-key rotation hits only the agent containers that use that provider.

### Kubernetes

Update the underlying `Secret`:

```bash
kubectl create secret generic agent-mesh-secrets \
  --from-literal=ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}" \
  --dry-run=client -o yaml \
  | kubectl apply -f -
```

Then roll the consuming `Deployment` so the pods pick up the new env vars:

```bash
kubectl rollout restart deployment/agent-mesh-gateway
kubectl rollout restart deployment/agent-mesh-awe
```

For file-mounted secrets the kubelet propagates the new contents to the volume without a restart, typically within a minute. A `kubectl rollout restart` is still the safest path because consumers that cache the credential at startup will not pick up the new value otherwise.

### Per-Surface Notes

- **Broker password** — Rotate at the broker first. Active SMF / WebSocket sessions stay connected on the old credentials; reconnects (and new components rolling) use the new value.
- **LLM provider key** — Issue a new key, deploy it, then revoke the old one at the provider. Most providers leave both keys live during an overlap window.
- **Object-storage credentials** — Prefer IAM roles via the cloud provider's default credential chain (`AWS_ROLE_ARN`, GCP workload identity, Azure managed identity). Those rotate transparently and need no application-side change.
- **Database password** — Coordinate with active connections. A rolling restart of the gateway and the agents that hold persistent sessions is enough; the new connection pool uses the new credential.
- **Session cookie signing key** — Changing this **invalidates every active session**. Every signed-in user is redirected to log in again on next request. Plan for a brief sign-in surge or pick a low-traffic window.
- **OIDC client secret** — Rotate at the IdP, update the env var, restart the gateway. In-flight logins fail during the restart window. Existing logged-in sessions stay valid because cookies are signed with `SESSION_SECRET_KEY`, not the IdP secret.
- **LLM gateway OAuth2 client secret** — Bifrost caches the access token until it expires, so rotation does not visibly bite until the next refresh. Restart agents to force an immediate fetch.

## Secrets in Logs

Agent Mesh's logging surface is structured to avoid leaking secret material:

- **Database connection URLs are redacted at log time.** The gateway redacts database URLs before they hit the slog handler — `postgres://user:hunter2@host/db` becomes `postgres://user:xxxxx@host/db` in `stdout`. SQLite URLs (no credentials possible) and unparseable URLs are handled defensively.
- **OAuth2 token-endpoint error bodies have two distinct treatments.** The LLM-gateway OAuth2 client-credentials path caps logged bodies at 200 bytes and extracts only RFC 6749 `error` / `error_description` fields. The OIDC user-login refresh path reads the full response body with no size cap and embeds it verbatim in the returned error string; downstream handlers that log that error therefore log the full body. Filter token-endpoint response bodies at log ingest as a catch-all rather than relying on either path's behavior.
- **The audit logger uses a closed schema.** Audit records carry `user_id`, `tool`, `agent`, `session_id`, `scopes`, `required_scopes`, `method`, `app_name`, `task_id`, `duration_ms`, `error`, and `reason` — nothing else. `Authorization` headers, cookies, and request bodies are not in the schema and never reach the audit stream. See Audit and compliance for the full schema and the JSON-handler requirement that keeps the contract intact.

Slog is otherwise structured and never logs known secret-bearing fields by name. The pattern operators should still enforce at ingest: a generic regex that redacts `password=`, `client_secret=`, and bearer-token shapes as a belt-and-braces guard against future contributors logging a raw error chain that wraps a sensitive value.

## What Next?

Secrets are wired in and the rotation procedure is in place. The companion topic is the certificate side of the same security boundary — server certs, CA bundles, and expiry monitoring — covered in TLS.
