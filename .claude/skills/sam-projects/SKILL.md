---
name: sam-projects
description: Use when a user wants an assistant to answer from their OWN uploaded documents with no code — "upload my PDFs/policies so the assistant can answer from them", creating or setting up a Project, uploading files to a project, "why isn't my project using my documents / the assistant ignores my files", the project Instructions field or default-agent settings, or choosing between a Project and a knowledge_base connector. Covers the WebUI Projects feature (the document workspace), NOT the `sam config` declarative-config directory (also historically called a "project").
version: dev
---

# sam-projects

**Scope check:** this skill covers **Projects** — the SAM WebUI feature where a user uploads documents and an assistant answers from them. To control an agent's tone / rules / behavior see `sam-author-agent`; for cloud-managed (Amazon Bedrock) document RAG see `sam-connectors` (knowledge_base); for the `sam config` directory of declarative YAML (also called a "project") see `sam-declarative-config`.

## What a Project is

A **Project** is a document workspace in the WebUI: a user uploads files, SAM indexes them automatically, and an assistant answers questions grounded in them — **no code, no cloud setup.** It's the primary no-code way to put "a pile of my own documents" behind an assistant.

Projects are a **WebUI + REST feature — there is no `sam` CLI command** for them. The deployment must have **persistence configured** (a database); on a no-persistence dev setup the Projects surface is unavailable. Governed by `SAM_FEATURE_PROJECTS` (on by default).

## The flow (all in the WebUI)

1. **Projects** → create a project (name + optional description).
2. **Knowledge** section → upload files. SAM **automatically** builds a search index in the background — wait for the "processing" indicator to finish. Until it does, the assistant can't search those files yet.
3. **Default agent** → pick the agent new chats in the project start with (still switchable per chat).
4. Start a chat **inside the project** and ask. The assistant gets a built-in search over the uploaded files and answers from them.

## What you can upload

Indexed for search: **PDF, Word (`.docx`), PowerPoint (`.pptx`)**, and text formats (Markdown, CSV, JSON, XML, YAML, HTML, plain text, …). Default limit **10 MB per file** (the deployment can raise it). A **scanned-image PDF with no text layer won't index** — there's no text to extract. Other binary types may upload but aren't searched.

## Two settings that look like they work but DON'T (today)

- **The project "Instructions" field does NOT change how the assistant answers** (in current builds). It is stored and shown in the UI — and its own helptext claims it "will guide the AI" — but it is **not wired into the assistant's instructions at runtime**, so setting tone, refusals, or a standing disclaimer there has **no effect**. (If unsure whether a build has changed this, test it — don't assume it works.) To control behavior, put those instructions in the **agent's own instruction** (→ `sam-author-agent`), not the project. Never tell a user the project Instructions field customizes the assistant.
- **The "default agent" is a convenience default, not a hard binding** — it's the agent new chats in the project open with; the user can change it per chat. Don't describe it as "the project forces this agent."

## "The assistant isn't using my documents" — check, in order

1. **Indexing still running (or never ran).** Uploads index asynchronously — wait for "processing" to finish. If it never starts, the files may all be non-indexable types.
2. **Unsupported / empty-text file.** Scanned-image PDFs, images, or odd binaries yield no searchable text. Re-add as a real PDF / Word / text file.
3. **The chat isn't in the project.** A generic new chat isn't scoped to the project — start the chat from inside the project.
4. **Search is keyword-based (BM25), not semantic.** If the question's wording is very different from the document text, it may not match. Use words closer to what the documents actually say.
5. **Indexing disabled / no persistence.** Project search needs indexing enabled (`SAM_FEATURE_PROJECT_INDEXING`, on by default) and the deployment's persistence configured.

Don't invent a tool name (e.g. a `customerdocuments_*` tool seen in the environment) — project search is a built-in capability over the project's own index, not a separate connector or MCP tool.

## Project vs. knowledge_base connector

Both let an assistant answer from documents — pick by infrastructure, not by feature envy:

| | **Project** | **knowledge_base connector** |
|---|---|---|
| Where docs live | SAM's own artifact storage | **Amazon Bedrock** (cloud) |
| Indexing | Automatic, local — BM25 keyword | Bedrock-managed vector RAG |
| Setup | Upload in the UI — no cloud | Needs an AWS account + a Bedrock Knowledge Base |
| Best for | No-code, no-cloud, your own files | Teams already on Bedrock / large managed KBs |

**No cloud setup wanted → Project.** Already running a Bedrock Knowledge Base → the `knowledge_base` connector (→ `sam-connectors`).

## Sharing & moving

A project is **owner-private by default**. When project sharing is enabled in the deployment, share with teammates as **owner / editor / viewer**. A project — its files plus settings — can be exported and imported as a ZIP.
