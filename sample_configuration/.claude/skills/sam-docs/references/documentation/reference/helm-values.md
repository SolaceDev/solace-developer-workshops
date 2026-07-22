---
title: Helm Values Reference
description: Complete reference for the Agent Mesh Helm chart values, covering global settings, core configuration, external datastores, networking, deployment, and bundled components.
sidebar_position: 1070
---

# Helm Values Reference

This page lists the configuration values for the Agent Mesh Helm chart. The chart `values.yaml` works out of the box for a Quick Start deployment and is configured for production by overriding the values in this reference. For the production workflow, see [Installing Kubernetes for Production](../installing/kubernetes/production.md). For evaluation, see [Kubernetes Quick Start](../installing/kubernetes/quickstart.md).

The chart `values.yaml` carries inline documentation for every value. Consult it alongside this reference when you build an overrides file.

## Global

Settings that apply across all chart components.

| Key | Type | Default | Description |
|---|---|---|---|
| `global.broker.embedded` | bool | `true` | Deploy a single-node Solace event broker alongside Agent Mesh. Set to `false` for production and configure the external event broker. |
| `global.persistence.enabled` | bool | `true` | Deploy bundled persistence with in-cluster PostgreSQL and SeaweedFS. Set to `false` for production and configure external datastores. |
| `global.persistence.namespaceId` | string | `"solace-agent-mesh"` | Identifier for database and user scoping. Set to a unique value per installation to avoid topic collisions. |
| `global.imageRegistry` | string | `"gcr.io/gcp-maas-prod"` | Container registry for all images. Set to your internal registry for air-gapped environments. |
| `global.imagePullSecrets` | list | `[]` | Image pull secrets applied to all pods. Required when using a private registry. Mutually exclusive with `global.imagePullKey`. |
| `global.imagePullKey` | string | `""` | Docker config JSON for private registry authentication. The chart creates a `kubernetes.io/dockerconfigjson` Secret from it. Apply with `--set-file`. Mutually exclusive with `global.imagePullSecrets`. |
| `global.podRuntimes` | object | `{}` | Named pod runtime profiles for sandbox isolation such as gVisor or Kata. Each profile sets a `runtimeClassName` and optional `nodeSelector` and `tolerations`. |

## Validations

| Key | Type | Default | Description |
|---|---|---|---|
| `validations.clusterResourceChecks` | bool | `true` | Run template-time checks that referenced Secrets, ConfigMaps, StorageClass, and IngressClass exist before install. Requires `get` RBAC on those resources. Set to `false` if the install service account lacks that access. |

## Core Agent Mesh Configuration

Application-level settings under the `sam` key.

| Key | Type | Default | Description |
|---|---|---|---|
| `sam.frontendServerUrl` | string | `"http://localhost:8080"` | Frontend URL for port-forward access. Ignored when `ingress.enabled` is `true`. URLs then derive from `sam.dnsName` or `ingress.host`. Clear it when using NodePort or LoadBalancer with `sam.dnsName`. |
| `sam.cors.allowedOriginRegex` | string | `"https?://(localhost\|127\.0\.0\.1)(:\d+)?"` | Regular expression for allowed CORS origins. The default allows any localhost port. Set to `""` for production. |
| `sam.authorization.enabled` | bool | `false` | Enforce RBAC authorization through OIDC. When `false`, all users have admin access. Set to `true` for production. |
| `sam.dnsName` | string | `""` | External hostname operators reach Agent Mesh at. Drives the host portion of all emitted URLs, including the OIDC redirect URI, and takes precedence over `ingress.host`. Include the port for non-standard ports. |
| `sam.fe.apiBaseUrl` | string | omitted | Override for the frontend API base URL in off-origin scenarios. An empty string means same-origin; an absolute URL targets a specific origin; omitted derives the URL from `sam.dnsName`. |
| `sam.fe.platformBaseUrl` | string | omitted | Override for the frontend platform API base URL. Same behavior as `sam.fe.apiBaseUrl`. |
| `sam.sessionSecretKey` | string | `""` | Session secret key. Auto-generates on first install and stays stable across upgrades. Set explicitly for reproducibility across clusters. |
| `sam.oauthProvider.providerName` | string | `""` | Name of the entry in the baked OIDC provider catalog. Empty falls back to the binary default. |
| `sam.oauthProvider.oidc.issuer` | string | `""` | OIDC issuer URL. |
| `sam.oauthProvider.oidc.clientId` | string | `""` | OIDC client ID. |
| `sam.oauthProvider.oidc.clientSecret` | string | `""` | OIDC client secret. |
| `sam.authenticationRbac.disableBuiltinRoles` | bool | `false` | Suppress the built-in `sam_admin` and `sam_user` role definitions. Required when migrating role definitions to database-managed RBAC. |
| `sam.authenticationRbac.customRoles` | object | `{}` | Custom role definitions with fine-grained scopes. |
| `sam.authenticationRbac.users` | list | Example admin and standard user | Static user-to-role assignments. |
| `sam.authenticationRbac.idpClaims.enabled` | bool | `false` | Enable dynamic role assignment from identity provider claims. |
| `sam.authenticationRbac.idpClaims.oidcProvider` | string | `"oidc"` | OIDC provider name for identity provider claims. |
| `sam.authenticationRbac.idpClaims.claimKey` | string | `"groups"` | Claim key that holds group or role information. |
| `sam.authenticationRbac.idpClaims.mappings` | object | `{}` | Map identity provider claim values to Agent Mesh roles. |
| `sam.authenticationRbac.defaultRoles` | list | `["sam_user"]` | Roles assigned when no explicit match is found. |
| `sam.taskLogging.enabled` | bool | `true` | Enable logging during task execution. |
| `sam.taskLogging.logStatusUpdates` | bool | `true` | Log status updates during tasks. |
| `sam.taskLogging.logArtifactEvents` | bool | `false` | Log artifact events. |
| `sam.taskLogging.logFileParts` | bool | `true` | Log file parts. |
| `sam.taskLogging.maxFilePartSizeBytes` | int | `10240` | Maximum file part size to log, in bytes. |
| `sam.taskLogging.hybridBuffer.enabled` | bool | `true` | Enable the hybrid buffer for task logging. |
| `sam.taskLogging.hybridBuffer.flushThreshold` | int | `10` | Flush threshold for the hybrid buffer. |
| `sam.featureEnablement.showThinkingContent` | bool | `true` | Show model thinking content. |
| `sam.featureEnablement.autoTitleGeneration` | bool | `false` | Enable automatic session title generation. |

## Event Broker

External Solace event broker connection. Used when `global.broker.embedded` is `false`.

| Key | Type | Default | Description |
|---|---|---|---|
| `broker.url` | string | `""` | Event broker connection URL such as `tcps://broker.messaging.solace.cloud:55443` or `wss://...:443`. |
| `broker.clientUsername` | string | `""` | Client username for event broker authentication. |
| `broker.password` | string | `""` | Client password. |
| `broker.vpn` | string | `""` | Message VPN name. |

## LLM Service

Optional large language model (LLM) provider configuration. Configure here or through the Console after installation. Non-empty model names, the endpoint, and the API key are seeded into the platform at startup.

| Key | Type | Default | Description |
|---|---|---|---|
| `llmService.llmServiceEndpoint` | string | `""` | LLM API endpoint, for example `https://api.openai.com/v1`. |
| `llmService.llmServiceApiKey` | string | `""` | API key for the LLM service. |
| `llmService.planningModel` | string | `""` | Model name for planning tasks. |
| `llmService.generalModel` | string | `""` | Model name for general tasks. |
| `llmService.reportModel` | string | `""` | Model name for reports. |
| `llmService.imageModel` | string | `""` | Model name for image generation. |
| `llmService.transcriptionModel` | string | `""` | Model name for audio transcription. |

## Tool API Keys

Credentials and endpoints for built-in tools and the bundled agent extras. Empty values are omitted from the rendered Secret so the binary defaults apply. The API base URLs default to public provider endpoints; point them at an internal proxy for air-gapped environments.

| Key | Type | Default | Description |
|---|---|---|---|
| `toolApiKeys.anthropic` | string | `""` | `ANTHROPIC_API_KEY` value. |
| `toolApiKeys.gemini` | string | `""` | `GEMINI_API_KEY` value for the image and audio agents and the entrypoint describe-image tool. |
| `toolApiKeys.geminiApiBase` | string | `"https://generativelanguage.googleapis.com"` | `GEMINI_API_BASE` endpoint for image generation. |
| `toolApiKeys.google` | string | `""` | `GOOGLE_API_KEY` value, used for provider auto-detection. |
| `toolApiKeys.googleSearchApiKey` | string | `""` | `GOOGLE_SEARCH_API_KEY` value for the research agent web search. |
| `toolApiKeys.googleSearchApiBase` | string | `"https://www.googleapis.com"` | `GOOGLE_SEARCH_API_BASE` endpoint for the research agent web search. |
| `toolApiKeys.googleCseId` | string | `""` | `GOOGLE_CSE_ID` value for the research agent web search. |

## Environment Variables

| Key | Type | Default | Description |
|---|---|---|---|
| `extraSecretEnvironmentVars` | list | `[]` | Load credentials from existing Kubernetes Secrets. Each entry sets `envName`, `secretName`, and `secretKey`. |
| `environmentVariables` | object | `NO_PROXY` and feature flags | Inject custom non-secret environment variables into the Agent Mesh containers. Values render into a ConfigMap in plaintext, so use `extraSecretEnvironmentVars` for credentials. The default sets `NO_PROXY` for in-cluster traffic and a set of `SAM_FEATURE_*` flags. Add `HTTP_PROXY` and `HTTPS_PROXY` here for proxied or air-gapped egress. |

## Network: Service

Kubernetes Service settings. The Entrypoint Executor's service exposes the Web UI entrypoint on a single port.

| Key | Type | Default | Description |
|---|---|---|---|
| `service.type` | string | `"ClusterIP"` | Service type. Keep `ClusterIP` when using ingress, or set to `LoadBalancer` or `NodePort` for direct access. |
| `service.annotations` | object | `{}` | Service annotations, for example cloud-specific load balancer configuration. |
| `service.nodePorts.http` | string | `""` | Pinned node port for the Web UI entrypoint over HTTP (service port 80). Used only when `service.type` is `NodePort`. |
| `service.nodePorts.https` | string | `""` | Pinned node port for the Web UI entrypoint over HTTPS (service port 443). Requires `service.tls.enabled`. |
| `service.tls.enabled` | bool | `false` | Enable pod-level TLS termination for LoadBalancer or NodePort access. Not needed for ingress. |
| `service.tls.existingSecret` | string | `""` | Reference an existing `kubernetes.io/tls` Secret. |
| `service.tls.cert` | string | `""` | TLS certificate. Provide with `--set-file`. |
| `service.tls.key` | string | `""` | TLS key. Provide with `--set-file`. |
| `service.tls.passphrase` | string | `""` | TLS key passphrase. |

## Network: Ingress

| Key | Type | Default | Description |
|---|---|---|---|
| `ingress.enabled` | bool | `false` | Enable ingress for HTTP and HTTPS routing. Set to `true` for production. |
| `ingress.className` | string | `""` | Ingress controller class name, for example `nginx`, `alb`, `traefik`, or `gce`. |
| `ingress.annotations` | object | `{}` | Ingress annotations, which vary by controller. |
| `ingress.autoConfigurePaths` | bool | `true` | Generate all required ingress paths for the platform API, auth endpoints, and the Web UI entrypoint. |
| `ingress.host` | string | `""` | Hostname for the ingress. Leave empty for ALB. Set to your domain for NGINX and other name-based controllers. |
| `ingress.hosts` | list | `[]` | Manual hosts and paths. Used only when `autoConfigurePaths` is `false`. |
| `ingress.tls` | list | `[]` | TLS configuration. Each entry triggers HTTPS URL generation, which OIDC redirects require. |

## External Datastores

External PostgreSQL database and object storage under the `dataStores` key. Used when `global.persistence.enabled` is `false`.

| Key | Type | Default | Description |
|---|---|---|---|
| `dataStores.database.host` | string | `""` | PostgreSQL hostname. |
| `dataStores.database.port` | string | `"5432"` | PostgreSQL port. |
| `dataStores.database.adminUsername` | string | `""` | Admin user. The chart uses these credentials to create the Agent Mesh application users and databases. |
| `dataStores.database.adminPassword` | string | `""` | Admin password. |
| `dataStores.database.applicationPassword` | string | `""` | Shared password for all Agent Mesh database users. Required for external persistence. |
| `dataStores.database.supabaseTenantId` | string | `""` | Supabase project ID. Required with the Supabase connection pooler. |
| `dataStores.objectStorage.type` | string | `"s3"` | Object storage type: `s3`, `azure`, or `gcs`. |
| `dataStores.objectStorage.workloadIdentity.enabled` | bool | `false` | Use cloud-native authentication (AWS IRSA, Azure Workload Identity, GCP Workload Identity) instead of static keys. |
| `dataStores.s3.endpointUrl` | string | `""` | S3 endpoint URL. Leave empty for AWS S3. Set it for MinIO or another S3-compatible store. |
| `dataStores.s3.bucketName` | string | `""` | Bucket for artifact storage. |
| `dataStores.s3.connectorSpecBucketName` | string | `""` | Bucket for connector specifications. Can be the same as `bucketName`. |
| `dataStores.s3.evalDataBucketName` | string | `""` | Optional bucket for evaluation data and artifact snapshots. Defaults to `bucketName` when empty. |
| `dataStores.s3.accessKey` | string | `""` | Access key ID. Omit when using workload identity. |
| `dataStores.s3.secretKey` | string | `""` | Secret access key. Omit when using workload identity. |
| `dataStores.s3.region` | string | `"us-east-1"` | AWS region. |
| `dataStores.azure.accountName` | string | `""` | Azure storage account name. |
| `dataStores.azure.accountKey` | string | `""` | Azure storage account key. Omit when using workload identity. |
| `dataStores.azure.connectionString` | string | `""` | Azure storage connection string. Alternative to account name and key. |
| `dataStores.azure.containerName` | string | `""` | Blob container for artifact storage. |
| `dataStores.azure.connectorSpecContainerName` | string | `""` | Blob container for connector specifications. Can be the same as `containerName`. |
| `dataStores.azure.evalDataContainerName` | string | `""` | Optional Blob container for evaluation data and artifact snapshots. Defaults to `containerName` when empty. |
| `dataStores.gcs.project` | string | `""` | GCP project ID. |
| `dataStores.gcs.credentialsJson` | string | `""` | GCS service account JSON credentials. Omit when using workload identity. |
| `dataStores.gcs.bucketName` | string | `""` | Bucket for artifact storage. |
| `dataStores.gcs.connectorSpecBucketName` | string | `""` | Bucket for connector specifications. Can be the same as `bucketName`. |
| `dataStores.gcs.evalDataBucketName` | string | `""` | Optional bucket for evaluation data and artifact snapshots. Defaults to `bucketName` when empty. |

## Shared Volumes

Shared filesystem volume store for the Agent Mesh volumes feature.

| Key | Type | Default | Description |
|---|---|---|---|
| `volumes.enabled` | bool | `false` | Mount a shared read-write-many volume on the Entrypoint Executor, Agent-Workflow Executor, and Secure Tool Runtime pods. |
| `volumes.existingClaim` | string | `""` | Name of an existing read-write-many PVC. Required when `volumes.enabled` is `true`. |
| `volumes.mountPath` | string | `/app/data/volumes` | Mount path for the shared volume. |

## Deployment

Deployment settings under the `samDeployment` key, including the Entrypoint Executor, Agent-Workflow Executor, and Secure Tool Runtime workloads.

| Key | Type | Default | Description |
|---|---|---|---|
| `samDeployment.serviceAccount.name` | string | `""` | Service account name. Auto-generates a per-component name when empty. Set explicitly for workload identity. |
| `samDeployment.serviceAccount.annotations` | object | `{}` | Service account annotations for workload identity. |
| `samDeployment.imagePullSecret` | string | `""` | Image pull secret attached to the Agent Mesh service accounts. Using `global.imagePullSecrets` is preferred. |
| `samDeployment.dbInit.image.registry` | string | `""` | Registry override for the database init container image. |
| `samDeployment.dbInit.image.repository` | string | `postgres` | Database init container image repository. |
| `samDeployment.dbInit.image.tag` | string | `"18.0-trixie"` | Database init container image tag. |
| `samDeployment.dbInit.image.digest` | string | `""` | Database init container image digest. Takes precedence over the tag when set. |
| `samDeployment.dbInit.image.pullPolicy` | string | `IfNotPresent` | Database init container pull policy. |
| `samDeployment.s3Init.image.registry` | string | `""` | Registry override for the S3 init container image. |
| `samDeployment.s3Init.image.repository` | string | `chrislusf/seaweedfs` | S3 init container image repository. Used when bundled persistence is enabled. |
| `samDeployment.s3Init.image.tag` | string | `"3.97-compliant"` | S3 init container image tag. |
| `samDeployment.s3Init.image.digest` | string | `""` | S3 init container image digest. |
| `samDeployment.s3Init.image.pullPolicy` | string | `IfNotPresent` | S3 init container pull policy. |
| `samDeployment.gwe.image.registry` | string | `""` | Registry override for the Entrypoint Executor image. |
| `samDeployment.gwe.image.repository` | string | `solace-agent-mesh` | Entrypoint Executor image repository. |
| `samDeployment.gwe.image.tag` | string | Chart default | Entrypoint Executor image tag. Defaults to the tag shipped with the chart version. Override only to pin a specific build. |
| `samDeployment.gwe.image.digest` | string | `""` | Entrypoint Executor image digest. Takes precedence over the tag when set. |
| `samDeployment.gwe.image.pullPolicy` | string | `IfNotPresent` | Entrypoint Executor image pull policy. |
| `samDeployment.gwe.resources` | object | req `500m`/`1Gi`, lim `4`/`2Gi` | Resource requests and limits for the Entrypoint Executor container. The chart ships Burstable defaults; `GOMEMLIMIT` is derived from `limits.memory`. See [Compute Resources](../installing/kubernetes/compute-resources.md). |
| `samDeployment.gwe.podRuntime` | string | `""` | Sandbox pod runtime profile name from `global.podRuntimes`. Empty disables sandbox runtime selection. |
| `samDeployment.awe.image.registry` | string | `""` | Registry override for the Agent-Workflow Executor image. |
| `samDeployment.awe.image.repository` | string | inherits `gwe` | Agent-Workflow Executor image repository. Blank inherits `samDeployment.gwe.image.repository`. |
| `samDeployment.awe.image.tag` | string | inherits `gwe` | Agent-Workflow Executor image tag. Blank inherits `samDeployment.gwe.image.tag`. |
| `samDeployment.awe.image.digest` | string | inherits `gwe` | Agent-Workflow Executor image digest. Blank inherits `samDeployment.gwe.image.digest`. |
| `samDeployment.awe.resources` | object | req `1`/`1Gi`, lim `4`/`2Gi` | Resource requests and limits for the Agent-Workflow Executor container. The Agent-Workflow Executor takes the highest CPU request as the heaviest workload. `GOMEMLIMIT` is derived from `limits.memory`. See [Compute Resources](../installing/kubernetes/compute-resources.md). |
| `samDeployment.awe.extraConfigs` | list | `[]` | Additional config files to load alongside the default, for example a baked agent config under `/etc/sam/configs/awe/`. |
| `samDeployment.awe.podRuntime` | string | `""` | Sandbox pod runtime profile name for the Agent-Workflow Executor. |
| `samDeployment.str.image.registry` | string | `""` | Registry override for the Secure Tool Runtime image. |
| `samDeployment.str.image.repository` | string | `solace-agent-mesh-str` | Secure Tool Runtime image repository. This image carries the Go and Python language runtimes and must not inherit the Entrypoint Executor image. |
| `samDeployment.str.image.tag` | string | Chart default | Secure Tool Runtime image tag. Defaults to the tag shipped with the chart version. Override only to pin a specific build. |
| `samDeployment.str.image.digest` | string | `""` | Secure Tool Runtime image digest. |
| `samDeployment.str.image.pullPolicy` | string | `IfNotPresent` | Secure Tool Runtime image pull policy. |
| `samDeployment.str.resources` | object | req `500m`/`2Gi`, lim `4`/`4Gi` | Resource requests and limits for the Secure Tool Runtime container. The Secure Tool Runtime carries a higher memory floor and ceiling for its tool subprocesses. `GOMEMLIMIT` is derived from `limits.memory`. See [Compute Resources](../installing/kubernetes/compute-resources.md). |
| `samDeployment.str.podRuntime` | string | `""` | Sandbox pod runtime profile name for the Secure Tool Runtime. |
| `samDeployment.caInitImage` | object | `{}` | Image override for the `ca-merge` init container. Defaults to the consuming pod's image. Must be a Debian-based image. Used only when `customCA.enabled` is `true`. |
| `samDeployment.customCA.enabled` | bool | `false` | Enable custom CA certificate injection through a ConfigMap. |
| `samDeployment.customCA.configMapName` | string | `truststore` | Name of the ConfigMap that holds the custom CA certificates. The ConfigMap must exist at install time. |
| `samDeployment.rollout.rollingUpdate` | object | `{}` | Rolling update parameters. |
| `samDeployment.rollout.strategy` | string | `RollingUpdate` | Update strategy for the Entrypoint Executor, Agent-Workflow Executor, and Secure Tool Runtime pods. Set to `Recreate` to stop the running pod before starting its replacement, which avoids two instances overlapping during an upgrade when your topology cannot tolerate a brief overlap. Each pod runs a single replica and the Entrypoint Executor hosts the in-process platform. |
| `samDeployment.podSecurityContext.runAsUser` | int | `10001` | Pod security context user ID. |
| `samDeployment.podSecurityContext.fsGroup` | int | `10002` | Pod security context filesystem group ID. |
| `samDeployment.securityContext.allowPrivilegeEscalation` | bool | `false` | Allow privilege escalation. |
| `samDeployment.securityContext.runAsUser` | int | `999` | Container user ID. |
| `samDeployment.securityContext.runAsGroup` | int | `999` | Container group ID. |
| `samDeployment.securityContext.runAsNonRoot` | bool | `true` | Enforce a non-root container. |
| `samDeployment.nodeSelector` | object | `{}` | Node selector for pod placement. |
| `samDeployment.tolerations` | list | `[]` | Tolerations for pod scheduling. |
| `samDeployment.annotations` | object | `{}` | Deployment annotations. |
| `samDeployment.podAnnotations` | object | `{}` | Pod annotations. |
| `samDeployment.podLabels` | object | `{}` | Pod labels. |

## Pre-Flight Check

The `sam-doctor` pre-install check validates configuration before the chart creates workload pods.

| Key | Type | Default | Description |
|---|---|---|---|
| `samDoctor.enabled` | bool | `true` | Enable the `sam-doctor` pre-flight validation. |
| `samDoctor.failOnError` | bool | `true` | Block install and upgrade on validation failure. Set to `false` to always exit successfully. |
| `samDoctor.timeoutSeconds` | int | `180` | Hook job deadline in seconds. |
| `samDoctor.tlsDnsName` | string | `""` | DNS name for TLS certificate validation. Defaults to `sam.dnsName` when empty. |

## Bundled Persistence Layer

In-cluster PostgreSQL and SeaweedFS under the `persistence-layer` key. Used only when `global.persistence.enabled` is `true`, which is not recommended for production.

| Key | Type | Default | Description |
|---|---|---|---|
| `persistence-layer.postgresql.serviceAccountName` | string | `""` | Service account for the PostgreSQL pod. |
| `persistence-layer.postgresql.commonLabels` | object | `{"app.kubernetes.io/service": "database"}` | Labels applied to PostgreSQL resources. |
| `persistence-layer.postgresql.imagePullSecrets` | list | `[]` | Image pull secrets for the PostgreSQL image. Merged with `global.imagePullSecrets`. |
| `persistence-layer.postgresql.image.registry` | string | `""` | Registry override for the PostgreSQL image. |
| `persistence-layer.postgresql.image.repository` | string | `postgres` | PostgreSQL image repository. |
| `persistence-layer.postgresql.image.tag` | string | `"18.0-trixie"` | PostgreSQL image tag. |
| `persistence-layer.postgresql.image.digest` | string | `""` | PostgreSQL image digest. |
| `persistence-layer.seaweedfs.serviceAccountName` | string | `""` | Service account for the SeaweedFS pod. |
| `persistence-layer.seaweedfs.commonLabels` | object | `{"app.kubernetes.io/service": "s3"}` | Labels applied to SeaweedFS resources. |
| `persistence-layer.seaweedfs.imagePullSecrets` | list | `[]` | Image pull secrets for the SeaweedFS image. Merged with `global.imagePullSecrets`. |
| `persistence-layer.seaweedfs.image.registry` | string | `""` | Registry override for the SeaweedFS image. |
| `persistence-layer.seaweedfs.image.repository` | string | `chrislusf/seaweedfs` | SeaweedFS image repository. |
| `persistence-layer.seaweedfs.image.tag` | string | `"3.97-compliant"` | SeaweedFS image tag. |
| `persistence-layer.seaweedfs.image.digest` | string | `""` | SeaweedFS image digest. |

## Bundled Embedded Event Broker

Single-node Solace event broker under the `embeddedBroker` key. Used only when `global.broker.embedded` is `true`, which is not recommended for production.

| Key | Type | Default | Description |
|---|---|---|---|
| `embeddedBroker.imagePullSecrets` | list | `[]` | Image pull secrets for the event broker image. Merged with `global.imagePullSecrets`. |
| `embeddedBroker.nodeSelector` | object | `{}` | Node selector for the event broker pod. |
| `embeddedBroker.tolerations` | list | `[]` | Tolerations for the event broker pod. |
| `embeddedBroker.image.registry` | string | `""` | Registry override for the event broker image. |
| `embeddedBroker.image.repository` | string | `solace-pubsub-enterprise` | Event broker image repository. |
| `embeddedBroker.image.tag` | string | `"10.25.0.193-multi-arch"` | Event broker image tag. |
| `embeddedBroker.image.digest` | string | `""` | Event broker image digest. |

The `embeddedBroker` key also accepts optional `storageClassName`, `shmSize`, and `resources` overrides, which are commented out in the chart `values.yaml`. The event broker requires a minimum of 2480 MiB of memory to start.
