---
name: sam-entrypoints
description: Use when making Solace Agent Mesh agents reachable from outside — chatting with agents from Slack or Microsoft Teams, exposing agents as MCP tools to Claude Code/Cursor/other MCP clients, triggering agents or workflows from Solace event mesh topics, email- or WhatsApp-driven tasks, or securing an entrypoint with OAuth/OIDC (Keycloak, dynamic client registration, PKCE) — and when creating, deploying, or troubleshooting entrypoints. Not for the agent reaching OUT to external systems (sam-connectors no-code, sam-tools-and-skills custom code), authoring the agent itself (sam-author-agent), or the built-in web chat UI, which needs no entrypoint setup.
version: main-v2.249.1-dirty
---

# sam-entrypoints

This skill creates and manages SAM **entrypoints** — the inbound front doors that let external users, systems, and events reach your agents. **Scope check:** if the *agent* reaches out (posts to Slack, sends email, queries a database, publishes to the mesh), that is a *connector* → `sam-connectors` (or custom code → `sam-tools-and-skills`). The same external system often exists on both sides — direction decides. The built-in web chat UI is not an entrypoint you create; it ships with the product.

## What an entrypoint is

A platform-managed resource: name, **slug** (immutable, URL-stable, lowercase, 3–63 chars), type, and type-specific config. Every HTTP-bearing entrypoint lives under `/gw/<slug>/…` on the entrypoint proxy (default port 8800) — the slug being immutable is what keeps externally registered URLs (IdP redirect allowlists, Meta/Teams webhooks) stable. Create-or-update can deploy in the same step; deleting auto-undeploys first. Deployment status (`deployed` / `not_deployed` / `deploy_failed`) and runtime status are visible in the UI.

## Picking the type

| The outside thing reaching in | Type | Availability |
|---|---|---|
| People chatting from Slack channels/DMs | `slack` | GA — **Socket Mode only** (no public URL needed) |
| People chatting from Microsoft Teams | `teams` | GA — Bot Framework webhook (needs public URL) |
| Broker events triggering an agent or workflow | `event_mesh` | GA |
| MCP clients (Claude Code, Cursor…) calling your agents as tools | `mcp` | Early access |
| Emails creating tasks | `email` | Experimental — `SAM_FEATURE_EMAIL_GATEWAY` |
| WhatsApp messages | `whatsapp` | Experimental — `SAM_FEATURE_WHATSAPP_GATEWAY` |

Experimental types are hidden from the UI and creation APIs until the operator sets the flag (existing instances keep working). Say this plainly — never present a gated type as GA. The web chat UI (`httpsse`) is built-in infrastructure, not a type you pick.

## Paths, in teaching order

1. **Builder UI** (default). WebUI → **Entrypoints** → Create: pick the type, fill the schema-driven form, toggle deploy-on-save. The UI also gives you a **YAML preview** (secrets redacted), **networking details** (the public webhook URL inbound types need), and for email a live **test connection**. Lead with this — it is the source of truth for which fields exist.
2. **Declarative config** — an entrypoint is its own resource kind, authored via the **`sam-declarative-config`** skill (`sam config plan` / `apply`). **That skill is the only source of full YAML — this skill names types and field names only.** `sam config pull` on a UI-created entrypoint is the fastest schema oracle.
3. **Raw runtime YAML** — escape hatch only (debugging, parity). Never the headline.

## Routing inbound traffic to an agent

Each type has one routing mechanism — don't invent others: Slack/Teams/WhatsApp route by `default_agent_name` (Slack and WhatsApp also honor an inline `@AgentName` mention); the event-mesh entrypoint routes per **event rule** (target agent *or* workflow); the MCP entrypoint routes by which tool the client called. Chat threads map to SAM sessions automatically.

## Hard rules (each counters an observed failure)

- **Go product, Go patterns.** Entrypoints are first-class platform resources with a real UI — never `sam plugin add`, never `sam-slack`/`sam-event-mesh-gateway` plugins, never hand-built `apps:`/`app_config:` files as the taught path.
- **Never write entrypoint YAML from memory** — not even "illustrative, verify the keys" sketches; users paste them. UI, `sam-declarative-config`, or `sam config pull`. Under time pressure that *is* the fast path — urgency never licenses memory-YAML.
- **Slack is Socket Mode only.** Two tokens (`xoxb-` bot + `xapp-` app-level), outbound WebSocket, no public endpoint, no Events-API/webhook alternative to offer.
- **MCP three-way split** — exposing your agents to MCP clients = MCP *entrypoint* (here); consuming a remote MCP server across agents = `mcp` *connector* (`sam-connectors`); one-agent inline MCP tool = `sam-author-agent`. Prefer the connector for anything reusable. State which you picked and why.
- **Slack, email, and event mesh exist on both sides** — messages/events coming in = *entrypoint* (here); agent posting, sending, or publishing = *connector* (`sam-connectors`). A mixed ask ("team chats with it AND it posts alerts") is two resources, one per direction. Filtering/multi-step logic on a triggered flow belongs in a workflow (`sam-author-agent`) — an event rule can target a workflow directly.
- **Secrets hygiene** as in `sam-connectors`: pasted tokens are exposed (advise rotation), `${VAR}` from then on, never echo literals.
- **Don't guess auth behavior.** OAuth/RBAC specifics for the MCP entrypoint are in [references/mcp-entrypoint.md](references/mcp-entrypoint.md) — facts there only; entrypoint login/RBAC beyond it → `sam-operate`.

## References

| Topic | File |
|---|---|
| Slack, Teams, email, WhatsApp entrypoints — fields, external prerequisites, routing | [references/chat-entrypoints.md](references/chat-entrypoints.md) |
| Event-mesh entrypoint — broker connection, event rules, outputs, acks | [references/event-mesh-entrypoint.md](references/event-mesh-entrypoint.md) |
| MCP entrypoint — exposing agents, tool naming, three auth modes, OAuth/Keycloak, client setup | [references/mcp-entrypoint.md](references/mcp-entrypoint.md) |
