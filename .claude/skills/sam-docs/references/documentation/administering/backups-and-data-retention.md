---
title: Managing Backups and Data Retention
description: Routine day-two tasks — what to back up, how the built-in log rotation and data-retention cleanup work, and what is delegated to the underlying storage.
sidebar_position: 870
---

# Managing Backups and Data Retention

Day-two maintenance on an Agent Mesh deployment is deliberately thin. The runtime delegates anything stateful to its backing storage — SQLite or Postgres for the session store, a filesystem path or an S3, GCS, or Azure Blob container for the artifact store, and your log aggregator for audit and operational logs. What is left is the small set of routines this page covers: **backups** for the state the runtime persists, the **built-in log rotation** that ships in every component, and the **automatic data-retention sweep** that prunes the entrypoint's task, feedback, and event tables on a schedule.

Adjacent day-two topics live on their own pages:

- Secret and credential rotation — see [Managing Secrets](./secrets-management.md).
- TLS certificate renewal and certificate authority (CA) bundle refresh — see [Configuring TLS](./tls.md).
- Version upgrades and schema migrations — see [Operator Workflows](./operator-workflows.md) for the pre-upgrade dry-run and [Troubleshooting a Running Deployment](./scenario-troubleshooting.md) for migration failures.
- Live-incident diagnostics — see [Troubleshooting a Running Deployment](./scenario-troubleshooting.md).

## What to Back Up

Agent Mesh persists state in two surfaces. Everything else is either ephemeral (in-memory caches, broker topic state) or already shipped to your log aggregator (audit and operational logs).

| Surface | Backed by | Backup mechanism |
|---|---|---|
| Session store (sessions, tasks, feedback, event buffer) | A SQLite file or a Postgres database, selected by the session store's `database_url` | The underlying engine's native tooling — `sqlite3 .backup` or `pg_dump`. The runtime exposes no online-snapshot API. |
| Artifact store | A filesystem path, an S3 bucket, a GCS bucket, or an Azure Blob container | The backend's native tooling — filesystem snapshot, `aws s3 sync`, `gsutil cp -r`, `azcopy`. |

The runtime does not stamp or hash backups for tamper detection. If your compliance posture requires write-once storage, configure that on the destination (S3 Object Lock, an immutable Postgres replica, an append-only filesystem volume). Audit immutability follows the same pattern — it is a property of your log aggregator, not the runtime; see [Managing Audit and Compliance](./audit-and-compliance.md).

### Session Store

The session store is configured per workload (the entrypoint, agents that hold persistent sessions, and the Platform service). It is a SQL store: the `type` is `sql`, and the `database_url` selects the engine by URL scheme — a `sqlite:///…` URL opens a local SQLite file, and a `postgres://…` URL opens a Postgres database.

```yaml
# gateway runtime config
...
session_service:
  type: sql
  database_url: "sqlite:///${SAM_DATA_DIR}/sam.db"
  default_behavior: PERSISTENT
...
```

| URL scheme | What lives there | Backup |
|---|---|---|
| `sqlite:///<path>` | A single `.db` file on local disk | `sqlite3 <path> .backup <dest>` for a consistent online snapshot |
| `postgres://…` | A Postgres database | `pg_dump --no-owner --no-privileges` |

For SQLite, prefer the `.backup` command over a raw `cp` — it takes a consistent snapshot even while the runtime is writing. For Postgres, use the logical (`pg_dump`) or physical (filesystem snapshot of the data directory) backup strategy you already run for other production databases; nothing about the Agent Mesh schema requires special handling.

If `database_url` is left unset, the workload runs on a volatile in-memory session store and emits a startup `WARN` — chat history then does not survive a restart. That mode is for local development only; there is nothing to back up because nothing is persisted.

### Artifact Store

The artifact store layout is determined by the `type` under the `artifact_service:` block. The runtime treats the root as opaque; the backend tooling owns the file layout.

```yaml
# gateway runtime config
...
artifact_service:
  type: filesystem
  base_path: ${SAM_DATA_DIR}
...
```

| `type` | Location | Backup |
|---|---|---|
| `filesystem` | A path on local disk under `base_path` | Filesystem snapshot (`zfs snapshot`, `btrfs send`, `tar`, or a volume-level snapshot in your hypervisor or cloud) |
| `s3` | The configured S3 bucket | Bucket-level replication or `aws s3 sync` to a cold-storage bucket |
| `gcs` | The configured GCS bucket | Bucket-level replication or `gsutil cp -r` |
| `azure` | The configured Blob container | Container-level replication or `azcopy` |
| `memory` | Nothing persistent | None required; cache lifetime only |

Filesystem stores grow with use. The session store's automatic data-retention sweep (covered in the following section) prunes its own tables, but **the artifact store has no built-in cleanup**, so unreferenced blobs accumulate until you remove them with separate tooling. If retention is a compliance requirement, set a bucket lifecycle policy — S3, GCS, and Azure all support time-based expiration — or run a periodic prune against the filesystem store.

### What Is Not Persisted

- **Operational and audit logs** go to the slog stream and from there to your log aggregator. Retention and backups belong to the aggregator. See [Managing Audit and Compliance](./audit-and-compliance.md).
- **Agent discovery and broker topic state** are kept in the broker, not in Agent Mesh. Standard broker backup procedures apply.
- **In-memory caches** (profile cache, scope cache, OAuth state cache) are not persistent by design. They warm up after a restart and have configured time-to-live windows.

## Log Rotation

Every component — the `sam` CLI, the Entrypoint Executor, the Agent-Workflow Executor, the Secure Tool Runtime, and the Platform service — writes operational logs through the same `log:` block in its runtime configuration. Rotation is **size-based**: the file is rotated when it reaches `max_size_mb`, and rotated backups are pruned by count and age. Time-based rotation (one file per calendar day) is not built in; use the platform's logrotate, a Kubernetes sidecar, or `journald` when you need it.

```yaml
# agent runtime config
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

The full key reference — defaults and environment-variable overrides — is in [Monitoring Your Agent Mesh](./observability.md). For maintenance, the keys to watch on a long-running deployment are:

| Key | Behavior over a long run |
|---|---|
| `max_size_mb` | Set this to a non-zero value whenever `log_file` is set. The default of `0` disables rotation and lets the log file grow unbounded — a workload that runs for months with `DEBUG` enabled fills the disk. When a `log_file` is configured with rotation disabled, the runtime emits a startup `WARN`. |
| `max_backups` | Caps the rotated-backup file count. The default of `10` suits most deployments. Setting it to `0` means *unlimited* — appropriate for compliance scenarios, but monitor disk usage. |
| `max_age_days` | Caps backup age. The default of `0` means "keep forever". Set this when `max_backups` is `0` so disk usage still has an upper bound. |
| `compress` | Gzip rotated backups. Recommended for production; the live file stays uncompressed. |

Audit records use the same slog handler as operational logs. There is no separate audit file path inside the runtime, so if you want audit retention to differ from operational retention, **ship to your aggregator and filter on the `logger_name=audit` tag downstream**. Configuring `log_file:` to a separate audit-only path is not supported; see [Managing Audit and Compliance](./audit-and-compliance.md).

## Automatic Data-Retention Sweep

The entrypoint runs an in-process background sweep that prunes old rows from the session store's task, feedback, and event tables. It is the only built-in maintenance routine the runtime exposes.

```yaml
# gateway runtime config
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

| Field | Default | Notes |
|---|---|---|
| `enabled` | `true` | Disable the sweep entirely — for example, during a database migration. |
| `task_retention_days` | `90` | Age threshold for task pruning. Tasks past the threshold are deleted on every sweep when the sweep is enabled. |
| `feedback_retention_days` | `90` | Age threshold for feedback pruning. Feedback past the threshold is deleted on every sweep when the sweep is enabled. |
| `sse_event_retention_days` | `30` | Age threshold for pruning the event buffer. |
| `cleanup_sse_events` | `true` | Default-on switch for event-buffer pruning specifically. Tasks and feedback have no per-table switch — they are pruned unconditionally when the sweep is enabled. |
| `cleanup_interval_hours` | `24` | Sweep cadence. |
| `batch_size` | `1000` | Rows deleted per transaction. Tune this downward when the underlying database is contended. |

There are no dedicated per-field environment variables for the sweep — every key is set in the `data_retention` block. Any individual value can still be driven from the environment through the standard `${VAR, default}` substitution that applies to any configuration value.

The task and feedback tables are the same ones the audit channel correlates against by `taskID`. Audit reviews typically reach back further than the operational logs do, so set the retention windows wide enough that the entrypoint's records still exist when an aggregator-side audit query reaches back into them. Confirm your audit aggregator has the matching records before you shorten the windows.

## Database Engine Maintenance

The runtime does not expose a `VACUUM`, `REINDEX`, or `ANALYZE` command. Use the database engine's native tooling when needed.

- **SQLite** — `VACUUM;` is safe to run against a quiesced database: stop the entrypoint, run `sqlite3 <path> 'VACUUM;'`, then start it again. Page-level fragmentation becomes meaningful only after sustained write churn; most deployments never need it.
- **Postgres** — autovacuum runs by default. If autovacuum is disabled on your cluster, schedule a periodic `VACUUM ANALYZE` against the Agent Mesh database the same way you would for any other application schema. The runtime does not require manual maintenance against any specific table.

The runtime tolerates either engine being briefly unavailable — pooled connections reopen on the next operation. A long outage during the data-retention sweep skips that cycle; the next cycle resumes on its normal schedule.

## What Next?

You have the backup targets identified, log rotation bounded, and the retention sweep tuned. The next step is confirming the whole deployment is production-ready — the full audit is in [Production Readiness Checklist](./production-readiness-checklist.md).
