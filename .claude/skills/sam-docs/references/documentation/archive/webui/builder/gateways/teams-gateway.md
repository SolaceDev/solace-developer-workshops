---
title: Microsoft Teams Gateway
description: Connect Solace Agent Mesh to Microsoft Teams so users can drive agents from personal chats, group chats, and team channels through a Teams bot.
sidebar_position: 3
---

# Microsoft Teams Gateway

This guide walks through configuring a Microsoft Teams Gateway in Agent Mesh.

## Overview

The Teams Gateway connects agents to Microsoft Teams, letting users interact with them from Teams chats and channels. The gateway receives messages on the HTTPS endpoint `/api/messages` and routes them to your agents.

Teams requires the endpoint to be **publicly reachable over HTTPS**. Exposure steps vary by deployment environment.

### Supported Features

| Feature | Behavior |
|---------|----------|
| Personal chats | Direct 1:1 messaging with the bot |
| Group chats | The bot responds when @mentioned |
| Team channels | The bot responds when @mentioned |
| File uploads | Users send files to the bot (CSV, JSON, PDF, YAML, XML, images, and more) |
| File downloads | The bot delivers files through the Teams FileConsentCard approval flow |
| Streaming responses | The bot edits one message in place as the agent produces output |
| Typing indicator | The bot shows "is typing" while the agent works (toggle in Step 4) |
| Session management | Each conversation gets a fresh session at midnight UTC daily |

## Prerequisites

Before you create a Teams gateway, ensure you have the following:

- An Azure account with permission to create App Registrations in Microsoft Entra ID and to create a Bot Service resource
- Access to the Agent Mesh web interface with permission to create and deploy gateways
- Permission to upload custom apps in Microsoft Teams

The following sections describe each prerequisite in detail.

### Azure Account

You need an Azure account with:

- Permission to create **App Registrations** in Microsoft Entra ID—most organizations allow this by default; if disabled, ask your admin for the **Application Developer** role
- **Contributor** role or higher on an Azure subscription or resource group, required to create the Bot Service resource

### Agent Mesh Web Interface Access

You need access to the Agent Mesh web interface with permission to create and deploy gateways.

### Teams Custom App Upload Permission

You need permission to upload custom apps in Microsoft Teams:

- For personal or team use, your Teams admin must enable the **Upload custom apps** policy for your account
- For organization-wide deployment, a **Teams Administrator** must upload and approve the app through the Teams Admin Center

## Step 1: Create an Azure App Registration

The App Registration provides authentication credentials for the gateway. Follow the Microsoft guide to register an application, then create a client secret under **Certificates & secrets**.

Apply these settings so the registration matches what the Teams Gateway expects:

| Microsoft field | Required value |
|---|---|
| Supported account types | Accounts in this organizational directory only (single tenant) |
| Redirect URI | Leave blank |
| Certificates & secrets | Create a **client secret** and copy the **Value** immediately—Azure shows it only once |

After creation, collect these values for Step 4:

| Microsoft value (from App registration) | Agent Mesh gateway field |
|---|---|
| Application (client) ID | Microsoft App ID |
| Directory (tenant) ID | Microsoft App Tenant ID |
| Client secret — Value | Microsoft App Password |

<details>
<summary>Example walkthrough (Azure Portal UI as of this writing—for reference only)</summary>

The Azure Portal UI changes over time. The following steps reflect the flow at the time of writing. If the portal looks different, follow the linked Microsoft guide in the preceding section.

1. Open the Azure Portal
2. Navigate to **App registrations**
3. Click **New registration**
   - **Name**: Choose a name (for example, `Agent Mesh Teams Bot`)
   - **Supported account types**: Select **Accounts in this organizational directory only** (single tenant)
   - **Redirect URI**: Leave blank
4. Click **Register**
5. On the overview page, copy the **Application (client) ID**—your **Microsoft App ID** for Agent Mesh
6. Copy the **Directory (tenant) ID**—your **Microsoft App Tenant ID** for Agent Mesh
7. Go to **Certificates & secrets** > **Client secrets** > **New client secret**
   - **Description**: for example, `Agent Mesh Bot Secret`
   - **Expires**: Choose an appropriate duration
8. Copy the secret **Value** immediately—Azure shows it only once. The value is your **Microsoft App Password** for Agent Mesh

</details>

## Step 2: Create an Azure Bot Service

The Bot Service registers your bot with Microsoft Teams. Follow the Microsoft guide to create an Azure Bot resource and enable the Teams channel.

Apply these settings so the bot works with the Teams Gateway:

| Microsoft field | Required value |
|---|---|
| Type of App | Single Tenant |
| Creation type | Use existing app registration |
| App ID | Application (client) ID from Step 1 |
| Tenant ID | Directory (tenant) ID from Step 1 |
| Channels | Enable the **Microsoft Teams** channel—Messaging enabled, Calling disabled |
| Messaging endpoint | Leave blank for now; set it in Step 6 after the gateway endpoint is available |

<details>
<summary>Example walkthrough (Azure Portal UI as of this writing—for reference only)</summary>

The Azure Portal UI changes over time. The following steps reflect the flow at the time of writing. If the portal looks different, follow the linked Microsoft guide in the preceding section.

1. In the Azure Portal, search for **Azure Bot** and click **Create**
2. Fill in the required fields:
   - **Bot handle**: A globally unique name (for example, `sam-teams-bot`)
   - **Subscription**: Your Azure subscription
   - **Resource group**: Create a new group or select an existing one
   - **Pricing tier**: **F0 (Free)** for testing, or **S1 (Standard)** for production
   - **Type of App**: **Single Tenant**
   - **Creation type**: **Use existing app registration**
   - **App ID**: Paste the Application (client) ID from Step 1
   - **Tenant ID**: Paste the Directory (tenant) ID from Step 1
3. Click **Review + create** > **Create**
4. After the resource finishes provisioning, open the bot resource
5. Navigate to **Configuration**
   - **Messaging endpoint**: Leave blank for now; set the gateway endpoint in Step 6
6. Navigate to **Channels** > click the **Microsoft Teams** icon
7. Confirm **Messaging** is enabled, leave **Calling** disabled
8. Accept the terms of service and click **Apply**

</details>

## Step 3: Create and Install the Teams App

Build a Teams app package—a ZIP containing `manifest.json` plus a color icon and an outline icon—and upload it to Teams. Follow the Microsoft guide to upload a custom Teams app.

The manifest declares the bot scopes and capabilities the gateway requires. The following example is a minimal manifest that works with the Teams Gateway. Replace `<YOUR_APP_ID>` with the **Application (client) ID** from Step 1 and replace the developer block with your organization's details.

:::note
The manifest schema evolves over time. For the current version, see the Teams app manifest schema reference.
:::

The first line of the example below is a descriptive comment that identifies the file path; strip it before saving the file, because JSON does not accept `//` comments.

```json
// File: manifest.json
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.22/MicrosoftTeams.schema.json",
  "version": "1.0.0",
  "manifestVersion": "1.22",
  "id": "<YOUR_APP_ID>",
  "name": {
    "short": "Agent Mesh Bot",
    "full": "Solace Agent Mesh Teams Gateway"
  },
  "developer": {
    "name": "Your Organization",
    "websiteUrl": "https://yourorg.com/",
    "privacyUrl": "https://yourorg.com/privacy",
    "termsOfUseUrl": "https://yourorg.com/terms"
  },
  "description": {
    "short": "AI-powered intelligent assistant for Teams",
    "full": "Connect to the Solace Agent Mesh Teams Gateway to access AI agents for task automation, data analysis, document creation, and intelligent assistance directly through Microsoft Teams."
  },
  "icons": {
    "outline": "outline.png",
    "color": "color.png"
  },
  "accentColor": "#ffffff",
  "bots": [
    {
      "botId": "<YOUR_APP_ID>",
      "scopes": [
        "personal",
        "team",
        "groupChat"
      ],
      "isNotificationOnly": false,
      "supportsCalling": false,
      "supportsVideo": false,
      "supportsFiles": true
    }
  ],
  "permissions": [
    "identity",
    "messageTeamMembers"
  ],
  "validDomains": []
}
```

The gateway requires these manifest values specifically:

| Manifest field | Required value | Why |
|---|---|---|
| `bots[0].botId` | Application (client) ID from Step 1 | Links the Teams app to your Azure Bot |
| `bots[0].scopes` | `personal`, `team`, `groupChat` | Enables 1:1 chats, team channels, and group chats |
| `bots[0].supportsFiles` | `true` | Required for users to send and receive files |
| `permissions` | `identity`, `messageTeamMembers` | Lets the gateway identify users and post messages |

Provide two icons in the package: `color.png` (192x192) and `outline.png` (32x32, white on transparent).

:::note
Uploading a custom app may require Teams Administrator approval, depending on your organization's app policies.
:::

<details>
<summary>Example walkthrough: package and upload (Teams UI as of this writing—for reference only)</summary>

The Teams and Developer Portal UIs change over time. The following steps reflect the flow at the time of writing. If the interface looks different, follow the linked Microsoft guide in the preceding section.

1. Create a ZIP file containing `manifest.json`, `color.png`, and `outline.png`
2. Upload through one of the following methods

**Option A: Import through the Teams Developer Portal**

1. Open the Teams Developer Portal
2. Select **Apps** > **Import app** and upload the ZIP file
3. Review and edit the app configuration if needed
4. Go to **Publish** > **Publish to org** to submit for admin approval

**Option B: Upload through Teams (for personal or team use)**

1. In Microsoft Teams, go to **Apps** > **Manage your apps** > **Upload an app**
2. Select **Upload a custom app** and choose the ZIP file

**Option C: Upload through the Teams Admin Center (for organization-wide deployment)**

1. Ask your Teams Administrator to upload the app through the Teams Admin Center under **Teams apps** > **Manage apps** > **Upload new app**
2. After upload, the app becomes available to users in the organization

</details>

## Step 4: Create and Deploy the Gateway in Agent Mesh

In the Agent Mesh web interface, navigate to Gateways, click **Create Gateway**, and select **Teams** as the gateway type. Enter a unique name (3–255 characters) and a description (10–1000 characters), then fill in the Teams-specific fields described below.

### Gateway Configuration

| Field | Required | Description |
|-------|----------|-------------|
| Microsoft App ID | Yes | Application (client) ID from Step 1. GUID format (for example, `12345678-1234-1234-1234-123456789abc`) |
| Microsoft App Password | Yes | Client secret **Value** from Step 1. Minimum length 1. Redacted in API responses and replaced with an environment-variable placeholder in downloaded YAML |
| Microsoft App Tenant ID | No | Directory (tenant) ID from Step 1. GUID format. Required for single-tenant bots; leave empty for multi-tenant |
| Default Agent | No | Agent that receives messages when no other routing applies. Defaults to `Orchestrator`, which dispatches based on message content |
| Initial Status Message | No | Plain-text message posted while the agent processes the request. Defaults to `Processing your request...`. Leave empty to suppress the placeholder message |
| Enable Typing Indicator | No | When `Yes`, the bot shows "is typing" while the agent works. Defaults to `Yes` |
| Max File Download Size (MB) | No | Cap on inbound file attachments fetched from Teams. Defaults to `100`. Accepts `1`–`500` |

After you save the form, click **Deploy** to provision the gateway and its networking resources. Saving alone does not create a running gateway.

## Step 5: Obtain the Gateway Endpoint

After deployment, the gateway listens on port `8080` and serves the `/api/messages` path. By default the gateway is only reachable from inside the Agent Mesh deployment, so you need to publish it on a public HTTPS URL before Microsoft Teams can deliver activities to it.

### Requirements

- The gateway endpoint must be reachable from the public internet at `https://<your-gateway-hostname>/api/messages`
- TLS must terminate in front of the gateway—Microsoft Teams rejects HTTP endpoints
- Inbound traffic on the public hostname must route to the gateway on port `8080`
- A DNS record (typically a CNAME or alias) must point your hostname at whatever public load balancer or reverse proxy sits in front of the gateway

How you satisfy these requirements depends on where you run Agent Mesh. Common patterns are:

- A cloud load balancer that terminates TLS and forwards traffic to the gateway
- A managed reverse proxy (for example, NGINX or Envoy) that terminates TLS and forwards traffic to the gateway
- Your existing edge networking solution, configured to expose the gateway hostname

Coordinate with whoever manages networking for your Agent Mesh deployment to set this up. Provide them with:

- The gateway hostname you plan to publish (for example, `sam-teams.yourdomain.com`)
- The gateway's internal address and port (`8080`)
- A valid TLS certificate for the hostname

### Your Gateway Endpoint

After the endpoint is exposed, the URL takes this form:

```text
https://<your-gateway-hostname>/api/messages
```

:::warning
The endpoint has to be reachable over HTTPS. Microsoft Teams does not send messages to HTTP endpoints.
:::

Verify the setup by opening `https://<your-gateway-hostname>/health` in a browser. A JSON health response confirms the gateway is publicly reachable.

## Step 6: Configure the Gateway Endpoint in Azure Bot Service

On the Azure Bot resource from Step 2, point the **Messaging endpoint** at the gateway URL. For more information, see the Microsoft guide to set the bot messaging endpoint.

| Field | Value |
|---|---|
| Messaging endpoint | `https://<your-gateway-hostname>/api/messages` |

<details>
<summary>Example walkthrough (Azure Portal UI as of this writing—for reference only)</summary>

The Azure Portal UI changes over time. The following steps reflect the flow at the time of writing. If the portal looks different, follow the linked Microsoft guide in the preceding section.

1. Open the Azure Portal
2. Navigate to your **Azure Bot** resource
3. Go to **Configuration**
4. Set **Messaging endpoint** to `https://<your-gateway-hostname>/api/messages`
5. Click **Apply**

</details>

## Verification

Verify the integration end-to-end:

1. Open Microsoft Teams
2. Find your bot app by searching for the name you assigned
3. Send a message such as `Hello`
4. Confirm a processing indicator appears, followed by an agent response

## After You Create the Gateway

After you save the gateway, it appears in the Gateways list with `Not Deployed` status. Click **Deploy** to provision the gateway and its networking resources. For deployment states, configuration drift, credential handling, and downloading the YAML, see Gateways.

## Security Considerations

Agent Mesh redacts Teams credentials from API responses and replaces them with environment-variable placeholders in downloaded YAML. For the shared credential model, see Gateways.

The bot reads and posts to every personal chat, group chat, and channel where users install your Teams app. Restrict installation through Teams app policies. If the client secret leaks, regenerate it in Azure under **App registrations** > **Certificates & secrets** and update the gateway.

## Troubleshooting

The following troubleshooting tips might help you to resolve issues with this gateway.

### Bot Does Not Respond to Messages

Check the following:

- The **Messaging endpoint** in Azure Bot Service matches the gateway URL exactly, including `/api/messages`
- The deployment status in the Agent Mesh web interface shows the gateway is running
- A JSON health response is returned when you open `https://<your-gateway-hostname>/health` in a browser
- The **Microsoft App ID** and **Microsoft App Password** in Agent Mesh match the Azure App Registration credentials

### Gateway Returns Authentication Errors

Check the following:

- The **Microsoft App Password** has not expired in Azure; regenerate it under **App registrations** > **Certificates & secrets** if needed
- The **Microsoft App Tenant ID** matches in Agent Mesh and Azure

### Teams Cannot Reach the Gateway Endpoint

Check the following:

- The endpoint is served over HTTPS—Microsoft Teams rejects HTTP endpoints
- The endpoint is reachable from the public internet

## What Next?

You have just created a Microsoft Teams gateway. Most readers next want to deploy the gateway and manage its lifecycle, covered in Gateways.
