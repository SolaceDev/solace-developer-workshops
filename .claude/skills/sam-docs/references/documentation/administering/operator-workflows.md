---
title: Operator Workflows
description: Operator workflow walkthroughs — rotating a large language model credential without downtime, running a pre-upgrade dry-run in staging, and scaling the Agent-Workflow Executor under sustained load.
sidebar_position: 8120
---

# Operator Workflows

This page covers operator workflows that span multiple reference pages. Each walkthrough orchestrates several day-two topics into one coherent procedure, and each step links into the page that owns the detail. The workflows here are reactive operations and planned changes, not live-incident playbooks — the per-failure playbook is in [Troubleshooting a Running Deployment](./scenario-troubleshooting.md).

Three workflows, in increasing scope:

1. Rotating a large language model (LLM) provider credential without downtime — a narrow operational change.
2. Running a pre-upgrade dry-run in staging — a multi-page change-management workflow.
3. Scaling the Agent-Workflow Executor under sustained load — a capacity decision driven by operational metrics.

Throughout, the long-running workloads are the Entrypoint Executor, the Agent-Workflow Executor, and the Secure Tool Runtime.

---

## Rotating an LLM Provider Credential Without Downtime

**Goal.** Replace an LLM provider API key on every workload that uses it, without dropping in-flight tasks, and verify the new key is being used end-to-end before the old key is revoked.

**When you do this.** A scheduled key rotation (most providers recommend one every 90 days); an early rotation in response to a leak; a switch between two keys belonging to different cost centers.

**Procedure.**

1. **Issue the new key at the provider** but keep the old key live. Almost every LLM provider supports an overlap window where both keys authenticate — that overlap is what makes this a zero-downtime rotation. If your provider does not support overlap, this workflow does not apply and you need to plan a maintenance window instead.

2. **Identify which workloads hold the key.** Any agent that calls the affected provider does. In a Kubernetes deployment, this is typically every replica of the Agent-Workflow Executor deployment, plus any workflow agent that calls the same provider. The canonical list of secret-bearing variables is in [Managing Secrets](./secrets-management.md).

3. **Update the secret store with the new key.** The mechanics depend on your platform — a Kubernetes `Secret`, HashiCorp Vault, and so on. The per-platform procedure is in [Managing Secrets](./secrets-management.md).

4. **Roll the consuming workloads one class at a time.** In Kubernetes:

   ```bash
   kubectl rollout restart deployment/agent-mesh-awe
   kubectl rollout status  deployment/agent-mesh-awe --timeout=5m
   ```

   Wait for the rollout to finish before moving to the next class. Workloads read the environment value once at startup, so a `rollout restart` is required even for projected `Secret` volumes — the process does not hot-reload a changed key.

5. **Revoke the old key at the provider** only after the verification steps confirm the new key is in use everywhere.

**Verification.**

- Every workload that holds the credential reports `{"status":"healthy"}` on its dedicated health server. See [Monitoring Your Agent Mesh](./observability.md).
- Submit a canary task that exercises the agent calling the rotated provider. On the Agent-Workflow Executor replica that handled it, the `sam.gen_ai.client.operation.duration` histogram records a data point — a bad credential surfaces as a `401` or `403` on the same operation's `error.type` label. The full metric list is in [Monitoring Your Agent Mesh](./observability.md).
- The provider's own dashboard typically shows per-key request counts. Confirm requests are landing on the new key before you revoke the old one.

**What can go wrong.**

- **An empty environment variable substitutes silently.** An unset `${ANTHROPIC_API_KEY}` becomes the empty string, not a YAML-load error, and the failure surfaces downstream as a confusing authentication error. The recovery is in [Troubleshooting a Running Deployment](./scenario-troubleshooting.md).
- **A workload is missed in the roll.** The provider's old-key dashboard line stays non-zero. Identify the workload, restart it, then revoke.

---

## Running a Pre-Upgrade Dry-Run in Staging

**Goal.** Validate a new Agent Mesh binary against a copy of production state before any production pod runs it, catching migration failures and behavioral regressions on a workload nobody depends on.

**When you do this.** Before every production upgrade whose release notes mention a schema change, a YAML rename, or a behavioral default change — and, increasingly, before every production upgrade, because the cost of the staging cycle is small compared to a rollback.

**Procedure.**

1. **Take pre-upgrade backups of the production session store, entrypoint store, and platform store.** The procedure (SQLite `.backup`, Postgres `pg_dump`, artifact-store replication) is in [Managing Backups and Data Retention](./backups-and-data-retention.md).

2. **Restore those backups into the staging environment.** Staging needs the same database engine and the same artifact-store backend as production for the restore to be meaningful.

3. **Roll the staging deployment to the new binary version.** Use the same workload-class order you would use in production — Platform service, then the Entrypoint Executor, then the Agent-Workflow Executor, then the Secure Tool Runtime — and wait on the dedicated health server between classes.

4. **Confirm each workload cleared its migrations.** A session-store, entrypoint, or platform migration failure is fail-fast: the workload aborts startup with a wrapped error (for the Agent-Workflow Executor, `session store: migrate session db: <error>`) and its dedicated health server never reaches `healthy`. Treat any workload that does not reach `{"status":"healthy"}` as a blocker on the dry-run; restore from backup and investigate before proceeding. The migration failure shapes are enumerated in [Troubleshooting a Running Deployment](./scenario-troubleshooting.md).

5. **Check that the Agent-Workflow Executor is not silently running on volatile storage.** A separate misconfiguration — leaving `database_url` unset — does not fail fast: the Agent-Workflow Executor logs a `WARN` that it is using a volatile in-memory session store and stays up. Session history then does not survive a restart. Confirm the staging Agent-Workflow Executor resolved a real `database_url` rather than falling back to memory.

6. **Trigger the production-traffic-derived evaluation experiment against staging.** Use `sam eval run` with a pass-rate threshold that matches your tolerance for regression:

   ```bash
   sam eval run nightly_support \
     --url "${STAGING_PLATFORM_URL}" \
     --threshold 0.95 \
     --timeout 30m
   ```

   The positional argument is the experiment name. The full evaluation CLI is in [Evaluating Agent Performance](../evaluating-agent-performance/index.md).

7. **Compare the pass rate against the previous run** of the same experiment on the old binary. The per-evaluator breakdown surfaces a regression that the overall threshold might mask — helpfulness held, but JSON validity dropped.

8. **Start the production roll only** if the staging health check, the absence of the volatile-fallback warning, and the eval comparison all clear. If any check fails, abort and investigate.

**Verification.**

- Every staging workload returns `{"status":"healthy"}` after the roll. See [Monitoring Your Agent Mesh](./observability.md).
- The evaluation CLI exits `0` against the threshold you set.
- Per-evaluator results in the run summary are within your tolerance against the previous run.

**What can go wrong.**

- **The staging restore is not byte-for-byte production.** A schema migration that crashes on a column production happens to populate does not surface against synthetic staging data. Use a real production backup, not a synthesized one.
- **A migration fails mid-upgrade.** Restore from backup, fix the migration (or the destination cluster state), and retry. The diagnostic and rollback detail is in [Troubleshooting a Running Deployment](./scenario-troubleshooting.md).
- **The evaluation dataset has drifted.** If staging passes but production behavior regresses, the dataset is no longer representative. Sample fresh production prompts into the dataset on a recurring cadence.

---

## Scaling the Agent-Workflow Executor Under Sustained Load

**Goal.** Decide between adding CPU and memory to existing Agent-Workflow Executor replicas (vertical) and adding more replicas (horizontal) when sustained load saturates the existing pool.

**When you do this.** Per-task latency creeps up over a week or a month; tool calls start timing out; the LLM provider's rate-limit errors appear in the operational log; the workload's per-task completion histogram p99 drifts above the service-level agreement (SLA) budget.

**Procedure.**

1. **Identify the bottleneck.** Three common causes:
   - **LLM rate limit at the provider.** `sam.gen_ai.client.operation.duration` shows an elevated p99, and the operational log carries `429` responses from the provider. Vertical or horizontal scaling on the Agent-Workflow Executor does not help — the limit is upstream.
   - **CPU saturation on the Agent-Workflow Executor.** `sam.operation.duration` for `type=agent` is elevated, the pod's CPU metric runs at the limit, and per-task latency is the dominant signal.
   - **Tool-execution slow path.** `sam.operation.duration` for `type=tool` is the elevated label; the underlying tool (an OpenAPI call, a Model Context Protocol (MCP) server) is the bottleneck. Adding Agent-Workflow Executor capacity does not help.

   The metric definitions are in [Monitoring Your Agent Mesh](./observability.md).

2. **Pick vertical or horizontal.**
   - Vertical (raise the resource limit on the existing replicas) is fastest and keeps the topology simple. It fits when the bottleneck is CPU on a single agent's loop and the workload is not concurrency-bound.
   - Horizontal (add more replicas) provides concurrent capacity. It fits when one user's task does not block another's. Agent-Workflow Executor replicas discover each other through the broker and need no coordination to scale out — see [Install and Deploy](../installing/index.md).

3. **Roll the change.** In Kubernetes:

   ```bash
   kubectl scale deployment/agent-mesh-awe --replicas=4
   kubectl rollout status deployment/agent-mesh-awe --timeout=5m
   ```

   For a vertical change, update the pod's resource requests and limits in the manifest and apply.

4. **Monitor for the first hour after the change.** Watch the same metric that surfaced the bottleneck. A successful horizontal scale halves per-task latency at the same throughput; a vertical scale that produced no change means the bottleneck is somewhere else (an upstream rate limit, a downstream tool).

**Verification.**

- The metric that surfaced the bottleneck returns toward its pre-incident baseline.
- The dedicated health server on every Agent-Workflow Executor replica reports `{"status":"healthy"}`. See [Monitoring Your Agent Mesh](./observability.md).
- No new `ERROR`-level entries appear on the Agent-Workflow Executor operational log.

**What can go wrong.**

- **Adding replicas increases broker subscription pressure.** Every Agent-Workflow Executor replica subscribes to its share of the Agent-to-Agent (A2A) topic tree. A significant horizontal scale (10 times the existing count) is best paired with a broker capacity review.
- **The session store becomes the new bottleneck.** A SQLite file cannot be shared across replicas — multiple Agent-Workflow Executor replicas contend on it. Run production on Postgres; the gate is in [Production Readiness Checklist](./production-readiness-checklist.md).
- **The LLM provider rate limit is the actual bottleneck.** No amount of Agent-Workflow Executor scaling helps. Raise the limit at the provider, or shard across multiple keys or accounts, instead.

---

## What Next?

When each of these workflows is rehearsed and the corresponding alert is in place, the system is materially closer to the production gate. The full readiness audit is in [Production Readiness Checklist](./production-readiness-checklist.md).
