---
title: Chatting with Agents
description: Use the chat interface to send messages to deployed agents, manage sessions, branch conversations, attach files, and download artifacts.
sidebar_position: 651
---

# Chatting with Agents

The chat interface is where you talk to the agents in your deployment. You send a message, the agent works on it, and the response streams back as the agent produces it. This page covers selecting an agent, sending messages, managing your sessions, attaching files, and working with the artifacts an agent produces. For an overview of the other activities in the application, see [Using Agent Mesh](./index.md).

## Selecting an Agent

The agent selector is the **Agent** drop-down list in the toolbar below the message box. Open it and select the agent you want to talk to. The list shows the display name of each agent in the deployment, so you can browse the available agents and pick the one whose skills match your task.

:::note
Switching agents starts a new chat. If the current chat already has messages, the Agent Mesh UI prompts you to confirm with the **Switch Agent** dialog before clearing the message history and any attached files.
:::

## Sending a Message

Type your message in the box at the bottom of the chat and click the **Send message** button, or press Enter. To add a line break without sending, press Shift+Enter.

While the agent is working, the **Send message** button becomes a **Stop** button. Click **Stop** to cancel the running task. The agent stops producing output, and you can send a new message.

Depending on how your deployment is configured, the message box supports two shortcuts:

- Start a message with `/` to insert a saved prompt from the prompt library. For more information about creating saved prompts, see [Managing Projects](./managing-projects.md).
- Type `@` anywhere in the message to mention a person.

## Working with Sessions

Each conversation is saved as a session so you can return to it later. For more information, see [Sessions](../concepts/sessions.md). Your sessions appear in the **Recent Chats** list in the side panel, most recent first. Select a session in the list to reopen it and continue where you left off.

To start a fresh conversation, click the **Start New Chat Session** button. A new, empty session opens, and the previous one stays in **Recent Chats**.

Each session in the list has an actions menu with the following options:

- **Rename**—Edit the session title inline.
- **Rename with AI**—Generate a title from the conversation content.
- **Move to Project**—Move the session into a project to group it with related work. For more information, see [Managing Projects](./managing-projects.md).
- **Delete**—Remove the session. The Agent Mesh UI prompts you to confirm with the **Delete Chat** dialog, because deleting a session also permanently removes the artifacts associated with it.

## Branching a Conversation

When you open a session that someone has shared with you, or a session you collaborate on with others, you can save your own copy and continue privately. Click **Continue in New Chat** in the chat header. The Agent Mesh UI copies the conversation, including its history, into a new session in your own **Recent Chats**, where you can keep working without changing the original.

## Attaching Files

To give an agent a file to work with, click the **Attach** button next to the message box. Depending on your configuration, you can either upload a file from your computer or attach an existing artifact from the deployment:

- **Upload from computer**—Select one or more files from your device.
- **Attach existing artifact**—Select an artifact that an agent produced earlier.

You can also drag files onto the message box, or paste a file or a large block of text directly into it. Attached files appear as cards above the message box; remove one before sending if you change your mind. Send the message to make the files available to the agent.

## Working with Artifacts

An artifact is a file an agent produces, such as a generated document, image, or dataset. For more information, see [Artifacts](../concepts/artifacts.md). Artifacts for the current session appear in the **Files** tab of the side panel.

Select a file in the **Files** tab to open a preview. The preview renders common formats inline, including images, PDFs, CSV data, and Markdown. To save a copy to your device, click the **Download** button.

When an agent updates an artifact, the Agent Mesh UI keeps each version. If a file has more than one version, a version drop-down list appears in the preview; select a version to view it. Click **Download** to save the version you are viewing.

## Sharing a Session

You can share a read-only view of a session with other people. Click the **Share** button in the chat header to open the **Manage Access** dialog. From there you have two ways to share:

- Select **Copy Sharing Link** to create a link that anyone in your organization can use to view the conversation in a read-only mode, including its files and history.
- Enter a person's email address to grant them access directly. Shared access is read-only: recipients can view the conversation but cannot send messages in it.

People who view a shared session can save their own copy to continue the conversation, as described in [Branching a Conversation](#branching-a-conversation).

## Giving Feedback

When feedback collection is enabled for your deployment, each agent response has a **Like** and a **Dislike** button. Select one to rate the response. The Agent Mesh UI then asks what you liked or disliked, and you choose whether to let administrators view the conversation content along with your feedback.

You can also click the **Copy to clipboard** button on any message to copy its text.

## Related Topics

- To follow a task step by step while an agent works on it, see [Monitoring Activity](./monitoring-activity.md).
- To group sessions into projects and set up saved prompts and scheduled tasks, see [Managing Projects](./managing-projects.md).
