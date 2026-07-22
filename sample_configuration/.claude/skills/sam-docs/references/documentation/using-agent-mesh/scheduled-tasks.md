---
title: Scheduling Tasks (Experimental)
description: "Set up recurring or one-shot agent invocations from the Agent Mesh UI: schedule types, lifecycle, and managing existing tasks."
sidebar_position: 654
---

# Scheduling Tasks (Experimental)

:::warning
This feature is in the Experimental stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

:::note Prerequisites
Scheduled Tasks requires SQL-backed session persistence on the Web UI entrypoint (SQLite or PostgreSQL).
:::

A **scheduled task** is an agent invocation that runs on its own, on a recurring schedule, at fixed intervals, or once at a specific time. You describe the message the agent receives, the target agent or workflow, and when the task fires. The Web UI entrypoint (the same process that serves the Agent Mesh UI) holds the schedule, fires the task, and records the outcome.

Scheduled tasks live in the **Schedules** area in the sidebar. They are stored per user and are not tied to any one project. This page covers creating, managing, and monitoring scheduled tasks in the Agent Mesh UI.

## Creating a Scheduled Task

On an empty deployment, the **Schedules** page offers two starting points:

- **Build with AI** — Opens a **Create Scheduled Task** dialog with a natural-language description textarea. Suggestion chips prefill the textarea (for example, "Generate daily report at 9 AM"). Select **Generate** and the AI drafts the schedule type, target agent, and message from your description. Review and adjust before saving.
- **Create Manually** — Opens the same **Create Scheduled Task** form with empty fields you fill in directly.

To create a task manually:

1. In the sidebar, open **Schedules**.
2. Select **Create Manually**.
3. Give the task a **Task Name** (required); optionally add a **Description**.
4. Choose a **Schedule Type** (`Recurring Schedule`, `Interval`, or `One Time`) and fill in its parameters. See [Schedule Types](#schedule-types).
5. Choose a **Timezone** (required; defaults to your browser's zone).
6. Under **Task Configuration**, choose a **Target** (Agent or Workflow), pick the target from the drop-down list, and write the **Instructions** the agent or workflow receives when the task fires. `Output` is fixed to `Chat` in the current release.
7. Select **Create and Activate** to save and start firing immediately, or **Create** to save the task in a disabled state (resume it later from the task's Actions menu).

After saving, the Schedules page shows the task as a card with its schedule, next-run time, and status.

## Schedule Types

Three schedule types are supported:

| Type | What you enter | Example |
|---|---|---|
| **Recurring Schedule** | A `Frequency` (`Daily`, `Weekly`, `Monthly`, or `Custom (Cron Expression)`) plus a `Time` picker. `Custom (Cron Expression)` opens a raw cron textbox with a live plain-English preview, format hint, canned examples, and syntax legend. | Every Monday at 09:00. |
| **Interval** | A numeric field plus a unit combobox (`Seconds`, `Minutes`, `Hours`, `Days`). Default `30 Minutes`. Minimum 60 seconds; the UI enforces a one-year upper bound. | Every 6 hours. |
| **One Time** | A date picker plus a time picker. Fires once at that moment and never refires. | November 17, 2026 at 09:00 UTC. |

For a cron expression, the scheduler accepts the standard 5-field POSIX syntax (minute, hour, day-of-month, month, day-of-week). Second-precision schedules are not supported. Sunday is indexed as `0`; the names `sun` through `sat` also work.

A past-due interval fire — for example, a 30-minute schedule when the entrypoint has just come back from a two-hour outage — is coalesced and fires immediately on recovery rather than being retroactively re-run for each missed tick.

## Managing Scheduled Tasks

Once you have created a task, the **Schedules** page shows it as a card in a grid. Each card carries the task name, the schedule description (`Occurs: Daily at 09:00`), the next-run relative time (`Next run: In 23 hours`), and a status pill (`Active`, `Paused`, or `Error`). The page header provides a **Filter** search box (filter by name, description, or agent), a **Status** filter, and a **Refresh** button.

Every card carries an **Actions** menu:

- **Run Now** — Fires the task immediately without waiting for its next scheduled time. Only available when the task is enabled and not a one-time or declarative-config task.
- **Edit Task** — Reopen the task form to change the schedule, target agent, or instructions.
- **View Execution History** — Opens the full task detail page focused on the executions table.
- **Pause Task** / **Resume Task** — Toggle the task's active status. A paused task stays registered but never fires.
- **Delete Task** — Remove the task and its execution history.

Selecting a card opens a **side panel** on the right of the page. The panel shows the task's description, current status, schedule, primary actions (**Run Now** and **Task Details**), and a compact **Execution History** with the latest runs. Select **Task Details** to navigate to the full detail page, which shows the full configuration on the left (**Name**, **Description**, **Schedule**, **Timezone**, **Agent**, **Output**, **Instructions**) with an **Edit** button, and the full **Execution History** table on the right with columns for **Run Time**, **Status**, and **Duration**, plus a **Date Range** filter.

## Reviewing Execution History

Every execution moves through a small state machine, surfaced in the **Execution History** table on the detail page and in the compact list in the side panel:

| Status | Meaning |
|---|---|
| **Pending** | The schedule fired; the execution is queued and waiting for a worker slot. |
| **Running** | The worker dispatched the task; the agent is processing it. |
| **Completed** | The agent returned a result, and that result was recorded. |
| **Failed** | The execution ended in an error. Triggers include: the agent returned an error, the caller was unauthorized, the entrypoint rejected the task because the agent entered an interactive state (see [Behavior You Should Know About](#behavior-you-should-know-about)), or orphan recovery on restart. |
| **Timeout** | The per-execution timeout elapsed before the agent finished, OR the stale-cleanup sweep transitioned a long-running execution. Distinct from Failed. |
| **Cancelled** | The operator canceled the execution mid-run. |
| **Skipped** | The scheduler tried to fire but could not proceed — either the target agent was not discoverable, the task was already running from a previous fire, or the global concurrent-execution cap was exhausted. The schedule continues on cadence; the next fire produces a fresh execution. |

Task-level status (shown on the card and side panel) is a separate concept: `Active` (running on cadence), `Paused` (registered but not firing), or `Error` (the schedule itself is in a bad state).

## Behavior You Should Know About

A few things worth knowing before you rely on a scheduled task in production:

- **No human in the loop.** A scheduled task runs with no user available to answer questions. If the agent's execution transitions the task into an `input-required` or `auth-required` state — for example, a Human-in-the-Loop (HIL) tool that pauses for approval, or an authentication step that needs an end-user OAuth callback — the entrypoint has no way to satisfy that request and rejects the task immediately. The execution lands in **Failed** with a clear error. **To preflight**, open a task's side panel, and select **Run Now**; a Failed execution with an interactive-state error means the agent hit one of these gates. Audit an agent's tools before scheduling it against it, or pre-configure any required credentials.
- **Restart recovery.** If the entrypoint restarts while an execution is running, the scheduler transitions that execution to **Failed** with a stable error message. The schedule continues on cadence; the next fire creates a fresh execution. No execution is silently lost.
- **Concurrent runs.** The scheduler runs multiple tasks in parallel up to an operator-configured cap. Fires that exceed the cap produce a **Skipped** execution.

## Operator Setup

*This section is for the operator running the Web UI entrypoint, not for users authoring schedules from the UI. If you configure schedules from the Agent Mesh UI, you can skip this section.*

The scheduler is configured on the Web UI entrypoint under the top-level `scheduler_service:` key:

```yaml
# Web UI entrypoint config — scheduler_service fragment
scheduler_service:
  enabled: true
  default_timeout_seconds: 3600
  max_concurrent_executions: 10
  stale_execution_timeout_seconds: 7200
  stale_cleanup_interval_seconds: 600
  retry_delay_seconds: 60
  execution_history_keep_count: 100
  misfire_grace_time_seconds: 60
  auto_pause_after_consecutive_failures: 10
```

The defaults:

| Key | Default | What it does |
|---|---|---|
| `enabled` | `true` | Master switch. Omitting the block also leaves the scheduler enabled; set to `false` explicitly to turn it off. |
| `default_timeout_seconds` | `3600` (1 h) | Per-execution wall-clock cap when a task does not set its own. |
| `max_concurrent_executions` | `10` | Cap on simultaneously-running executions across all tasks. Excess fires produce a **Skipped** execution. |
| `stale_execution_timeout_seconds` | `7200` (2 h) | Hard cap; an execution older than this is forcibly transitioned to **Timeout** by the stale-cleanup sweep. |
| `stale_cleanup_interval_seconds` | `600` (10 min) | How often the entrypoint sweeps the in-flight set looking for stale executions. |
| `retry_delay_seconds` | `60` | Delay between automatic retries when a task has automatic retries configured. |
| `execution_history_keep_count` | `100` | Per-task cap on history rows. Older executions are pruned. |
| `misfire_grace_time_seconds` | `60` | **Reserved for future use.** The current release parses this key but the scheduler engine uses a hardcoded 60-second grace regardless of the value you set. The grace applies only to one-time schedules: a one-time fire missed by more than 60 seconds is skipped rather than run retroactively. Recurring and interval past-due fires are always coalesced and fired immediately on recovery, regardless of this value. |
| `auto_pause_after_consecutive_failures` | `10` | Pauses a task after this many consecutive failed executions. Resume it explicitly from the task's Actions menu once you have investigated the failures. |

The scheduler is on by default wherever SQL session persistence is configured — entrypoint configurations that omit `scheduler_service:` still get the feature. To opt out, add the block with `enabled: false`.

## Related Topics

- To learn what an agent does when it receives a task, see [What Is an Agent?](../concepts/what-is-an-agent.md).
- To watch for scheduled-task failures in operational logs and metrics, see [Monitoring Your Agent Mesh](../administering/observability.md).
- To refine the agent you're invoking, see [Creating Agents](../building/agents/index.md), or draft one from a prompt in [Quick Build (Experimental)](../building/quick-build.md).
- To understand the entrypoint that hosts the scheduler, see [Configuring Entrypoints](../building/entrypoints/index.md).
