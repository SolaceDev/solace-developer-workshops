---
published: true
title: What Is an Entrypoint?
description: "An introduction to entrypoints in Agent Mesh: what they are, how they connect external surfaces to agents, and the entrypoint types available."
sidebar_position: 530
---

# What Is an Entrypoint?

An *entrypoint* is how people and other systems reach agents. Every request into Agent Mesh comes in through an entrypoint: a message you type in the Agent Mesh UI, a Slack post that `@`-mentions the bot, an email that lands in a monitored mailbox, or an event that arrives on an event broker topic.

The entrypoint translates the external transport's protocol on one side (HTTP for the Web UI, Slack Events for Slack, IMAP, and SMTP for email, and so on) into the Agent Mesh internal shape on the other. It authenticates the caller, ties them to a conversation, translates the incoming request into a task addressed to an agent, and streams the agent's response back through the same transport.

## The Entrypoint Types

Agent Mesh ships eight built-in entrypoint types. Each handles one external transport.

| Entrypoint | What it fronts |
|---|---|
| Web UI | The browser chat UI, over HTTP and Server-Sent Events. |
| Slack | Slack Events API for `@`-mentions in channels and direct messages. |
| Teams | Microsoft Teams via the Bot Framework. |
| Email | IMAP inbound, SMTP outbound. Turns an email thread into a session. |
| Model Context Protocol (MCP) | Exposes agents as tools to external MCP clients (for example, Claude Desktop or Claude Code). |
| Event mesh | Subscribes to event broker topics to trigger agents from events instead of user messages. |
| Webhook | Inbound HTTP requests from external systems (GitHub, CI pipelines, IoT platforms, and similar). Routes each request to a target agent or workflow and returns `202 Accepted` without waiting for a result. |
| WhatsApp (Early Access) | 1:1 WhatsApp chats through the Meta WhatsApp Business Cloud API. Identifies each sender through an identity provider claim, or runs every message as one system user. |

You do not have to select just one. A single deployment can run several entrypoints at once, all pointing at the same set of agents. Each incoming request looks the same to the agent regardless of which entrypoint minted it.

## What Every Entrypoint Handles

Different transports share the same responsibilities:

- **Authentication.** The entrypoint is the trust boundary. It verifies who the caller is before anything reaches an agent: an OpenID Connect (OIDC) login for the Web UI, a Slack bot token, an email Domain-based Message Authentication, Reporting, and Conformance (DMARC) check, or an MCP OAuth flow.
- **Sessions.** The entrypoint derives a session key from whatever the transport offers (a browser cookie, a Slack thread, an email thread, an MCP identity) so a follow-up message lands in the same conversation.
- **Authorization.** When the runtime uses role-based access control, the entrypoint resolves the caller's roles into scopes and stamps them on the outgoing task. Agents and tools honor those scopes.
- **Translation.** Each transport-specific shape (an HTTP body, a Slack event, an email MIME structure, an MCP request) becomes a standard Agent-to-Agent (A2A) task on the way in, and the entrypoint renders the agent's response back into that shape on the way out.

:::note
**Webhook Diverges from the Shared Model**

The Webhook entrypoint is asynchronous and sessionless. Each inbound HTTP request is a standalone, one-shot task that neither derives nor continues a session. The entrypoint replies with `202 Accepted` before the agent begins work, and Agent Mesh logs the agent's final response but never returns it to the caller. That model suits event-driven pipelines and high-volume notification streams where the sender does not wait for a result. Because the caller receives no output, the outcome of a webhook task is whatever the agent does through its own tools and connectors, such as commenting on the pull request that triggered it. For more information, see [Webhook Entrypoints](../building/entrypoints/webhook/index.md).
:::

## How You Add an Entrypoint

Like agents, entrypoints are configuration. You do not write code to ship one. You supply the credentials the transport requires (a Slack bot token, an IMAP mailbox, an MCP issuer URL), the identifier of the default agent to route messages to, and any per-transport behavior knobs. The Web UI entrypoint is enabled by default. Adding another entrypoint means adding another entry in your configuration.

## What Next?

- [Configuring Entrypoints](../building/entrypoints/index.md) walks each entrypoint type end to end: credentials, session keying, and authorization.
- [What Is an Agent?](./what-is-an-agent.md) covers the other side of the picture: what an entrypoint routes traffic to.
- [Architecture Overview](./architecture.md) shows how entrypoints fit alongside the Agent-Workflow Executor and the Secure Tool Runtime.
