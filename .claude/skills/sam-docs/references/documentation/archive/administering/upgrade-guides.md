---
title: Upgrade Guides
description: How to upgrade a running Solace Agent Mesh deployment — what the upgrade actually changes, pre-upgrade checks, the workload-by-workload roll, mixed-version behaviour, and rollback.
sidebar_position: 12
---

# Upgrade Guides

This page is the operator's procedural reference for taking a running Solace Agent Mesh deployment from version N to version N+1. It covers the workload-by-workload roll, the pre-upgrade checks that bound the blast radius, what the runtime applies automatically, and the rollback procedure when an upgrade goes sideways.

What is **not** on this page:

- **Per-version breaking-change notes** — see Migrations.
- **Cross-language migration from Python Agent Mesh** — see Migrating from Python. That is a port, not an upgrade.
- **When an in-progress upgrade is misbehaving in production** — see Scenario troubleshooting → Upgrade failures.
- **Initial install** — see Installing.

## What an Upgrade Actually Changes

An Agent Mesh upgrade touches three surfaces. Understanding which is which is the difference between a clean roll and a surprise.

| Surface | What changes | Operator-visible impact |
|---|---|---|
| Binary version | One image / binary per workload class (Gateway Executor (GWE), Agent-Workflow Executor (AWE), Secure Tool Runtime (STR), platform service) | The deployment manifest references a new tag or digest per workload. |
| Database schema | The runtime's three embedded migration sets (session store, gateway store, platform store) | A new binary's first boot extends the schema before opening the listener. Already-applied migrations are skipped. |
| YAML config compatibility | Keys, defaults, and accepted values inside the runtime config files (`configs/*.yaml`) | If a key was renamed or removed, the operator updates the YAML; the runtime does not auto-translate. |

The A2A protocol — the JSON-RPC wire format every agent and gateway speaks on the broker — is forward-compatible within a major version. A pod on N can publish a task that a pod on N+1 picks up, and the reverse, during a roll. The YAML config schema and the database schema are **not** forward-compatible: a new binary requires its new schema, and an old binary started against a new schema may refuse to boot or behave incorrectly. The combination is the reason mixed-version *deployments* are fine for the brief window of a roll but not as a steady state.

## Pre-Upgrade Checks

Walk through these before the first new pod rolls out. Each is in the production-readiness checklist; this section is the upgrade-specific subset.

1. **Read the per-version migration notes for the version pair you are jumping.** The notes for the upgrade path land in Migrations when the release ships a schema change, a YAML rename, or a default change.

2. **Confirm a fresh backup of every persistence surface exists.** The runtime refuses to start rather than partially apply a migration; restoring from backup is the only rollback path. Backup procedures are in Maintenance → Backups. Two surfaces matter:
   - **Session store** — SQLite file or Postgres database, configured per workload that holds sessions (GWE, the platform service, and any agent that persists conversation history).
   - **Artifact store** — filesystem path, S3 / GCS / Azure container; back this up if your retention policy depends on artifact history.

3. **Confirm the backup has been restored at least once in staging.** A backup that has never been restored is not yet a backup.

4. **Run the new binary against a copy of production data in staging.** The migration is what is new; the data is what is novel. The upgrade-failure mode this catches is "the migration is fine against the test fixtures, but rejects a real row from production."

5. **Pin the deployment to a binary version or container image digest, not a floating tag.** Without a pinned version, a roll-forward and a roll-back are not symmetric, and the rollback step below assumes you can redeploy the previous version verbatim.

6. **Drain or pause scheduled / cron-triggered tasks** that you do not want firing mid-roll. The gateway's scheduled-task runner re-evaluates after the new binary boots.

## The Upgrade Procedure

Roll one workload class at a time. The order is **platform service → GWE → AWE → STR**: services that own state and authority first, services that consume from them second. Each step waits on the dedicated workload health server before the next class rolls.

| Step | Workload | Wait for |
|---|---|---|
| 1 | platform service | dedicated health server reports `{"status":"healthy"}` on every platform-service pod |
| 2 | GWE | dedicated health server reports `{"status":"healthy"}` on every GWE pod |
| 3 | AWE | dedicated health server reports `{"status":"healthy"}` on every AWE pod |
| 4 | STR | dedicated health server reports `{"status":"healthy"}` on every STR pod |

The health-probe shape (`{"status":"healthy"}` vs `{"status":"unhealthy","error":"component <name> unhealthy: <wrapped error>"}`) and which port it listens on (configured via the per-workload `--health-addr` flag) are documented in Observability and alerting → Health endpoints. The request-path `/health` endpoint on the gateway always returns `200 OK ok` and is **not** the upgrade probe — it confirms only that the HTTP listener is up.

Between classes, watch the operational log for unexpected `Error`-level entries. A migration failure surfaces at the workload that owns the affected store — the gateway store migration runs in GWE, the platform store migration runs in the platform service, and the session store migration runs in whichever workload opens the session store first. Stop the roll if any pod refuses to come healthy; go to Scenario troubleshooting → Upgrade failures for the diagnostic.

In Kubernetes the rolling-update strategy realises this naturally if the four workload classes are separate deployments and the operator bumps the image tag for one deployment at a time. In Docker Compose, recreate the containers one service at a time and wait between each. In `sam run` embedded-mode local development, an upgrade is `sam --version`-check, swap the binary, restart — there is no inter-class ordering because every component lives in one process.

## Mixed-Version Behaviour During a Roll

For the duration of a roll, some pods run version N and some run N+1. The behaviours are:

- **A2A traffic crosses freely.** A GWE pod on N submits a task; an AWE pod on N+1 picks it up and publishes results; the same GWE pod on N reads the results. This is the protocol-compatibility guarantee.
- **Feature semantics may diverge briefly.** If N+1 changed the default value of an agent-loop timeout or added a new tool-call policy, two AWE pods (one N, one N+1) handle the same kind of task with different parameters until both are on N+1. Plan for the roll to complete inside one operational window.
- **Database schema is shared.** When the first N+1 pod for a workload class boots, it extends the shared schema. Already-running N pods keep working against the extended schema for the read paths; new write paths that depend on the new schema are exercised only by N+1. The reverse is **not** true: a fresh N pod started after the schema has been extended may refuse to boot if its embedded migration set does not match. This is one of the reasons rollback restores the database from backup.
- **YAML config compatibility is per workload.** Each workload reads its own YAML at startup. If an N+1 binary requires an updated YAML key and the deployment manifest mounts the same YAML across pods, all pods on that workload class need both the new binary *and* the new YAML simultaneously.

Do not run mixed versions long-term. The protocol is forward-compatible within a major version; the operational contract is not.

## What Is Applied Automatically

The runtime applies schema migrations on its own at workload startup. There is no separate `sam migrate` command, no `--migrate-only` flag, no manual goose invocation.

- Each workload that opens a database applies any pending migrations from the embedded set before the dedicated health server starts listening.
- Already-applied migrations are skipped. The applied set is tracked in a per-store version table — `session_goose_version` (the AWE-side conversation store), `gateway_goose_version` (the gateway's tasks / feedback / SSE event buffer), and `platform_goose_version` (the platform service's resources).
- When a gateway store or platform store migration fails, the workload logs an `Error`-level record `migration failed` with the offending `version` and the underlying SQL error, then exits with a wrapped startup error. The exact wrap depends on which store hit the failure:

  ```text
  run migrations: goose up (table=gateway_goose_version): <wrapped error>
  ```

  ```text
  platform migrations: goose up (table=platform_goose_version): <wrapped error>
  ```

  The workload exits before the dedicated health server reaches `healthy`; the orchestrator marks the pod unhealthy and restarts it until the migration succeeds or the operator intervenes.
- The runtime does **not** half-apply these migrations. For the gateway store and the platform store, the new schema is in place when the request listener opens, or the process never gets that far.
- **The AWE-side session store is an exception.** When the `session_goose_version` migration fails, AWE logs `failed to migrate session db, using memory` at `Error` and silently falls back to an in-memory conversation store. The workload reports healthy on its probe — but conversation history written by the previous binary is invisible until the migration is fixed and the workload restarted manually. The presence of this log line during an upgrade is the signal; the absence of a startup-error wrap is not confirmation that the migration succeeded. See Migrations for the per-store contract.

The `sam config migrate <legacy> <output>` subcommand is unrelated — it migrates a legacy-format YAML project to the current format and runs on the operator's local machine before deployment. It does not touch a running database.

## Checking the Deployed Version

Confirming which binary is running is the entry point for any upgrade investigation. The `sam --version` invocation for the CLI and the per-workload image-tag convention for the long-running binaries (`platform`, `gateway`, `awe`, `str` — none of which expose `--version` today) are documented once, in Maintenance → Checking the deployed version.

## Rollback

The runtime does not auto-rollback. A failed upgrade is a manual procedure:

1. **Stop the new pods.** Set the deployment replica count to zero (or remove the new image tag from the deployment manifest) so no N+1 instance is racing with the rollback.
2. **Restore the affected databases from the pre-upgrade backup.** This is why pre-upgrade backups are non-negotiable. The schema needs to be at the version the old binary expects.
3. **Redeploy the previous binary version.** The pinned image tag or digest from the pre-upgrade deployment manifest is the artifact you redeploy. If your manifest tracked `latest`, the previous binary is no longer recoverable through the deployment tooling — pull it from your image registry by digest if your registry retains untagged images.
4. **Restart the workloads in the same order as a fresh deploy** — platform service → GWE → AWE → STR — and confirm each reports healthy on its dedicated probe.
5. **Investigate the upgrade failure offline.** Open the operational log from the failed pod; cross-reference the per-version notes in Migrations; reproduce against the staging copy of production data before retrying.

A blue-green or canary deploy that flips the load balancer back is the production shape of this same procedure. The substantive constraint is the same: the database state needs to be at the version the redeployed binary expects.

## What Next?

When an upgrade does not go as planned, the diagnostic loop and the per-symptom playbook are in Scenario troubleshooting → Upgrade failures.
