---
published: true
title: Identifying WhatsApp Senders
description: Decide whether a WhatsApp entrypoint matches each sender to an Agent Mesh user through an identity provider claim or runs every message as one system user, and revoke a person's WhatsApp access.
sidebar_position: 2
---

# Identifying WhatsApp Senders

:::warning
This feature is in the Early Access stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

Anyone who knows a WhatsApp business number can message it, so you decide whose permissions each message carries. This page covers the two ways that a Solace Agent Mesh WhatsApp entrypoint can identify senders, the identity provider setup that the default mode requires, and how to revoke a person's WhatsApp access. To create the entrypoint itself, see [WhatsApp Entrypoints (Early Access)](./index.md).

## Choosing How Senders Are Identified

The **Sender Identity** setting of a WhatsApp entrypoint selects one of the following modes.

| Consideration | Identity provider lookup (default) | System user |
|---|---|---|
| Who a message acts as | The Agent Mesh user whose identity provider claim matches the sender, with that user's roles and role-based access control (RBAC) scopes | The system user that you name, with only the roles that system user holds |
| A sender that Agent Mesh cannot match | Refused and asked to sign in | Not applicable, because every sender is accepted |
| Tools that require the sender's own authorization | Available through an **Authorize** button | Not available |
| Requires | Single sign-on (SSO) with an identity provider that issues the matching claim, and one sign-in by each person | A system user declared with declarative config |
| Use it for | Employees, partners, or customers who have Agent Mesh accounts | A public number that anyone can message |

## Identity Provider Lookup

In this mode, the entrypoint reads the sender's phone number from each message and looks for the one Agent Mesh user whose `phone_number` claim holds the same number. When it finds that user, the message acts as them, with the roles and RBAC scopes they hold. The task also runs under the email address of the person's Agent Mesh account, so the agent can use the delegated credentials that the person already authorized in the Agent Mesh UI. If Agent Mesh has no email address for the person, or another Agent Mesh user has the same email address, the task runs under a separate WhatsApp identity instead, and the entrypoint sends an **Authorize** button the first time a tool requires the person's credentials.

The entrypoint refuses a sender who matches no user, and never falls back to the deployment's default roles for them. Instead, it responds with a **Sign in** button that opens the Agent Mesh UI of your deployment. The person signs in with the account that carries their number, and then sends the message again, because the entrypoint does not process the refused message later. The entrypoint sends the button only when the Agent Mesh UI address uses HTTPS, and otherwise sends the address as text.

### Identity Provider Requirements

For the lookup to match, the identity provider and its claim must meet the following requirements:

- The identity provider issues a claim named `phone_number` in the token that Agent Mesh receives at sign-in. A phone lookup compares only against `phone_number`, so if your provider holds the number in another attribute, map that attribute onto `phone_number` in the provider. Some providers release the claim when the client requests the `phone` scope, which you add to the `scopes` list of the provider's entry in the provider catalog. Others require you to configure the provider to add the claim to the token. For more information, see [The Provider Catalog](../../../administering/enabling-sso.md#the-provider-catalog).
- The claim holds the full international number, including the country code, for example `+1 555 010 0199`. Agent Mesh ignores spaces, dashes, parentheses, a leading `+`, and a leading `00` when it compares numbers, but it cannot supply a missing country code.
- The provider does not mark the number unverified. Agent Mesh does not match a number whose `phone_number_verified` claim is `false`.
- Each number belongs to one user. When two users hold the same number, the entrypoint refuses messages from that number until only one user holds it.
- Each person signs in to the Agent Mesh UI at least once, and again after their number changes in the identity provider. Agent Mesh records claims only at sign-in.

:::warning
The `phone_number` claim determines who a WhatsApp message acts as. Source it from an attribute that only an administrator can change. If people can edit their own phone number in the identity provider, anyone can claim a colleague's number and act with that colleague's access. A number stored without its country code may also match a sender in another country whose number has the same digits.
:::

### Senders Whose Number WhatsApp Withholds

WhatsApp users can adopt a username. For such a user, Meta omits the phone number from the webhook unless your business exchanged a message or call with that number in the last 30 days, or has the user in its contact book. A phone lookup has nothing to match for such a sender, so by default the entrypoint tells them to contact their administrator.

To give these senders a one-tap way to share their number, create a message template with a **Share Contact Info** button in WhatsApp Manager, and name it in **Contact Request Template**. The entrypoint then sends that template to a sender whose number is withheld, at most once in 24 hours. After the sender taps the button, Meta records the number and includes it in later webhooks, so the entrypoint confirms the share and asks the sender to send their request again. For more information about when Meta withholds a number, see the Meta [business-scoped user IDs guide](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids/).

If the template does not meet the following requirements, Meta rejects the request to send it, and the entrypoint tells the sender to contact their administrator:

- Meta has approved the template, and it has a **Share Contact Info** button.
- The template has no variables. The entrypoint sends it without parameters. The `request_contact_info_1` template in the template library is a starting point, but you must delete its variable first.
- **Contact Request Template Language** names an approved translation exactly, for example `en_US`, which is the default.

To select a template from a list instead of typing its name, select **Find Template** beneath **Contact Request Template**, enter your **WhatsApp Business Account ID**, and select **Look Up**. The account ID is not the Phone Number ID. The list shows which templates you can use, and selecting one fills in the template name and language.

:::note
The entrypoint reads the sender's number from the webhooks that Meta sends after the sender shares their number, not from the shared contact card. Meta includes the number in those webhooks when your business uses the Meta contact book, which you can turn off in Meta Business Suite. Keep the contact book on for the business that owns the number.
:::

### Matching on WhatsApp Username

To match the handle a sender chose in WhatsApp instead of their number, set **Identify Senders By** to **WhatsApp username**. No standard claim holds a WhatsApp handle, so enter the name of the claim that your identity provider issues for it in **Identity Provider Claim**. The claim cannot be `phone_number`.

A username match gives the sender the roles that the matched user holds through claim mappings and through role grants made in the Agent Mesh UI or with `sam config apply`, but not the roles that the user-assignments file assigns to their email address. The sender's sessions, artifacts, and delegated credentials also stay separate from that user's Agent Mesh UI account. The entrypoint tells a sender who has not set a username to set one or to contact their administrator, and the contact request template is not available in this mode. For more information about the user-assignments file, see [Authoring Roles and Assignments](../../../administering/enabling-rbac.md#authoring-roles-and-assignments).

:::warning
Each person chooses their own WhatsApp username, and a username returns to the pool when its owner releases it, so whoever registers the handle next can message as the person that your claim names. Provision the claim from a handle that each person demonstrably holds, remove it when they release the handle, and match on phone number where you can. The entrypoint logs a warning at every startup while it matches on usernames.
:::

### When a Number Moves to Another WhatsApp Account

Agent Mesh records which WhatsApp account each matched number arrives from. When a matched number starts to arrive from a different WhatsApp account, for example because a carrier reassigned the number or its owner registered WhatsApp again, Agent Mesh withholds the match and tells the sender to contact their administrator. Signing in again does not end the hold. When Meta reports that an account's WhatsApp ID changed while its number stayed the same, the entrypoint updates the record, so that account keeps its access.

The hold ends in one of the following ways:

- A super administrator revokes the stored claims of the person who holds the number, and that person signs in again. For more information, see [Revoking WhatsApp Access for a Person](#revoking-whatsapp-access-for-a-person).
- Your identity provider assigns the number to a different person, and that person signs in. Until the previous holder's stored claims stop including the number, through their next sign-in or a revocation, both users hold it, and the entrypoint refuses the number as held by more than one user.

## System User

In this mode, the entrypoint does not identify senders. Every message runs as the system user that you select in **Run As System User**, with only the roles granted to that system user. The deployment's default roles do not apply, so a system user without a role grant cannot reach any agent. Anyone who can message the number reaches every agent that the system user can invoke, so create a custom system user whose roles grant only the agents that the entrypoint must reach. You declare system users with declarative config. For more information, see [Machine Entrypoints and System Users](../../../administering/enabling-rbac.md#machine-entrypoints-and-system-users).

:::warning
The built-in `default` system user can invoke any agent or workflow that does not declare `required_scopes`, so an entrypoint that runs as `default` lets anyone who messages the number reach those agents and workflows. Select a custom system user instead. The entrypoint logs a warning at startup when it runs as `default`.
:::

Each sender still has their own conversation session. However, every sender acts as the same principal, so every sender shares anything that an agent keeps for the user rather than for the conversation.

:::warning
A System user entrypoint cannot ask a sender to authorize a tool, because a sender cannot complete an authorization on behalf of a system user. A tool that requires a delegated credential works there only with one that a person authorized for the system user, and every sender then acts through that one credential. Without such a credential, the tool fails with an error that the agent can pass on to the sender, and the entrypoint does not offer an **Authorize** button.
:::

## Revoking WhatsApp Access for a Person

A matched sender keeps acting as their Agent Mesh user for as long as the claims that Agent Mesh recorded at their last sign-in match. The entrypoint does not consult your identity provider when a message arrives. A change that you make in the identity provider, such as removing a number, takes effect only at the person's next sign-in.

:::warning
Disabling a person in your identity provider does not stop their WhatsApp messages from matching, because a disabled person never signs in again to replace the stored claims. A matched sender reaches that user's roles and delegated credentials, so revoke the stored claims when a person leaves, loses their phone number, or must no longer use WhatsApp. Their messages may still match for up to 5 minutes after you revoke the claims.
:::

A super administrator revokes the claims through the Platform service API. The following steps use the `sam api` command to call the API. For more information about the command, see [CLI Reference](../../../reference/cli.md).

1. Find the person's Agent Mesh user ID. The search matches part of a display name or an email address:

   ```bash
   sam api "/api/v1/platform/users?search=alice@example.com" --jq '.data[] | {id, email, displayName}'
   ```

2. Revoke the claims stored for that user, replacing the example ID with the `id` from the previous step:

   ```bash
   USER_ID=0198c5e2-4a1b-7c3d-9e8f-0123456789ab
   sam api -X DELETE "/api/v1/platform/users/${USER_ID}/identityClaims"
   ```

In the response, `revoked` counts the stored claims that Agent Mesh removed, and `bindingsReset` counts the cleared records that tie the person's numbers to the WhatsApp accounts that they arrived from. The person's WhatsApp messages stop matching within 5 minutes, the time that the Platform service may keep serving an earlier lookup result. If the person must keep WhatsApp access with a corrected number, update the number in your identity provider and have them sign in again.

## Troubleshooting

The following sections describe the most common sender identity issues and how to resolve them.

### Known Senders Receive a Sign-In Prompt

People who have Agent Mesh accounts receive the **Sign in** button, or a reminder to sign in, instead of a reply.

To resolve this issue, check the following items:

- The person signed in to the Agent Mesh UI after their number was added to the identity provider. Agent Mesh records claims only at sign-in.
- The person signed in with the account that carries their number, not with a different account.
- The identity provider issues the `phone_number` claim. To see the claims that Agent Mesh recorded for the person, find their user ID, and then run `sam api "/api/v1/platform/users/${USER_ID}/identityClaims"`. A `phone_number` row shows the stored digits and whether Agent Mesh treats the value as verified. For more information about finding the user ID, see [Revoking WhatsApp Access for a Person](#revoking-whatsapp-access-for-a-person).
- The stored number includes the country code and matches the number that the person messages from. At sign-in, the Platform service logs `identity claim stored but not usable for authorization` for a number that the provider marks unverified, or that is too short or too long to be an international number. A national-format number may pass that check and still never match, so compare the stored digits with the person's full international number.

### Senders Are Told to Contact Their Administrator

A sender receives a reply saying that their account could not be matched to an Agent Mesh user and asking them to contact their administrator for access. Signing in does not help.

To resolve this issue, find the refusal in the Entrypoint Executor logs and act on its cause:

- The log message `this sender's identity claim is held by more than one SAM user` means that two users hold the same number. The Platform service log `identity lookup refused: claim value matches multiple users` lists their user IDs. Correct the number in your identity provider and have both users sign in again, or revoke the claims of the user who no longer holds the number.
- The log message `the platform declined this identity lookup` means that the Platform service refused the match, and its own log names the reason. When that log says that the value `reached the entrypoint from a sender it did not before and is withheld`, the number now arrives from a different WhatsApp account. For more information, see [When a Number Moves to Another WhatsApp Account](#when-a-number-moves-to-another-whatsapp-account).
- The log message `whatsapp sender identity gate is unavailable` means that no sender lookup is available to the entrypoint, so it refuses every sender. The log line names the cause.

### Unmatched Senders Receive No Sign-In Button

A sender who matches no user receives a text reply about signing in instead of the **Sign in** button, and the reply either gives no address or gives the address as text.

To resolve this issue:

- Check the Entrypoint Executor startup logs for `no web UI address is configured`. That warning means that the Entrypoint Executor has no Agent Mesh UI address to send. In a Helm deployment, the chart sets the address from the values that define the deployment's public URL, such as `sam.dnsName`. For more information about these values, see [Core Agent Mesh Configuration](../../../reference/helm-values.md#core-agent-mesh-configuration).
- Check that the address uses HTTPS. The entrypoint sends the **Sign in** button only for an HTTPS address, and it sends any other address as text.

### Senders Are Told Their Account Does Not Share a Phone Number

A sender receives `This WhatsApp account doesn't share a phone number with us, so I can't tell who you are.` The sender has adopted a WhatsApp username, and Meta withholds their phone number.

To resolve this issue:

- Configure a **Contact Request Template** so that these senders can share their number in one tap. For more information, see [Senders Whose Number WhatsApp Withholds](#senders-whose-number-whatsapp-withholds).
- If you configured a template, check the Entrypoint Executor logs for `contact-share request undeliverable: the configured template was refused`. Meta rejects a template that is not approved, that still has a variable, or whose language code names no approved translation.
- If the sender tapped the share button but receives `I still don't have a phone number for you.` in reply to later messages, Meta is still withholding the number. Confirm that your business uses the Meta contact book.

### Senders Are Told They Do Not Have Access to the Agent

About 2 minutes after sending a message, the sender receives `You don't have access to the agent this conversation uses. Contact your administrator to request access.` The entrypoint identified the sender, but the sender cannot invoke the agent that the message was for. The entrypoint retries for about 2 minutes first, in case a temporary failure to look up permissions caused the refusal.

To resolve this issue:

- Grant the matched user, or the system user of a System user entrypoint, a role that can invoke the assigned agent. For more information, see [Managing Users and Roles](../../user-management/index.md).
- If the message started with an `@` mention, check that the mention names an agent that the sender can use. A leading mention that matches no available agent produces the same refusal.

## Next Steps

You have chosen how the entrypoint identifies senders, and you know how to revoke a person's access.

To create the entrypoint and connect it to Meta, follow the steps in [WhatsApp Entrypoints (Early Access)](./index.md).

To limit what a System user entrypoint can reach, create a custom system user whose roles grant only the agents that the entrypoint must reach. For more information, see [Machine Entrypoints and System Users](../../../administering/enabling-rbac.md#machine-entrypoints-and-system-users).

To manage the same entrypoint and its system user as version-controllable YAML, see [WhatsApp Entrypoints with the CLI](./cli.md).
