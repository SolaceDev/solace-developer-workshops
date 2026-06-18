---
title: Runtime Services
description: The shared runtime layer every Solace Agent Mesh process is built on — component lifecycle, services container, KV store, TTL cache, metrics, health endpoints, configuration loading, and graceful shutdown.
sidebar_position: 4
---

# Runtime Services

Concepts → GWE / AWE / STR names what each workload class does. This page is one level underneath that: the shared runtime layer every process — Gateway Executor (GWE), Agent-Workflow Executor (AWE), Secure Tool Runtime (STR), the Platform service — is wired together from. It is what an operator needs to know to size a process, probe its health, plumb its logs, and understand its shutdown behaviour.

This page is not about subsystems that live on top of the runtime — artifact storage, session persistence, the workflow engine, skills. Those have their own concept homes: Artifacts, Sessions, the workflow engine, skills. This page is about the floor everything else stands on.

## The Component Interface

Every long-lived service inside a Solace Agent Mesh process implements the same lifecycle interface:

```go
type Component interface {
    Init(ctx context.Context, cfg config.Config) error
    Start(ctx context.Context) error
    Stop(ctx context.Context) error
    Health() error
}
```

The four methods carry one job each:

- **Init** receives the typed configuration, validates it, and sets up internal state. Called once per component, before any component has started. A failure aborts startup before anything reaches the network. By contract, `Init` may not open subscriptions, dial out, or start goroutines — anything that needs a counterpart `Stop` belongs in `Start`.
- **Start** begins processing — subscriptions go live, HTTP listeners open, background loops run. Called after every component has finished Init.
- **Stop** shuts the component down cleanly within a deadline. Safe to call even if Start never ran.
- **Health** returns nil when the component is healthy and an error when it is not. Polled by the health-server endpoints.

An agent loop, a broker connection, a session store, a metrics exporter, the health server itself — every one of them is a `Component`. The runtime treats them uniformly.

## The Runtime Orchestrator

A `Runtime` instance holds the ordered list of components and runs them through the lifecycle as a single batch.

- Components are registered in order. The registration order is the start order.
- **Init** runs on every component in order. Any error aborts the batch and propagates immediately — already-initialised components are *not* rolled back, because Init's contract forbids resources that would need a Stop. Init failures should leave nothing to clean up.
- **Start** runs after Init completes for every component. If a component's Start fails, the components that already started are stopped in reverse registration order before the error propagates — the `startedCount` tracker prevents Stop from running against components whose Start was never called.
- **Stop** runs in reverse registration order on shutdown. The HTTP listener stops before the broker connection so in-flight requests can be drained before the publisher dies underneath them.

The default grace period for shutdown is 30 seconds. The same context-with-deadline is passed to every component's Stop, so a slow component does not steal time from a fast one — each gets its own slice of the budget.

## The Services Container

Configuration is what `Init` carries; everything else a component needs — the broker connection, the LLM client factory, the artifact store, the session store — comes from a separate `Services` container the component captures at construction time, before it is registered with the runtime. The container is a read-only accessor exposing:

| Service | What it provides |
|---|---|
| `Broker` | The broker connection for this process. See Concepts → Event-driven mesh. |
| `Config` | The typed configuration loaded from YAML. |
| `KVStore` | A small in-process key-value store for cross-component coordination. |
| `Cache` | A TTL-based cache with expiry callbacks. |
| `Metrics` | A counter / gauge / histogram surface. No-op by default; an OpenTelemetry exporter is wired in when configured. |
| `Tracer` | A distributed-tracing surface with the same default behaviour as `Metrics`. |
| `LLM(model)` | A factory that resolves a model string to an LLM client. |
| `Artifacts`, `Sessions`, `Auth`, `Audit`, `Credentials` | Pluggable services that components call without knowing the backend. `Artifacts` and `Sessions` are nil when not configured; the enterprise auth, audit, and credential surfaces return no-op implementations so call sites do not need nil checks. |
| `HTTPClient` | A shared HTTP client with a 30-second timeout, used so every component does not allocate its own. |

The container is read-only — components consume `Services` and never modify it. Wiring — picking the in-memory artifact store versus the S3 store, picking the SQLite session store versus the Postgres store, deciding whether the metrics surface is no-op or OTel-backed — happens once at process startup and never again. Components retrieve the live container through `Runtime.Services()` and hold the reference for the rest of the process lifetime.

## Configuration Loading

The `Config` interface is the only sanctioned way to read configuration. Components call typed accessors (`GetString`, `GetInt`, `GetBool`, `GetDuration`, `GetSection`) rather than unmarshalling YAML themselves.

The loader runs a small pipeline before the YAML reaches a component:

1. **`!include` directives** are processed first. Any value of the form `!include path/to/other.yaml` is replaced inline with the loaded content of that file. Includes are relative to the file that contains them.
2. **`${VAR, default}` env substitution** is applied. Four forms are recognised: `${VAR}`, `${VAR, default}`, `${VAR:-default}`, and `${VAR:+alt}`. A reference to an unset variable with no default expands to the empty string.
3. **YAML parsing** produces the typed configuration tree.

Validation of the resulting values is not the config package's job — components validate during Init and return errors early. That is the same fail-fast discipline the Component interface enforces: configuration problems surface at startup, not at the first user request.

A complete component config block looks like this:

```yaml
# configs/agent.yaml
...
log:
  format: ${LOG_FORMAT, text}
  stdout_log_level: ${LOG_LEVEL, INFO}
apps:
  - name: my_agent
    broker:
      broker_url: ${SOLACE_BROKER_URL}
      broker_username: ${SOLACE_BROKER_USERNAME, default}
      broker_password: ${SOLACE_BROKER_PASSWORD}
      broker_vpn: ${SOLACE_BROKER_VPN, default}
    app_config:
      namespace: ${NAMESPACE, default}
...
```

See Installing → Configure for the full per-section schema.

## The KV Store

`KVStore` is a small thread-safe in-process key-value store with three methods: `Get`, `Set`, and `Delete`. It is not a database and does not persist across process restarts. Its purpose is cross-component coordination inside a single process — one component publishes a piece of derived state, another reads it. The Agent Mesh runtime uses it for short-lived shared state that several components need to see consistently, without dragging in the broker or the session database for in-process bookkeeping.

The store is bounded only by available memory. It does not enforce a key limit or a value-size limit. Operators sizing a process can treat KV store usage as effectively zero — the values stored there are pointers and short strings.

## The TTL Cache

`Cache` is a TTL-based cache backed by per-entry timers. It supports the operations a single-purpose cache needs, including some that are easy to get wrong by hand:

- **`Get`** returns the value and a "found" flag. An expired entry reads as a miss.
- **`Set`** stores a value with optional TTL and an optional `OnExpiry` callback fired when the timer elapses.
- **`Delete`** removes the entry synchronously and cancels its timer.
- **`GetAndDelete`** is an atomic read-and-remove — important for single-use capabilities such as OAuth state values where a TOCTOU race would let a token be redeemed twice.
- **`SetIfAbsent`** is an atomic set-only-if-missing for the same reason in reverse.

Inside a process the cache shows up in a handful of places, all of which have the same shape: a piece of state that is cheap to recompute but expensive to recompute on every request, and where the staleness budget is bounded by the lifetime of an external object. The gateway's JWT profile cache, the agent and gateway discovery TTLs, OAuth callback state are all instances of the same pattern.

The cache is also unbounded in entry count. A pathological workload that mints unique cache keys faster than the configured TTL retires them will grow the cache until memory pressure forces a process restart. In practice the keys come from a constrained namespace (a user ID, a session ID, an OAuth flow ID) and the cache is bounded by the size of that namespace.

## Health Endpoints

Every Agent Mesh process exposes a health server on a configurable port — `9091` by default for the Platform service, on per-process ports for GWE, AWE, and STR. The server publishes two endpoints:

| Endpoint | Returns 200 when | Returns 503 when |
|---|---|---|
| `GET /health` | Every registered component's `Health()` returns nil. | Any component returns an error. The body names which component failed. |
| `GET /ready` | The runtime has finished Init and Start on every component. | The process is still starting, or the runtime is shutting down. |

`/health` is the liveness check — a 503 here is a signal to the orchestrator to restart the process. `/ready` is the readiness check — a 503 here means the load balancer must hold traffic, but the process itself is fine. Wire both into a Kubernetes pod spec; do not point liveness at `/ready` or the orchestrator will kill a process that is merely starting up.

The health server is itself a component, so it stops in reverse order along with everything else.

## Metrics and Tracing

Metrics and tracing are opt-in. The default `Services.Metrics()` returns a no-op implementation that swallows every counter, gauge, and histogram. Wiring an OpenTelemetry exporter at process startup replaces the no-op with an exporter that ships metrics over OTLP.

There is no built-in Prometheus scrape endpoint. The reason is uniformity — OTLP is the single egress surface for telemetry, and a Prometheus exporter can sit behind that. Operators who want Prometheus scrapes wire the OpenTelemetry Collector in between.

Tracing follows the same pattern — a no-op `Tracer` by default; an OpenTelemetry tracer when configured. Both opt-in surfaces are designed to add zero runtime cost when nothing is wired up.

## Structured Logging

Every Agent Mesh process logs through Go's standard `log/slog`. The log section of the YAML config controls format, level, file rotation, and OTLP shipping:

```yaml
# configs/agent.yaml
...
log:
  format: ${LOG_FORMAT, text}
  stdout_log_level: ${LOG_LEVEL, INFO}
  log_file: ${LOG_FILE}
  max_size_mb: 100
  max_backups: 10
  max_age_days: 30
  compress: true
...
```

Two field-naming conventions live side by side. Identifiers — `traceID`, `taskID`, `userID`, `agentName` — are camelCase. Metric-style measurements — `duration_ms`, `elapsed_ms`, `timeout_s` — are snake_case to match Prometheus and Datadog conventions. The split is deliberate, not accidental.

Trace correlation lives in the runtime layer too. GWE mints a UUIDv7 `traceID` when it accepts a user task. Every component on the path forward attaches that ID to its scoped logger, so a single `grep traceID=<uuid>` across stdout reproduces the full causal chain — GWE, AWE, STR, tool subprocess — for one task. See Concepts → Request lifecycle → Identifiers carried end-to-end.

## Graceful Shutdown

The runtime's main loop sits on a signal channel waiting for `SIGTERM` or `SIGINT`. When one arrives, it runs `Stop` on every component in reverse registration order with a shared deadline — 30 seconds by default, settable through a `WithGracePeriod` option at startup. Components that finish early give their unused time back to components that come later; a component that exceeds its share is cancelled and the next component's Stop runs anyway.

`SIGUSR1` is special. It does not stop the process — it triggers a diagnostic dump. The runtime writes a JSON snapshot of memory stats, a heap profile, and a stack-trace dump for every goroutine to a known location under `/tmp`. The dump is useful when a process appears stuck and the cause is not in the logs.

## What This Means for Sizing

The shared runtime layer itself is small. The KV store and cache are in-memory and bounded by the number of distinct keys the workload produces. The health server holds a single goroutine. The metrics surface is no-op until wired. The logging stack is one slog handler plus an optional file rotator.

The components on top of the runtime are where the workload lives:

- An AWE process holds open broker subscriptions for every agent it runs, a streaming connection to the LLM provider for each in-flight task, and the conversation history of each active session. CPU is dominated by the LLM client; memory tracks active task count.
- A GWE process holds the discovery view of every agent on the mesh, an open SSE connection per active browser tab, and the session-store handle. CPU is dominated by request handling; memory tracks active connection count.
- An STR process holds one subprocess per in-flight remote-tool call. CPU and memory track the tools, not the worker.
- The Platform service holds a database connection pool and an in-memory discovery registry. CPU is light; memory is bounded by the number of registered components and resources.

The runtime layer adds approximately one broker connection, one health endpoint, the configured logging stack, and the cache and KV state actually populated by the workload. Plan capacity for the workload — agent count, concurrent task count, tool concurrency, request rate — and treat the shared runtime as overhead in the noise.

## What Next?

You now have the shared runtime that every Agent Mesh process is built on. The configuration knobs that wire each runtime to its environment are documented in Installing → Configure; operational guidance for the production version of those settings lives in Administering → Observability and Administering → Health checks and logging.
