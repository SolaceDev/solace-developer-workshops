---
title: Configuring Agent Mesh
description: Configure the event broker, LLM provider, artifact and session storage, authentication, and secrets for a Kubernetes install of Agent Mesh.
sidebar_position: 360
---

# Configuring Agent Mesh

You have Agent Mesh installed. Configuration connects it to your environment and makes it usable for your deployment.

A Kubernetes install reads its configuration from Helm chart values: you set values in a values file, and the chart renders the underlying configuration and environment for you. This page covers the most common values for each concern and links to the full procedure. For the step-by-step production install, see [Installing Kubernetes for Production](./kubernetes/production.md). For every chart value, see [Helm Values Reference](../reference/helm-values.md).

The desktop bundle is not configured through this page; it runs with bundled defaults and prompts for your large language model (LLM) API key on first launch.

## What to Configure First

Configuration breaks down into concerns that you can set independently. The following table lists each concern, what it controls, and when you need it.

| What you configure | What it controls | Required for |
|---|---|---|
| Event broker | Which event broker carries messages between components | Every deployment |
| LLM provider | Which model the agent calls and how it authenticates | Every agent that calls an LLM |
| Artifact storage | Where versioned artifacts such as documents and images persist | Any agent that produces artifacts |
| Session storage | Where conversation history and task checkpoints persist | Multi-turn chats and resumable tasks |
| Authentication | Who can use the entrypoint | Non-local deployments |
| Secrets | How API keys, tokens, and credentials are sourced | Every deployment |

A production Kubernetes deployment needs at minimum an external event broker, a real LLM provider, durable artifact and session storage, and an identity provider.

## Event Broker

The event broker carries every agent-to-agent and agent-to-entrypoint message. The chart deploys an embedded event broker by default for evaluation. A production deployment disables the embedded event broker and points at an external Solace event broker:

```yaml
global:
  broker:
    embedded: false
broker:
  url: "tcps://your-broker.messaging.solace.cloud:55443"
  vpn: "your-vpn"
  clientUsername: "your-username"
  password: "${BROKER_PASSWORD}"
```

:::warning
The embedded event broker provides no high availability and no backup and restore. Set `global.broker.embedded: false` and supply an external event broker for production.
:::

For the full event broker value set and the procedure for connecting an external event broker, see [Installing Kubernetes for Production](./kubernetes/production.md).

## LLM Provider

Every agent, and the entrypoint's system agent when present, calls a model identified by a `<provider>/<model-name>` string. The prefix selects the API protocol, and the runtime handles the per-provider details.

| Prefix | Provider | Notes |
|---|---|---|
| `openai/` | OpenAI direct, or any OpenAI-compatible endpoint | The default when you give no prefix. |
| `anthropic/` | Anthropic Claude direct | Inferred from any model name that contains `claude` or `anthropic`. |
| `azure/` | Azure OpenAI | Requires an endpoint, an API version, and a deployments map. |
| `bedrock/` | AWS Bedrock | Requires an IAM principal with `bedrock:InvokeModel`, plus an access key, a secret key, and a region. |
| `vertex/` | Google Vertex AI | Requires a service account with the `aiplatform.user` role, plus a project ID, a region, and application default credentials. |
| `google/` | Google Generative AI direct | Inferred from any model name that contains `gemini`. |
| `ollama/` | Local Ollama | Requires an endpoint URL, for example `http://localhost:11434`. |
| `huggingface/`, `replicate/` | Hugging Face Inference and Replicate | Use the standard API-key pattern. |
| `groq/`, `mistral/`, `cohere/`, `xai/`, `openrouter/`, `perplexity/`, `cerebras/`, `nebius/` | Other supported providers | Use the standard API-key pattern. The `cerebras` and `nebius` providers are recognized but not tested end-to-end. |

For the connection, retry, and authentication fields that accompany the model string, see [The `model` Block](../reference/config-schema.md#the-model-block) in Configuration Schema.

On Kubernetes, the LLM block is optional. If you leave it empty, you choose a provider and enter the API key on first login through the Model Configuration prompt.

```yaml
llmService:
  llmServiceEndpoint: "https://api.openai.com/v1"
  llmServiceApiKey: "${LLM_SERVICE_API_KEY}"
  planningModel: "gpt-4o"
  generalModel: "gpt-4o"
```

The endpoint, API key, and non-empty model names are seeded at startup as the `planning` and `general` model aliases. You can add or change model configurations later in the Agent Mesh UI.

## Artifact Storage

The artifact service holds the versioned artifacts that agents produce or consume, such as documents, images, and generated reports. A production deployment points at an external object store through the `dataStores` values:

```yaml
dataStores:
  objectStorage:
    type: "s3"
  s3:
    bucketName: "my-sam-artifacts"
    region: "us-east-1"
    accessKey: "${S3_ACCESS_KEY}"
    secretKey: "${S3_SECRET_KEY}"
```

Set `dataStores.objectStorage.type` to `s3`, `azure`, or `gcs`, and populate the matching block. To remove static access keys, use workload identity instead. For workload identity and the full storage value set, see [Authenticate to Cloud Storage with Workload Identity](./kubernetes/production.md#authenticate-to-cloud-storage-with-workload-identity).

:::warning
Agent Mesh validates S3 bucket access at startup, so a missing or forbidden bucket fails the workload before it accepts traffic. The Google Cloud Storage and Azure backends defer their credential and container checks to the first read or write. Verify access independently to catch a misconfigured bucket before it appears under load.
:::

## Session Storage

The session service holds the conversation history and task checkpoints that let an agent resume across requests. A production deployment points at an external PostgreSQL database through the `dataStores.database` values:

```yaml
dataStores:
  database:
    host: "mydb.abc123.us-east-1.rds.amazonaws.com"
    port: "5432"
    adminUsername: "postgres"
    adminPassword: "${DB_ADMIN_PASSWORD}"
    applicationPassword: "${DB_APP_PASSWORD}"
```

A database init container uses the admin credentials to create the Agent Mesh application users and databases. The `applicationPassword` is the shared password for those users.

:::warning
The init container creates the application users only if they do not already exist, and it does not change the password of a user that is already present. Set `applicationPassword` before the first install. To change it later, set a new `global.persistence.namespaceId` to create a fresh set of users and databases, or update the passwords directly in the database.
:::

For the full database value set, see [Installing Kubernetes for Production](./kubernetes/production.md).

## Authentication

Authentication is a property of the Web UI entrypoint, not the agents. It answers who the user is. Role-based access control (RBAC), which answers what an authenticated user can do, is a separate concern. For more information, see [RBAC Reference](../reference/rbac-reference.md).

A production deployment enables authorization and configures the OpenID Connect (OIDC) provider through the `sam` values:

```yaml
sam:
  authorization:
    enabled: true
  oauthProvider:
    oidc:
      issuer: "https://login.microsoftonline.com/YOUR-TENANT-ID/v2.0"
      clientId: "your-client-id"
      clientSecret: "${OIDC_CLIENT_SECRET}"
```

:::warning
When `sam.authorization.enabled` is `false`, every user has admin access. Set it to `true` for production and configure the OIDC provider.
:::

Register the callback URI `https://your-dns-name/api/v1/auth/callback` with your identity provider, where `your-dns-name` is the value of `sam.dnsName`. For the full authentication procedure, see [Installing Kubernetes for Production](./kubernetes/production.md).

## Secrets

Every credential is sourced at startup rather than written inline in your values file. Instead of placing passwords and API keys directly in the values file, reference existing Kubernetes Secrets through `extraSecretEnvironmentVars`. Each entry maps an environment variable name to a Secret name and key, and the chart injects the value into the workloads. The `${VAR}` placeholders in the values above—`${BROKER_PASSWORD}`, `${S3_ACCESS_KEY}`, `${DB_ADMIN_PASSWORD}`, `${OIDC_CLIENT_SECRET}`, and the like—resolve from those injected variables.

## Validate the Configuration

Confirm that the configuration is well-formed before the first task arrives.

To pre-flight connectivity, run `sam doctor`. It reads the connection settings present in your environment (event broker, LLM service endpoint, databases, object storage, TLS, and OIDC) and reports a PASS, WARN, FAIL, or SKIP line per check. On a developer machine, set `SAM_DOCTOR_CONTEXT=local`, which skips the checks for services you have not configured instead of failing them:

```bash
SAM_DOCTOR_CONTEXT=local sam doctor -v
```

The `-v` flag turns on verbose output, and a failing check causes a non-zero exit. This pre-flight is most useful when you set the connection variables yourself, for example when rehearsing a Kubernetes deployment.

On Kubernetes, the chart runs the `sam-doctor` pre-install check automatically before it creates any workload pods, using the `helm` rule set. The check confirms cluster resources and the referenced Secrets, ConfigMaps, StorageClass, and IngressClass exist. For how to read its output, see [Kubernetes Installation Issues](./troubleshoot.md#kubernetes-installation-issues).

After the install, you can confirm the deployment is reachable through its ingress hostname:

```bash
curl -s https://sam.example.com/health
curl -s https://sam.example.com/api/v1/platform/health
```

If both endpoints return a successful response, Agent Mesh is running correctly. The entrypoint `/health` endpoint returns a plain `ok` body, and the platform endpoint returns:

```json
{"status":"healthy","service":"Platform Service"}
```

## Next Steps

You have configured Agent Mesh for your environment. After it is running, confirm it is healthy and emitting the metrics and logs your monitoring stack consumes. For more information, see [Monitoring Your Deployment](./monitor.md).
