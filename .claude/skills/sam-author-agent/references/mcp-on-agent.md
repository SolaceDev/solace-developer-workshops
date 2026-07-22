# Giving an agent an MCP server's tools

Scope check: this is **outbound** — your agent consumes an external MCP server. Exposing your agents TO external MCP clients is the MCP *entrypoint* (`sam-entrypoints`). A reusable, platform-managed MCP connection shared across agents is the `mcp` **connector** (creation details in `sam-connectors`); attaching one to an agent is covered here.

## Paths, in teaching order

1. **Builder UI — the MCP connector wizard.** Create/select an `mcp` connector (user supplies: server URL — connectors are remote-only, SSE or streamable HTTP, no stdio — plus auth and a tool selection step listing the server's discovered tools), then attach it to the agent in the agent's connectors dialog. This is the no-code path; lead with it.
2. **Declarative config** — author the connector + agent attachment via `sam-declarative-config` (it has the connector kind's exact schema).
3. **Runtime YAML (escape hatch)** — an inline `tool_type: mcp` entry on one agent. Capability level: `connection_params` (transport `stdio` | `sse` | `streamable-http`, with `command`/`args` or `url`), an `auth` block (`type`: oauth2 | basic | bearer, with credential fields), TLS via `ssl_config` (CA bundle, client cert, verify), and tool filtering via `allow_list` / `deny_list` (or `tool_name` for a single tool). Exact spelling: `sam-declarative-config` — do not write these keys from memory.

## Facts that prevent common errors

- Bearer/basic auth is a structured **`auth` block**, not hand-rolled `headers:`.
- Tool filtering is **`allow_list` / `deny_list`** (mutually exclusive options), not `tool_filter`.
- Secrets go in env vars via `${VAR}` substitution, never inline.
- Internal-CA TLS is supported on the MCP connection itself (`ssl_config`) — no need to touch the host trust store.
- Inline tool vs connector: inline binds to one agent's config; the connector is platform-managed and reusable. Prefer the connector unless the user explicitly hand-manages one agent's runtime YAML.

## Verify

Ask the agent "what tools do you have?" — the server's tools should appear (skill-bundled/MCP names may be prefixed). Auth failures surface in the agent's startup logs; diagnosis beyond that → `sam-operate`.
