---
published: true
title: WhatsApp Entrypoints with the CLI
description: Define a WhatsApp entrypoint as declarative-config YAML and apply it into Agent Mesh with sam config.
sidebar_position: 3
---

# WhatsApp Entrypoints with the CLI

:::warning
This feature is in the Early Access stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

This page covers authoring a WhatsApp entrypoint for Solace Agent Mesh as *declarative config*: the YAML specific to the `entrypoint` kind with `type: whatsapp`, applied with `sam config apply`. To create and manage WhatsApp entrypoints from the Agent Mesh UI instead, and to understand the deployment lifecycle and shared model that every entrypoint type follows, see [WhatsApp Entrypoints (Early Access)](./index.md) and [Configuring Entrypoints](../index.md). For the `sam config plan`, `apply`, and `pull` workflow that applies to every kind, see [Managing Configuration as Code (Early Access)](../../declarative-config/index.md).

The first example on this page defines the same `Support Line` entrypoint that the Agent Mesh UI procedure creates, so you can compare the CLI and UI approaches directly. For the Agent Mesh UI procedure, see [Creating a WhatsApp Entrypoint](./index.md#creating-a-whatsapp-entrypoint).

## Before You Start

You need a running Agent Mesh instance as the target for your configuration. For installation and deployment instructions, see [Install and Deploy](../../../installing/index.md). The Agent Mesh host must be reachable at a public HTTPS URL so that Meta can call the entrypoint's webhook.

You also need the following items from Meta:

- A WhatsApp Business Account
- A Cloud API phone number
- A Meta app
- The values collected from them: the Phone Number ID, an access token, the App Secret, and a webhook verify token that you create

For the full walkthrough, see the [Prerequisites](./index.md#prerequisites) section of the Agent Mesh UI page.

Decide how the entrypoint identifies senders before you write the file. The default matches each sender to an Agent Mesh user through the `phone_number` claim that your identity provider issues. The alternative runs every message as one system user. For more information about the two modes, see [Choosing How Senders Are Identified](./sender-identity.md#choosing-how-senders-are-identified).

The entrypoint references an agent by name. The following example routes to an `orchestrator-agent`; substitute the name of an agent already deployed in your mesh.

## Write the Entrypoint

An entrypoint is one file under the `entrypoints/` directory of a declarative-config repo, listed by name in the manifest.

```yaml
# manifest.yaml
kind: manifest
name: support-line
description: Customer support WhatsApp entrypoint.
target:
  url: http://127.0.0.1:8800
resources:
  entrypoints:
    - support-line
```

The following file defines the WhatsApp entrypoint. The `spec.type` field is `whatsapp`, `spec.slug` sets the URL-stable path segment used in the webhook URL, and the WhatsApp-specific fields go under `spec.values`. The entrypoint identifies senders by phone number, which is the default, so the file sets no identity fields.

```yaml
# entrypoints/support-line.yaml
kind: entrypoint
name: support-line
description: WhatsApp line that routes customer messages to the support orchestrator agent.
spec:
  type: whatsapp
  slug: support-line
  values:
    default_agent_name: orchestrator-agent
    phone_number_id: "123456789012345"
    access_token: ${WHATSAPP_ACCESS_TOKEN}
    app_secret: ${WHATSAPP_APP_SECRET}
    verify_token: ${WHATSAPP_VERIFY_TOKEN}
```

The top-level `name` and `description` fields identify the entrypoint. The `description` field is required and must be 10 to 1,000 characters. The following table describes the fields under `spec`. Most `values` fields map to fields of the WhatsApp entrypoint form in the Agent Mesh UI. You can set `slug`, `responseFormat`, and `systemPurpose` only in YAML.

| Field | Description |
|---|---|
| `type` | The entrypoint type. Set to `whatsapp` for a WhatsApp entrypoint. Immutable after creation. |
| `slug` | The URL-stable path segment in the webhook URL, `/gw/<slug>/webhook`. Use 3 to 63 lowercase letters, digits, and dashes, starting with a letter and ending with a letter or digit. The values `api`, `gw`, `health`, `oauth`, and `well-known` are reserved. When you omit it, the URL uses the entrypoint's universally unique identifier (UUID). On a deployment that serves entrypoints under the Agent Mesh host, set it so that the webhook URL registered in Meta stays the same if you delete and recreate the entrypoint. Agent Mesh ignores a change to `slug` after the entrypoint exists. |
| `deploy` | Accepted, but `sam config apply` deploys every entrypoint that it creates or updates, regardless of the value of this field. To save the entrypoint without bringing its webhook online, run `sam config apply --no-deploy`, which skips deployment for every resource in the manifest. |
| `values.phone_number_id` | The numeric Cloud API ID of the business phone number, as digits only. This ID is neither the phone number nor the WhatsApp Business Account ID. Quote it so that YAML reads it as a string. Required. |
| `values.access_token` | The bearer credential for outbound Graph API calls. Use a Meta system user access token rather than the temporary token, which expires within 24 hours. Required. |
| `values.app_secret` | The Meta app secret, which the entrypoint uses to verify the signature on every inbound webhook. Required. |
| `values.verify_token` | The string that Meta sends back when it verifies the webhook. Enter the same value in the Meta webhook configuration. Required. |
| `values.default_agent_name` | The agent that handles every message that does not name another agent. When you omit it, messages go to whichever discovered agent sorts first by its internal name, so always set it. |
| `values.disable_file_uploads` | When `true`, the entrypoint declines inbound images, documents, audio files, voice messages, and videos before it downloads them. Defaults to `false`. |
| `values.identity_lookup_key` | What the entrypoint matches a sender on: `phone`, the default, or `wa_username`. |
| `values.identity_claim_key` | The identity provider claim that the sender's value must equal. A `phone` lookup requires `phone_number`, which is also its default. A `wa_username` lookup requires a claim that you name, and that claim cannot be `phone_number`. |
| `values.contact_request_template` | The name of an approved message template with a **Share Contact Info** button, which the entrypoint sends to a sender whose phone number WhatsApp withholds. Available with a `phone` lookup only. |
| `values.contact_request_template_language` | The language code of the approved template translation, matched exactly. Defaults to `en_US`. Requires `contact_request_template`. |
| `values.run_as` | The name of the system user that every message runs as, which switches the entrypoint to the System user mode. You cannot combine it with `identity_lookup_key`, `identity_claim_key`, or the contact request fields. |
| `values.responseFormat` | The formatting guidance that Agent Mesh gives agents with each task. An agent applies it only when its configuration sets `injectResponseFormat: true` under `additionalConfigurations`, and the built-in agents set it. When you omit the field, Agent Mesh stores its WhatsApp default, which tells agents to avoid headings, tables, and Markdown links and to return the files they create. Set your own text to change the guidance, or set `""` to remove it. |
| `values.systemPurpose` | Text that describes what the entrypoint is for, which Agent Mesh gives agents with each task. An agent applies it only when its configuration sets `injectSystemPurpose: true` under `additionalConfigurations`, and the built-in agents set it. Unset by default. |

The output of `sam config schema show entrypoint --type whatsapp` also lists `sender_identity_mode`, which the Agent Mesh UI uses to switch between the two modes. Leave it out of your YAML. Agent Mesh derives the mode from `run_as`, and `sam config pull` does not write it.

Reference the three secrets through the environment so the YAML is safe to commit. Provide the real values when you run `sam config apply`. For more information, see [Secrets and Variables](../../declarative-config/secrets-and-variables.md).

The 25 MB limit on inbound and outbound media is fixed for an entrypoint that you apply with `sam config apply`, and the entrypoint pins the Meta Graph API version that it calls, so neither requires configuration.

To list the WhatsApp fields with their types and validation, run `sam config schema show entrypoint --type whatsapp`. To print a templated starting file, run `sam config schema example entrypoint --type whatsapp`.

### Running Every Message as a System User

To serve anyone who messages the number, set `run_as` instead of the identity fields. The following file defines a public entrypoint that runs every message as the `whatsapp-public` system user:

```yaml
# entrypoints/public-line.yaml
kind: entrypoint
name: public-line
description: Public WhatsApp line that answers anyone who messages the number.
spec:
  type: whatsapp
  slug: public-line
  values:
    default_agent_name: faq-agent
    phone_number_id: "123456789012345"
    access_token: ${WHATSAPP_ACCESS_TOKEN}
    app_secret: ${WHATSAPP_APP_SECRET}
    verify_token: ${WHATSAPP_VERIFY_TOKEN}
    run_as: whatsapp-public
```

Declare the `whatsapp-public` system user with the `systemUser` kind, and grant it a role whose scopes allow only the agents that the entrypoint must reach. Until the system user exists, the entrypoint refuses every message. For an example role and system user, see [Restricting an Entrypoint to Specific Agents](../../../administering/enabling-rbac.md#restricting-an-entrypoint-to-specific-agents). To return the entrypoint to identity provider lookup, delete the `run_as` line and apply again.

:::warning
A System user entrypoint cannot ask a sender to authorize a tool. A tool that requires a delegated credential fails there unless a person authorized one for the system user, which every sender then shares. For more information, see [System User](./sender-identity.md#system-user).
:::

## Apply and Verify

Set `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, and `WHATSAPP_VERIFY_TOKEN` in the shell first, because `sam config plan` and `sam config apply` both fail on an unset variable. Preview the change with `sam config plan -m manifest.yaml`, and then apply the manifest to create and deploy the entrypoint:

```bash
sam config apply -m manifest.yaml
```

```text
Applied entrypoints:
  + support-line  created
Deployments:
  * support-line  deploy (deploy) completed
```

On a deployment that serves entrypoints under the Agent Mesh host, the webhook URL takes the following form after the entrypoint deploys:

```text
https://<your-agent-mesh-host>/gw/support-line/webhook
```

The `support-line` segment comes from the `spec.slug` field. When you omit `slug`, the URL uses the entrypoint's UUID instead. A deployment that gives each entrypoint its own host name serves the webhook at that host followed by `/webhook`. In every case, the entrypoint's detail panel on the **Entrypoints** page shows the URL to register under **Entrypoint Endpoint**.

In the Meta App Dashboard, open **WhatsApp** > **Configuration**, enter the URL as the callback URL with the same verify token, and subscribe to the `messages` webhook field. For the full Meta-side setup, see [WhatsApp Entrypoints (Early Access)](./index.md).

To confirm the running state, export the entrypoint back into YAML with `sam config pull -o ./pulled --url http://127.0.0.1:8800 --only entrypoint`, or open the Agent Mesh UI and find `support-line` in the entrypoints list on the **Entrypoints** page. The pulled file replaces the secrets with environment-variable placeholders and includes the stored `responseFormat`.

## What Next?

You have a WhatsApp entrypoint defined as version-controllable YAML and deployed with `sam config apply`.

To decide how the entrypoint identifies senders, or to revoke a person's WhatsApp access, see [Identifying WhatsApp Senders](./sender-identity.md).

To manage the roles and system users that the entrypoint uses in the same repository, declare them as access-control kinds. For more information, see [Managing Users and Roles with the CLI](../../user-management/cli.md).

To configure WhatsApp entrypoints from the Agent Mesh UI instead, use the **Entrypoints** page. For more information, see [WhatsApp Entrypoints (Early Access)](./index.md).
