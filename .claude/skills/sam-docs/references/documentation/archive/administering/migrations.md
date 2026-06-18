---
title: Migrations
description: Per-version breaking-change notes for Solace Agent Mesh — what changed, what the operator must do, and where to find the source of the change.
sidebar_position: 13
---

# Migrations

This page is the canonical home for **per-version migration notes** — the subset of changes between two Solace Agent Mesh releases that an operator needs to know about to upgrade cleanly. The procedural side of an upgrade (pre-upgrade checks, the rolling-update order, rollback) is in Upgrade guides; this page lists what changed and what to do about it on a release-by-release basis.

What is **not** on this page:

- **Cross-language migration from Python Agent Mesh to the Go implementation** — that is a port, not an upgrade. See Migrating from Python.
- **The full changelog.** This page filters the release stream to the migration-worthy subset. Routine bug fixes and additive features do not appear here.
- **The upgrade procedure itself.** See Upgrade guides.
- **Audit schema changes.** The audit-event schema is closed and changes are rare; when they happen they are documented in Audit and compliance, not duplicated here.

## What Ships a Migration Note

A release lands a per-version entry on this page when any of the following surfaces changed in a way the operator must respond to:

- **Database schema.** A new migration file shipped in the binary's embedded migration set (session store, gateway store, or platform store).
- **YAML config keys.** A key was renamed, removed, or had its accepted values restricted. The runtime does not auto-translate old keys.
- **Environment variables.** A variable was renamed, removed, or had its semantics changed.
- **Default value changes.** A default that operators may have relied on shifted in a way that changes runtime behaviour.
- **Removed features.** A YAML block, a CLI subcommand, or an entire tool kind that previously worked no longer does.

Additive changes (new YAML keys with safe defaults, new CLI subcommands, new tool kinds) do **not** ship a migration note — they appear in the release announcement and the relevant Building / Administering page only.

## The Auto-Apply Contract

Schema migrations run automatically when a workload starts. There is no separate `sam migrate` command, no `--migrate-only` flag, no operator-driven step.

- Each store (the agent conversation store, the gateway store, the platform store) carries its own embedded migration set inside the binary. The applied set is tracked in a per-store version table inside the database: `session_goose_version` (agent conversation history opened by AWE), `gateway_goose_version` (the gateway's tasks / feedback / SSE event buffer), and `platform_goose_version` (the platform service's resources). A `SELECT MAX(version_id) FROM <table>` against any of these is how an operator confirms which migrations have run.
- When a workload starts, it applies every migration whose version is higher than the highest already-applied number for its store.
- When a gateway store or platform store migration fails to apply, the workload logs an `Error`-level record `migration failed` with the offending `version` and the underlying SQL error, then exits with a wrapped startup error of the form `run migrations: goose up (table=gateway_goose_version): <wrapped error>` or `platform migrations: goose up (table=platform_goose_version): <wrapped error>`. The process exits before the dedicated workload health server reaches `healthy`; the orchestrator marks the pod unhealthy and restarts it until the migration succeeds or the operator intervenes.
- The **AWE-side `session_goose_version` migration is an exception today.** When it fails, AWE logs an `Error`-level record `failed to migrate session db, using memory` and silently falls back to an in-memory conversation store. The workload comes up healthy on its dedicated probe, but conversation history written by the previous binary is invisible until the migration is fixed and the workload restarted manually. Treat a session-store migration failure as a silent-degradation event, not a crash loop — the absence of a `goose up (table=session_goose_version): …` startup error is **not** confirmation that the session-store migration succeeded.

- The diagnostic path when this happens — capturing the operational log, restoring from backup, retrying — is in Scenario troubleshooting → Upgrade failures.

## Per-Version Entry Shape

Every per-version section on this page follows the same shape. Future authors should extend the page with new entries in this format:

```text
## vN.M.x → vN.M+1.x

**What changed.** One sentence stating the surface that changed (schema / YAML key / env var / default / removed feature).

**What you must do.** Operator-actionable steps if the migration is not transparent. Omit this line if the migration is purely transparent — the auto-apply contract above is the answer.

**Source.** Link to the release notes, the relevant PR, or the CHANGELOG entry that introduced the change.
```

The intent is that an operator preparing to jump from one release to another reads exactly the entries between their current version and their target version, and gets a complete list of what they must do.

## Per-Version Notes

When the upgrade you are planning does not appear in any section below, the upgrade is transparent: roll the workloads in the order documented in Upgrade guides, apply the pre-upgrade backup discipline, and let the embedded migrations apply themselves. There are no manual steps unique to that release pair.

*No per-version entries yet — the first entry will land here when a release ships a non-transparent change.*

## What Next?

When you have read the relevant per-version entries above (or confirmed there are none for your upgrade path), the procedural reference for the roll itself is in Upgrade guides.
