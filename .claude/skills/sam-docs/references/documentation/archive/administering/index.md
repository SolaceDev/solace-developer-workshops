---
title: Administering Solace Agent Mesh
description: Day-two operations — maintenance, observability, secrets, TLS, health checks, RBAC operation, upgrades, evaluation, and scenario-based troubleshooting.
sidebar_position: 0
---

# Administering Solace Agent Mesh

This section is the operator's day-two home. Deploy-time setup lives in Installing; this shelf covers what you do once the system is running.

## Pages in This Section

- **Maintenance** — Backups, log rotation, routine operational tasks.
- **Observability and alerting** — What to watch, what alert thresholds to set, what backpressure looks like. Includes OpenTelemetry exports and the recommended Grafana dashboards.
- **Secrets management** — Storing and rotating LLM API keys, broker credentials, and other secrets.
- **TLS** — Certificate management, where TLS terminates, expiry monitoring.
- **Health checks and logging** — Probe configuration, log aggregation, log retention.
- **RBAC reference** — Day-two role management, role-provider rotation, and audit. Covers SSO, MCP gateway auth, and Secure User-Delegated Access.
- **Audit and compliance** — The immutable audit trail — what is logged, where it is stored, how to query and retain it.
- **Upgrade guides** — Pre-upgrade checks, rollback, and leftover state.
- **Migrations** — Per-version breaking-change notes. Cross-language migration from Python lives under Migrating from Python.
- **Evaluating agent performance** — Running evaluations against live agents, scoring outputs, tracking regressions.
- **Tutorials and use cases** — Operator workflow examples — scaling, credential rotation, upgrade dry-runs.
- **Scenario troubleshooting** — Failure scenarios organized by what broke, not by symptom.
- **Production readiness checklist** — The pre-prod gate covering RBAC setup, deployment topology, audit storage, secrets handling, and observability wiring.
