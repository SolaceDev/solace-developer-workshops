---
title: Observability and Alerting
description: Operational logs, OpenTelemetry metrics, traceID correlation, and health endpoints — and how to ship them to your aggregator.
sidebar_position: 7
---

# Observability and Alerting

Operating an Agent Mesh deployment day-two means watching three streams: **operational logs** (slog output covering startup, request handling, broker activity, errors), **metrics** (OpenTelemetry histograms and counters for gateway latency, LLM duration, token usage, and tool execution), and **`traceID` correlation** so a single user task can be followed through GWE → AWE → STR → tool boundaries.

Agent Mesh runs the OTel SDK in-process and exposes a Prometheus `/metrics` endpoint plus optional OTLP exporters for shipping metrics and logs to an external aggregator (OTel collector, Datadog, New Relic, Grafana Cloud, etc.). It does **not** run a metrics backend, a long-term log store, or a distributed-tracing collector — those are aggregator concerns. The audit channel — the closed, security-relevant slog stream — has its own page; see Audit and compliance.

Deploy-time wiring (scrape configs, container probes, log-collector DaemonSets) lives in Monitor. This page covers what to read on the dashboards once those pipes are in place.

## Operational Logs

Agent Mesh writes structured slog output to stderr by default. The shape is controlled by the optional `log:` block on each component's runtime config; the same keys are read by the `sam` CLI, GWE, AWE, STR, and the Platform service.

```yaml
# configs/agents/example_agent.yaml
...
log:
  format: json
  stdout_log_level: INFO
  log_file_level: DEBUG
  log_file: /var/log/sam/agent.log
  max_size_mb: 50
  max_backups: 10
  max_age_days: 30
  compress: true
...
```

Recognised keys, defaults, and env-var overrides:

| Key | Default | Env override | Notes |
|---|---|---|---|
| `format` | `text` | `LOG_FORMAT` | Use `json` for any aggregator. Case-insensitive. |
| `stdout_log_level` | `INFO` | `SAM_STDOUT_LOG_LEVEL` | Stderr threshold. `DEBUG` / `INFO` / `WARNING` / `WARN` / `ERROR` / `CRITICAL`. |
| `log_file_level` | `DEBUG` | `SAM_FILE_LOG_LEVEL` | File threshold (only used when `log_file` is set). |
| `log_file` | unset (stderr only) | `SAM_LOG_FILE` | Absolute path. When set, records fan out to stderr AND the file. |
| `max_size_mb` | `0` (no rotation) | `SAM_LOG_MAX_SIZE_MB` | Trigger size in MiB. `0` grows the file unbounded with a startup WARN. |
| `max_backups` | `10` | `SAM_LOG_MAX_BACKUPS` | Backups to keep. Explicit `0` = unlimited (audit/compliance). |
| `max_age_days` | `0` (forever) | `SAM_LOG_MAX_AGE_DAYS` | Max age of rotated backups in days. |
| `compress` | `false` | `SAM_LOG_COMPRESS` | Gzip rotated backups. |

Set `LOGGING_CONFIG_PATH` to point at a standalone YAML file when you want one logging policy across every component — its `log:` block fully replaces the per-app block. The file shape matches the `log:` block above: a single top-level `log:` key followed by the same fields. The runtime prints an `INFO: logging configured from LOGGING_CONFIG_PATH (path=…)` line to stderr at startup so an operator can confirm the active file even when `stdout_log_level` is `WARN` or higher.

Slog attribute *values* are passed through a defense-in-depth redaction pass before they hit any handler: keys matching `password`, `client_secret`, `api_key`, `token`, or `credential` (with optional `_` prefix) emit `[REDACTED]` in place of the value. Treat this as a safety net, not a substitute for not logging the secret in the first place — keys outside the pattern (`url`, DSN-style fields) still pass through verbatim. See Secrets management for the redaction contract in full.

## Metrics

The runtime exposes a Prometheus `/metrics` endpoint backed by the OpenTelemetry Go SDK. Metrics are off by default — zero overhead, no endpoint. Enable them on any component by adding the `management_server.observability` block:

```yaml
# configs/gateways/example_gateway.yaml
...
management_server:
  port: 9090            # /health, /ready, and /metrics all listen here
  observability:
    enabled: true
    metric_prefix: sam
    path: /metrics
...
```

`metric_prefix` defaults to `sam` and `path` defaults to `/metrics`; both fields are optional.

`/metrics` is served by each workload's **dedicated management server — the same listener as the `/health` and `/ready` probes**, not the gateway's request-path port. `management_server.port` (a sibling of `observability:`, not nested under it) sets that listener; an explicit `--health-addr` flag overrides it, and with neither set each binary falls back to its default: GWE `:9090`, Platform service `:9091`, AWE `:8090`, STR `:8092` (a single `:8090` in embedded mode — see Health Endpoints for the full map). Point your scrape job at that management port, **not** the API listener.

### Built-In Instruments

The names and labels are wire-compatible with Python Solace Agent Mesh so a dashboard built for one runtime reads the other. Every metric is prefixed (`sam.` by default), and durations are reported in seconds.

| Metric | Kind | Where it fires | Notable labels |
|---|---|---|---|
| `sam.operation.duration` | histogram | Agent task and tool execution | `type=agent\|tool`, `component.name`, `operation.name`, `error.type` |
| `sam.gen_ai.client.operation.duration` | histogram | LLM client calls | `gen_ai.request.model`, `error.type` |
| `sam.gen_ai.client.operation.ttft.duration` | histogram | Time-to-first-token for streaming LLM responses | `gen_ai.request.model` |
| `sam.gen_ai.tokens.used` | counter | LLM token accounting (input/output split) | `gen_ai.request.model`, `gen_ai.token.type` |
| `sam.gateway.duration` | histogram | HTTP request duration on the gateway | `gateway.name`, `operation.name`, `error.type` |
| `sam.gateway.ttfb.duration` | histogram | HTTP time-to-first-byte for streaming gateway endpoints | `gateway.name`, `operation.name` |
| `sam.gateway.requests` | counter | HTTP request count | `gateway.name`, `route.template`, `http.method`, `error.type` |
| `sam.outbound.request.duration` | histogram | Outbound calls (artifact backends, peer-routing proxy, Teams/Slack APIs) | `service.peer.name`, `operation.name`, `error.type` |

Histogram bucket boundaries are configurable per-metric under `management_server.observability.distribution_metrics`. Set `exclude_labels: ["*"]` on any metric to turn it off without removing the YAML.

Distributed-tracing spans are not emitted today — use `traceID` correlation instead (next section).

## Trace ID Correlation

Every user task carries an immutable UUIDv7 `traceID` minted by GWE the moment the task is submitted. The same value is forwarded at every subsequent hop — broker user-properties, agent task loop, peer-agent delegation, STR dispatch, and tool context — so one identifier spans the entire causal chain. Built-in tools see the same `traceID` on the tool context they receive.

```mermaid
sequenceDiagram
  participant User
  participant GWE
  participant Broker
  participant AWE
  participant STR
  participant Tool

  User->>GWE: HTTP request
  Note over GWE: mint traceID (UUIDv7),<br/>log with traceID
  GWE->>Broker: publish (A2A user-properties carry traceID)
  Broker->>AWE: deliver, traceID intact
  Note over AWE: log with traceID
  AWE->>STR: tool invocation (traceID forwarded)
  Note over STR: log with traceID
  STR->>Tool: spawn subprocess (traceID on tool context)
  Note over Tool: log with traceID
  Tool-->>STR: result
  STR-->>AWE: response (traceID echoed)
  AWE-->>Broker: status + response (traceID forwarded)
  Broker-->>GWE: SSE event log
  GWE-->>User: SSE stream
```

The slog field name on operational logs is `traceID` (camelCase), emitted by GWE, AWE, STR, and the tool layer at every meaningful hop. A single grep surfaces the full causal chain of a task:

```bash
grep 'traceID=01972c40-d3c8-7c8b-a6c7-3f8c1f0c8f63' /var/log/sam/*.log
```

In Datadog Logs the equivalent query is `@traceID:01972c40-d3c8-7c8b-a6c7-3f8c1f0c8f63` (or whichever attribute key your slog→JSON pipeline produces). The point of the immutable `traceID` is that one search across GWE, AWE, STR, and tool logs returns a complete trail without joining identifiers.

What `traceID` is **not**:

- **Not** a distributed-tracing span. There is no parent/child relationship, no W3C trace-context propagation, and no OTel APM linkage today.
- **Not** in the audit-channel schema. Audit records carry `task_id` and `session_id` for correlation; the operational `traceID` is a separate identifier that lives on operational logs only. See the closed audit schema in Audit and compliance.
- **Not** re-minted on republish. The same UUID survives every hop until the task completes.

If you build alerts that need cross-process correlation, alert on the operational stream and pivot to `traceID` for the drill-down query.

## Health Endpoints

Two health surfaces serve different needs:

- **Gateway proxy `/health`** — the gateway's request-path listener (typically `:8800`) responds to `GET /health` with `200 OK` and a plain `ok` body. Use this for cheap external liveness checks (load balancer health probes, smoke tests).
- **Dedicated health server `/health` and `/ready`** — every workload runs an independent health server on its own port that returns the component-aware JSON envelope used by Kubernetes probes:

  ```bash
  curl -fsS http://localhost:8090/health
  ```

  ```text
  {"status":"healthy"}
  ```

  A failed check returns `{"status":"unhealthy","error":"<failing component>"}` with status `503 Service Unavailable`. `GET /ready` returns `{"ready":true|false}` and is the appropriate target for a Kubernetes readiness probe.

Multi-pod deployments give each workload its own probe port: GWE `:9090`, Platform service `:9091`, AWE `:8090`, STR `:8092`. In embedded mode (single-process) a single `:8090` health server speaks for every component. Point cluster probes at the per-workload port from the Helm chart values rather than the request-path listener — the JSON envelope is what tells you *which* component is sick.

## Shipping to Your Aggregator

Whatever metrics/logs aggregator you run, the bridge is one of three patterns: Prometheus scrape, OTLP push (metrics, logs, or both), or a stderr-capturing log driver.

### Prometheus Scrape

Enable `management_server.observability` (above) and point a scrape job at the workload's **management port** — the same port as its health probes (`:9090` for GWE), not the request-path listener. Histograms appear under their full prefixed names — `sam_operation_duration_seconds`, `sam_gateway_duration_seconds`, etc. (the Prometheus exporter renames dots to underscores and appends the unit suffix).

```yaml
# prometheus.yaml
scrape_configs:
  - job_name: sam-gateway
    metrics_path: /metrics
    static_configs:
      - targets:
          - sam-gateway.example.internal:9090
```

### OTLP Push

`management_server.exporters` is a **list** that sits as a sibling to `observability` (not nested under it). Each entry chooses one OTLP target and opts in to `metrics`, `logs`, or both. Log exporters work even when `observability.enabled: false` — the two surfaces are independent.

```yaml
# configs/services/example_service.yaml
...
management_server:
  port: 9091            # /health, /ready, and /metrics listener
  observability:
    enabled: true
    metric_prefix: sam

  exporters:
    - type: otlp
      endpoint: http://otel-collector.observability.svc:4318
      protocol: http
      compression: gzip
      metrics: true
      logs: true
      log_level: INFO
      timeout: 10
...
```

Per-entry schema:

| Field | Required | Default | Notes |
|---|---|---|---|
| `type` | yes | — | Only `otlp` is accepted today. |
| `endpoint` | yes | — | Auto-suffixed with `/v1/metrics` (HTTP) when the path is missing. |
| `protocol` | yes | — | `http` or `grpc`. |
| `metrics` | no | `false` | Opt-in. |
| `logs` | no | `false` | Opt-in. Independent of `observability.enabled`. |
| `log_level` | no | `INFO` | One of `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`. Per-exporter. |
| `headers` | no | none | Map of string → string. Use `${VAR}` for secrets. |
| `timeout` | no | `10` | Seconds. |
| `compression` | no | `none` | `none` or `gzip`. The YAML parser accepts `deflate` but both the HTTP and gRPC OTLP exporters reject it — `deflate` falls back to `none` with a warning. Use `gzip` when you want compression. |
| `insecure` | no | `false` | gRPC only — turns off TLS. Mutually exclusive with `certificate_file`. |
| `certificate_file` | no | unset | gRPC only — PEM CA bundle for the OTLP endpoint. |

Metrics export on a 60-second cadence; logs batch through the standard OTel SDK log processor. When the endpoint host matches `datadoghq.com` or `datadoghq.eu`, the exporter automatically switches counters and histograms to delta temporality (matching Datadog's cloud intake contract). Multiple entries are allowed — each can ship to a different backend or filter to a different level.

### Datadog

```yaml
# configs/services/example_service.yaml
...
management_server:
  observability:
    enabled: true

  exporters:
    - type: otlp
      endpoint: https://api.datadoghq.com
      protocol: http
      headers:
        DD-API-KEY: ${DD_API_KEY}
      metrics: true
      logs: false
      compression: gzip
...
```

Set `log.format: json` on every component so the Datadog Agent's log collector parses structured records and the `traceID` field becomes queryable as `@traceID`. The OTLP exporter handles metrics; logs typically flow via the Datadog Agent reading container stdout/stderr (no second OTLP entry needed).

### Bare Stderr-Shipping

If you do not run an OTel collector and your aggregator only ingests JSON logs, set `log.format: json` on every component and let the platform's log collector (Fluent Bit / Vector / journald / Docker logging driver / Kubernetes DaemonSet) read stdout/stderr. You lose the metrics pipeline but keep the full `traceID`-correlated operational log stream.

## What Next?

You have logs flowing, metrics scraped, and `traceID` queries answering "what happened to this task?". When those signals flag a failure, the per-scenario playbook for broker, agent, persistence, and tool-execution failures is in Scenario troubleshooting.
