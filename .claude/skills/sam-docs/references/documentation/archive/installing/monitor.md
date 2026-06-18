---
title: Monitor
description: Deploy-time observability setup — metrics scraping, log aggregation, and health endpoints.
sidebar_position: 5
---

# Monitor

This page covers the observability you wire up at install time so your dashboards have data: health probes, the Prometheus `/metrics` endpoint, OpenTelemetry exporters, and JSON log shipping. Operating an already-running deployment — reading the dashboards, setting alert thresholds, drilling into a failing task — is on Administering — Observability and alerting and the signpost page for health checks and logging. This page is the deploy-time complement; cross-link, do not restate.

Solace Agent Mesh runs the OpenTelemetry SDK in-process and exposes a Prometheus `/metrics` endpoint plus optional OTLP exporters for shipping to an external aggregator. It does not run a metrics backend, a long-term log store, or a distributed-tracing collector — those are the aggregator's job. Your install task is to wire the deployment to whichever aggregator you operate.

## Health Endpoints

Agent Mesh exposes two distinct health surfaces.

**Gateway proxy `/health`** is the cheap external liveness check. The gateway's request-path listener (typically `:8800`) responds with `200 OK` and a plain `ok` body. Use it for load-balancer health probes and synthetic smoke tests. It returns `ok` unconditionally as long as the HTTP listener is up — it confirms only that, nothing more.

**The dedicated workload health server** is the one Kubernetes probes target. Every long-running workload — GWE, the Platform service, AWE, STR — runs an independent health server on its own port. It exposes two routes:

| Route | Healthy response | Unhealthy response |
|---|---|---|
| `GET /health` | `200 OK` with `{"status":"healthy"}` | `503 Service Unavailable` with `{"status":"unhealthy","error":"<failing component>"}` |
| `GET /ready` | `200 OK` with `{"ready":true}` | `503 Service Unavailable` with `{"ready":false}` |

There is no `/livez` route — `/health` covers the liveness check and `/ready` covers readiness.

Default ports per binary in a multi-pod deployment:

| Workload | Default health port |
|---|---|
| GWE (`sam-gateway-enterprise`) | `:9090` |
| Platform service (`sam-platform-enterprise`) | `:9091` |
| AWE (`sam-awe-enterprise`) | `:8090` |
| STR (`sam-str-enterprise`) | `:8090` |

AWE and STR both default to `:8090` because they run as their own pods in a multi-pod deployment, each binding the port inside its own network namespace. When they are colocated on the same host — embedded mode, `sam run` multi-process, or a single-host `docker run` — the runner offsets STR to `:8092` to avoid the collision; the override is applied via `--health-addr` so the binary defaults stay aligned. In embedded mode (the single-process layout used by `sam run --embedded` and the published Docker image), a single `:8090` health server speaks for every component in the process. Override the address with the `--health-addr` flag (`--health-addr :8093` binds the loopback on a non-default port) or with the per-role environment variable pattern `SAM_<ROLE>_HEALTH_ADDR=:8093` (for example `SAM_AWE_HEALTH_ADDR`, `SAM_GATEWAY_HEALTH_ADDR`). Setting the address to an empty string disables the health server.

## Kubernetes Probe Wiring

Point Kubernetes liveness and readiness probes at the dedicated health server, not at the gateway proxy. The JSON envelope identifies which component is sick when a probe goes red, which is what triages an outage; the plain `ok` body from the gateway proxy does not.

A minimal probe stanza for an AWE workload:

```yaml
# helm/values.yaml
awe:
  livenessProbe:
    httpGet:
      path: /health
      port: 8090
    initialDelaySeconds: 10
    periodSeconds: 15
    failureThreshold: 3
  readinessProbe:
    httpGet:
      path: /ready
      port: 8090
    initialDelaySeconds: 5
    periodSeconds: 10
    failureThreshold: 3
  startupProbe:
    httpGet:
      path: /ready
      port: 8090
    periodSeconds: 5
    failureThreshold: 30
```

Apply the same shape to GWE (`:9090`), the Platform service (`:9091`), and STR (`:8090` in its own pod, `:8092` when colocated with AWE). Point the external load balancer's ingress health check at the gateway proxy's `/health` on its request-path port (`:8800` by default) — that is the in-band check that confirms the user-facing HTTP listener is up.

## Prometheus Metrics

The Prometheus `/metrics` endpoint is mounted under `management_server.observability`. It is off by default; enable it explicitly:

```yaml
# configs/agents/example_agent.yaml
management_server:
  observability:
    enabled: true
    metric_prefix: sam
    path: /metrics
```

`enabled` is the only required field; `metric_prefix` defaults to `sam` and `path` defaults to `/metrics`. When enabled, the metrics endpoint is mounted at the configured path on the component's HTTP listener.

A scrape job for GWE:

```yaml
# prometheus.yaml
scrape_configs:
  - job_name: agent-mesh-gateway
    metrics_path: /metrics
    static_configs:
      - targets:
          - agent-mesh-gateway.example.internal:8800
```

The built-in instruments cover agent task and tool duration, LLM call duration, time-to-first-token, token accounting, HTTP gateway latency, and outbound calls to artifact backends and peer agents. The full instrument table with labels is on Observability — built-in instruments — do not duplicate it here; the day-two page is the authoritative reference for what each metric means and how to alert on it.

## OpenTelemetry Exporters

`management_server.exporters` is a list of OTLP destinations. Each entry chooses one endpoint and opts in to metrics, logs, or both. Log exporters work independently of `observability.enabled` — the two surfaces do not share state.

```yaml
# configs/services/example_service.yaml
management_server:
  observability:
    enabled: true

  exporters:
    - type: otlp
      endpoint: http://otel-collector.observability.svc:4318
      protocol: http
      compression: gzip
      metrics: true
      logs: true
      log_level: INFO
      timeout: 10
```

Per-entry fields:

| Field | Required | Default | Notes |
|---|---|---|---|
| `type` | yes | — | Only `otlp` is accepted today. |
| `endpoint` | yes | — | Auto-suffixed with `/v1/metrics` (HTTP) when the path is missing. |
| `protocol` | yes | — | `http` or `grpc`. |
| `metrics` | no | `false` | Opt-in. |
| `logs` | no | `false` | Opt-in; independent of `observability.enabled`. |
| `log_level` | no | `INFO` | One of `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`. Case-insensitive. |
| `headers` | no | none | Map of string to string. Use `${VAR}` for secrets. |
| `timeout` | no | `10` | Seconds. Must be positive. |
| `compression` | no | `none` | `none` or `gzip`. |
| `insecure` | no | `false` | gRPC only — turns off TLS. Mutually exclusive with `certificate_file`. |
| `certificate_file` | no | unset | gRPC only — PEM CA bundle for the OTLP endpoint. |

Metrics export on a 60-second cadence; logs batch through the standard OTel SDK log processor. When the endpoint host matches `datadoghq.com` or `datadoghq.eu`, the exporter automatically switches counters and histograms to delta temporality (matching Datadog's intake contract). Multiple entries are allowed — each can ship to a different backend or filter to a different level. The day-two page covers a worked Datadog example; see Observability — Datadog.

:::warning
Agent Mesh does not honor the standard `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`, or `OTEL_RESOURCE_ATTRIBUTES` environment variables. All OTLP configuration is in YAML via `management_server.exporters`. If you set those variables expecting an automatic fallback, no exporter is created and no data is shipped.
:::

## Log Format and Shipping

Every Agent Mesh component writes structured logs. The default format is plain text, which is convenient for `tail -f` but harder for an aggregator to parse. Set JSON format on every component in production:

```yaml
# configs/agents/example_agent.yaml
log:
  format: json
  stdout_log_level: INFO
```

The environment-variable equivalent is `LOG_FORMAT=json`. Either form works; the env var is convenient when you cannot easily edit the YAML for a single component.

For a centralized log policy across every component in a deployment, set `LOGGING_CONFIG_PATH` to point at a standalone YAML file. The file shape matches the `log:` block above: a single top-level `log:` key followed by the same fields, which fully replace the per-app block at startup.

slog identifier fields are emitted at every hop and use camelCase:

| Field | What it identifies |
|---|---|
| `traceID` | Immutable UUIDv7 per user task; carried end-to-end across GWE, AWE, STR, and tool boundaries. |
| `taskID` | Gateway-minted user-task addressing (used by SSE subscribe and cancel). |
| `agentName` | The agent handling the task. |
| `corrID` / `reqID` | STR or peer-router pending-request key. |
| `messageID` | Per-message dedup key inside a conversation. |
| `contextID` | A2A session or conversation grouping. |
| `userID` | The authenticated user, when auth is enabled. |

Duration and unit-suffixed fields use snake_case (`duration_ms`, `elapsed_ms`, `timeout_s`) to match Prometheus and Datadog idioms.

For aggregator-side ingestion: configure your collector (Fluent Bit, Vector, the Datadog Agent, a Kubernetes log DaemonSet) to read container stdout/stderr and parse the JSON records as structured fields. The aggregator's parser is what makes the identifier fields searchable.

## TraceID Correlation Across Hops

Every user task carries a `traceID` (UUIDv7) minted by GWE the moment the task is submitted. The same value rides on the A2A protocol's user-properties block end-to-end, is forwarded by the agent loop onto peer-agent calls, and is forwarded by STR onto remote-tool dispatches. A single search for one `traceID` in your aggregator returns the entire causal chain.

| Aggregator | Query |
|---|---|
| Datadog Logs | `@traceID:01972c40-d3c8-7c8b-a6c7-3f8c1f0c8f63` |
| Splunk | `traceID="01972c40-d3c8-7c8b-a6c7-3f8c1f0c8f63"` |
| Loki | `\|= "01972c40-d3c8-7c8b-a6c7-3f8c1f0c8f63"` |
| Raw JSON file | `jq 'select(.traceID == "01972c40-...")' /var/log/sam/*.log` |
| Raw text file | `grep 'traceID=01972c40-...' /var/log/sam/*.log` |

`traceID` is operational-log only — it is not a W3C trace-context propagation, there are no parent/child spans, and it does not appear in audit records. The day-two page covers the full correlation story; see Observability — trace ID correlation.

## First-Week Monitoring Checklist

Walk this list once the deployment is in front of real traffic:

1. **Probes responding.** `curl -fsS http://<pod>:<healthPort>/health` and `/ready` for every workload (GWE `:9090`, AWE `:8090`, Platform `:9091`, STR `:8090`). For colocated layouts where STR shares a host with AWE — embedded mode, `sam run` multi-process, single-host `docker run` — the runner offsets STR to `:8092`. Confirm `kubectl describe pod` shows liveness and readiness probes succeeding.
2. **Gateway proxy reachable from the load balancer.** `curl -fsS http://<lb>/health` returns `200 OK` with body `ok`. This is the path the external LB targets, distinct from the JSON health server.
3. **Metrics scrape returning data.** After enabling `management_server.observability.enabled: true`, `curl http://<gateway>:8800/metrics` returns counters plus histograms. Submit one task and confirm `sam_gateway_requests_total` and `sam_operation_duration_seconds_bucket` increment.
4. **Log aggregator parsing JSON.** Set `LOG_FORMAT=json` everywhere, submit a test task, capture its `traceID` from the gateway response, and confirm a single search in your aggregator returns records from GWE, AWE, and STR.
5. **OTLP push reachable.** If you configured `management_server.exporters`, confirm the collector or destination is receiving on the 60-second cadence. Per-exporter validation failures are logged at error and the entry is silently skipped — check the startup log for those lines.
6. **Log rotation set.** If `log.log_file` is in use, confirm `max_size_mb` is set to a positive value. Without rotation, the startup log emits a warning and the file grows unbounded.

## What Next?

You have probes responding, metrics scraping, logs flowing, and `traceID` queries returning the right results. The day-two operations side — what to read on the dashboards, how to alert, how to drill into a failing task — is in Observability and alerting.
