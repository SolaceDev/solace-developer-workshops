---
published: true
title: Collecting and Publishing User Feedback
description: Enable end-user feedback collection, publish feedback events to the event mesh, set retention, and retrieve feedback through the API for analytics and evaluation.
sidebar_position: 855
---

# Collecting and Publishing User Feedback

Solace Agent Mesh can collect end-user ratings on agent responses, store them, and expose them through a REST API for analytics and agent evaluation. Feedback collection is available on the Agent Mesh UI, Slack, and Teams entrypoints, and every entrypoint writes to one shared feedback store. This page covers the operator configuration. For the end-user experience of rating a response in the UI, see [Giving Feedback](../using-agent-mesh/chatting.md#giving-feedback).

Feedback moves through the following stages, each configured independently:

- Collection stores each rating, its optional comment, and the end user's content-sharing consent in the entrypoint database. Enable it per entrypoint.
- Publishing forwards feedback to the event mesh so an external consumer can act on it. Enable it per entrypoint.
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

As an administrator, you can also set `collectFeedback` through `PUT /api/v1/platform/webuiSettings` or the manifest's `platform.webuiSettings` block. An override set there takes precedence over `frontend_collect_feedback` in the entrypoint's own YAML. For more information, see [Web UI Settings](../building/declarative-config/the-manifest.md#web-ui-settings).

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
Feedback comments are stored in the entrypoint database, are kept for the full retention window, and are included in published feedback events. Comments and shared task content can contain personal or sensitive data, so weigh this risk before you enable collection or publishing.
:::

## Publish Feedback to the Event Mesh

Publishing is available on the Agent Mesh UI, Slack, and Teams entrypoints. Each entrypoint publishes only the feedback it collects, and enabling it on one entrypoint has no effect on the others. An operator who wants every entrypoint's feedback on the event mesh enables publishing on each entrypoint's own configuration.

Publishing is off by default and requires the SQL session store described in Before You Start, because only stored ratings are published.

:::warning
The entrypoint no longer honors `feedback_publishing.topic`. Feedback publishes to the fixed namespaced topic described in The Feedback Event, and a configured `topic` value is ignored with a startup warning. If you set this key in an earlier release, move your subscriber to the fixed topic.
:::

### Agent Mesh UI

Turn on publishing in one of two places.

An administrator sets it per instance through the Platform service, and the change takes effect without restarting the entrypoint. Send a `PUT` request to `/api/v1/platform/webuiSettings`:

```json
{ "collectFeedback": true, "publishFeedback": true }
```

You can declare the same settings in a configuration manifest instead:

```yaml
# manifest.yaml
platform:
  webuiSettings:
    collectFeedback: true
    publishFeedback: true
```

An operator sets the deployment-wide default in the Web UI entrypoint configuration. A platform override, when present, takes precedence over this value:

```yaml
# entrypoint configuration
frontend_collect_feedback: true
feedback_publishing:
  enabled: true
```

### Slack and Teams

Slack and Teams have no platform-level override. `feedback_publishing` in each entrypoint's own configuration controls publishing entirely, alongside `feedback_enabled` (see Enable Feedback Collection):

```yaml
# slack-entrypoint.yaml
kind: entrypoint
name: slack-entrypoint
description: Slack entrypoint with user feedback enabled and published.
spec:
  type: slack
  values:
    slack_bot_token: ${SLACK_BOT_TOKEN}
    slack_app_token: ${SLACK_APP_TOKEN}
    feedback_enabled: true
    feedback_publishing:
      enabled: true
```

The Teams entrypoint configuration follows the same shape under its own `spec.values`.

| Field | Description |
|---|---|
| `enabled` | When `true`, the entrypoint publishes a feedback event every time a rating is submitted. Defaults to `false`. |

### The Feedback Event

Every entrypoint with publishing enabled publishes to the same topic, where `{namespace}` is the namespace it shares with the rest of the deployment:

```text
{namespace}/sam/v1/feedback
```

The topic is fixed and shared: with publishing enabled on more than one entrypoint, ratings from the Agent Mesh UI, Slack, and Teams all land on this same topic, and `entrypoint_type` in the payload is what tells a consumer which entrypoint captured it. To route feedback into your own topic taxonomy, republish from this topic with a bridge on the event broker.

```json
{
  "feedback": {
    "event": "created",
    "task_id": "3b1e5c7a-9d21-4f0a-bd11-6a2e4c8f9012",
    "session_id": "9c2a1f6e-4b83-47d2-a0c5-1e7d9b3f5a24",
    "feedback_type": "down",
    "feedback_text": "The summary missed the breaking changes.",
    "user_id": "user-42",
    "entrypoint_type": "webui",
    "subject_id": "OrchestratorAgent",
    "subject_type": "agent",
    "created_at": "2026-09-09T14:22:31.004000+00:00",
    "updated_at": "2026-09-09T14:22:31.004000+00:00"
  }
}
```

The `event` field is `created` the first time a user rates a response and `updated` if that user later adds a comment or content-sharing consent to the rating. Submitted feedback cannot be changed: a different rating, comment, or sharing choice for the same response is rejected, and resending identical feedback publishes nothing. Each rating therefore produces at most one `created` event and one `updated` event. Both carry the same `task_id` and `user_id`, so a consumer that counts ratings must treat the pair as one rating. During a rolling upgrade, an entrypoint that still runs an earlier version of Agent Mesh accepts changes to submitted feedback. It can publish further `updated` events for the same rating, including events with a different `feedback_type` or `feedback_text`. After you upgrade every entrypoint, each rating produces at most one `created` event and one `updated` event.

:::warning
The published event always carries `feedback_text` and `user_id`, regardless of the content-sharing flag on the record. That flag controls whether an administrator can view the conversation content through the API. A subscriber to this topic receives comments that the API redacts for administrators without content access. Grant subscribe access on this topic only to the audience you trust with feedback content.
:::

Agent Mesh does not consume this event itself. Subscribe to the topic from your own service to route feedback into a data warehouse, an alerting system, or an evaluation pipeline. To confirm events are flowing, watch the topic while you submit a rating in the Agent Mesh UI.

:::warning
The event carries the user's comment and their user ID, and the event broker delivers it to every subscriber it allows on that topic. Review who can subscribe within the namespace before you enable publishing.
:::

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
- For the Agent Mesh UI, confirm no platform-level override is set: call `GET /api/v1/platform/webuiSettings` and inspect `collectFeedback`. A `null` value means no override exists and `frontend_collect_feedback` applies; `true` or `false` means an override exists and takes precedence.
- For the Agent Mesh UI, check the entrypoint logs for the message `feedback configured but persistence not enabled; disabling for frontend`, which is emitted when the UI requests its configuration.
- Confirm `session_service.database_url` is set, then restart the entrypoint.

### Feedback Events Do Not Reach Your Consumer

Publishing is enabled, but your subscribing service receives no feedback events.

- Confirm publishing is on for the entrypoint whose feedback is missing. For the Agent Mesh UI, call `GET /api/v1/platform/webuiSettings` to see the platform override, which takes precedence over `feedback_publishing.enabled` in the entrypoint configuration whenever the override is set. Slack and Teams have no platform override, so check `feedback_publishing.enabled` in that entrypoint's own configuration instead.
- Confirm feedback collection is on for that entrypoint: `frontend_collect_feedback` (or `collectFeedback` in the platform settings) for the Agent Mesh UI, `feedback_enabled` for Slack and Teams. With collection off, the entrypoint hides its rating buttons or card, so no rating is submitted and nothing is published.
- Confirm your subscription matches `{namespace}/sam/v1/feedback` for the namespace the entrypoints share. A `{namespace}/sam/v1/feedback/>` subscription does not match this topic, because `>` matches one or more further levels.
- Confirm the entrypoint's event broker client is authorized to publish on that topic.
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
