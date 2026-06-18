---
title: Scheduled Tasks
description: How to set up recurring or one-shot agent invocations from the gateway — schedule kinds, lifecycle, notifications, and the HTTP API.
sidebar_position: 7
---

# Scheduled Tasks

A scheduled task is a recurring or one-shot A2A submission to a configured agent, owned by the gateway. The gateway holds the schedule, fires the task at the right moment, listens to the response, records the execution, and (optionally) notifies an external channel when it finishes.

This page covers the configured path. The configured-vs-built dimension is explained once in Concepts → Configured vs built; this page does not restate it. For the gateway that hosts the scheduler, see Building → Gateways. For the agents the scheduler invokes, see Building → Agents.

## What a Scheduled Task Is

A scheduled task points at a configured agent (or workflow) and carries an A2A message — the same shape the agent would receive from a human user — that fires on a schedule. The scheduler is a feature of the Web UI gateway; it ships with it, runs in the same process, and reuses the gateway's session and artifact backends.

The same task can fire on a recurring schedule (every Monday morning), at fixed intervals (every six hours), or once at a specific moment (the 17th at 09:00 EST). Once a task fires, the execution flows through the broker exactly like a user-initiated task — the agent does not know the difference. The scheduler waits for the agent's completion, records the outcome, and either notifies a channel or holds the result for later polling.

Scheduled tasks are addressable resources. You can list them, update them, disable them, trigger them on demand, and inspect their execution history through the gateway's HTTP API.

## Schedule Kinds

Three schedule kinds are supported:

- **`cron`** — a 5-field cron expression: minute, hour, day-of-month, month, day-of-week. Standard syntax (`0 9 * * 1-5` for "9 AM weekdays"). The gateway accepts only 5 fields; second-precision schedules are not supported.
- **`interval`** — a Go-style duration string such as `"30m"`, `"2h"`, or `"24h"`. Use `d` for days (`"7d"`). The minimum interval is **60 seconds**; shorter intervals are rejected. Mixed forms like `"1d12h"` are not accepted.
- **`one_time`** — an ISO 8601 timestamp such as `"2026-06-01T09:00:00Z"`. Fires once at that instant; never refires.

All three kinds support a `timezone` field (default `"UTC"`). Times in cron expressions and one-time schedules are interpreted in this timezone.

## A Minimal Scheduled Task

Create a scheduled task by posting JSON to the gateway. The example creates a Monday-morning report:

```bash
# POST a new scheduled task.
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "name": "Weekly report",
    "scheduleType": "cron",
    "scheduleExpression": "0 9 * * 1",
    "timezone": "America/New_York",
    "targetAgentName": "ReportingAgent",
    "taskMessage": "Generate the weekly traffic report.",
    "timeoutSeconds": 1800,
    "enabled": true,
    "notificationConfig": {
      "on_success": true,
      "on_failure": true,
      "channels": [
        {
          "type": "webhook",
          "config": {
            "url": "https://chat.example.com/hooks/abc123",
            "webhook_type": "slack"
          }
        }
      ]
    }
  }' \
  https://gateway.example.com/api/v1/scheduledTasks
```

The response is the full task DTO, including the assigned `id`, computed `nextRunTime`, audit fields, and the lifecycle counters.

A task is **enabled by default**. Set `enabled: false` at create time to register a schedule that does not fire until you explicitly enable it.

## The `scheduler_service:` YAML Block

The scheduler is configured on the Web UI gateway under the top-level `scheduler_service:` key. The full surface:

```yaml
# configs/webui_gateway.yaml — scheduler_service fragment
scheduler_service:
  enabled: true
  default_timeout_seconds: 3600
  max_concurrent_executions: 10
  stale_execution_timeout_seconds: 7200
  stale_cleanup_interval_seconds: 600
  retry_delay_seconds: 60
  execution_history_keep_count: 100
  misfire_grace_time_seconds: 60
```

The defaults:

| Key | Default | What it does |
|---|---|---|
| `enabled` | `false` | Master switch. The scheduler runs only when this is `true`. |
| `default_timeout_seconds` | `3600` (1 h) | Per-execution wall-clock cap when a task does not set its own. |
| `max_concurrent_executions` | `10` | Cap on simultaneously-running executions across all tasks. Excess fires are queued. |
| `stale_execution_timeout_seconds` | `7200` (2 h) | Hard cap; an execution older than this is forcibly transitioned to `failed`. |
| `stale_cleanup_interval_seconds` | `600` (10 min) | How often the gateway sweeps the in-flight set looking for stale executions. |
| `retry_delay_seconds` | `60` | Delay between automatic retries when a task has `maxRetries > 0`. |
| `execution_history_keep_count` | `100` | Per-task cap on history rows. Older executions are pruned. |
| `misfire_grace_time_seconds` | `60` | Window after a scheduled fire time during which a missed fire is still allowed to run. Past this, the misfire is logged and skipped. |

The scheduler is **off by default**. Existing gateway configs that omit `scheduler_service:` continue to behave as if the feature were not present. Turn it on by adding the block and setting `enabled: true`.

## Execution Lifecycle

Every execution moves through a small state machine:

1. **`pending`** — the schedule fired; the execution is queued and waiting for a worker slot.
2. **`running`** — the worker dispatched the A2A task to the broker; the agent is processing it.
3. **`completed`** — the agent returned a result, and that result was recorded.
4. **`failed`** — the agent returned an error, the task timed out at the per-execution cap, or the gateway rejected the task because the agent entered an interactive state. (Interactive-state rejection is covered in Interactive-state rejection.)
5. **`timeout`** — the per-execution `timeoutSeconds` elapsed before the agent finished.
6. **`cancelled`** — the operator cancelled the execution mid-run.

Wire-format status values are lowercase strings. They appear in the `status` field of every execution DTO and in SSE event payloads.

## Orphan Recovery at Startup

When the gateway starts, it scans the executions table for rows still marked `pending` or `running` from the previous process incarnation. Those are orphaned — there is no worker holding them — and the gateway transitions each to `failed` with a stable error message:

> Execution was interrupted by a server restart.

This means an execution that was in flight when the gateway crashed will not be silently lost; it lands in the history as a recorded failure. The schedule continues to fire on cadence; the next fire creates a fresh execution.

If you bring the gateway up after a long outage, every fire missed during that window is treated as a misfire — and misfires older than `misfire_grace_time_seconds` are skipped rather than fired retroactively.

## Interactive-State Rejection

Scheduled tasks run with no human in the loop. If the agent enters an interactive state during execution — for example, an admin-required tool calls `hil.require_approval`, or an authentication step needs an end-user OAuth callback — the gateway has no way to satisfy that request. Instead of hanging the execution forever, it rejects the task immediately with a structured error:

- JSON-RPC error code: **`-32001`**
- Message: "Task requires user authentication or input which is not available in scheduled (non-interactive) executions"

(The symbolic name `SCHEDULED_TASK_INTERACTIVE_REJECTED` appears in the Python codebase that shares this protocol; the Go gateway emits only the integer error code on the wire.)

The execution lands in `failed` with this error attached, and the schedule continues firing on cadence. When you design an agent that may be invoked by a scheduled task, audit its tools for `hil.require_approval` and decide whether to either remove the gate for those agents or skip scheduled invocation entirely.

## Notifications on Completion

A task can declare a `notificationConfig` so that interested parties hear about the result without polling. Three channel types are supported today:

- **`sse`** — sends the execution result to subscribers of the Web UI's SSE stream. Useful for in-app dashboards.
- **`webhook`** — POSTs a JSON payload to a configurable URL. Set `webhook_type: slack` or `webhook_type: teams` inside the channel's `config:` block to format the payload for those services, or omit `webhook_type` for the default JSON shape.
- **`broker_topic`** — publishes the execution result to a Solace topic. The topic must start with `scheduled-tasks/` to avoid colliding with the A2A topic tree. Useful for downstream event-driven pipelines.

Webhook URLs are protected by SSRF rejection: requests to private or loopback IP ranges are blocked, and the gateway strips a fixed list of forwarded-identity headers before sending. Treat the webhook URL as a real outbound credential — it leaves the gateway with the execution result attached.

## Previewing a Schedule

Before committing a schedule, you can preview the next *N* fire times to verify the cron expression or interval is what you expect:

```bash
# Preview the next 5 fires of a cron expression.
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "scheduleType": "cron",
    "scheduleExpression": "0 9 * * 1-5",
    "timezone": "America/New_York",
    "count": 5
  }' \
  https://gateway.example.com/api/v1/scheduledTasks/preview
```

The response is a JSON array of ISO 8601 timestamps. `count` defaults to `5` and is capped at `50`. The preview endpoint does not create a task; use it to sanity-check expressions before posting them for real.

## HTTP API Reference

The gateway exposes 14 scheduled-task endpoints. All paths are rooted at `/api/v1/scheduledTasks` and respond with the standard error envelope (`{message, errorId, validationDetails?}`) on failure.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/scheduledTasks` | Create a new scheduled task. Returns the full DTO. |
| `GET` | `/api/v1/scheduledTasks` | List tasks, paginated (`?pageNumber=`, `?pageSize=`). |
| `GET` | `/api/v1/scheduledTasks/{id}` | Get a single task. |
| `PATCH` | `/api/v1/scheduledTasks/{id}` | Update mutable fields on a task. |
| `DELETE` | `/api/v1/scheduledTasks/{id}` | Delete a task and its execution history. |
| `POST` | `/api/v1/scheduledTasks/{id}/enable` | Enable a disabled task. Fires resume on cadence. |
| `POST` | `/api/v1/scheduledTasks/{id}/disable` | Disable an enabled task. The task stays registered; fires stop. |
| `POST` | `/api/v1/scheduledTasks/{id}/trigger` | Fire the task now, fire-and-forget. Returns immediately. |
| `POST` | `/api/v1/scheduledTasks/{id}/run` | Fire the task now, synchronously. Blocks until the execution completes and returns the result. |
| `GET` | `/api/v1/scheduledTasks/{id}/executions` | List execution history for one task, paginated. |
| `GET` | `/api/v1/scheduledTasks/executions/recent` | List recent executions across all tasks. |
| `GET` | `/api/v1/scheduledTasks/executions/byA2aTask/{a2aTaskId}` | Find the scheduled-task execution for a known A2A task id. |
| `GET` | `/api/v1/scheduledTasks/scheduler/status` | Scheduler health: active task count, running count, pending count. |
| `POST` | `/api/v1/scheduledTasks/preview` | Preview next-N fire times for a schedule without creating it. |

Use `/trigger` when you want to kick off a run and let the normal completion path (notifications, history) handle the result. Use `/run` when you need the result inline — for example, an operator-initiated "run this now and tell me what happened" check.

## Operator Knobs

The configuration surface beyond `scheduler_service:` mostly lives on individual tasks. The keys you reach for most often when authoring tasks:

- `timeoutSeconds` — per-execution wall-clock cap. Overrides `scheduler_service.default_timeout_seconds`.
- `maxRetries` — number of automatic retries on failure. Default `0` (no retries). Retries respect `retry_delay_seconds`.
- `retryDelaySeconds` — overrides the global retry delay for this task.
- `enabled` — set to `false` to register a task without firing it. Use this when you want to author a task, review it, and turn it on later.
- `notificationConfig` — declares the completion-notification channel; see Notifications on completion.
- `taskMetadata` — opaque JSON object carried through to the agent's task metadata. Useful for tagging executions for downstream filtering.

When a task's `maxRetries` is exhausted, the execution lands in `failed` with the last attempt's error. The schedule continues on cadence; the next fire is treated as a fresh execution, not a retry of the failed one.

## What Next?

You have just learned how to schedule recurring agent invocations. Most readers next want to draft a new agent configuration to invoke on schedule — covered in Building → AI assistant. For the gateway that hosts the scheduler, see Building → Gateways. For the day-two operations playbook that includes scheduled-task monitoring, see Administering → Observability.
