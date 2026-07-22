---
title: Managing Projects
description: "Create projects to ground an agent in your own documents, give a project its own instructions and default agent, and work with saved prompts from the Agent Mesh UI."
sidebar_position: 652
---

# Managing Projects

A project is a workspace in the Agent Mesh UI where you put your own documents behind an agent. You upload files, Agent Mesh indexes them automatically, and an agent answers your questions grounded in their contents, with no code and no cloud setup. A project also carries its own instructions and a default agent, so every chat you start inside it begins with the right context.

This page also covers a companion Agent Mesh UI feature that helps you re-use work with agents: **saved prompts**. Unlike documents, prompts are not stored inside a project; they live under **Assets** in the sidebar, but they are part of the same day-to-day workflow, so they are documented together here. For scheduled agent runs, see [Scheduling Tasks (Experimental)](./scheduled-tasks.md).

Everything on this page happens in the browser; there is no CLI command for any of it. This page is for all users, and especially for Cloud users, who work with Agent Mesh entirely through the Agent Mesh UI.

Projects require your deployment to have persistence (a database) configured. On a local development setup with no persistence, or in a deployment where an operator has turned the feature off, the **Projects** entry does not appear in the sidebar.

## What a Project Is

A project answers a single need: to let an agent answer from your own files. You create a project, upload a body of documents into it, and then chat inside the project. The agent gets a built-in search over the project's documents and uses it to ground its answers.

Search is keyword-based: the agent matches the words in your question against the words in your documents. Phrase questions using terms close to what the documents actually say.

A project is different from an agent. The agent supplies the behavior: its tone, its rules, the tools it can call. You configure that behavior on the agent itself. For more information, see [Creating Agents](../building/agents/index.md). The project supplies the documents the agent searches, an optional set of instructions layered on top, and the default agent new chats open with.

## Create a Project

To create a project, perform these steps:

1. In the left navigation sidebar, open **Projects**.
2. Select **Create New Project**.
3. Give the project a **name** (required). A **description** is optional; you can add or change it later.
4. Select **Create Project**.

The project opens to its workspace. Everything else (the instructions, the default agent, and the documents) you add here, not in the create dialog.

## The Project Workspace

An open project has two areas:

- **Chats** — the conversations you have started inside this project, and a button to start a new one.
- **Context** — what every chat in the project carries with it, in three sections: **Instructions**, **Default Agent**, and **Knowledge**.

From the workspace header you can **Edit Details** (change the name and description), **Share** the project (when sharing is enabled), and delete it. If you are not the project's owner, the editing controls are hidden and you work with the project read-only.

## Add Documents to a Project

Upload your files in the project's **Knowledge** section. You can drag files onto the drop zone or select **Upload File**, then add an optional description for each file to help the agent understand its purpose.

Agent Mesh builds a search index over your documents in the background. While it works, the workspace shows a **Processing project files for faster access...** banner, and the editing controls are disabled until it finishes. Wait for processing to complete before asking questions. Until indexing finishes, the agent can't search a freshly uploaded file.

Agent Mesh indexes these formats:

- PDF documents.
- Microsoft Word (`.docx`) and PowerPoint (`.pptx`).
- Text formats: Markdown, plain text, CSV, JSON, XML, YAML, and HTML.

The default limit is 50 MB per file; your deployment can change it via `gateway_max_upload_size_bytes`. You can upload other file types (an image or an archive, for example), but they are stored without being indexed, so the agent can't search their contents. A scanned-image PDF with no text layer can't be indexed, because it has no text to extract. Re-add the content as a real PDF, Word, or text file.

If the agent isn't using your documents, check these items in order:

1. Indexing is still running, or never started. Wait for processing to finish, and confirm the files are an indexable type.
2. The file has no extractable text (a scanned-image PDF or an image). Re-add it in a text-bearing format.
3. The chat isn't scoped to the project. Start the chat from inside the project, not from a generic new chat.
4. The wording is too far from the document text. Rephrase using words the documents use.

## Set the Instructions

A project's **Instructions** are a block of guidance carried into every chat started in the project: a place to set standing direction such as a persona, a preferred answer format, or rules about which documents to trust. Select **Edit** in the **Instructions** section to write them. The instructions are separate from the agent's own configured behavior; they layer the project's context on top of whichever agent runs.

## Set a Default Agent

A project has a default agent: the agent that new chats started in the project open with. The default is a convenience; you can still switch the agent on any individual chat. In the **Default Agent** section, select **Edit**, then select the agent best suited to the project's documents and the questions you expect to ask. If you leave it unset, new chats start with no agent preselected.

## Chat in a Project

From the **Chats** section, select **New Chat** (or open an existing project chat). The agent searches the project's indexed documents and answers from them, with the project's instructions and default agent already applied. Because the chat is scoped to the project, you don't need to attach files to each message; the whole project's knowledge is available throughout the conversation, and a badge in the chat shows which project is active.

For everything else about the chat interface (sessions, attachments, and artifacts), see [Chatting with Agents](./chatting.md).

## Share a Project

A project is private to its owner by default. When project sharing is enabled in your deployment, the project owner can select **Share** and grant other people **Viewer** access by email, giving them read access to the project's documents, instructions, and chats. Only the owner can manage sharing.

## Export and Import a Project

You can export a project's documents, instructions, and default-agent setting as a single ZIP file to move it between deployments or hand it to a colleague.

- To export, open a project's menu on the **Projects** page and select **Export Project**. The browser downloads a ZIP.
- To import, select **Import Project** on the **Projects** page and select a previously exported ZIP. Agent Mesh shows a preview, lets you adjust the new project's name, and rebuilds the search index after import.

The export does not include chat history; only the project's documents and settings travel with the ZIP.

## Saved Prompts

The **Prompts** area, under **Assets** in the sidebar, is where you keep prompts you use repeatedly. Save a prompt once and re-use it across conversations instead of retyping it each time, which is useful for standard questions, recurring report requests, or any instruction you send often.

A saved prompt has a name, an optional description and category, the prompt text itself, and an optional chat shortcut you can type to drop the prompt straight into a new chat. Prompts keep a version history and, when prompt sharing is enabled, can be shared with your teammates. For the full sharing workflow, see [Sharing Prompts](./sharing-prompts.md). Prompts are stored per user and are not tied to any one project.

## Project or Knowledge Base Connector?

Both a project and a `knowledge_base` connector let an agent answer from documents. Select by your infrastructure:

- Use a **project** when you want a no-code, no-cloud workspace for your own files, indexed locally by keyword search.
- Use a **`knowledge_base` connector** when your team already runs an Amazon Bedrock Knowledge Base and wants managed vector search over a large corpus. For more information, see [Amazon Bedrock Connectors](../building/connectors/amazon-bedrock/index.md).

## What Next?

You have just learned how to ground an agent in your own documents and automate your work with it. Next, you might want to watch those tasks run and trace their results. For more information, see [Monitoring Activity](./monitoring-activity.md).
