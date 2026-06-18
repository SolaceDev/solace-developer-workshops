---
title: MCP Integration
description: Attach an external Model Context Protocol server's tools to a Solace Agent Mesh agent, walking the stdio transport with tool-name filtering and security considerations.
sidebar_position: 3
---

# MCP Integration

The Model Context Protocol (MCP) is a JSON-RPC-based protocol for connecting LLM-driven agents to external tool servers. The Agent Mesh runtime acts as an MCP **client** — it speaks to any MCP server, lists the tools the server exposes, and routes the agent's tool calls over the protocol. The agent itself sees those tools the same way it sees a built-in tool.

This tutorial walks the most common MCP integration shape: a configured agent that pulls in a third-party MCP server's tools over the `stdio` transport. The runtime spawns the MCP server as a subprocess, speaks JSON-RPC over its standard streams, and exposes the discovered tools on the agent's tool list. No network, no API keys, no OAuth — all the protocol mechanics happen inside the process boundary.

By the end you will have:

- A sandboxed directory the agent can read from and write into.
- A configured agent with the official MCP filesystem server attached over `stdio`.
- A working bot that lists files, reads a file, and creates a file on request.
- The vocabulary to swap the filesystem server for any other MCP server — local stdio binary, remote SSE endpoint, or remote streamable-HTTP endpoint.

The full key-by-key MCP configuration surface (every connection transport, every auth type, every filtering knob) lives in Building → Tools → MCP tools. This tutorial focuses on the recipe.

## What You Need Before You Start

- Agent Mesh installed locally. Walk Installing → Install first if you have not.
- An LLM API endpoint and key. Installing → Configure covers the env-var contract.
- A broker the agent can reach. The dev broker that ships with the repo is enough for a laptop run.
- **Node.js + `npx`** on `PATH`. `npx` is used to spawn the MCP filesystem server. Version 18 or newer is sufficient.

## Pick the MCP Server

This tutorial uses the **official `@modelcontextprotocol/server-filesystem`** server, published by the Model Context Protocol project. It exposes a small set of filesystem operations (read, write, list, search) scoped to one or more directories you allow at startup.

The runtime supports three MCP transports:

| Transport         | When to use                                                                             |
|-------------------|------------------------------------------------------------------------------------------|
| `stdio`           | The MCP server runs as a local subprocess. No network, no auth. **Used in this tutorial.** |
| `sse`             | The MCP server is a remote service exposed over Server-Sent Events.                      |
| `streamable-http` | The MCP server is a remote service exposed over the modern streamable-HTTP transport.    |

Remote transports add auth (bearer tokens, OAuth2, mTLS, custom headers) and TLS considerations. The shape is documented at Building → Tools → MCP tools; a one-paragraph example sits at the end of this tutorial for orientation.

## Set Up the Sandbox Directory

Create a directory the agent is allowed to read from and write into. Keep it outside your normal working tree so an unexpected agent action does not touch unrelated files.

```bash
mkdir -p /tmp/sam-mcp-sandbox
echo "Hello from inside the sandbox." > /tmp/sam-mcp-sandbox/README.txt
```

The filesystem MCP server takes the sandbox path as a positional argument and refuses access to anything outside it. Multiple directories can be passed by adding more positional arguments; for this tutorial one is enough.

## Configure the Agent

Drop an agent config that attaches the filesystem MCP server. The `npx -y` flags install the package on first use and skip the confirmation prompt, so the subprocess starts cleanly without an interactive step.

```yaml
# configs/file_agent.yaml
log:
  level: info

apps:
  - name: file_agent_app
    app_exec: sam-awe
    app_config:
      agent_name: FileAgent
      display_name: Files
      namespace: ${NAMESPACE, solace-agent-mesh}
      supports_streaming: true

      model:
        model: ${LLM_SERVICE_GENERAL_MODEL_NAME, openai/gpt-4o}
        api_base: ${LLM_SERVICE_ENDPOINT}
        api_key: ${LLM_SERVICE_API_KEY}

      instruction: |
        You are an assistant that helps the user inspect and edit files
        inside the configured sandbox directory. Use the `fs_` tools to
        list, read, write, and search files. Never refer to paths
        outside the sandbox — the tools refuse them anyway.

      tools:
        - tool_type: mcp
          connection_params:
            type: stdio
            command: npx
            args:
              - "-y"
              - "@modelcontextprotocol/server-filesystem"
              - "/tmp/sam-mcp-sandbox"
          tool_name_prefix: "fs"
          allow_list:
            - "list_directory"
            - "read_text_file"
            - "write_file"
            - "search_files"
            - "directory_tree"
            - "list_allowed_directories"

      session_service:
        type: memory
        default_behavior: "PERSISTENT"
      artifact_service:
        type: filesystem
        base_path: /tmp/sam
        artifact_scope: namespace
      enable_embed_resolution: true

      agent_card:
        description: |
          A file assistant scoped to a single sandbox directory. Reads,
          writes, lists, and searches files via the official MCP
          filesystem server.
        defaultInputModes: ["text"]
        defaultOutputModes: ["text"]

      agent_card_publishing: { interval_seconds: 10 }
      agent_discovery: { enabled: true }
```

The keys inside the `tool_type: mcp` entry are the contract between the agent and the MCP server. The ones that matter most:

- **`connection_params.type: stdio`** picks the transport. The other valid values are `sse` and `streamable-http`; both add a `url:` and the auth surface documented at Building → Tools → MCP tools.
- **`connection_params.command:` + `args:`** is what the runtime spawns. `npx -y @modelcontextprotocol/server-filesystem /tmp/sam-mcp-sandbox` is one process invocation; the runtime opens its stdin and stdout, speaks JSON-RPC, and treats the subprocess lifetime as bound to the agent's.
- **`tool_name_prefix: "fs"`** rewrites every tool's name to `fs_<original>`. The LLM sees `fs_list_directory`, `fs_read_text_file`, and so on. Prefixes matter when you attach more than one MCP server to the same agent — without them, two servers exposing a `read_file` tool collide and only one is reachable.
- **`allow_list:`** picks which of the server's tools the agent gets. The filesystem server ships 13 tools (read, write, edit, move, search, directory tree, file info, and several variants); narrowing the list keeps the LLM's tool catalog focused on what you intend and shrinks the attack surface if the server is malicious.

`auth:` is omitted for `stdio` — there is no network and no remote identity to authenticate. For `sse` / `streamable-http`, `auth:` is where bearer tokens, OAuth2 client credentials, or per-user OAuth2 are declared.

## Run and Verify

Set the environment, then start everything in one command.

```bash
export NAMESPACE=solace-agent-mesh
export LLM_SERVICE_ENDPOINT=${LLM_SERVICE_ENDPOINT}
export LLM_SERVICE_API_KEY=${LLM_SERVICE_API_KEY}
export LLM_SERVICE_GENERAL_MODEL_NAME=openai/gpt-4o
export SOLACE_DEV_MODE=true
```

Launch the agent and a gateway under one orchestrator (any gateway works — the REST gateway integration tutorial walks the full `curl` recipe):

```bash
sam run configs/
```

`sam run` spawns one subprocess per YAML config in the directory (the agent and the gateway) and starts an in-process TCP dev broker on `:55554` that both subprocesses connect to. Logs from each subprocess are interleaved into the same terminal with `[file_agent]` / `[webui_gateway]` prefixes, and `Ctrl+C` shuts down everything together.

In the agent logs, watch for the `MCP client added` line (the server connected), followed by `discovered MCP tools` (the server returned its tool list), and one `registered MCP tool` line per exposed tool. With this config, you will see six `registered MCP tool` entries: `fs_list_directory`, `fs_read_text_file`, `fs_write_file`, `fs_search_files`, `fs_directory_tree`, `fs_list_allowed_directories`. If any of those is missing, the `allow_list` did not match a tool name the server actually advertises — fix the spelling and restart.

If the agent fails to start with an error mentioning the MCP client or an exit code from `npx`, the package install failed (no network, or npm registry unreachable) or `node` is not on `PATH` for the agent's process. The remediation is the same as any other subprocess failure: confirm the command runs from the same shell the agent is launched from.

Once the agent is up, three quick smoke tests via your gateway:

1. *"What files are in the sandbox?"* — agent calls `fs_list_directory` on `/tmp/sam-mcp-sandbox` and reports `README.txt`.
2. *"What does README.txt say?"* — agent calls `fs_read_text_file` and quotes the contents.
3. *"Create a file called `notes.txt` with the line 'starting batch 2'."* — agent calls `fs_write_file`. Verify on disk: `cat /tmp/sam-mcp-sandbox/notes.txt`.

The agent's reply includes the tool calls it made, which makes debugging easy: if the agent guesses at the path instead of calling the tool, the issue is the tool description or the LLM choice, not the MCP wiring.

## Filtering: Limit Which Tools the Agent Gets

The runtime supports three mutually-exclusive narrowing strategies, plus an orthogonal namespace prefix:

- **`allow_list: [tool_name, ...]`** — expose only these. Anything not on the list is invisible to the agent.
- **`deny_list: [tool_name, ...]`** — expose everything except these. Use when the server exposes 30 tools and you want to block 2.
- **`tool_name: <single>`** — expose exactly one tool. Useful when a server bundles many capabilities but the agent only needs one.

The runtime rejects configs that combine `allow_list`, `deny_list`, and `tool_name` on the same entry — pick one. The fourth knob is independent and stacks with any of the three listed:

- **`tool_name_prefix: <prefix>`** — namespace every exposed tool's name.

LLM providers restrict tool names to `[a-zA-Z0-9_-]`, so the runtime sanitises the prefix-plus-name before exposure. The prefix is what tells the LLM (and the human reading the agent's call log) which MCP toolset a tool came from. When two MCP servers expose tools with the same name (`read_file` is common across filesystem-like servers), distinct prefixes are mandatory — they make the names unique.

## Security Considerations

MCP servers run code on your behalf. A few rules worth holding to:

- **Use `allow_list` on third-party MCP servers.** An MCP server's tool descriptions are text the server author wrote, and the agent's LLM reads them. A hostile tool description is a prompt-injection vector — the description can talk the LLM into a tool call you never intended. Narrowing the tool list is the simplest mitigation.
- **Prefer scoped sandboxes for stdio servers.** The filesystem server's positional arguments are the only sandbox enforcement; if you hand it `/`, the agent can read everything the user running the agent can read. Hand it a directory you would not mind being read or written.
- **For `sse` / `streamable-http`, prefer `ca_bundle` over `ssl_config.verify: false`.** Disabling verification is acceptable in development; in production traffic, supply a CA bundle that validates the MCP server's cert.
- **Per-user OAuth tokens are scoped by `(agent, user, credential_key)`.** When two OAuth2-protected MCP servers are attached to the same agent, set `credential_key` explicitly on each so their token storage does not collide.

For per-tool authorization (gating who in your organisation is allowed to call which MCP tool), the `required_scopes:` field on the tool entry hooks into the runtime's RBAC layer. Administering → RBAC reference walks the scope model.

## Real-World: Remote MCP Server with OAuth

`stdio` is the simplest transport but not the only one you will reach for. Public MCP servers like `mcp.stripe.com` and `mcp.atlassian.com` are exposed over `streamable-http` and require OAuth2 per-user tokens. The shape is:

```yaml
- tool_type: mcp
  connection_params:
    type: streamable-http
    url: "https://mcp.example.com/v1"
  auth:
    type: oauth2
    client_id: "${MCP_OAUTH_CLIENT_ID}"
    client_secret: "${MCP_OAUTH_CLIENT_SECRET}"
    authorization_url: "https://idp.example.com/oauth2/authorize"
    token_url: "https://idp.example.com/oauth2/token"
    scopes: ["mcp:read", "mcp:write"]
  tool_name_prefix: "ex"
  allow_list:
    - "search"
    - "create_issue"
```

The runtime stores the OAuth tokens per `(agent, user, credential_key)`. The first time a user invokes a tool that needs auth, the runtime emits an authentication-required signal back to the gateway, the gateway prompts the user through the configured flow, and the resulting token is reused for subsequent calls. The full reference for the auth shape is at Building → Tools → MCP tools.

## Troubleshooting

### Agent Fails to Start: MCP Subprocess Error

**Symptoms.** The agent's startup logs show an error mentioning the MCP client or an exit code, missing binary, or `EACCES` from the subprocess. No `MCP client added` line ever appears.
**Diagnostic.** Run the command from the args list manually in the same shell the agent is launched from: `npx -y @modelcontextprotocol/server-filesystem /tmp/sam-mcp-sandbox`. If `npx` is not found, Node.js is not on `PATH`. If `npx` runs but the install fails, the npm registry is unreachable from this host.
**Resolution.** Make `node` and `npx` available to the agent process (install Node.js if needed, or add the install location to `PATH`). For air-gapped environments, prebuild the MCP server package and point `command:` at the local binary directly.
**Prevention.** For production deployments, do not rely on `npx -y` to install at startup — install the package or vendor a binary, then point `command:` at the installed path.

### Some Tools Are Missing From the Agent

**Symptoms.** The agent does not know about a tool you expected (the LLM responds *"I cannot list directories"* even though `list_directory` was on the `allow_list`).
**Diagnostic.** In the agent logs at `INFO`, look for the `registered MCP tool` lines after `discovered MCP tools`. If the missing tool is not in the list, the `allow_list` did not match it. If it is in the list but the LLM still claims it cannot, check the prefix you set in `tool_name_prefix` — the LLM is seeing `fs_list_directory`, not `list_directory`, and your tool description or instruction may say the wrong name.
**Resolution.** Confirm the spelling against the MCP server's documented tool catalog. Add the missing entry to `allow_list`, or remove `allow_list` entirely to expose every tool the server advertises.
**Prevention.** Read the MCP server's README to inventory the tools before listing them in `allow_list`. Errors at this layer surface as silent capability gaps in the agent.

### Tool Calls Timeout or Hang

**Symptoms.** The agent calls a tool and the response never arrives; the gateway eventually shows a task timeout.
**Diagnostic.** For `stdio` MCP servers, the subprocess is one of two things: still running but blocked, or crashed and respawning. Run `ps` and look for the `node` or `npx` process the agent started. For `sse` / `streamable-http`, the MCP server is reachable from the agent but the request is hung — check the MCP server's own logs.
**Resolution.** For stdio, restart the agent to re-spawn the subprocess. If the same call hangs reliably, the MCP server has a real bug — narrow the agent's `allow_list` to remove the failing tool until you can fix the server. For HTTP-based transports, lower `connection_params.sse_read_timeout` so the runtime fails fast instead of hanging.
**Prevention.** Always pair an MCP integration with the agent's `max_llm_calls_per_task` so a tool-loop that spins on a flaky MCP call cannot exhaust your LLM budget.

### `tool 'X' not found in MCP server response`

**Symptoms.** The agent starts but a specific tool in `allow_list` is not registered, and a log line says the server did not return it.
**Diagnostic.** The MCP server returned its `tools/list` response, and the runtime filtered the result by your `allow_list`. The tool name in the list did not match anything the server actually exposes.
**Resolution.** Drop the bad entry from `allow_list` or fix its spelling. The runtime treats unknown entries as a soft warning, not an error — the agent still starts.
**Prevention.** Use an explicit `manifest:` entry when you want startup to fail fast on tool-name mismatches (manifest entries assert the tools the server *must* expose; missing ones become startup errors).

## What Next?

You have just attached external capabilities to an agent through MCP. Most readers next want to wire the agent to a real-world chat surface — covered in Slack support bot. For the full MCP configuration reference (every transport, every auth shape, every filtering knob), see Building → Tools → MCP tools.
