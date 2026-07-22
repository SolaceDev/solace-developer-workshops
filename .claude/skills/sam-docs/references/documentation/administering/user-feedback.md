---
title: Collecting and Publishing User Feedback
description: Enable end-user feedback collection, publish feedback events to the event mesh, set retention, and retrieve feedback through the API for analytics and evaluation.
sidebar_position: 855
---

# Collecting and Publishing User Feedback

Solace Agent Mesh can collect end-user ratings on agent responses, store them, and expose them through a REST API for analytics and agent evaluation. Feedback collection is available on the Agent Mesh UI, Slack, and Teams entrypoints, and every entrypoint writes to one shared feedback store. This page covers the operator configuration. For the end-user experience of rating a response in the UI, see [Giving Feedback](../using-agent-mesh/chatting.md#giving-feedback).

Feedback moves through the following stages, each configured independently:

- Collection stores each rating, its optional comment, and the end user's content-sharing consent in the entrypoint database. Enable it per entrypoint.
- Publishing forwards Agent Mesh UI feedback to the event mesh so an external consumer can act on it.
- Retention prunes stored feedback on a schedule so the database does not grow without bound.

## Before You Start

Feedback collection requires a persistent session store, because the entrypoint saves each rating to its database. Configure the session service to use SQL persistence before you enable feedback. For how to configure session storage, see [Session Storage](../installing/configure.md#session-storage).

:::warning
All feedback collection requires the SQL session store. Without it, the Agent Mesh UI hides the rating buttons, and the entrypoint logs a warning when the UI requests its configuration, while the Slack and Teams entrypoints still show their buttons but discard submitted feedback. In every case, the end user sees no error.
:::

## Enable Feedback Collection

Feedback collection is enabled per entrypoint. Each entrypoint type has its own setting, and every entrypoint writes to the same feedback store. The Slack and Teams entrypoints are configured as declarative configuration resources; for the `sam config` workflow, see [Managing Configuration as Code (Early Access)](../building/declarative-config/index.md). The Agent Mesh UI examples show individual configuration keys. When configuring the Web UI entrypoint, add these keys to the same configuration file or section where you set other Web UI entrypoint settings.

### Agent Mesh UI

Set `frontend_collect_feedback` to `true` in the Web UI entrypoint configuration to show the Like and Dislike buttons on each agent response:

```yaml
# entrypoint configuration
frontend_collect_feedback: true
```

### Slack

In the Slack entrypoint configuration, set `feedback_enabled` to `true` under `spec.values` to add thumbs-up and thumbs-down buttons after each response:

```yaml
# entrypoints/slack-entrypoint.yaml
kind: entrypoint
name: slack-entrypoint
description: Slack entrypoint with user feedback enabled.
spec:
  type: slack
  values:
    slack_bot_token: ${SLACK_BOT_TOKEN}
    slack_app_token: ${SLACK_APP_TOKEN}
    feedback_enabled: true
```

For the complete Slack entrypoint setup, see [Slack Entrypoints](../building/entrypoints/slack/index.md).

### Teams

In the Teams entrypoint configuration, set `feedback_enabled` to `true` under `spec.values` to post a thumbs-up and thumbs-down card after each response:

```yaml
# entrypoints/teams-entrypoint.yaml
kind: entrypoint
name: teams-entrypoint
description: Teams entrypoint with user feedback enabled.
spec:
  type: teams
  values:
    feedback_enabled: true
```

For the complete Microsoft Teams entrypoint setup, see [Microsoft Teams Entrypoints](../building/entrypoints/teams/index.md).

### Feedback Records

Each stored feedback record holds the rating (`up` or `down`), an optional comment, and a content-sharing flag. The flag records whether the end user consented to let an administrator view the conversation content alongside the feedback. This consent is off by default, and only the task owner can grant it.

:::note
Feedback comments are stored in the entrypoint database, are kept for the full retention window, and, for the Agent Mesh UI, are included in published feedback events. Comments and shared task content can contain personal or sensitive data, so weigh this risk before you enable collection or publishing.
:::

## Publish Feedback to the Event Mesh

Publishing applies to Agent Mesh UI feedback only. The Slack and Teams entrypoints store feedback and expose it through the API, but do not publish it to the event mesh.

To forward each Agent Mesh UI rating to the event mesh as it is submitted, add a `feedback_publishing` block to the Web UI entrypoint configuration. Publishing depends on the SQL session store from Before You Start, because only stored ratings are published:

```yaml
# entrypoint configuration
frontend_collect_feedback: true
feedback_publishing:
  enabled: true
  topic: "sam/feedback/v1"
```

| Field | Description |
|---|---|
| `enabled` | When `true`, the entrypoint publishes a feedback event every time a rating is submitted. Defaults to `false`. |
| `topic` | The topic the feedback event is published to. Defaults to `sam/feedback/v1`. Set a fully qualified topic to route feedback into your own namespace. |

The published event carries a fixed set of fields:

```json
{
  "feedback": {
    "task_id": "3b1e5c7a-9d21-4f0a-bd11-6a2e4c8f9012",
    "session_id": "9c2a1f6e-4b83-47d2-a0c5-1e7d9b3f5a24",
    "feedback_type": "down",
    "feedback_text": "The summary missed the breaking changes.",
    "user_id": "user-42"
  }
}
```

:::note
Agent Mesh reads only `enabled` and `topic` under `feedback_publishing`. The event always carries the fields shown, and you cannot attach a task summary or the full task event log to the payload.
:::

Agent Mesh does not consume this event itself. Subscribe to the topic from your own service to route feedback into a data warehouse, an alerting system, or an evaluation pipeline. To confirm events are flowing, watch the configured topic while you submit a rating in the Agent Mesh UI.

## Set Feedback Retention

The same automatic sweep that prunes tasks and event history also prunes stored feedback, no matter which entrypoint collected it. Set `feedback_retention_days` under `data_retention` to control how long feedback is kept:

```yaml
# entrypoint configuration
data_retention:
  enabled: true
  feedback_retention_days: 90
  cleanup_interval_hours: 24
```

The sweep deletes feedback older than `feedback_retention_days` on every run. The default retention is 90 days, and the default sweep interval is 24 hours. For more information about the retention sweep and the other data it prunes, see [Managing Backups and Data Retention](./backups-and-data-retention.md).

## Retrieve Feedback Through the API

Agent Mesh exposes stored feedback at `GET /api/v1/feedback`. Feedback collected on any entrypoint that shares this database is available here, and each caller can retrieve only their own feedback:

```bash
curl -H "Authorization: Bearer ${SAM_AUTH_TOKEN}" \
  "https://myapp.example.com/api/v1/feedback?rating=down&pageSize=50"
```

This endpoint accepts these query parameters:

| Parameter | Description |
|---|---|
| `startDate`, `endDate` | Restrict results to feedback created in a time range. Both are ISO 8601 timestamps. |
| `taskId` | Return feedback for a single task. The caller must own the task. |
| `sessionId` | Return feedback for a single session. |
| `rating` | Filter by rating value, either `up` or `down`. |
| `pageNumber` | The 1-based page to return. |
| `pageSize` | The number of records per page, between 1 and 100. |

The response wraps the records in a paginated envelope:

```json
{
  "data": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "sessionId": "9c2a1f6e-4b83-47d2-a0c5-1e7d9b3f5a24",
      "taskId": "3b1e5c7a-9d21-4f0a-bd11-6a2e4c8f9012",
      "userId": "user-42",
      "rating": "down",
      "comment": "The summary missed the breaking changes.",
      "shareTaskContent": true,
      "createdAt": "2026-07-03T14:41:54.021000+00:00"
    }
  ],
  "meta": {
    "pagination": {
      "pageNumber": 1,
      "pageSize": 50,
      "count": 1,
      "totalPages": 1,
      "nextPage": null
    }
  }
}
```

The `shareTaskContent` field reflects the consent the end user gave when submitting the rating. When it is `true`, an administrator can review the associated task content alongside the feedback.

## Troubleshooting

### Rating Buttons Do Not Appear, or Clicking Them Records Nothing

Feedback collection is enabled, but the buttons or card are missing, or submitting feedback stores nothing.

- Confirm the entrypoint's session service uses `type: sql`. Without a SQL store, the Agent Mesh UI hides the buttons, while the Slack and Teams entrypoints show their buttons but discard the feedback.
- Confirm the enable setting for that entrypoint type: `frontend_collect_feedback` for the Agent Mesh UI, or `feedback_enabled` under `spec.values` for Slack and Teams.
- For the Agent Mesh UI, check the entrypoint logs for the message `feedback configured but persistence not enabled; disabling for frontend`, which is emitted when the UI requests its configuration.
- Confirm `session_service.database_url` is set, then restart the entrypoint.

### Feedback Events Do Not Reach Your Consumer

Publishing is enabled, but your subscribing service receives no feedback events.

- Confirm `feedback_publishing.enabled` is `true`.
- Confirm your subscription matches the configured `topic`. The default is `sam/feedback/v1`.
- Verify the entrypoint's connection to the event mesh is healthy.

### The API Returns 403 or an Empty List

A request to `GET /api/v1/feedback` returns 403 Forbidden or an empty `data` array.

- A 403 on a `taskId` filter means the task belongs to another user. Each caller can retrieve only their own feedback.
- An empty list means no stored feedback matches the filters for the calling user. Widen the `startDate`, `endDate`, or `rating` filters.

### Feedback Is Not Pruned

Feedback older than the retention window remains in the database.

- Confirm `data_retention.enabled` is `true`.
- Confirm `feedback_retention_days` is set to the intended window.
- The sweep runs every `cleanup_interval_hours`, which defaults to 24 hours, so allow one interval to pass before checking again.

## What Next?

You have feedback collection, publishing, and retention configured. Most readers next want to see where feedback fits alongside the other operational signals Agent Mesh produces.

- To monitor logs, metrics, and traces for a running deployment, see [Monitoring Your Agent Mesh](./observability.md).
- To adjust the retention sweep that prunes feedback and other stored data, see [Managing Backups and Data Retention](./backups-and-data-retention.md).
