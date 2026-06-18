---
title: Maintenance
description: Routine day-two tasks — what to back up, how the built-in log rotation and data-retention cleanup work, and what is delegated to the underlying storage.
sidebar_position: 9
---

# Maintenance

Maintenance on a Solace Agent Mesh deployment is deliberately thin. The runtime delegates anything stateful to its backing storage (SQLite / Postgres for the session store; filesystem / S3 / GCS / Azure Blob for the artifact store; your log aggregator for audit and operational logs). What is left is the small set of knobs and routines this page covers: **backups** for the state the runtime persists, the **built-in log rotation** that ships in every component, and the **automatic data-retention sweep** that prunes the gateway's event log and feedback tables on a schedule.

What is **not** on this page:

- **Secret and credential rotation** — see Secrets management.
- **TLS certificate renewal and CA bundle refresh** — see TLS.
- **Version upgrades and migrations** — see Upgrade guides and Migrations.
- **Live-incident troubleshooting** — see Scenario troubleshooting.

## Backups

Agent Mesh persists state in two surfaces. Everything else is either ephemeral (in-memory caches, A2A topic state on the broker) or already shipped to your log aggregator (audit and operational logs).

| Surface | Backed by | Backup mechanism |
|---|---|---|
| Session store (sessions, tasks, feedback, SSE event buffer) | SQLite file or Postgres database, selected by `session_service.type` | The underlying engine's native tooling — `sqlite3 .backup` or `pg_dump`. The runtime exposes no online-snapshot API. |
| Artifact store | Filesystem path, S3 bucket, GCS bucket, or Azure Blob container | The backend's native tooling — filesystem snapshot, `aws s3 sync`, `gsutil cp -r`, `az storage blob copy`. |

The runtime does not stamp or hash backups for tamper detection; if your compliance posture requires write-once storage, configure that on the destination (S3 Object Lock, an immutable Postgres replica, an append-only filesystem volume). Audit immutability follows the same pattern — it is a property of your log aggregator, not the runtime; see Audit and compliance.

### Session Store

The session store is configured per workload (gateway, agents that hold persistent sessions, Platform service). The shape that gets backed up depends on the `type:`:

```yaml
# configs/gateway.yaml
...
session_service:
  type: sql
  database_url: "sqlite:///${SAM_DATA_DIR}/sam.db"
  default_behavior: PERSISTENT
...
```

| `type:` | What lives there | Backup |
|---|---|---|
| `memory` (default when omitted) | nothing persistent | none required; state is lost on restart by design |
| `sqlite` | a single `.db` file at the `path:` field | `sqlite3 <path> .backup <dest>` for an online snapshot |
| `sql` | URL-dispatched driver from `database_url:` — `sqlite:///<path>` opens a local SQLite file, `postgres://...` opens a Postgres database | `sqlite3 .backup` for the SQLite URL form; `pg_dump --no-owner --no-privileges` for the Postgres URL form |

For SQLite, prefer the `.backup` command over a raw `cp` — it takes a consistent snapshot even while the runtime is writing. For Postgres, use the database engine's logical (`pg_dump`) or physical (filesystem snapshot of the data directory) backup strategy you already run for other production databases; nothing about Agent Mesh's schema requires special handling.

### Artifact Store

The artifact store layout is determined by the `type:` under the `artifact_service:` block. The runtime treats the root as opaque; the backend tooling owns the file layout.

```yaml
# configs/gateway.yaml
...
artifact_service:
  type: filesystem
  base_path: ${SAM_DATA_DIR}
...
```

| `type:` | Location | Backup |
|---|---|---|
| `filesystem` | `${base_path}/artifacts/...` on local disk | filesystem snapshot (`btrfs send`, `zfs snapshot`, `tar`, volume-level snapshot in your hypervisor / cloud) |
| `s3` | the configured S3 bucket | bucket-level replication or `aws s3 sync` to a cold-storage bucket |
| `gcs` | the configured GCS bucket | bucket-level replication or `gsutil cp -r` |
| `azure` | the configured Blob container | container-level replication or `azcopy` |
| `memory` | nothing persistent | none required; cache lifetime only |

Filesystem stores grow with use. The session store's automatic data-retention sweep (next section) prunes its own tables; **the artifact store has no built-in cleanup**, so unreferenced blobs accumulate until you remove them out-of-band. If retention is a compliance requirement, set a bucket lifecycle policy (S3, GCS, Azure all support time-based expiration) or run a periodic prune of `*/artifacts/<old-session-id>/` paths against the filesystem store.

### What Is *Not* Persisted

- **Operational and audit logs** — go to the slog stream and from there to your log aggregator. Retention and backups belong to the aggregator. See Audit and compliance.
- **Agent discovery and broker topic state** — kept in the broker, not in Agent Mesh. Standard broker backup procedures apply.
- **In-memory caches (profile cache, scope cache, OAuth state cache)** — not persistent by design. They warm up after a restart and have configured TTLs.

## Log Rotation

Every component (`sam` CLI, the Gateway Executor (GWE), the Agent-Workflow Executor (AWE), the Secure Tool Runtime (STR), the Platform service) writes operational logs through the same `log:` block in its runtime config. Rotation is **size-based** — the file is rotated when it reaches `max_size_mb`, and rotated backups are pruned by count and age. Time-based rotation (one file per calendar day) is not built in; use the platform's logrotate, a Kubernetes sidecar, or `journald` if you need it.

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

The full key reference (defaults, environment-variable overrides) is in Observability and alerting. For maintenance, the keys to watch are:

| Key | Behavior on a long-running deployment |
|---|---|
| `max_size_mb` | Set this to a non-zero value. The default of `0` disables rotation and lets the log file grow unbounded — a workload that runs for months with `DEBUG` enabled will fill the disk. The runtime emits a startup WARN when rotation is disabled. |
| `max_backups` | Caps the rotated-backup file count. The default of `10` is a sane operations default. Setting it to `0` means *unlimited* — appropriate for compliance scenarios but watch the disk. |
| `max_age_days` | Caps backup age. The default of `0` means "keep forever". Set this when `max_backups` is `0` so disk usage still has an upper bound. |
| `compress` | Gzip rotated backups. Recommended for production; the live file is uncompressed. |

Audit records ride the same slog handler as operational logs. There is no separate audit file path inside the runtime — if you want audit retention to differ from operational retention, **ship to your aggregator and filter on the `component=audit` tag downstream**. Configuring `log_file:` to a separate audit-only path is not supported; see Audit and compliance.

## Automatic Data-Retention Sweep

The gateway runs an in-process background sweep that prunes old rows from the session store's tasks, feedback, and SSE-event tables. It is the only built-in maintenance routine the runtime exposes today.

```yaml
# configs/gateway.yaml
...
data_retention:
  enabled: true
  task_retention_days: 90
  feedback_retention_days: 90
  sse_event_retention_days: 30
  cleanup_sse_events: true
  cleanup_interval_hours: 24
  batch_size: 1000
...
```

The fields:

| Field | Default | Notes |
|---|---|---|
| `enabled` | `true` | Disable the sweep entirely (e.g., during a database migration). |
| `task_retention_days` | `90` | Age threshold for task pruning. Tasks past the threshold are deleted on every sweep when `enabled: true`. |
| `feedback_retention_days` | `90` | Age threshold for feedback pruning. Feedback past the threshold is deleted on every sweep when `enabled: true`. |
| `sse_event_retention_days` | `30` | Age threshold for SSE-event-buffer pruning. |
| `cleanup_sse_events` | `true` | Default-on switch for SSE-event pruning specifically. Tasks and feedback have no per-table switch — they are pruned unconditionally when the sweep is enabled. |
| `cleanup_interval_hours` | `24` | Sweep cadence. |
| `batch_size` | `1000` | Rows deleted per transaction. Tune downward if the underlying database is contended. |

Per-field environment-variable overrides (set on GWE):

| Env var | Sets |
|---|---|
| `DATA_RETENTION_TASK_DAYS` | `task_retention_days` |
| `DATA_RETENTION_FEEDBACK_DAYS` | `feedback_retention_days` |
| `DATA_RETENTION_SSE_EVENT_DAYS` | `sse_event_retention_days` |
| `DATA_RETENTION_CLEANUP_SSE_EVENTS` | `cleanup_sse_events` |
| `DATA_RETENTION_CLEANUP_INTERVAL_HOURS` | `cleanup_interval_hours` |
| `DATA_RETENTION_BATCH_SIZE` | `batch_size` |

The task and feedback tables are the same ones the audit channel correlates against (via `task_id`). Audit-and-compliance reviews typically reach back further than the operational logs do, so set the retention windows wide enough that the gateway's records still exist when an aggregator-side audit query reaches back into them. Confirm your audit aggregator has the matching records before shortening the windows.

## Database Engine Maintenance

The runtime does not expose a `VACUUM`, `REINDEX`, or `ANALYZE` command. Use the database engine's native tooling when needed.

- **SQLite** — `VACUUM;` is safe to run against a quiesced database (stop the gateway, then `sqlite3 <path> 'VACUUM;'`, then start). Page-level fragmentation only becomes meaningful after sustained write churn; most deployments never need it.
- **Postgres** — autovacuum runs by default. If autovacuum is disabled on your cluster, schedule a periodic `VACUUM ANALYZE` against the Agent Mesh database the same way you would for any other application schema. The runtime does not require manual maintenance against any specific table.

The runtime is responsive to either engine being briefly unavailable — pooled connections reopen on the next operation. A long outage during the data-retention sweep simply skips that cycle; the next cycle picks up where the previous one left off.

## Checking the Deployed Version

Confirming which binary is running is a frequent input to the routines above (and the entry point for Upgrade failures). The `sam` CLI exposes its version directly:

```bash
sam --version
```

```text
sam version v0.53.0
```

For the long-running workloads (`awe`, `gateway`, `str`, `platform`), the container image tag is the canonical source of the deployed version. In Kubernetes:

```bash
kubectl get pods -l app=agent-mesh -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].image}{"\n"}{end}'
```

The runtime does not emit a startup banner that prints its own version on stderr today. Track the version externally — image tag, deployment annotation, Helm chart version — rather than relying on the operational log.

## What Next?

Maintenance is the *quiet* side of day-two. When the routine breaks and a system is misbehaving, the per-scenario playbook is in Scenario troubleshooting.
