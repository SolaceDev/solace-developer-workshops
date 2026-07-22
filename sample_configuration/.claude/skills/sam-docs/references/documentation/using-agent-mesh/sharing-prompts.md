---
title: Sharing Prompts
description: "Share a saved prompt with colleagues: select Viewer or Editor access, and manage or revoke access when the prompt is no longer needed."
sidebar_position: 653.5
---

# Sharing Prompts

When you share a saved prompt, the prompt appears in your colleagues' libraries alongside their own. You grant access per recipient by email, and you select whether each recipient can use the prompt only (Viewer) or also edit it (Editor). This page covers sharing a prompt, what recipients see, and managing or revoking access.

For the underlying Prompts feature (creating, using, and organizing saved prompts), see [Prompts](./prompts.md).

## Before You Begin

Prompt sharing requires that your administrator has enabled the feature for your deployment. If the **Share** control does not appear on your prompts, ask your administrator to enable prompt sharing. No RBAC scope is needed to share prompts you own. For the full role-based access control (RBAC) scope reference, see [RBAC Reference](../reference/rbac-reference.md).

## Access Levels

Each recipient of a shared prompt holds one of three access levels. The owner is the user who created the prompt.

| Level | Insert into a chat | Save a new version | Share with others | Revoke shares |
|---|---|---|---|---|
| Viewer | Yes | No | No | No |
| Editor | Yes | Yes | No | No |
| Owner | Yes | Yes | Yes | Yes |

## Share a Prompt

To share a prompt, perform these steps:

1. Open the prompt from your **Prompts** library.
2. Select **Share** on the prompt's menu. The **Share Prompt** dialog opens.
3. Enter one or more email addresses in the **Add people** field. To add several at once, paste a comma-separated list.
4. For each recipient, select the access level from the drop-down list: **Viewer** or **Editor**.
5. Select **Save**.

The recipients now see the prompt in their own Prompts library, and can insert it into a chat immediately.

## What Recipients See

A shared prompt appears in the recipient's library alongside their own prompts. The owner's identity stays attached to the prompt, so the recipient can tell it is shared rather than one of their own.

- **Both Viewers and Editors** can insert the prompt into a chat using the slash-command described in [Using a Saved Prompt](./prompts.md#using-a-saved-prompt).
- **Editors** can save new versions of the prompt. The version history records who made each change, so the owner can trace who edited what.
- **Only the owner** can delete the prompt or manage its sharing.

## Manage and Revoke Shares

To change access, perform these steps:

1. Open the prompt and select **Share**.
2. In the recipient list, change a recipient's access level from the drop-down list, or select the delete icon on their row to remove access entirely.
3. Select **Save**.

Removing a recipient revokes their access immediately. The prompt disappears from their library on their next refresh.

Deleting the prompt itself removes all shares along with it. Recipients no longer see the prompt at all.

## Related Topics

- To create, use, and organize saved prompts, see [Prompts](./prompts.md).
- To share a project's documents, instructions, and chats instead of an individual prompt, see [Share a Project](./managing-projects.md#share-a-project).
- For the full RBAC scope reference, see [RBAC Reference](../reference/rbac-reference.md).
