---
title: Administering Agent Mesh
description: Day-two operations for a running Agent Mesh — the production-readiness gate, security and access, observability, backups, upgrades, and scenario-based troubleshooting.
sidebar_position: 0
---

# Administering Agent Mesh

This section is the operator's day-two home — what you do once Agent Mesh is running. First-time setup (install commands, initial configuration, choosing a deploy target) lives in [Install and Deploy](../installing/index.md); the pages here cover operating, securing, observing, and troubleshooting a live deployment.

Before you move your Solace Agent Mesh into production, we recommend that you review the sections that follow.

## Production Checklist

- [Production Readiness Checklist](./production-readiness-checklist.md)—We strongly recommend that you use this pre-production checklist prior to moving to production.

## Security and Access

- [Enabling Single Sign-On (SSO)](./enabling-sso.md)—Configure OpenID Connect (OIDC) single sign-on: the provider catalog, callback URIs, and the login flow.
- [Secure User-Delegated Tool Access](./secure-user-delegated-access.md)—Let each user act on remote systems through their own OAuth credentials.
- [Managing Secrets](./secrets-management.md)—Where secrets are read from, the substitution syntax that wires them into YAML, and how to rotate each one without downtime.
- [Configuring TLS](./tls.md)—TLS for the inbound listener, the event broker connection, and outbound OIDC, large language model (LLM), and Model Context Protocol (MCP) traffic.
- [Managing Audit and Compliance](./audit-and-compliance.md)—The audit event types, the closed schema, and how to ship audit records to your log aggregator.

## Observability and Feedback

- [Monitoring Your Agent Mesh](./observability.md)—Operational logs, OpenTelemetry metrics, `traceID` correlation, and health endpoints.
- [Collecting and Publishing User Feedback](./user-feedback.md)—Collect end-user feedback, publish it to the event mesh, and retrieve it through the API.

## Data and Backups

- [Managing Backups and Data Retention](./backups-and-data-retention.md)—What to back up, how log rotation and the data-retention sweep work, and what is delegated to the underlying storage.

## The Broker Layer

- [The Event Mesh Communication Layer](./event-driven-mesh.md)—The broker layer Agent Mesh runs on: the runtime connection block, the namespace tenant fence, and the durable queues that appear on the broker.

## Runbooks and Troubleshooting

- [Operator Workflows](./operator-workflows.md)—End-to-end walkthroughs: rotating an LLM credential without downtime, staging a pre-upgrade dry-run, and scaling the Agent-Workflow Executor.
- [Troubleshooting a Running Deployment](./scenario-troubleshooting.md)—Live failures organized by what broke, each with symptoms, diagnostics, resolution, and prevention.
