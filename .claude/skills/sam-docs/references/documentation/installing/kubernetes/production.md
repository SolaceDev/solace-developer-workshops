---
title: Installing Kubernetes for Production
description: Full production Kubernetes deployment with external event broker, managed databases, object storage, OIDC authentication, TLS, and RBAC.
sidebar_position: 352
---

# Installing Kubernetes for Production

This guide covers a full production deployment of Agent Mesh on Kubernetes. Unlike the Quick Start, this deployment uses an external Solace event broker, external persistent storage, TLS, and authentication. Complete [Before You Begin](../before-you-begin.md) and the [Kubernetes Quick Start](./quickstart.md) before following this guide.

## Prerequisites

Before you begin, make sure you have the following:

- A running Kubernetes cluster on version 1.33 or later.
- Cluster nodes that provide at least 4 vCPU and 16 GiB of allocatable memory for the Entrypoint Executor, Agent-Workflow Executor, and Secure Tool Runtime workloads. The external layout in this guide removes the embedded event broker and datastores, so the cluster carries only the Agent Mesh workloads. For full sizing guidance and per-agent capacity planning, see [Compute Resources](./compute-resources.md).
- `kubectl` installed and configured to talk to your cluster.
- The Helm command-line interface (CLI) version 3.0 or later.
- The Agent Mesh Helm chart archive (`solace-agent-mesh-<version>.tar.gz`) and the image pull credentials file (`sam-pull-credentials.json`). Solace provides both. For how to download the chart, see [Obtain the Delivery Package](../before-you-begin.md#obtain-the-delivery-package). The credentials file is provided separately.
- An external Solace event broker (Solace Cloud or self-managed). You need the secured Solace Message Format (SMF) connection URL, the Message VPN name, a client username, and a password.
- A managed PostgreSQL database for session storage, with admin credentials that can create databases and users.
- An S3-compatible object store for artifact storage. AWS S3, Azure Blob Storage, and Google Cloud Storage are supported.
- An API key for a supported large language model (LLM) provider. You can supply this at install time or enter it on first login.
- A DNS name for your deployment and a Transport Layer Security (TLS) certificate for that name.
- An OpenID Connect (OIDC) identity provider for single sign-on (SSO) and role-based access control (RBAC).

The chart does not require any specific admission controllers. Before it creates any workload pods, the chart runs a `sam-doctor` pre-install check and template-time cluster resource checks that confirm the referenced Secrets, ConfigMaps, StorageClass, and IngressClass exist.

:::note Cluster Resource Checks Need Read Access
The template-time checks require `get` RBAC on the cluster resources they look up. If the install service account lacks that access, set `validations.clusterResourceChecks: false` in your values file. For how to read the pre-install check output, see [Kubernetes Installation Issues](../troubleshoot.md#kubernetes-installation-issues).
:::

## Configure Your Helm Values

A production deployment overrides the chart defaults with a values file that disables the embedded components and points Agent Mesh at your external services. Create a file named `production-values.yaml` and add the blocks in this section. For the complete set of chart values, see [Helm Values Reference](../../reference/helm-values.md).

:::warning Embedded Components Are Not Supported for Production
The chart defaults deploy an embedded event broker and bundled PostgreSQL and object storage for evaluation. These components do not provide high availability or backup and restore. A production deployment must set `global.broker.embedded: false` and `global.persistence.enabled: false` and supply external services.
:::

1. Disable the embedded components and set a unique namespace identifier:

   ```yaml
   global:
     broker:
       embedded: false
     persistence:
       enabled: false
       namespaceId: "your-deployment-id"
   ```

   The `namespaceId` scopes the database users and the event broker topics for this installation. Set it to a unique value per installation to avoid topic collisions between deployments that share an event broker.

2. Configure the external event broker connection:

   ```yaml
   broker:
     url: "tcps://your-broker.messaging.solace.cloud:55443"
     vpn: "your-vpn"
     clientUsername: "your-username"
     password: "your-password"
   ```

   | Key | Description |
   |---|---|
   | `broker.url` | Secured connection URL. Use the secured SMF port (`tcps://...:55443`) or WebSocket Secure (`wss://...:443`). |
   | `broker.vpn` | Message VPN name. |
   | `broker.clientUsername` | Client username for event broker authentication. |
   | `broker.password` | Client password. |

3. Configure the LLM provider. This block is optional. If you leave it empty, you select a provider and enter the API key on first login through the Model Configuration prompt.

   ```yaml
   llmService:
     llmServiceEndpoint: "https://api.openai.com/v1"
     llmServiceApiKey: "your-api-key"
     planningModel: "gpt-4o"
     generalModel: "gpt-4o"
   ```

   Non-empty model names, the endpoint, and the API key are seeded into the platform at startup as the `planning` and `general` model aliases. You can add or change model configurations later in the Console.

4. Configure PostgreSQL for session storage:

   ```yaml
   dataStores:
     database:
       host: "mydb.abc123.us-east-1.rds.amazonaws.com"
       port: "5432"
       adminUsername: "postgres"
       adminPassword: "your-admin-password"
       applicationPassword: "your-application-password"
   ```

   | Key | Description |
   |---|---|
   | `dataStores.database.host` | PostgreSQL hostname. |
   | `dataStores.database.port` | PostgreSQL port. Defaults to `5432`. |
   | `dataStores.database.adminUsername` | Admin user. A database init container uses these admin credentials to create the Agent Mesh application users and databases. |
   | `dataStores.database.adminPassword` | Admin password. |
   | `dataStores.database.applicationPassword` | Shared password for all Agent Mesh database users, including the entrypoint, orchestrator, platform, and agents. Required for external persistence. |

   For Supabase with the connection pooler, also set `dataStores.database.supabaseTenantId` to your project ID.

   :::warning Set the Application Password Before First Install
   The database init container creates the application users only if they do not already exist. It does not change the password of a user that is already present, so after first install, changing `applicationPassword` has no effect on the existing users. To change it, set a new `global.persistence.namespaceId` to create a fresh set of users and databases. You can also update the passwords directly in the database.
   :::

5. Configure S3-compatible artifact storage:

   ```yaml
   dataStores:
     objectStorage:
       type: "s3"
     s3:
       bucketName: "my-sam-artifacts"
       connectorSpecBucketName: "my-sam-artifacts"
       region: "us-east-1"
       accessKey: "your-access-key"
       secretKey: "your-secret-key"
   ```

   | Key | Description |
   |---|---|
   | `dataStores.objectStorage.type` | Object storage type: `s3`, `azure`, or `gcs`. |
   | `dataStores.s3.bucketName` | Bucket for artifact storage. |
   | `dataStores.s3.connectorSpecBucketName` | Bucket for connector specifications. Can be the same as `bucketName`. |
   | `dataStores.s3.region` | AWS region. |
   | `dataStores.s3.accessKey` | Access key ID. Omit when you use workload identity. |
   | `dataStores.s3.secretKey` | Secret access key. Omit when you use workload identity. |

   Leave `dataStores.s3.endpointUrl` empty for AWS S3. Set it for MinIO or another S3-compatible store. For Azure Blob Storage or Google Cloud Storage, set `dataStores.objectStorage.type` to `azure` or `gcs` and populate the matching `dataStores.azure` or `dataStores.gcs` block. The chart `values.yaml` documents the keys for each type.

6. Configure ingress and TLS:

   ```yaml
   sam:
     dnsName: "sam.example.com"
   ingress:
     enabled: true
     className: "nginx"
     tls:
       - secretName: sam-tls
         hosts:
           - sam.example.com
   ```

   | Key | Description |
   |---|---|
   | `sam.dnsName` | External hostname operators reach Agent Mesh at. It drives the host portion of every emitted URL, including the OIDC redirect URI. |
   | `ingress.enabled` | Set to `true` to route HTTP and HTTPS traffic through an ingress controller. |
   | `ingress.className` | Ingress controller class name, for example `nginx`, `alb`, or `traefik`. |
   | `ingress.tls` | TLS configuration. Each entry triggers HTTPS URL generation, which OIDC redirects require. TLS terminates at the ingress. |

7. Enable OIDC authentication and RBAC:

   ```yaml
   sam:
     authorization:
       enabled: true
     oauthProvider:
       oidc:
         issuer: "https://login.microsoftonline.com/YOUR-TENANT-ID/v2.0"
         clientId: "your-client-id"
         clientSecret: "your-client-secret"
   ```

   When `sam.authorization.enabled` is `false`, every user has admin access. Set it to `true` for production and configure the OIDC provider.

   :::note Register the OIDC Callback URI
   Register the callback URI `https://your-dns-name/api/v1/auth/callback` with your identity provider, substituting the value of `sam.dnsName`. The redirect fails if the registered URI does not match this exact path.
   :::

   For role definitions and scope assignments, see [RBAC Reference](../../reference/rbac-reference.md).

8. Set a stable session secret key:

   ```yaml
   sam:
     sessionSecretKey: "your-session-secret"
   ```

   If you leave this empty, the chart generates a key on first install and keeps it stable across upgrades. Set it explicitly for reproducibility across clusters. Generate a value with `openssl rand -hex 32`.

After you complete these steps, your `production-values.yaml` disables the embedded components and points Agent Mesh at your external event broker, database, object store, and identity provider.

:::tip Load Credentials from Existing Secrets
Instead of placing passwords and API keys inline, you can reference existing Kubernetes Secrets through `extraSecretEnvironmentVars`. Each entry maps an environment variable name to a Secret name and key. The chart `values.yaml` shows the format for the event broker password and the LLM API key.
:::

### Authenticate to Cloud Storage with Workload Identity

Workload identity lets the Agent Mesh pods authenticate to cloud object storage using their Kubernetes service account, which removes the static access keys from your values file. Enable it instead of the access key and secret key in the storage block:

```yaml
dataStores:
  objectStorage:
    type: "s3"
    workloadIdentity:
      enabled: true
samDeployment:
  serviceAccount:
    annotations:
      eks.amazonaws.com/role-arn: "arn:aws:iam::123456789012:role/my-sam-role"
```

Set the service account annotation for your cloud provider: `eks.amazonaws.com/role-arn` for AWS IRSA, `azure.workload.identity/client-id` for Azure Workload Identity, or `iam.gke.io/gcp-service-account` for GCP Workload Identity. Omit the static credentials (`accessKey` and `secretKey`, `accountKey`, or `credentialsJson`) for the storage type you use.

### Trust Custom CA Certificates

If your event broker, identity provider, or LLM endpoint presents a certificate signed by a private certificate authority (CA), add the CA bundle so the pods trust it.

1. Create a ConfigMap named `truststore` from your PEM certificate file. The data key must end in `.crt`:

   ```bash
   kubectl create configmap truststore \
     --from-file=ca.crt=/path/to/your-ca.crt \
     -n sam
   ```

2. Enable custom CA injection in your values file:

   ```yaml
   samDeployment:
     customCA:
       enabled: true
       configMapName: truststore
   ```

A `ca-merge` init container appends your certificates to the system trust bundle that all containers share. The ConfigMap must exist in the release namespace at install time, or the chart fails the render. To rotate certificates, replace the ConfigMap and restart the deployment with `kubectl rollout restart`, because the pods read the bundle only at startup.

## Deploy Agent Mesh

Install the chart with the credentials file and your production values.

1. Validate the rendered manifests with a dry run:

   ```bash
   helm install sam /path/to/solace-agent-mesh-<version>.tar.gz \
     --namespace sam \
     --create-namespace \
     --dry-run \
     --set-file global.imagePullKey=sam-pull-credentials.json \
     -f production-values.yaml
   ```

   The command renders the manifests and reports any configuration errors without creating resources.

2. Install the chart:

   ```bash
   helm install sam /path/to/solace-agent-mesh-<version>.tar.gz \
     --namespace sam \
     --create-namespace \
     --set-file global.imagePullKey=sam-pull-credentials.json \
     -f production-values.yaml
   ```

   The chart runs the pre-install check before it creates any workload pods. When the configuration uses external components, authentication, and ingress, the post-install output reports `Configured for production use` and prints the Console URL derived from your `sam.dnsName`.

   :::note Moving an Existing Quick Start Release to Production
   To convert an existing Quick Start release rather than create a new one, run `helm upgrade` in place of `helm install` with the same credentials file and `production-values.yaml`. Migration of data from the embedded PostgreSQL database to your external database is a separate task and is not automatic.
   :::

3. Watch the pods until every one reaches `Running` status:

   ```bash
   kubectl get pods -n sam -l app.kubernetes.io/instance=sam -w
   ```

   The Entrypoint Executor, Agent-Workflow Executor, and Secure Tool Runtime pods reach `Running` with all containers ready. A production deployment runs no embedded event broker or datastore pods. Press `Ctrl-C` to stop watching after all pods are `Running`. If a pod does not start, see [Kubernetes Installation Issues](../troubleshoot.md#kubernetes-installation-issues).

## Verify the Deployment

Confirm that each component is healthy and reachable before you route traffic to the deployment.

1. Check the entrypoint and platform health endpoints, substituting your DNS name:

   ```bash
   curl -s https://sam.example.com/health
   curl -s https://sam.example.com/api/v1/platform/health
   ```

   Both endpoints return a successful response when Agent Mesh is running correctly.

2. Open the Console at `https://your-dns-name`. You are redirected to your identity provider. After you sign in, the Console loads.

3. Confirm the event broker connection in the logs:

   ```bash
   kubectl logs -n sam -l app.kubernetes.io/instance=sam --tail 200
   ```

   The logs show a successful connection to the event broker and no connection errors.

4. Send a test message in Chat to confirm LLM connectivity. If you did not pre-configure the LLM provider, the Model Configuration prompt appears first. Select your provider, enter your API key, and save. A successful response from the orchestrator confirms the deployment is working end to end.

For health probe configuration and metrics collection, see [Monitoring Your Deployment](../monitor.md).

## Next Steps

- To configure logging and metrics, see [Monitoring Your Deployment](../monitor.md).
- For RBAC setup, see [RBAC Reference](../../reference/rbac-reference.md).
- For every Helm chart value, see [Helm Values Reference](../../reference/helm-values.md).
- For the production readiness checklist, see [Production Readiness Checklist](../../administering/production-readiness-checklist.md).
