# Helm Production Deployment

Deploy SAM on a real shared cluster (EKS/GKE/AKS or any shared instance) with an external broker, external PostgreSQL, external object storage, and OIDC/TLS/RBAC.

This is the **same chart** as the quickstart — promotion is a values change, not a re-architecture. There are no cloud-specific chart variants. You build a `production-values.yaml` that disables the bundled components and points at real services. Applies to the go-only 2.x chart line (take the exact chart version from the `Charts/` filename in your download). The parent skill covers artifact sourcing and the install command shape; this file is the production-values walkthrough plus deploy/verify.

## Prerequisites (beyond the quickstart)

- Kubernetes v1.20 or later; `kubectl`; Helm CLI v3.0 or later.
- The chart archive `solace-agent-mesh-<chart-version>.tar.gz` and the image-pull credentials file `sam-pull-credentials.json` (from the Solace product portal).
- Node(s) with at least **4 vCPU and 16 GiB allocatable memory** for the GWE/AWE/STR workloads (the external layout removes the embedded broker and bundled datastores).
- An external Solace broker (Solace Cloud or self-managed PubSub+): secured SMF URL, Message VPN, client username, password.
- Managed PostgreSQL with admin credentials that can create databases and users.
- An S3-compatible object store (AWS S3, Azure Blob Storage, or Google Cloud Storage).
- A DNS name and TLS certificate for it.
- An OIDC identity provider for SSO and RBAC.

The chart runs the `sam-doctor` pre-install check plus template-time cluster-resource checks (it verifies referenced Secrets, ConfigMaps, StorageClass, and IngressClass exist). Template-time checks need `get` RBAC; disable them with `validations.clusterResourceChecks: false`.

## Build production-values.yaml

### Disable embedded components

Set a deployment namespace id and turn off the bundled broker and datastores:

```yaml
global:
  broker:
    embedded: false
  persistence:
    enabled: false
    namespaceId: "your-deployment-id"
```

> **On a shared broker, set `global.persistence.namespaceId` to a value unique among everyone sharing that broker — lowercase letters, digits, dots, and hyphens only (no underscores).** This key is triple-duty: it scopes the database/users, it is the broker **topic prefix** (the chart sets the `NAMESPACE` env var from it), **and it is the object-storage (S3) bucket name**. The default `solace-agent-mesh` collides on topics with any other default install — a real concern on Solace Cloud, where the broker is shared by default. An underscore makes a valid DB name and topic but an illegal S3 bucket name: bundled-storage bucket creation fails silently (the `s3-init` container reports success), `sam-doctor` passes, and it surfaces only as a GWE startup-probe failure. Changing `namespaceId` later both re-prefixes broker topics **and** points SAM at fresh, empty databases, so choose it deliberately before the instance holds data you care about.

### External broker

`broker.url` is a secured SMF URL (`tcps://...:55443`) or WebSocket Secure URL (`wss://...:443`):

```yaml
broker:
  url: "tcps://your-broker.messaging.solace.cloud:55443"
  vpn: "your-vpn"
  clientUsername: "your-username"
  password: "your-password"
```

### LLM (optional)

Optional at install. Non-empty endpoint, key, and model names seed the `planning` and `general` model aliases at startup:

```yaml
llmService:
  llmServiceEndpoint: "https://api.openai.com/v1"
  llmServiceApiKey: "your-api-key"
  planningModel: "gpt-4o"
  generalModel: "gpt-4o"
```

### External PostgreSQL

```yaml
dataStores:
  database:
    host: "mydb.abc123.us-east-1.rds.amazonaws.com"
    port: "5432"
    adminUsername: "postgres"
    adminPassword: "your-admin-password"
    applicationPassword: "your-application-password"
```

- `port` defaults to `5432`. `adminUsername` / `adminPassword` are used by a DB-init container to create the application users and databases. `applicationPassword` is the shared password for all SAM database users (web UI, orchestrator, platform, agents) — required for external persistence.
- **Rotation warning:** the init container creates users only if they don't already exist; it does NOT change an existing user's password. To rotate, set a new `global.persistence.namespaceId` (creates fresh users and databases) or change the password directly in the database.
- Supabase pooler users: also set `dataStores.database.supabaseTenantId` to the project ID.

### External object storage

`type` is `s3`, `azure`, or `gcs`. S3 example:

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

- `connectorSpecBucketName` may equal `bucketName`. Leave `dataStores.s3.endpointUrl` empty for AWS S3; set it for MinIO or other S3-compatible stores. For azure/gcs, populate the `dataStores.azure` or `dataStores.gcs` block instead. Omit `accessKey` / `secretKey` when using workload identity (below).

### Ingress + TLS

TLS terminates at the ingress:

```yaml
sam:
  dnsName: "sam.example.com"
ingress:
  enabled: true
  className: "nginx"
  host: "sam.example.com"
  tls:
    - secretName: sam-tls
      hosts:
        - sam.example.com
```

- `sam.dnsName` is the external hostname; it drives the host portion of every emitted URL, including the OIDC redirect URI. `ingress.host` (defaults to empty) is the Ingress rule's host — set it, usually to the same value as `sam.dnsName`. `ingress.className` is `nginx`, `alb`, `traefik`, or `gce`.

### OIDC + RBAC

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

- `authorization.enabled: false` means every user has admin access — enable it for any shared instance.
- **Register this exact OIDC callback URI with your IdP: `https://<your-dns-name>/api/v1/auth/callback`** (substitute `sam.dnsName`). Login fails if the registered URI doesn't match exactly.

### Session secret

```yaml
sam:
  sessionSecretKey: "your-session-secret"
```

- If empty, the chart generates one on first install and keeps it stable across upgrades. To set your own: `openssl rand -hex 32`.

## Authenticate to cloud storage with workload identity

Prefer workload identity over static keys:

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

Per-cloud service-account annotation:

- `eks.amazonaws.com/role-arn` (AWS IRSA)
- `azure.workload.identity/client-id` (Azure)
- `iam.gke.io/gcp-service-account` (GCP)

Omit the static credentials (`accessKey` / `secretKey`, `accountKey`, or `credentialsJson`) when workload identity is enabled.

## Trust custom CA certificates

Create a ConfigMap whose data key ends in `.crt`:

```bash
kubectl create configmap truststore \
  --from-file=ca.crt=/path/to/your-ca.crt \
  -n sam
```

Enable injection:

```yaml
samDeployment:
  customCA:
    enabled: true
    configMapName: truststore
```

A `ca-merge` init container appends the certs to the shared system trust bundle; the ConfigMap must exist at install time. To rotate: replace the ConfigMap, then `kubectl rollout restart` the workloads (pods read the bundle only at startup).

## Deploy

Dry-run first:

```bash
helm install sam /path/to/solace-agent-mesh-<chart-version>.tar.gz \
  --namespace sam --create-namespace --dry-run \
  --set-file global.imagePullKey=sam-pull-credentials.json \
  -f production-values.yaml
```

Then install (drop `--dry-run`). Post-install output reports it's configured for production use and prints the Console URL from `sam.dnsName`.

Converting an existing quickstart release is a `helm upgrade` (same creds file and values) — but **migrating data from the embedded PostgreSQL to an external database is not automatic**; plan that separately.

Tip: use `extraSecretEnvironmentVars` to source env vars from existing Kubernetes Secrets instead of putting secrets in values.

## Verify

```bash
kubectl get pods -n sam -l app.kubernetes.io/instance=sam -w
curl -s https://sam.example.com/health
curl -s https://sam.example.com/api/v1/platform/health
kubectl logs -n sam -l app.kubernetes.io/instance=sam --tail 200
```

The Console at `https://<your-dns-name>` redirects to your IdP for login.

---

Full key list and defaults → helm-values.md; air-gapped clusters → helm-airgap.md; install failures → helm-troubleshoot.md.
