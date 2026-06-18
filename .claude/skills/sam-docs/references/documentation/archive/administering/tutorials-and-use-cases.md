---
title: Tutorials and Use Cases
description: Operator workflow walk-throughs — rotating an LLM credential without downtime, running a pre-upgrade dry-run in staging, and scaling AWE under sustained load.
sidebar_position: 14
---

# Tutorials and Use Cases

This page covers operator workflows that span multiple reference pages. Each tutorial orchestrates pages on this shelf into a single coherent procedure; each step links into the reference page that owns the detail. The tutorials are reactive operations and planned changes — not live-incident playbooks. The per-failure playbook is in Scenario troubleshooting.

Three tutorials, in increasing scope:

1. Rotating an LLM provider credential without downtime — narrow operational change.
2. Running a pre-upgrade dry-run in staging — multi-page change-management workflow.
3. Scaling AWE under sustained load — capacity decision driven by operational metrics.

---

## Rotating an LLM Provider Credential Without Downtime

**Goal.** Replace an LLM provider API key on every workload that uses it, without dropping in-flight tasks, and verify the new key is being used end-to-end before the old key is revoked.

**When you would do this.** A scheduled key rotation (most providers recommend 90 days); an early rotation in response to a leak; a switch between two keys belonging to different cost centres.

**Procedure.**

1. **Issue the new key at the provider** but keep the old key live. Almost every LLM provider supports an overlap window where both keys authenticate — that overlap is what makes this a zero-downtime rotation. If your provider does not support overlap, this tutorial does not apply and you need to plan a maintenance window instead.

2. **Identify which workloads hold the key.** Any agent that calls the affected provider does. In a Kubernetes deployment, this is typically every replica of the AWE deployment, plus any workflow agent that calls the same provider. The canonical list of secret-bearing variables is in Secrets management — the secret-bearing surfaces.

3. **Update the secret store with the new key.** The mechanics depend on your platform — Kubernetes `Secret`, Docker `--env-file`, HashiCorp Vault, etc. The full per-platform procedure is in Secrets management — rotation procedures.

4. **Roll the consuming workloads one class at a time.** In Kubernetes:

   ```bash
   kubectl rollout restart deployment/agent-mesh-awe
   kubectl rollout status  deployment/agent-mesh-awe --timeout=5m
   ```

   Wait for the rollout to finish before moving to the next class. Workloads cache the environment value at startup, so a `rollout restart` is required even for projected `Secret` volumes.

5. **Revoke the old key at the provider** only after the verification step below confirms the new key is in use everywhere.

**Verification.**

- Every workload that holds the credential reports `{"status":"healthy"}` on its dedicated health server. See Observability and alerting — health endpoints.
- Submit a canary task that exercises the agent calling the rotated provider. The operational log on the AWE replica that handled it should show an `sam.gen_ai.client.operation.duration` data point — failures from a bad credential appear as a `401` or `403` on the same operation. The full metric list is in Observability — built-in instruments.
- The provider's own dashboard typically shows per-key request counts. Confirm requests are landing on the new key before revoking the old one.

**What can go wrong.**

- **An empty environment variable substitutes silently.** An unset `${ANTHROPIC_API_KEY}` becomes the empty string, not a YAML-load error, and the failure surfaces downstream as a confusing authentication error. The substitution semantics and the empty-string trap are in Secrets management — substitution syntax; the recovery is in Scenario troubleshooting — AWE and GWE crash loops.
- **A workload is missed in the roll.** The provider's old-key dashboard line stays non-zero. Identify the workload, restart it, then revoke.

---

## Running a Pre-Upgrade Dry-Run in Staging

**Goal.** Validate a new Solace Agent Mesh binary against a copy of production state before any production pod runs it. Catch migration failures and behavioural regressions on a workload nobody is depending on.

**When you would do this.** Before every production upgrade where the release notes mention a schema change, a YAML rename, or a behavioural default change. Increasingly, before every production upgrade — the cost of the staging cycle is small compared to a rollback.

**Procedure.**

1. **Take pre-upgrade backups of the production session store, gateway store, and platform store.** The procedure (SQLite `.backup`, Postgres `pg_dump`, artifact-store replication) is in Maintenance — backups.

2. **Restore those backups into the staging environment.** Staging needs the same database engine and the same artifact-store backend as production for the restore to be meaningful.

3. **Roll the staging deployment to the new binary version.** Use the same workload-class order you would use in production — platform service → GWE → AWE → STR — and wait on the dedicated health server between classes. The full upgrade procedure is in Upgrade guides — the upgrade procedure.

4. **Watch for the silent session-store fallback.** If AWE logs `failed to migrate session db, using memory` at `Error` and stays healthy, the session-store migration has failed silently — the workload is up but every new session is being held in memory. The full asymmetry is documented in Migrations. Treat that log line as a hard stop on the dry-run; restore from backup and investigate before proceeding.

5. **Trigger the production-traffic-derived evaluation experiment against staging.** Use `sam eval run` with a pass-rate threshold that matches your tolerance for regression:

   ```bash
   sam eval run nightly_support \
     --url "${STAGING_PLATFORM_URL}" \
     --threshold 0.95 \
     --timeout 30m
   ```

   The full eval CLI is in Evaluating agent performance — running an evaluation.

6. **Compare the pass rate against the previous run** of the same experiment on the old binary. The per-evaluator breakdown will surface a regression that the overall threshold might mask (helpfulness held, but JSON-validity dropped).

7. **Only start the production roll** if the staging health check, the absence of the session-store fallback log line, and the eval comparison all clear. If any check fails, abort and investigate.

**Verification.**

- Every staging workload returns `{"status":"healthy"}` after the roll. See Observability — health endpoints.
- The eval CLI exits 0 against the threshold you set.
- Per-evaluator results in the run summary are within your tolerance against the previous run.

**What can go wrong.**

- **The staging restore is not byte-for-byte production.** A schema migration that crashes on a column production happens to populate will not surface against synthetic staging data. Use a real production backup, not a synthesised one.
- **A migration fails mid-upgrade.** Scenario troubleshooting — upgrade failures is the diagnostic. Restore from backup, fix the migration (or the destination cluster state), retry.
- **The eval dataset has drifted.** If staging passes but production behaviour regresses, the dataset is no longer representative. Sample fresh production prompts into the dataset on a recurring cadence.

---

## Scaling AWE Under Sustained Load

**Goal.** Decide between adding CPU/memory to existing AWE replicas (vertical) and adding more replicas (horizontal) when sustained load saturates the existing pool.

**When you would do this.** Per-task latency creeps up over a week or a month; tool calls start timing out; the LLM provider's rate-limit errors appear in the operational log; the workload's per-task completion histogram p99 drifts above the SLA budget.

**Procedure.**

1. **Identify the bottleneck.** Three usual suspects:
   - **LLM rate limit at the provider.** `sam.gen_ai.client.operation.duration` shows elevated p99, and the operational log carries `429` responses from the provider. Vertical or horizontal scaling on AWE does not help — the limit is upstream.
   - **CPU saturation on AWE.** `sam.operation.duration` for `type=agent` is elevated, the pod's CPU metric runs at the limit, and the per-task latency is the dominant signal.
   - **Tool execution slow path.** `sam.operation.duration` for `type=tool` is the elevated label; the underlying tool (an OpenAPI call, an MCP server) is the bottleneck. Adding AWE capacity does not help.

   The metric definitions are in Observability — built-in instruments.

2. **Pick vertical or horizontal.**
   - Vertical (raise the resource limit on the existing replicas) is fastest and keeps the topology simple. Appropriate when the bottleneck is CPU on a single agent's loop and the workload is not concurrency-bound.
   - Horizontal (add more replicas) buys concurrent capacity. Appropriate when one user's task does not block another. AWE replicas discover each other through the broker and need no coordination to scale out — see Deploy options — Kubernetes.

3. **Roll the change.** In Kubernetes:

   ```bash
   kubectl scale deployment/agent-mesh-awe --replicas=4
   kubectl rollout status deployment/agent-mesh-awe --timeout=5m
   ```

   For a vertical change, update the pod's resource requests / limits in the manifest and apply.

4. **Monitor for the first hour after the change.** Watch the same metric that surfaced the bottleneck. A successful horizontal scale halves the per-task latency at the same throughput; a vertical scale that did not move the needle means the bottleneck is somewhere else (upstream rate limit, downstream tool).

**Verification.**

- The metric that surfaced the bottleneck returns toward its pre-incident baseline.
- The dedicated health server on every AWE replica reports `{"status":"healthy"}`. See Observability — health endpoints.
- No new `Error`-level entries are appearing on AWE's operational log.

**What can go wrong.**

- **Adding replicas increases broker subscription pressure.** Every AWE replica subscribes to its share of the A2A topic tree. Significant horizontal scale (10× existing) is best paired with a broker capacity review.
- **The session store becomes the new bottleneck.** If staging-style SQLite is in front of a horizontally scaled AWE, the SQLite file becomes a contention point — multiple replicas cannot share a SQLite file. Production should be on Postgres; the gate is in Production readiness checklist — deployment topology.
- **The LLM provider rate limit is the actual bottleneck.** No amount of AWE scaling helps. Raise the limit at the provider (or shard across multiple keys / accounts) instead.

---

## What Next?

When each of these workflows is rehearsed and the corresponding alert is in place, the system is materially closer to the production gate. The full readiness audit is in Production readiness checklist.
