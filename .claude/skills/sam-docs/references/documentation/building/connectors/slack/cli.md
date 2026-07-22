---
title: Slack Connectors via the CLI
description: Configure a Slack connector as declarative YAML and apply it with the Agent Mesh CLI, so agents can send and update messages in Slack channels.
sidebar_position: 2
---

# Slack Connectors via the CLI

A Slack connector lets agents send messages to Slack channels and update messages they have already posted, authenticating to a workspace with a Bot User OAuth Token. You define the connector as a declarative config resource and apply it with the Agent Mesh CLI, instead of using the Agent Mesh UI. To configure the same connector in the UI, and to read about the Slack app setup, the required bot scopes, and the tools the connector provides, see [Slack Connectors](./index.md).

The following sections describe the YAML shape and the `sam config` command workflow.

The connector is outbound only. Agents drive the conversation, and the connector does not receive messages from Slack. For inbound messages from Slack, see [Slack Entrypoints](../../entrypoints/slack/index.md).

:::note
Slack connectors require outbound HTTPS access from your Agent Mesh deployment to the Slack Web API at `slack.com` and `*.slack.com`.
:::

## Prerequisites

Before you author a Slack connector, ensure you have the following:

- A Slack app installed in your workspace, with the bot scopes the connector needs (at minimum `chat:write`). For the full scope list and a ready-to-paste app manifest, see [Bot Token Scopes](./index.md#bot-token-scopes)
- A Bot User OAuth Token (`xoxb-`) from the app's **OAuth & Permissions** page
- The `sam` CLI installed and a declarative config directory with a `manifest.yaml`. For more information, see [Platform Service](../../../concepts/platform-service.md)

## Creating the Connector

A Slack connector is one resource in a declarative config directory. To create the connector, perform the following steps:

1. Write the connector file under the `connectors/` directory, as described in [Connector YAML](#connector-yaml).
2. Reference the bot token through an environment variable, as described in [Referencing Secrets](#referencing-secrets).
3. Add the connector to the manifest and apply it, as described in [Applying the Connector](#applying-the-connector).

### Connector YAML

A connector is a single YAML file under the `connectors/` directory. The file declares the resource envelope (`kind`, `name`, and `description`) and a `spec` block that sets `type: slack`, `subtype: bot`, and the bot token under `values`.

The connector takes a single field, the bot token, which is a secret. Reference it as a `${VAR}` placeholder rather than writing it into the file:

```yaml
# connectors/slack-bot.yaml
kind: connector
name: slack-bot
description: "Slack bot for posting change-approval requests to the engineering workspace."
spec:
  type: slack
  subtype: bot
  values:
    slack_bot_token: ${SLACK_BOT_TOKEN}
```

The `name` must be 3–255 characters and unique across all connectors in your deployment. The `description` is 10–1000 characters; the agent's language model reads it to decide when to invoke the Slack tools.

| Field             | Required | Description                                                                                             |
| ----------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `slack_bot_token` | Yes      | The Bot User OAuth Token (`xoxb-`) from the Slack app's **OAuth & Permissions** page (secret)          |

The channel an agent posts to is not connector configuration. The agent supplies a channel ID, `#channel-name`, user ID, or user email per tool call. Tell the agent its target channel in its instructions.

### Referencing Secrets

Never write the bot token into the YAML file. The `slack_bot_token` field takes a `${VAR}` placeholder that the Agent Mesh CLI substitutes from the environment at apply time. Set the variable before you run `sam config apply`. The Agent Mesh CLI also loads a `.env` file from the nearest ancestor directory, so you can keep the value there instead of exporting it:

```bash
export SLACK_BOT_TOKEN="xoxb-your-bot-token"
```

Use the `${VAR, default}` form to supply a fallback when the variable is unset. When you run `sam config pull` to export an existing connector, the Agent Mesh CLI rewrites the token back to a `${VAR}` placeholder, so a pulled repository never contains a live credential.

:::warning
The Bot Token (`xoxb-`) grants every Slack capability the app requested. Treat it as a production secret. Never commit it to source control, and never paste it into a channel. When a token leaks, revoke it on the Slack app's **OAuth & Permissions** page and create a replacement before you redeploy.
:::

### Applying the Connector

List the connector under `resources.connectors` in the manifest, alongside any agents that use it:

```yaml
# manifest.yaml
kind: manifest
name: my-deployment
description: Connectors and the agents that use them.
target:
  url: https://platform.example.com
resources:
  connectors:
    - slack-bot
  agents:
    - my-agent
```

Validate your changes without affecting the Platform service, then apply them when you are ready:

```bash
sam config plan
sam config apply
```

`sam config plan` shows the connectors and agents that would be created, updated, or deleted. `sam config apply` reconciles the Platform service to match the manifest; it creates and updates resources but does not delete anything unless you pass `--prune`. Create the connector before the agent that references it. An agent that names a connector missing from the Platform service fails to deploy.

| Command             | Description                                                              |
| ------------------- | ---------------------------------------------------------------------- |
| `sam config plan`   | Preview the changes an apply would make, without changing the Platform service  |
| `sam config apply`  | Create and update the manifest's resources on the Platform service             |
| `sam config pull`   | Export the Platform service's live config into editable YAML, secrets redacted  |

For the full command reference, see [Platform Service](../../../concepts/platform-service.md).

## Security Considerations

Slack connectors use a shared credential model: all agents assigned to this connector send messages as the same Slack bot user and can post to any channel the bot is a member of, including direct messages to any user in the workspace. To restrict where an agent can post, limit the channels the bot is invited to, limit the scopes granted to the bot, or create separate Slack apps and connectors for agents with different posting requirements. For more information, see [Configuring Connectors](../index.md).

## Troubleshooting

The following tips might help you resolve issues with a Slack connector applied from the Agent Mesh CLI.

### Apply Fails to Substitute the Token

Check the following:

- The `SLACK_BOT_TOKEN` environment variable is set, or defined in a `.env` file the Agent Mesh CLI loads
- You ran `sam config apply` in a shell where the variable is exported
- The token value is at least 10 characters

### Connector Fails to Authenticate

Slack API calls return `invalid_auth`, `token_revoked`, or `not_authed` errors.

Check the following:

- The token starts with `xoxb-` and is the current value from the Slack app's **OAuth & Permissions** page
- A Slack admin has not revoked the token
- The Slack app is installed in the workspace where the agent posts

### Bot Cannot Post to a Channel

The send-message tool returns a `channel_not_found`, `not_in_channel`, or similar error.

Check the following:

- The channel ID or name the agent supplies is correct
- The bot is a member of the target channel. For private channels, and for public channels without `chat:write.public`, invite the bot with `/invite @bot`
- The granted bot scopes include `chat:write` and, for public channels the bot has not joined, `chat:write.public`
- The app was reinstalled to the workspace after any scope change

## What Next?

After you apply a Slack connector, reference it from an agent so the agent can send and update Slack messages during conversations. Tell the agent its target channel in its instructions. For more information, see [Creating Agents with the CLI](../../agents/cli.md).

To configure this connector in the Agent Mesh UI instead, see [Slack Connectors](./index.md).
