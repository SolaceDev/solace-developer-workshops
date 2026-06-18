---
title: Health Checks and Logging
description: Signpost page — where the canonical detail lives for health probes, operational logs, log aggregation, and log retention.
sidebar_position: 6
---

# Health Checks and Logging

This page is the operator's entry point for three closely related questions:

- **Is the workload alive?** — health probes.
- **Where does the workload write its operational output?** — operational logs.
- **How do I keep that output around long enough to be useful?** — log retention and rotation.

The substantive detail for each lives on one of the other shelf pages. The job of this page is to point you at the right one quickly.

## Health Probes

Solace Agent Mesh exposes two health surfaces:

- **The gateway's request-path `/health`** is a cheap external liveness check. It always returns `200 OK` with the plain body `ok` — it confirms only that the HTTP listener is up. Use it for load-balancer health probes and synthetic smoke tests.
- **The dedicated workload health server** is the one Kubernetes probes should target. Every long-running workload (GWE, AWE, STR, and the platform service) runs an independent health server on its own port that returns the JSON envelope `{"status":"healthy"}` or `{"status":"unhealthy","error":"<failing component>"}` with status 503 when a component is sick. `/ready` on the same server returns `{"ready":true|false}` for readiness probes.

The full surface — which port each workload listens on, the JSON envelope shape, the embedded-mode single-port layout, the `--health-addr` flag — is in Observability and alerting — health endpoints. When a probe goes red, the per-failure-class diagnostic playbook is in Scenario troubleshooting.

## Operational Logs

Every component writes structured logs through `log/slog`. The `log:` block on each component's runtime config controls format, level, optional file sink, and rotation. Recognised keys (`format`, `stdout_log_level`, `log_file`, `log_file_level`, `max_size_mb`, `max_backups`, `max_age_days`, `compress`) and their environment-variable overrides are in Observability and alerting — operational logs.

The slog stream is what every operator-facing diagnostic depends on:

| Operator question | Where to look |
|---|---|
| What is the format and key reference for the `log:` block? | Observability — operational logs. |
| How do I follow one user task through every hop? | Observability — trace ID correlation. |
| How do I get logs and metrics into my aggregator? | Observability — shipping to your aggregator. |
| How is the closed audit channel different from operational logs? | Audit and compliance. |

Set `log.format: json` on every component in production so the audit logger stays on its supported handler and so the aggregator parses structured records.

## Log Retention and Rotation

Two layers, each owned by a different surface:

- **Inside the workload — size-based rotation.** Every component supports the `max_size_mb`, `max_backups`, `max_age_days`, and `compress` keys on its `log:` block. The defaults are documented in Maintenance — log rotation, along with the keys to watch on a long-running deployment.
- **Outside the workload — aggregator-side time-based retention.** Long-term retention is your aggregator's job. The runtime ships a slog stream; the destination store (Splunk, Datadog, S3 Object Lock, an immutable SIEM tier) is configured for the retention window your compliance posture requires. Audit retention works the same way — see Audit and compliance — where audit logs land.

## What Next?

The substantive detail for every section above lives in Observability and alerting — that is the next page to read.
