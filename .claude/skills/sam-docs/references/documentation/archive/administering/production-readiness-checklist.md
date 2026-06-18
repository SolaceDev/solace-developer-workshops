---
title: Production Readiness Checklist
description: The pre-prod gate — deployment topology, RBAC, secrets, TLS, persistence, observability, probes, runbooks, and rollback. One checkbox per commitment, each linked to the page that owns the detail.
sidebar_position: 2
---

# Production Readiness Checklist

This page is the gate a Solace Agent Mesh deployment passes through before it carries production traffic. It is **not** a tutorial for getting the system running — that lives under Installing. It is the operator's last self-audit before flipping the load balancer over.

Each section below lists the commitments that should be true at the moment a deployment is declared production-ready. Each item has the same shape: a yes/no statement, a one-sentence description of what good looks like, and a link to the page that owns the detailed procedure.

**How to use this list.** Copy the checkboxes into your own runbook. Walk down them in order — earlier sections are dependencies for later ones. When an item is unchecked, follow its link; when an item cannot be checked because of a known constraint of your environment, document the exception alongside the checkbox so the next operator on-call knows the gap is intentional.

**Out of scope.** Proof-of-concept and staging deployments do not need every item ticked — those environments exist to find the items that *would* matter in production. The contract on this page is what the *production* environment commits to.

## Deployment Topology

The runtime is built to be split across multiple workload classes; running everything in a single embedded process is appropriate for development but is not the production shape.

- [ ] **The Gateway Executor (GWE), the Agent-Workflow Executor (AWE), the Secure Tool Runtime (STR), and the Platform service run as independent workloads.** Each can be scaled, restarted, and rolled independently. The embedded single-process mode is reserved for local development and desktop builds.
- [ ] **AWE, STR, and Platform each run at least two replicas.** A single replica is a single point of failure on these classes; the broker discovers them independently, so extra replicas need no coordination. See Deploy options for the per-deployment-mode replica wiring.
- [ ] **GWE runs one replica today, with the load-balancer sticky-session and SSE-replay constraints understood.** Multi-pod GWE HA requires session affinity at the load balancer (WebUI session state is pod-local), an SSE reconnect strategy that tolerates per-pod event-log isolation, and acceptance that dynamic gateway registration uses an in-process atomic check that is not cross-pod-safe. Treat GWE as single-replica until the chart's roadmap multi-pod work lands. See Deploy options — single-pod versus split deployments.
- [ ] **The broker is Solace PubSub+ (or a managed equivalent).** The dev broker is local-development-only and is not a supported production transport.
- [ ] **The broker tier matches the SLA.** A single-instance broker is acceptable for staging; production-grade SLAs need a HA pair (or a managed cluster) plus the network rules to fail over to the secondary.
- [ ] **The session store's `database_url:` points at Postgres, not at a local SQLite file.** The `sql` session type is URL-dispatched (`sqlite:///…` opens a local file; `postgres://…` opens Postgres); there is no `type: postgres`. SQLite is appropriate only for single-replica deployments because multiple GWE / AWE replicas cannot share a SQLite file. See Maintenance — backups.
- [ ] **The artifact store backend matches the durability requirement.** Filesystem-backed artifact storage is single-host only; production deployments use S3, GCS, or Azure Blob with credentials provisioned through workload identity. See Maintenance — backups.

## Authentication and RBAC

Every privileged operation Agent Mesh exposes is gated by either an authenticated user identity or an internal service identity. The pre-prod commitment is that the IdP is wired, the role catalogue reflects who can do what, and unauthenticated access to privileged endpoints is impossible.

- [ ] **An external OIDC identity provider is configured.** No production gateway runs with a built-in static-token shim. The gateway's OIDC catalogue carries the IdP's discovery URL, client ID, and (file-mounted) client secret. See RBAC reference.
- [ ] **Role assignments are written into the RBAC catalogue, not hand-edited per request.** Adding or removing a user from a role flows through the IdP-provided claim map or the catalogue's group-binding rules — there is no production deployment with hand-edited per-user grants.
- [ ] **The default role grants the least privilege the workload requires.** Anonymous or first-time users land on a role with no privileged-tool scopes; elevation flows through a documented IdP group change. See RBAC reference.
- [ ] **Audit logging has not been disabled.** Audit logging is on by default — the gate is to confirm the `audit_log:` section is either absent (default applies) or sets `enabled: true`, and that the `SAM_AUDIT_LOG` environment variable is not set to `false` or `0`. Pair with `log.format: json` on every component so the audit logger stays on its supported handler. See Audit and compliance.
- [ ] **The audit retention contract is enforced at the aggregator, not the runtime.** The runtime emits to slog; the destination store (Splunk, Datadog, S3 Object Lock, an immutable SIEM tier) is configured for the retention window your compliance posture requires. See Audit and compliance — where audit logs land.

## Secrets and Credentials

Every secret-bearing surface has the same contract: stored outside the YAML, sourced from a secrets manager, rotated through a rehearsed procedure.

- [ ] **No YAML file in the deployment carries a literal credential.** Broker passwords, LLM API keys, OIDC client secrets, OAuth bearers, signing keys, and database passwords are all `${VAR}` references or `*_file` mounts. See Secrets management.
- [ ] **Every `${VAR}` reference resolves to a non-empty value at boot.** An unset variable substitutes the empty string silently — the downstream consumer rejects the empty value with a confusing error rather than the loader failing at YAML-parse time. Confirm by submitting one canary task in the new deployment and watching for authentication / credential-empty errors before opening the door to production traffic. See Secrets management — substitution syntax.
- [ ] **The session-cookie signing key (`SESSION_SECRET_KEY`) is at least 32 bytes of entropy and is unique per environment.** A weak or shared key lets an attacker forge cookies; reuse between staging and production also means a staging breach reaches into prod. See Secrets management — generating a session-cookie key.
- [ ] **Object-storage credentials use workload identity (IAM role, GCP workload identity, Azure managed identity) when the platform supports it.** Static access keys are accepted but rotate manually; workload identity rotates transparently and removes the "expired key broke writes" failure mode.
- [ ] **A rotation procedure has been rehearsed against staging.** Pick the highest-impact secret you carry (broker password, LLM provider key, OIDC client secret) and walk the rotation procedure end-to-end against staging — confirm the new value takes effect and the old one is revoked. See Secrets management — rotation procedures.
- [ ] **At least one runbook owner has access to the secrets manager.** A rotation done at 03:00 by an on-call who cannot reach the secrets manager is not a rotation. The secret-vault access list and the on-call rota overlap by at least one named human.

## TLS

The TLS surface has three boundaries — inbound HTTP, outbound to upstream providers (LLM, OIDC, MCP), and broker — and all three need to be set up before production traffic.

- [ ] **The gateway's inbound HTTP / SSE listener terminates TLS at the edge** (ingress controller, cloud load balancer, or service mesh sidecar). Direct exposure of the gateway listener with no TLS in front is not a production shape. See TLS — inbound.
- [ ] **The broker connection is TLS** (`tcps://` URL on Solace PubSub+) with the workload trusting the broker's issuing CA. See TLS — broker.
- [ ] **OIDC, LLM, and MCP outbound calls use TLS.** The IdP discovery URL and JWKS URL are HTTPS; the LLM provider endpoint is HTTPS; every MCP server URL is HTTPS unless explicitly inside a trusted internal mesh. See TLS — outbound.
- [ ] **A certificate-expiry monitor is alerting on the workload's trust store.** Cert expiry on a running workload is a common failure mode and one of the easiest to avoid with an alert; pick the alerting path that fits your platform (cert-manager, ACM event, Prometheus exporter, vendor-side notification). See TLS — verifying.
- [ ] **If your environment uses an internal CA, the workload's trust store includes that CA.** A handshake that fails in production but works in staging is almost always a missing internal-CA bundle.

## Persistence and Backups

The runtime does not own backup orchestration; it persists into databases and object stores you back up the same way you back up every other production data plane.

- [ ] **The session-store database is backed up on a schedule that meets your recovery-point objective.** Postgres via `pg_dump` (logical) or a filesystem snapshot of the data directory (physical); SQLite via `sqlite3 .backup`. See Maintenance — backups.
- [ ] **A restore has been performed at least once against a clean environment.** A backup that has never been restored is not a backup. Pick a recent snapshot, restore it into a parallel database, point a sandbox gateway at it, and confirm a known task is visible.
- [ ] **The artifact-store backend has its own backup or replication path configured.** Bucket-level replication (S3, GCS, Azure) or filesystem snapshots (cloud volume / hypervisor). See Maintenance — backups.
- [ ] **The automatic data-retention sweep is set to the retention window your audit pipeline expects.** Confirm `task_retention_days`, `feedback_retention_days`, and `sse_event_retention_days` match the value your aggregator-side audit query reaches back into. See Maintenance — automatic data-retention sweep.
- [ ] **Disk-full alerting is configured on the workload hosts.** A `log_file:` path with `max_size_mb: 0` (default — disables rotation) on a long-running workload fills the disk and crashes the process; either set a rotation size or alert on the filesystem.

## Observability

A production-ready deployment ships logs and metrics off the workload to an aggregator. The runtime does not run a metrics backend or a log store — those are aggregator concerns.

- [ ] **`log.format: json` is set on every workload** so the audit logger stays on its supported handler and so the aggregator parses structured records. See Observability — operational logs.
- [ ] **The metrics endpoint is enabled and scraped.** `management_server.observability.enabled: true` on every workload that should emit metrics; the Prometheus / OTLP scrape configuration is wired and the workload appears in your metrics catalogue. See Observability — metrics.
- [ ] **A `traceID` grep returns a complete chain in your aggregator.** Submit a single task in staging, take its `traceID`, run the corresponding aggregator query (`@traceID:<uuid>` in Datadog, the equivalent in your system), and confirm GWE + AWE + STR + tool log lines come back. If the chain is broken, the JSON-formatting or attribute-mapping in your collector is wrong. See Observability — trace ID correlation.
- [ ] **Alert thresholds are defined for the few signals that matter.** As a starting set: workload health server returning 503 for more than one probe interval, `sam.gateway.duration` p99 above the SLA budget, audit-channel authentication-failure rate above a baseline, broker reconnect-attempt log rate above zero. See Observability — built-in instruments.
- [ ] **An on-call dashboard exists.** One Grafana / Datadog board (or equivalent) that surfaces the built-in instruments and the audit-failure rate, with the workload `traceID` field exposed as a clickable pivot from any alert into the operational log.

## Health Probes

The runtime exposes two health surfaces; production probes use the dedicated one, not the request-path `/health`.

- [ ] **Kubernetes / load-balancer probes point at the dedicated workload health server, not the request-path `/health`.** The request-path endpoint returns `200 OK` with body `ok` unconditionally — it confirms the HTTP listener is up, nothing more. The dedicated server emits the JSON envelope (`{"status":"healthy"}` or `{"status":"unhealthy","error":"component <name> unhealthy: <wrapped error>"}`) and is the one that tells you which component is sick. See Observability — health endpoints.
- [ ] **Per-workload probe ports are mapped correctly in the Helm chart / deployment manifest.** GWE, AWE, STR, and Platform service each expose their own health server on their own port — wire each pod's probe to its own port, not a shared listener.
- [ ] **Startup, liveness, and readiness are differentiated.** Startup probes give a slow-booting workload time to migrate the database; liveness restarts a stuck process; readiness controls traffic. A single probe shape that conflates the three is a common cause of crash loops during normal startup.

## Runbooks

Runbooks are the operator's reference when a workload misbehaves; production readiness includes confirming the on-call has read them ahead of time, not at the moment they are needed.

- [ ] **The Scenario troubleshooting page has been read by every on-call rotation member.** Each of the five scenarios (broker connectivity, AWE and GWE crash loops, persistence-layer failures, tool execution failures, and upgrade failures) is the entry point for a specific class of pages.
- [ ] **The dependency owners are documented.** Who runs the broker. Who owns the IdP. Who pays the LLM-provider bill. Who renews the TLS certificates. A blank entry on any of those rows is a blank-incident-response when that dependency misbehaves.
- [ ] **The on-call rota has access to the runbook, the aggregator, the secrets manager, and the deployment-rollback path.** Each access is a separate IdP grant; rotate them when rota membership changes.
- [ ] **A "what changes can the on-call make without paging owners" envelope is written down.** Restart a pod, roll a deployment, rotate a secret — yes. Modify the RBAC catalogue, change YAML in the running config, alter the broker topology — no, page the owner. Without this envelope the on-call's range is undefined.

## Rollback and Upgrade

The rollback path is the safety net for every upgrade; it bounds the blast radius when a release misbehaves.

- [ ] **A pre-upgrade backup of the session store and the gateway database is part of the upgrade runbook.** The rollback procedure depends on this backup existing; an upgrade without one is irreversible by design. See Upgrade guides.
- [ ] **The new release has been run end-to-end against a copy of production data in staging.** The migration that runs at the new binary's first boot is the most common upgrade failure mode; it is also the easiest to catch in staging if you point staging at a real copy of production data. See Migrations.
- [ ] **The deployment manifest pins the binary version (or container image digest) rather than tracking `latest`.** Production is reproducible; a redeploy returns the same binary unless an operator explicitly bumps the version.
- [ ] **The rollback path returns the deployment to the previous binary without intervention.** A green-deploy / blue-deploy or canary rollout that flips the load balancer back is the production shape. "Rebuild from the old image" is acceptable only when paired with a documented downtime window.
- [ ] **Workload-class rolls happen one at a time, not all at once.** Platform first, then GWE, then AWE, then STR. Each class can independently report health on its dedicated probe; an unhealthy step is then visible before the next class rolls.

## Signing Off

When every section above is ticked, two more things finish the gate:

- [ ] **An operator with hands-on production deployment experience has reviewed this checklist against this specific deployment.** The page itself is a template; the production reality is the deployment in front of you. The reviewer's job is to find the items the template does not.
- [ ] **The exceptions are documented.** Any unchecked item is either a known gap with an owner and a remediation date, or a deliberate non-applicability with a rationale. A blank checkbox with no annotation is an unmanaged risk.

## What Next?

The system is now ready to take production traffic. The companion page from here is the operator's day-two reading: the per-scenario playbook for the failures the deployment will eventually see, in Scenario troubleshooting.
