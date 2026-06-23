---
title: Migrating From Python
description: A 12-month aid for existing Python SAM users moving to the current Solace Agent Mesh release. Sunset ~2027-05.
sidebar_position: 0
---

# Migrating From Python

This section exists as a 12-month aid for users already running Python Solace Agent Mesh. Sunset target: **~2027-05**. New users can skip this section entirely.

## Pages in This Section

- **Overview** — What is the same, what is different, and why. Sunset note.
- **Config differences** — YAML deltas (for example, `app_module` becomes `app_exec`).
- **Behavior differences** — Runtime semantics deltas.
- **Tool migration** — Port Python tools to Go-native built-in tools, or keep them as remote tools in STR.
- **Gateway migration** — Mapping Python custom gateways onto the in-box Go gateway adapters or the MCP gateway plus a built tool.
- **Deployment migration** — Kubernetes charts, env vars, image names. Covers the deltas around RBAC, SSO, MCP gateway auth, the platform service, scheduled tasks, and audit.
- **Gotchas** — Known incompatibilities and workarounds.

*Content forthcoming — these pages are tracked in the per-section content plan.*
