---
title: Try Agent Mesh Desktop
description: Install the desktop bundle, launch the single-process Agent Mesh, and chat with the bundled agents end-to-end in about five minutes.
sidebar_position: 2
---

# Try Agent Mesh Desktop

The desktop bundle is the fastest way to feel Solace Agent Mesh on your own machine. It is a single native application that collapses the three runtime workload classes — the **Agent-Workflow Executor (AWE)**, the **Gateway Executor (GWE)**, and the **Secure Tool Runtime (STR)** — plus an in-memory broker into one process. Launching it opens a chat UI with a pair of bundled agents already running — nothing to install on the side, no shell session to keep alive, no broker to provision.

This page is for evaluators who want to see a real agent respond to a prompt. It is not a deployment story; for that, see Build your first project and the rest of Installing and Configuring.

## Prerequisites

You need an LLM API key for at least one provider and a confirmed outbound HTTPS path to that provider. See Before you begin for the full checklist — broker decisions, network reachability, and where the environment variables that hold credentials will live. The desktop bundle uses the in-memory broker, so you can skip the broker procurement section.

The desktop bundle currently runs on macOS (Apple Silicon and Intel), Windows (x86_64), and Linux (x86_64 and ARM).

## Install the Desktop Bundle

Follow the per-platform download and install steps in Install → Desktop bundle, then come back here for the API-key setup and first-launch walkthrough.

:::note
Desktop installers ship in an upcoming release. If you do not see them on the releases page yet, check back shortly, or start with the CLI install path in the meantime — the rest of this page applies once the bundle is installed.
:::

## Set Your LLM API Key

The desktop bundle reads the provider-specific environment variable that matches the model you choose. For example, with Anthropic Claude as the model provider, `ANTHROPIC_API_KEY` is the variable the runtime reads. Two ways to make it available to the bundle:

- **Exported in the shell that launches the binary.** Works on Linux, and on macOS or Windows if you start the application from a terminal.
- **In a local `.env` file** next to where you launch from. The first-launch onboarding wizard detects keys it finds there. Works in any platform's GUI launcher.

For other providers (OpenAI, Google Vertex AI, AWS Bedrock, Azure OpenAI, Ollama), set the corresponding variable from the LLM provider reference.

Environment variables exported in the shell that launches the binary are inherited — that covers Linux, and macOS or Windows when you start the binary from a terminal. Launching the macOS `.app` bundle from Finder or the Windows MSI-installed shortcut from the desktop does **not** inherit shell variables; in that case the first-launch onboarding flow takes over. The wizard detects any LLM keys it finds in the process environment or a local `.env` file, asks you to confirm the provider, picks a model, and persists the choice to the user-config directory described below.

## First Launch

Launch the application. A native window opens to a chat surface with the welcome screen — the bundled assistant agent greets you and offers a small set of starter prompts you can click to send. The chat history and session list sit in a sidebar on the left; the chat thread fills the centre; the message-entry field is the strip at the bottom of the window.

Two agents are running inside the bundle from the moment the window opens:

- The **default assistant** — the conversational entry point that the welcome screen drops you into.
- The **builder agent** — a second agent specialised for authoring new agents and workflows. You can switch to it from the agent picker in the chat header once you have something to build.

On first launch the bundle walks you through a short onboarding flow that asks which LLM provider you want to use and confirms the API-key environment variable is set. The choice is persisted to the user-config directory, so subsequent launches skip onboarding.

That directory is where configuration, the bundled skill library, the SQLite session store, and the application log live — `~/.config/sam` on Linux, `~/Library/Application Support/sam` on macOS, `%USERPROFILE%\.sam\` on Windows. Set `SAM_HOME` to override. The exact path is printed to the app log on first launch. Closing the window stops the whole bundle (AWE, GWE, STR, in-memory broker, and both agents).

## Verify One Task Ran End-To-End

The fastest verification is to send a prompt and watch the reply stream back:

1. Click one of the starter prompts on the welcome screen, or type your own message into the chat entry field at the bottom of the window.
2. Press Enter.
3. Watch the reply stream in token by token. A streaming response that completes without an error banner means the gateway routed the task, the agent picked it up, the LLM provider answered, and the response made it back through the gateway to the UI.

To confirm the task touched the runtime end-to-end (and not just the LLM API), ask the agent something that exercises a tool — for example, "What is the current time?" The default assistant has tools wired in and will call one before answering. The chat surface shows tool-call status updates inline, so you should see a brief "calling tool…" line before the final reply.

If you do not see a response within a few seconds, the most common causes are:

- The LLM API key is missing or has expired — the log file in the user-config directory records the provider error.
- The outbound HTTPS path to the LLM provider is blocked — check the egress proxy notes in Before you begin.
- The selected model is not available in your account's region — re-run onboarding (delete the persisted settings file under the user-config directory, then relaunch) and pick a model the key can reach.

## What You Have, and What You Do Not

The desktop bundle is one process with an in-memory broker and a small bundled toolset. That makes it perfect for a five-minute preview and risky for anything else:

- **What works**: chat in real time, see a streaming reply, observe a tool call inline, browse session history, switch between the bundled agents.
- **What does not**: persisting state across machines, multi-tenancy, RBAC, observability dashboards, scheduled tasks against a real broker, distributing agents across hosts. Those need a real broker and the deployed topology in Deploy options.

If the desktop bundle answers a prompt, you have proven that the runtime, the gateway, an agent, and an LLM provider all talk to each other on your laptop. Everything else in the documentation builds on that foundation.

## What Next?

You have Agent Mesh responding to a prompt in a single process on your laptop. Most readers next want to build something that is *theirs* — their own agent, against their own LLM key, that they can edit and re-run. See Build your first project.
