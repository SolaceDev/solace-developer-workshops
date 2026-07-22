---
title: Prompts
description: "Save, organize, and re-use prompts across conversations from the Agent Mesh UI."
sidebar_position: 653
---

# Prompts

A **saved prompt** is a piece of text you use with agents often enough that you do not want to retype it every time. You save it once, and afterward you insert it into any chat with a keystroke. Saved prompts are useful for standard questions, recurring report requests, project-specific rules you want to hand the agent up front, or any instruction you send repeatedly.

Saved prompts live in the **Prompts** area under **Assets** in the sidebar. They are stored per user and are not tied to any one project. This page covers creating, using, organizing, and sharing saved prompts.

## Creating a Saved Prompt

You can create saved prompts in two ways: from a plain-language description with AI assistance, or by filling in the form yourself.

To create a prompt with AI, perform these steps:

1. In the sidebar, open **Assets** and select **Prompts**.
2. Select **Build with AI**. The **Create Prompt** dialog opens.
3. In the **Describe your task...** field, describe the prompt you want in plain language, or paste an existing prompt and let the AI convert it into a reusable template. Suggestion chips at the bottom of the dialog offer a starting point (for example, "Summarize a document", "Write me an email", "Translate code").
4. Select **Generate**. The AI drafts the prompt, and you can continue the conversation to refine the name, description, content, or variables until the draft matches what you want.
5. Save the prompt when you are satisfied.

To create a prompt manually, perform these steps:

1. In the sidebar, open **Assets** and select **Prompts**.
2. Select **Create Manually**.
3. Give the prompt a **name** (required). Add an optional **description** and **category** to help you find it later.
4. Write the **prompt text** you want to re-use.
5. Optionally, set a **chat shortcut**, a short string you can type into the chat to insert the prompt. The shortcut must be unique across your saved prompts.
6. Select **Save**.

The prompt now appears in your Prompts list, ready to re-use.

## Using a Saved Prompt

You can insert a saved prompt into a chat in two ways:

- **From the prompt list.** Open **Prompts**, find the prompt you want, and select **Use**. The Agent Mesh UI opens a new chat with the prompt already in the message box.
- **From the chat shortcut.** In any chat, type `/` in the message box to open the prompt picker. Start typing the prompt's name or its shortcut, and select the match. The Agent Mesh UI inserts the prompt text at the cursor, so you can edit it before sending.

After the prompt text is in the message box, you can edit it inline: substitute placeholder values, add follow-up instructions, or trim parts you do not want to send this time.

## Editing a Saved Prompt

To change an existing prompt, open it from the Prompts list and select **Edit**. You can update the fields directly, or select **Edit with AI** to describe the change in plain language and have the AI update the prompt for you. Refinements happen in the same multi-turn chat surface as **Build with AI**, so you can iterate until the prompt is right.

## Organizing Prompts

Your Prompts list supports search by name and description, and filters by category. Use the **category** field to group related prompts, for example, one category for research prompts, another for report templates, another for project-specific standing rules.

Each saved prompt keeps a version history. When you edit and save a prompt, the Agent Mesh UI records the previous version. Open the prompt's history to review earlier versions, compare them, or roll back to a previous version.

## Sharing Prompts

When prompt sharing is enabled for your deployment, you can share a saved prompt with colleagues by email and specify whether each recipient gets Viewer or Editor access. For the full workflow, including how the operator enables the feature and what recipients see, see [Sharing Prompts](./sharing-prompts.md).

If the **Share** control does not appear on your prompts, prompt sharing is turned off for your deployment. Ask your operator to enable it.

## Related Topics

- To insert saved prompts from the chat window, see [Chatting with Agents](./chatting.md).
- To scope prompts to a body of documents rather than share them across every chat, see [Managing Projects](./managing-projects.md).
