---
title: Airgap
description: Run Solace Agent Mesh in disconnected environments — offline installs, local LLM endpoints, internal registries.
sidebar_position: 6
---

# Airgap

You can run Solace Agent Mesh in an environment with no internet egress. The runtime is self-contained: no license server to call, no activation, no usage reporting, no vendor heartbeat. The work is mostly about mirroring container images into an internal registry and pointing the LLM somewhere your network can reach. This page covers the decisions and the mechanics.

For the install paths and verification commands, see Install. For the YAML keys referenced here, see Configure.

## Two Patterns

Operators usually pick one of two patterns:

| Pattern | When to use |
|---|---|
| No cloud LLM, otherwise standard | You can pull images and connect to a Solace broker freely, but compliance, privacy, or cost rules out a public LLM endpoint. You substitute a local or private-cloud LLM and the rest of the stack stays as-is. |
| Full airgap | The cluster has no egress at all. You mirror every image, host a local LLM endpoint, host a private CA for TLS, and route every outbound dependency to an internal target. |

Most production deployments are the first pattern. The second pattern is more work but the same building blocks — mirror the images, substitute the LLM, point telemetry at an internal collector.

## What Does and Does Not Phone Home

Agent Mesh does not contact Solace or any other vendor at runtime. The only outbound network calls are to endpoints you configure:

- The Solace broker URL.
- The LLM endpoint.
- The OpenID Connect issuer (if SSO is enabled).
- The database (Postgres or SQLite path).
- The object-storage endpoint (S3, GCS, Azure Blob, or a filesystem path).
- The OTLP collector (only if you enable `management_server.exporters`).
- Any MCP servers, OpenAPI endpoints, or remote tools your agents call.

Specifically, the runtime does not contact a license server, does not check for activation, does not report usage telemetry, and the Solace messaging SDK does not heartbeat anything outside the broker connection you provide. The `sam-enterprise doctor` pre-flight check only probes the endpoints you have configured, so it is safe to run inside an airgap.

If you add a third-party tool (a custom MCP server, an OpenAPI integration, a built-in tool that calls an external API), that tool's network behavior is its own. Audit each tool's egress before enabling it in an airgapped agent.

## Container Images to Mirror

The published Agent Mesh image is a single multi-binary container. One image carries the CLI, the Agent-Workflow Executor (AWE), the Gateway Executor (GWE), the Platform service, the Secure Tool Runtime (STR), the doctor, the bundled Go tool binaries, the React Web UI, and the bundled skills library. You mirror one Agent Mesh image, plus images for whatever dependencies your deployment uses.

| Image | Role | Where to source |
|---|---|---|
| `solace-agent-mesh:<version>` | Agent Mesh runtime — all binaries, Web UI, tools, skills | The registry path documented in your release notes |
| Solace PubSub+ broker | Event mesh | Solace's broker image (or use an existing on-prem broker) |
| `postgres:18-alpine` | Session and Platform persistence (only if not using SQLite) | Docker Hub or your Postgres vendor |
| SeaweedFS | S3-compatible artifact store (only if not using a real S3 / GCS / Azure backend) | The SeaweedFS image |

You do not need every image on this list. A single-pod deployment using the embedded broker, SQLite sessions, and a filesystem artifact backend only mirrors the Agent Mesh image. A multi-pod production deployment with Postgres and S3 mirrors all four.

## Mirroring the Runtime Image

Pull from the source registry, retag for the internal registry, push:

```bash
SRC_REGISTRY="${SRC_REGISTRY}"            # e.g. the registry your release notes point at
INTERNAL_REGISTRY="${INTERNAL_REGISTRY}"  # e.g. registry.internal.example.com/agent-mesh
VERSION="${SAM_VERSION}"

docker pull "${SRC_REGISTRY}/solace-agent-mesh:${VERSION}"
docker tag  "${SRC_REGISTRY}/solace-agent-mesh:${VERSION}" \
            "${INTERNAL_REGISTRY}/solace-agent-mesh:${VERSION}"
docker push "${INTERNAL_REGISTRY}/solace-agent-mesh:${VERSION}"
```

Mirror by explicit tag, not by `:latest`. Agent Mesh releases pin the runtime binaries and the bundled skills together; a `:latest` mirror can silently move the version on a re-pull. Repeat the sequence for every dependent image (broker, Postgres, SeaweedFS) and for every version you support in production.

## Helm Install From a Mirrored Chart

The Helm chart for Agent Mesh ships in a separate release artifact (`sam-kubernetes`), not in the runtime container image. Extract the chart from the release artifacts, point the values at the internal registry, and install from the local path:

```bash
helm install agent-mesh ./charts/solace-agent-mesh \
  --namespace agent-mesh \
  --create-namespace \
  --values /path/to/my-values.yaml
```

The image references in `my-values.yaml` point at the internal registry:

```yaml
# my-values.yaml
samDeployment:
  image:
    repository: "${INTERNAL_REGISTRY}/solace-agent-mesh"
    tag: "${SAM_VERSION}"
    pullPolicy: IfNotPresent
    imagePullSecret: agent-mesh-registry
  goImage:
    repository: "${INTERNAL_REGISTRY}/solace-agent-mesh"
    tag: "${SAM_VERSION}"
  strImage:
    repository: "${INTERNAL_REGISTRY}/solace-agent-mesh"
    tag: "${SAM_VERSION}"
```

The `agent-mesh-registry` pull secret is a regular Kubernetes `docker-registry` secret holding credentials for the internal registry. Create it once per namespace before the install:

```bash
kubectl create secret docker-registry agent-mesh-registry \
  --namespace agent-mesh \
  --docker-server="${INTERNAL_REGISTRY}" \
  --docker-username="${INTERNAL_REGISTRY_USER}" \
  --docker-password="${INTERNAL_REGISTRY_PASSWORD}"
```

For the full chart values surface (TLS, persistence, RBAC, scheduled tasks, observability), see the chart's README inside the release artifacts. The non-airgap install path is in Install — Kubernetes.

## LLM Substitution

Agent Mesh routes LLM calls through Bifrost, which supports every common provider behind a single `model:` block. For an airgap, the two patterns are a self-hosted local model or a private-cloud endpoint with restricted networking.

### Local LLMs

Ollama is a first-class provider prefix. Any other OpenAI-compatible endpoint (vLLM, llama.cpp's OpenAI server, an in-cluster LiteLLM proxy) works via the `openai/` prefix plus an `api_base:` override:

```yaml
# configs/agents/example_agent.yaml
app_config:
  model:
    model: ollama/llama3
    api_base: http://ollama.internal:11434
```

```yaml
# configs/agents/example_agent.yaml
app_config:
  model:
    model: openai/llama-3.1-70b-instruct
    api_base: http://vllm.internal:8000/v1
    api_key: ${LLM_GATEWAY_API_KEY}
```

The prefix selects the API protocol Bifrost speaks; it does not have to match the underlying model. An OpenAI-compatible proxy fronting any open-source model uses the `openai/` prefix.

### Private-Cloud LLMs

Azure OpenAI behind a Private Link endpoint, AWS Bedrock with a VPC endpoint, and Vertex AI with VPC Service Controls all use the same provider prefix as their public equivalents. The differences are the endpoint URL and the CA chain:

```yaml
# configs/agents/example_agent.yaml
app_config:
  model:
    model: azure/gpt-4o
    api_base: https://aoai-eastus.privatelink.openai.azure.com
    api_ca_cert: /etc/ssl/certs/internal-root-ca.pem
    api_key: ${AZURE_OPENAI_API_KEY}
```

`api_ca_cert` takes a PEM-encoded CA bundle that is trusted for the LLM endpoint. For lab work only, `api_skip_tls_verify: true` disables certificate validation; do not ship this in production.

For the full provider list and Bifrost passthrough keys, see Configure — LLM provider.

## Telemetry Posture in Airgap

Telemetry is off by default. The `/metrics` endpoint is not mounted unless `management_server.observability.enabled` is set to `true`, and `management_server.exporters` is an empty list unless you populate it. So an airgap deployment that does nothing about telemetry sends nothing outbound.

To ship metrics or logs to an internal OpenTelemetry collector, populate the exporters list with the internal endpoint:

```yaml
# configs/agents/example_agent.yaml
management_server:
  observability:
    enabled: true

  exporters:
    - type: otlp
      endpoint: http://otel-collector.observability.svc:4318
      protocol: http
      metrics: true
      logs: true
      compression: gzip
```

Agent Mesh does not read the standard `OTEL_EXPORTER_OTLP_*` environment variables; all OTLP configuration is in YAML. If you set those env vars expecting an automatic fallback, nothing happens. The full exporter-field reference and the day-two dashboards story is in Monitor and Administering — Observability.

## Verifying the Airgap

Three checks confirm an installed deployment has no surprise egress.

### Run the Doctor

```bash
sam-enterprise doctor
```

The doctor probes broker reachability, the LLM endpoint, object-storage credentials, the OIDC issuer (if SSO is enabled), and TLS. Every probe targets a destination you configured; nothing in the doctor reaches out to Solace or to any other vendor. A clean exit means every operator-configured endpoint is reachable from inside the airgap.

### Audit Egress

Use the network policy controlling the deployment's namespace to confirm only the operator-configured destinations are reachable. In Kubernetes, a deny-all egress `NetworkPolicy` with allow rules for the broker, the LLM endpoint, the OIDC issuer, the database, the object-storage endpoint, and the OTLP collector is the safest posture.

For spot verification during commissioning, run `tcpdump` against the workload's network namespace or front the cluster's egress with an inspecting proxy and confirm only those destinations appear in the trace.

### Confirm Nothing Tries to Phone Home

After the deployment has been running under normal load for a working day, review the egress audit. Any destination that is not on the operator-configured list of allowed endpoints is a third-party tool's egress; trace it to the tool's configuration. A clean audit has no calls to public Solace endpoints, no calls to a license server, and no calls to any vendor's telemetry intake.

## What Next?

The airgap is wired and verified. Set up the deploy-time observability surface — health probes, metrics scraping, log aggregation, the OTLP exporter — in Monitor.
