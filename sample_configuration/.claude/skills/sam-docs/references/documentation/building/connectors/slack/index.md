---
title: Slack Connectors
description: Configure the Slack connector so agents can send messages to Slack channels and update existing messages.
sidebar_position: 1
---

# Slack Connectors

The Slack connector lets agents send messages to Slack channels and update messages they have already posted. It authenticates to a Slack workspace with a Bot User OAuth Token (`xoxb-`) and provides agents with two tools: a send-message tool that posts plain text, Slack Block Kit content, threaded replies, and file attachments, and an update tool that edits a message the agent already posted. Agents call these tools to push notifications and keep long-running status messages current. The connector is outbound only—agents drive the conversation, and the connector does not receive messages from Slack. For inbound messages from Slack, see [Slack Entrypoints](../../entrypoints/slack/index.md).

## When to Use the Connector Versus the Slack MCP Server

The Slack connector is intended for machine-triggered procedures, where an application executes on its own behalf, for example, posting notifications, updating status messages, or sending alerts as part of an automated workflow.

For user-focused procedures, where a person is conversationally driving Slack actions through an agent (for example, browsing channels, summarizing threads, or reacting to messages on the user's behalf), use the Slack Model Context Protocol (MCP) server instead. The MCP server exposes the broader Slack API surface that interactive use cases need.

:::note
This connector requires outbound HTTPS access from your Agent Mesh deployment to the Slack Web API at `slack.com` and `*.slack.com`.
:::

## Prerequisites

Before you create this connector, ensure you have the following:

- A Slack app installed in your workspace. The [Quick Setup Using a Slack App Manifest](#quick-setup-using-a-slack-app-manifest) section creates one in a few steps
- A Bot User OAuth Token (`xoxb-`) from the app's **OAuth & Permissions** page. The same token works for both the Slack connector and the Slack entrypoint, provided the app has the scopes both require
- The Bot Token scopes listed in [Bot Token Scopes](#bot-token-scopes)
- Network connectivity from Agent Mesh to the Slack Web API, with firewalls and security groups permitting outbound HTTPS traffic to `slack.com` and `*.slack.com`

### Bot Token Scopes

On the **OAuth & Permissions** page, grant the Bot Token the following scopes.

| Scope | Why the connector needs it |
|-------|----------------------------|
| `chat:write` | Posts messages to channels and direct messages |
| `chat:write.public` | Posts to public channels the bot has not joined |
| `files:write` | Uploads file attachments alongside messages |
| `users:read` | Looks up workspace user metadata required to resolve recipients |
| `users:read.email` | Resolves a recipient's email address to a Slack user ID for direct messages |

If you add a scope after installing the app, reinstall the app to your workspace for the updated scope to take effect.

### Quick Setup Using a Slack App Manifest

The fastest way to create the Slack app is to paste a manifest into your workspace. The manifest combines the permissions the Slack connector requires with those the Slack entrypoint requires, so a single app can power both. The connector ignores the entrypoint-only event subscriptions and Socket Mode setting, and the entrypoint picks them up if you deploy it later. For information about the entrypoint, see [Slack Entrypoints](../../entrypoints/slack/index.md).

On the [Slack apps page](https://api.slack.com/apps), click **Create New App**, choose **From a manifest**, select your workspace, and paste the following JSON.

```json
{
  "$schema": "https://raw.githubusercontent.com/slackapi/manifest-schema/main/manifest.schema.json",
  "display_information": {
    "name": "Solace Agent Mesh"
  },
  "features": {
    "app_home": {
      "home_tab_enabled": false,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "bot_user": {
      "display_name": "Solace Agent Mesh",
      "always_online": true
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "app_mentions:read",
        "channels:history",
        "channels:join",
        "channels:read",
        "chat:write",
        "files:read",
        "files:write",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "im:write",
        "mpim:history",
        "reactions:write",
        "users:read",
        "users:read.email"
      ]
    }
  },
  "settings": {
    "event_subscriptions": {
      "bot_events": [
        "app_mention",
        "message.im"
      ]
    },
    "org_deploy_enabled": false,
    "socket_mode_enabled": true,
    "token_rotation_enabled": false
  }
}
```

After Slack creates the app, install it to your workspace from the **Install App** page and copy the Bot Token from the **OAuth & Permissions** page. If you also deploy the Slack entrypoint later, the entrypoint requires an additional App-Level Token. For more information, see [Slack Entrypoints](../../entrypoints/slack/index.md).

## Creating the Connector

To create a Slack connector:

1. In the Agent Mesh UI, go to the **Connectors** page and click **Create Connector**.
2. Select **Slack** as the connector type.
3. Enter a **Connector Name** that is unique across all connectors in your deployment. You can rename it later.
4. Enter a **Description** of 10–1000 characters. The agent's language model uses this text to decide when to invoke the Slack tools. For example: "Send change-approval requests to the engineering Slack workspace".
5. Enter the **Bot Token**. This is the Bot User OAuth Token from the Slack app and starts with `xoxb-`. The form masks the value.
6. Click **Create** to save the connector.

When you later edit a saved connector, keep the placeholder value in the **Bot Token** field to preserve the existing token.

## Tools the Connector Provides

When you assign this connector to an agent, the agent gains access to the following tools:

- **Send Message**—sends a message to a Slack channel, direct message, or thread. The agent provides the channel and message text. The channel can be a channel ID (`C01234ABCDE`), a channel name (`#channel-name`), a user ID for a direct message, or a user's email address, which the connector resolves to a user ID through the Slack Web API. The agent can supply Block Kit JSON for rich formatting, a parent message timestamp to reply in a thread, and file attachments to upload alongside the message. The connector automatically converts standard Markdown in the message text to Slack `mrkdwn` format, so bold, links, and headings render correctly without the agent producing Slack-specific syntax. Attachments and Block Kit content are mutually exclusive—the agent uses one or the other in a given call
- **Update Message**—edits a Slack message the agent has already posted. The agent supplies the channel, the timestamp of the original message (returned by the send-message tool as the `ts` field), and the replacement text or Block Kit content. The updated message completely replaces the original—the agent must include all content, not just the changes. This tool is useful for long-running tasks where an agent posts an initial status message and updates it as progress changes

After you create the connector, it is available to assign to agents. For information about assigning, editing, and deleting connectors, see [Configuring Connectors](../index.md).

## Security Considerations

Slack connectors use a shared credential model. For more information, see [Configuring Connectors](../index.md).

All agents assigned to this connector send messages as the same Slack bot user and can post to any channel the bot is a member of, including direct messages to any user in the workspace. To restrict where an agent can post:

- Limit the channels the bot is invited to
- Limit the scopes granted to the bot in the Slack app
- Create separate Slack apps and connectors for agents with different posting requirements

:::warning
The Bot Token (`xoxb-`) grants every Slack capability the app requested. Treat it as a production secret. Never commit downloaded configuration files that contain a real token, and never paste a token into a channel. When a token leaks, revoke it on the Slack app's **OAuth & Permissions** page and create a replacement before you redeploy.
:::

## Troubleshooting

The following troubleshooting tips might help you to resolve issues with this connector.

### Connector Fails to Authenticate

Slack API calls return `invalid_auth`, `token_revoked`, or `not_authed` errors.

Check the following:

- The Bot Token starts with `xoxb-` and is the current value from the Slack app's **OAuth & Permissions** page
- A Slack admin has not revoked the token
- The Slack app is installed in the workspace where the agent posts

### Bot Cannot Post to a Channel

The send-message tool returns a `channel_not_found`, `not_in_channel`, or similar error.

Check the following:

- The channel ID or name is correct
- The bot is a member of the target channel. For private channels, and for public channels without `chat:write.public`, invite the bot with `/invite @bot`
- The granted Bot Token scopes include `chat:write` and, for public channels the bot has not joined, `chat:write.public`
- The app was reinstalled to the workspace after any scope change

### Email Recipient Cannot Be Resolved to a User

The send-message tool returns a `users_not_found` error when the agent passes an email address as the channel.

Check the following:

- The email address matches a user in the Slack workspace
- The granted Bot Token scopes include `users:read.email`
- The app was reinstalled to the workspace after the scope was added

### File Upload Fails

The send-message tool returns a file-upload error or the message posts without the attachment.

Check the following:

- The granted Bot Token scopes include `files:write`
- The bot is a member of the target channel
- The attachment filename is not empty
- The file size does not exceed the Slack workspace upload limit

## What Next?

After you create a Slack connector, assign it to an agent so the agent can send and update Slack messages during conversations. For more information, see [Configuring Connectors](../index.md).

To configure this connector from the command line instead of the Agent Mesh UI, see [Slack Connectors via the CLI](./cli.md).
