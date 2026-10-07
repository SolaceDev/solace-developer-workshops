---
published: true
title: Managing Users and Roles
description: Control what people can do in Agent Mesh from the User Management page by defining roles, granting them to users directly, and mapping them to identity-provider group claims.
sidebar_position: 1
---

# Managing Users and Roles

Agent Mesh decides what each person can do by resolving the set of *roles* they hold. A role is a named collection of *scopes*, and a scope is a single permission such as the right to invoke one agent. You manage all of this from the **User Management** page in the Agent Mesh UI.

This page covers the concepts behind roles and how to create and grant them from the Agent Mesh UI. To turn enforcement on in the first place, see [Enabling Role-Based Access Control (RBAC)](../../administering/enabling-rbac.md). To manage the same resources as version-controlled YAML, see [Managing Users and Roles with the CLI](./cli.md).

## How Access Resolves

Three things can give a user a role:

- A direct grant. You assign the role to one named person on the **Users** tab.
- A claim mapping. You map a value of an identity-provider (IdP) group claim to one or more roles on the **Claim Mappings** tab. Everyone whose token carries that value receives those roles.
- Agent Mesh configuration. An operator defines roles and assignments in YAML files that load when the deployment starts.

Agent Mesh combines roles from all three sources. A user holds every role that any source grants them. Ordering does not matter, and no source overrides another.

Default roles apply only when a user has no roles from any other source. If a user has even one role from a direct grant, claim mapping, or configuration, they do not receive default roles.

A role only grants access and never revokes it, so there is no deny rule to write, and a user who ends up with no roles can do nothing.

For the scope grammar itself, the full catalog of scopes Agent Mesh ships, and how to diagnose a specific denial, see [RBAC Reference](../../reference/rbac-reference.md).

## Prerequisites

You need the following before you start:

- A running Agent Mesh deployment. For more information, see [Install and Deploy](../../installing/index.md).
- Single sign-on configured. The **Users** tab lists the people who have signed in to your deployment, so a deployment with no real logins has an empty directory. For more information, see [Enabling Single Sign-On (SSO)](../../administering/enabling-sso.md).
- A signed-in account holding the super administrator grant, which authorizes every action in Agent Mesh. Every change on this page requires it. For more information about establishing the first super administrator, see [Common Scopes](../../reference/rbac-reference.md#common-scopes) in the RBAC Reference.

To open the page, select **User Management** in the navigation bar. It appears at the bottom, next to **User Account** and **Log Out**.

If you do not hold the super administrator grant, **User Management** does not appear, and browsing directly to its address returns you to the chat page. An administrator can also hide the page for everyone by setting `SAM_FEATURE_RBAC` to `false`, which leaves the underlying API and `sam config apply` working as before.

:::warning
On a deployment where no one has turned enforcement on:

- Every signed-in user resolves to the universal grant, which makes them a super administrator.
- Each of them sees **User Management** and can change any role.

The same applies when you disable authentication, because every request then runs as one built-in development identity that also holds the universal grant. Turn enforcement on before you rely on anything you configure here. For more information, see [Enabling Role-Based Access Control (RBAC)](../../administering/enabling-rbac.md).
:::

## Granting a Group of People Access to an Agent

The following example gives everyone in an identity-provider group access to a single agent. It creates a role, maps a group claim to that role, and then confirms that a member of the group now holds it. The same three steps cover most of what you do on this page.

### Step 1: Create the Role

1. Select **User Management** in the navigation bar, then select the **Roles** tab.

2. Select **Create Role**.

   The **Create Role** dialog box opens on its **Access** tab.

3. Enter a **Name** and a **Description**. For example:

   - **Name**: `research-users`
   - **Description**: `Invoke the web research agent.`

   The name can be up to 64 characters and the description up to 500.

4. In the **Agents** section, select **Add Agent**, then select an agent from the list. For example, select **Web Research Synthesizer**.

   The section heading becomes **Agents (1)** and the agent appears as a row with a remove button at the end.

   To grant every agent instead of naming them one by one, select **All Agents** at the top of the list. If you have already added individual agents, Agent Mesh asks you to confirm, because the wildcard replaces them.

5. (Optional) Select the **Scopes** tab to see what the role actually grants.

   The tab is read-only and lists every scope on the role. Adding one agent produces a single scope of the form `agent:<agentId>:invoke`.

6. Select **Create Role**.

   The role appears in the table with a **Type** of **Custom** and your address in the **Created By** column.

:::note
The role editor grants access to agents and workflows only. A role that needs any other permission, such as building agents, managing entrypoints, or running evaluations, has to come from Agent Mesh configuration or from [Managing Users and Roles with the CLI](./cli.md). You can still open such a role here, and the **Scopes** tab still shows every scope the role already holds.
:::

:::warning
The **Scopes** tab identifies each agent and workflow by its generated id, not by the name shown in the picker. Selecting an agent named `Web Research Synthesizer` produces a scope such as `agent:019f8b35-6281-79df-9a28-9437b64cfbf8:invoke`. A scope you hand-write from the display name instead silently matches nothing, and Agent Mesh reports no error. For more information, see [RBAC Reference](../../reference/rbac-reference.md).
:::

### Step 2: Map the Group Claim to the Role

1. Select the **Claim Mappings** tab, then select **Create Claim Mapping**.

2. Enter a **Name**, a **Claim Value**, and one or more **Roles**. For example:

   - **Name**: `research-group`
   - **Claim Value**: `engineering`
   - **Roles**: `research-users`

3. Select **Create Claim Mapping**.

   The mapping appears in the table, and everyone whose group claim carries that value now holds the role.

The dialog box has no field for which claim to read. The claim key is a single deployment-wide setting an administrator configures separately. Every mapping reads the same claim, and you cannot vary it per mapping.

:::warning
Agent Mesh compares claim values exactly, with no normalization. The **Claim Value** must reproduce what the token carries, including any leading slash or path prefix your identity provider emits, such as `/sam-engineering`. A value that differs only in case or in a prefix matches nobody, and Agent Mesh reports no error, because a mapping that matches nobody is indistinguishable from one whose group has zero members.
:::

:::warning
If no administrator has configured the claim key, the dialog box warns you and still saves the mapping. The mapping grants no roles until that key exists, so it appears to succeed while doing nothing.
:::

### Step 3: Verify the Result

Select the **Users** tab and find a member of the group. The **Roles** column lists the role you created.

The **Roles** column shows effective roles, which is everything the user holds from all three sources. The column includes roles the user receives through claim mappings, even if no one assigned those roles directly.

## Managing Roles

The **Roles** tab lists every role in the deployment. Filter by name, or filter by **Type** to narrow the list. The **Type** column records where a role comes from, and it determines what you can do with it:

| Type | Where It Comes From | What You Can Do |
|---|---|---|
| **Custom** | Created through the Agent Mesh UI or with `sam config apply` | View, edit, delete, and set as a default role |
| **System** | Loaded from an operator-managed YAML file when the deployment starts | View only |
| **Built-in** | Shipped with Agent Mesh | View and set as a default role |

Only **Custom** roles show a value in the **Created By** column. The others show a dash, because no user authored them.

Select **More** on any row to reach its actions. For a **Custom** role, the menu contains **Add to Default Roles**, **View**, **Edit**, and **Delete**. The first item is labeled **Remove from Default Roles** when the role is already a default. For a **System** or **Built-in** role, the menu contains **View** only. A **Built-in** role can still become a default role, but you select it in the **Manage Default Roles** dialog box rather than from its row.

### Deleting a Role

When you delete a role, Agent Mesh asks you to confirm and then removes the role permanently. Agent Mesh also removes every grant that references the role, so every user who holds it loses that access.

You cannot delete a role that is currently a default role. Remove it from the default set first, using either **Remove from Default Roles** on its row or the **Manage Default Roles** dialog box.

## Managing Default Roles

Default roles cover the person who matches nothing else, such as a new employee who signs in before anyone has assigned them anything.

1. On the **Roles** tab, select **Manage Default Roles**.

2. Select **Assign default roles to users with no other roles**.

3. Select one or more roles in **Default Roles**, then select **Save**.

The **Roles** table marks each role in the default set, so you can identify them without opening the dialog box.

:::note
**System** roles cannot be default roles, so they do not appear in the picker. **Custom** and **Built-in** roles both appear.
:::

:::warning
Agent Mesh ships one **Built-in** role, `sam_manager`. The role manages almost every part of Agent Mesh, including agents, workflows, connectors, entrypoints, skills, toolsets, models, evaluations, and analytics. It cannot manage access control. It can also invoke every agent and workflow, read the per-user content in analytics reports, read from and post to other users' notification inboxes, and change the settings for the Agent Mesh UI, including the system purpose that agents reached through it receive. Selecting it as a default role gives all of those permissions to every user who matches nothing else. Create a narrow **Custom** role for the default set instead.
:::

:::warning
Clearing the checkbox and saving does not necessarily leave unmatched users with no roles. It clears the set you manage here, and Agent Mesh then falls back to the `default_roles` list in the deployment configuration. On a deployment that sets `default_roles`, unmatched users keep receiving those roles. To leave them with no access, clear that configuration key as well. For more information, see [Enabling Role-Based Access Control (RBAC)](../../administering/enabling-rbac.md).
:::

## Managing Claim Mappings

The **Claim Mappings** tab is where you manage access by group rather than by person, which is usually less work to keep current. The table shows each mapping's **Name**, **Claim Value**, and **Roles**. Select **More** on a row for **View**, **Edit**, and **Delete**.

You can map each claim value only once. To grant several roles from one group, list them all in that mapping's **Roles** field rather than creating a second mapping for the same value.

When you delete a mapping, Agent Mesh asks you to confirm and identifies the mapping by claim value rather than by name, because the claim value is what identifies the mapping. The name is a label for your own use, and changing it does not repoint the mapping.

Both this tab and the **Edit User Roles** dialog box describe the roles you can select as custom roles, but **Built-in** roles are selectable as well. The rule that holds in both places is that **System** roles are not available, because Agent Mesh cannot modify a role an operator loads from a file.

## Managing Users

The **Users** tab lists the people who have signed in to your deployment. Filter by name or email, filter by role, or sort by the **User** column.

Agent Mesh adds a person to this directory the first time they sign in. Someone who has an account with your identity provider but has never signed in to Agent Mesh does not appear, so you cannot assign them a role from this page. To give access to people who have not signed in yet, use a claim mapping, which applies the moment they arrive, or grant the role with `sam config apply`. Agent Mesh stores that grant and applies it when the person first signs in. For more information, see [Managing Users and Roles with the CLI](./cli.md).

### Assigning a Role to One Person

1. Select **More** on the user's row, then select **Edit User Roles**.

2. Select the roles to grant, then select **Save**.

:::warning
This dialog box sets only the grants you make directly to the user. Roles from a claim mapping or from Agent Mesh configuration stay in effect and do not appear here, so clearing every role can leave a user with access after you appear to have revoked it. To revoke a role that comes from a claim mapping, remove the person from the group in your identity provider, which takes effect the next time their token is issued. Editing the mapping instead affects everyone whose claim carries that value, not just this person. To revoke one that comes from Agent Mesh configuration, an operator must change the YAML files. The **Roles** column in the table shows everything the user holds.
:::

### System Users

A system user is a principal that belongs to Agent Mesh instead of to your identity provider. It exists for automated processes, not for people who sign in. A machine entrypoint such as a webhook runs as one, so that requests arriving with no end-user identity still carry real permissions.

System users appear in this list with a **System User** badge, and the line under the name reads `Run as:` followed by the name an entrypoint points at. Their rows have no actions. A system user that you declare gets its roles from its configuration file, and the next `sam config apply` overwrites any edit you make here. The built-in `default` and `eval` system users are not declared in your configuration; their roles ship with Agent Mesh. To limit what an entrypoint can reach, declare a system user of your own. For more information, see [Machine Entrypoints and System Users](../../administering/enabling-rbac.md#machine-entrypoints-and-system-users).

## Seeing Who Can Reach an Agent or Workflow

To answer the reverse question, start from the resource rather than from this page. On the **Agent Management** page, select **More** on an agent's row and select **View Access**. The **User Access** dialog box lists the users who can invoke that agent, whether they receive that access directly or through a claim mapping. System users that can invoke the agent appear with a **System User** badge. The **Workflows** page offers the same action on a workflow's row. For more information about the Agent Management page, see [Creating Agents](../agents/index.md).

The list covers system users and people who have signed in. A person who has never signed in does not appear, even if a claim mapping grants them access when they first sign in.

## Defining Users and Roles as Code Instead

You can author everything on this page as version-controlled YAML and apply it with `sam config apply`, which suits GitOps and automation. That path also grants the permissions the role editor cannot express, such as building agents or managing entrypoints, and it is the only way to create a system user. For more information, see [Managing Users and Roles with the CLI](./cli.md).

## Next Steps

You control who can reach which agents. Most readers next want to widen or tighten that boundary:

- To author the same resources as version-controlled YAML, see [Managing Users and Roles with the CLI](./cli.md).
- To set the system user a webhook or event-mesh entrypoint runs as, see [Configuring Entrypoints](../entrypoints/index.md).
- To put real logins in front of the roles you just created, see [Enabling Single Sign-On (SSO)](../../administering/enabling-sso.md).
