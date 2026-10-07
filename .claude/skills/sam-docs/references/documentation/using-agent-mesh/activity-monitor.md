---
published: true
title: Chatting with the Activity Monitor (Experimental)
description: Ask the built-in Activity Monitor agent for usage reports, failure lists, and task traces covering agent and workflow activity across your deployment.
sidebar_position: 655.5
---

# Chatting with the Activity Monitor (Experimental)

:::warning
This feature is in the Experimental stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

The Activity Monitor is a built-in agent you talk to like any other agent in your deployment. Instead of performing a task, it answers questions about the tasks other agents and workflows have already run: how many ran, how long they took, whether they succeeded, and how much large language model (LLM) token usage they drove. This page covers what the Activity Monitor can tell you and how to ask it. For an overview of the other activities in the application, see [Using Agent Mesh](./index.md).

The Activity Monitor is a different tool than the Activities page described in [Monitoring Activity](./monitoring-activity.md). The Activities page is a live, per-task view: you select one task and watch its execution graph as it happens. The Activity Monitor is a chat-driven, aggregate view: you ask it a question in natural language, and it summarizes many tasks over a time window into a report.

## What the Activity Monitor Does

The Activity Monitor is read-only. It does not change agent configuration, cancel tasks, or fix anything it finds. If you ask it to resolve a problem, it explains what it found and recommends an action instead of attempting one.

It can do three things:

- Produce an activity report for a time window, covering total tasks, failures, duration, and token usage broken down by agent and by workflow.
- List the tasks that failed in a time window.
- Trace a single task, including the peer agents or workflow nodes it touched, so you can see where a failure originated.

## Enabling the Activity Monitor

The Activity Monitor is on by default. An administrator can disable it by setting the `SAM_FEATURE_ACTIVITY_MONITOR` environment variable to `false` on the deployment. For more information about setting feature flags, see [Environment Variables](../reference/env-vars.md).

The Activity Monitor is seeded automatically and appears alongside the Orchestrator and any other built-in agents in the **Deployed** tab of Agent Management. For more information about that page, see [Viewing Agents](../building/agents/index.md#viewing-agents).

## Starting a Conversation

Open the agent selector in the chat toolbar and select the Activity Monitor, the same way you select any other agent. For more information about the agent selector, see [Chatting with Agents](./chatting.md). You don't need special access to talk to it beyond the access your account already has to invoke agents. What the Activity Monitor tells you about, however, depends on your access. See [Access and Visibility](#access-and-visibility).

## Requesting an Activity Report

Describe the time window you want in your message. The Activity Monitor understands relative phrasing ("the last 24 hours", "today", "the past 7 days") and absolute date ranges ("from June 1 to June 15"). If you don't specify a window, it defaults to the last 24 hours. It reports on a maximum of 90 days in a single request; ask for a narrower window if the Activity Monitor rejects your request for exceeding that limit.

You can also narrow a report to one agent or workflow by naming it in your request, for example, "How did the billing-agent do this week?" A narrowed report omits the by-agent and by-workflow breakdowns, because every row would restate the one agent you asked about.

Example requests:

```text
Give me an activity report for the last 24 hours.
How many tasks failed last week?
Show me token usage for the release-notes-agent over the past 7 days.
```

The Activity Monitor returns two things: a short chat message stating the headline result, and an HTML report that opens in the chat preview pane the same way any other artifact does. For more information about artifacts and the preview pane, see [Working with Artifacts](./chatting.md#working-with-artifacts).

### Reading the Report

The report opens with a verdict banner summarizing the window as one of `No activity`, `All succeeded`, `Mostly succeeded`, `Mixed outcomes`, or `Mostly failed`, based on the proportion of tasks that failed. Below the banner, a row of tiles shows total tasks, success rate, failure count, 95th-percentile duration, and the number of tasks still running in the background.

The rest of the report breaks the window down into:

- A status chart showing the mix of completed, failed, canceled, and in-progress tasks.
- A duration histogram.
- Token usage and task-count trends over the window.
- A By Agent table and a By Workflow table, each with per-handler invocation counts, failure counts, and token totals. The By Workflow table also expands to show which agents ran inside each workflow.
- A Users table, collapsed by default, lists every user active in the window and notes if the count hit a safety limit set for very large deployments. It only appears when you hold the `activity:*:read` scope and the report isn't already narrowed to one user. See [Access and Visibility](#access-and-visibility).
- A Recent Failures table, capped at 10 rows. If there are more, the report tells you how many, and you can ask the Activity Monitor to list them all. See [Looking Up Failed Tasks](#looking-up-failed-tasks).

## Looking Up Failed Tasks

Ask for the full list of failures instead of the capped preview in a report, for example, "List every task that failed yesterday." The Activity Monitor returns a paginated table with up to 50 rows per page, ordered newest first. Ask for the next page by number if there are more results than fit in one response.

## Tracing a Single Task

Give the Activity Monitor a task ID and ask it to explain or trace that task, for example, "Why did task 019fdc7d-4b90-7d63-8faa-b63ee755f7dd fail?" It returns the task's place in its execution tree: the tasks above it (if a peer agent or workflow delegated to it) and the tasks below it (if it delegated further), along with the events around the point of failure.

:::note
Tracing an ancestor task returns that task's place in the tree, but not its own event timeline, only the timeline of the task you asked about and its descendants. Ask about a specific task directly if you need its own events.
:::

## Access and Visibility

By default, the Activity Monitor shows you only your own task activity: reports, failure lists, and traces are scoped to tasks your account started or that were run on your behalf. This default scope requires no special permission beyond the standard access your account already has to invoke agents.

An administrator can grant a role the `activity:*:read` scope to allow cross-user visibility: reports and failure lists for every user in the deployment, and the ability to ask about a specific user's activity by user ID. The `activity:*:read` scope follows the same scope-based access model used throughout Solace Agent Mesh. For more information, see [RBAC Reference](../reference/rbac-reference.md).

:::note
The `activity:*:read` scope does not have a separate content tier. If you can see a task, whether because it's your own or because you hold this scope, you can see its content, including the text of the request that started it.
:::

## Troubleshooting

The following issues are the most common problems you might encounter using the Activity Monitor.

### Cross-User Request Rejected

You asked the Activity Monitor about another user's activity, and it reported the request was rejected. Your account does not hold the `activity:*:read` scope required for cross-user reporting.

To resolve this issue:

1. Ask your administrator to grant a role with the `activity:*:read` scope.

For more information about the scope model, see [Access and Visibility](#access-and-visibility).

### Task Reported as Not Found

You asked the Activity Monitor to trace a task you believe exists, and it reported the task was not found. The Activity Monitor returns this same response both when a task ID does not exist and when it exists but you do not have access to it, so a not-found result does not confirm the task never ran.

To resolve this issue:

1. Confirm you have the correct task ID from the Activities page or from a report's failure list.
2. If you believe the task belongs to another user, ask an administrator with the `activity:*:read` scope to look it up.

## Related Topics

- To follow a single task's execution live instead of asking about historical activity, see [Monitoring Activity](./monitoring-activity.md).
- To select agents and manage conversations, see [Chatting with Agents](./chatting.md).
- To understand the scope model behind cross-user access, see [RBAC Reference](../reference/rbac-reference.md).
- To find and set the environment variable that controls this feature, see [Environment Variables](../reference/env-vars.md).
