---
title: Monitoring Your Deployment
description: Confirm a running Agent Mesh deployment is healthy and logging cleanly, using its health and readiness endpoints and its structured logs.
sidebar_position: 370
---

# Monitoring Your Deployment

This page helps you confirm a running Agent Mesh deployment is healthy and logging cleanly, using its health and readiness endpoints and its structured logs. Operating an already-running deployment is a separate concern: reading dashboards, scraping metrics, setting alert thresholds, shipping signals to your aggregator, and correlating a task across components. For more information, see [Monitoring Your Agent Mesh](../administering/observability.md).

Agent Mesh does not store telemetry itself. It exposes health endpoints and writes structured logs, and you point the monitoring tools you already operate at each component.

A Kubernetes install runs each workload as a pod: the Helm chart wires liveness and readiness probes, and you ship container logs to the aggregator you operate.

The desktop bundle runs everything in one process for laptop evaluation. Monitoring it means reading its logs and the local health endpoint; it is not a production monitoring target.

## Health Endpoints

Agent Mesh exposes health information in two distinct places, and they serve different purposes.

The entrypoint proxy health check is the lightweight external liveness check. The entrypoint's request-path listener, on port 8800 by default, responds to `GET /health` with `200 OK` and a plain-text `ok` body. Use it for load-balancer health probes and synthetic checks. It returns `ok` whenever the HTTP listener is up, so it confirms reachability and nothing more.

The dedicated workload health server is the one your probes and checks target. Each long-running workload runs an independent health server on its own port: the Entrypoint Executor, the Platform service, the Agent-Workflow Executor, and the Secure Tool Runtime. The server exposes two routes:

| Route | Healthy Response | Unhealthy Response |
|---|---|---|
| `GET /health` | `200 OK` with `{"status":"healthy"}` | `503 Service Unavailable` with `{"status":"unhealthy","error":"<failing component>"}` |
| `GET /ready` | `200 OK` with `{"ready":true,"checks":{...}}` | `503 Service Unavailable` with `{"ready":false,"checks":{...}}` |

The `/ready` response includes a `checks` object that reports the readiness inputs: `phase` (the runtime lifecycle phase) and `broker` (the event broker connection state, one of `connected`, `down`, or `absent`). A workload is ready when its phase is `running` and the event broker connection is not down. There is no `/livez` route. The `/health` route covers the liveness check and `/ready` covers readiness.

Each workload binds a default health port:

| Workload | Default Health Port |
|---|---|
| Entrypoint Executor | 9090 |
| Platform service | 9091 |
| Agent-Workflow Executor | 8090 |
| Secure Tool Runtime | 8090 |

Each workload runs as its own pod and binds the default port from the preceding table. The Helm chart wires the liveness probe to `/health` and the readiness probe to `/ready` on that port, so your task is to confirm they pass rather than to author them. When a probe fails, the JSON response identifies which component is unhealthy, which the plain `ok` body from the entrypoint proxy does not. Confirm the probes are succeeding with `kubectl describe pod`, and point the external load balancer's ingress health check at the entrypoint proxy `/health` on its request-path port, 8800 by default, which confirms that the user-facing HTTP listener is up.

## Logs

Every Agent Mesh component writes structured logs. The default format is JSON, which an aggregator parses directly, and each record carries a `traceID` that follows one task across the Entrypoint Executor, Agent-Workflow Executor, and Secure Tool Runtime and their tools. For the full log-field reference, for changing the log format, and for correlating a task across components, see [Monitoring Your Agent Mesh](../administering/observability.md).

Each container writes logs to stdout. Configure your log collector (such as Fluent Bit, Vector, or a Kubernetes log agent) to read container stdout and parse the JSON records as structured fields. Keep `format: json` on every component so the collector's parser can extract the fields.

## First-Week Monitoring Checklist

Walk this list after the deployment starts serving real traffic:

1. Confirm the probes respond. Run `curl -fsS http://<pod>:<healthPort>/health` and the same against `/ready` for every workload (the Entrypoint Executor on 9090, the Agent-Workflow Executor on 8090, the Platform service on 9091, and the Secure Tool Runtime on 8090). On Kubernetes, confirm that `kubectl describe pod` shows the liveness and readiness probes succeeding.
2. Confirm the entrypoint proxy is reachable from the load balancer. Run `curl -fsS http://<lb>/health`; it returns `200 OK` with a JSON body (`{"status":"A2A Web UI Backend is running"}`). The external load balancer targets this path, which is distinct from the JSON health server.
3. Confirm the aggregator parses JSON. Submit a test task, capture its `traceID` from the entrypoint response, and confirm that one search in your aggregator returns records from the Entrypoint Executor, Agent-Workflow Executor, and Secure Tool Runtime. JSON is the default; if you overrode it, set `LOG_FORMAT=json` on every component.
4. Confirm your metrics collection is working before you rely on it. Enabling and scraping metrics is a day-two task; for how to set it up and verify it, see [Monitoring Your Agent Mesh](../administering/observability.md).

## Next Steps

You have probes responding and logs flowing. The next step is day-two operations: reading dashboards, scraping metrics, setting alert thresholds, shipping signals to your aggregator, and correlating a task across components. For more information, see [Monitoring Your Agent Mesh](../administering/observability.md).

If any of these checks fail, see [Troubleshooting Your Installation](./troubleshoot.md).
