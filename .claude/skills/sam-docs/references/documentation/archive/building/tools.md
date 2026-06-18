---
title: Building Tools
description: Built-in tools, MCP servers, OpenAPI services, and remote tools (Python and Go via samtoolsdk) — what they are, where they run, and how to declare them on an agent.
sidebar_position: 3
---

# Building Tools

A **tool** is a discrete capability that an agent can call. Tools are the unit through which an agent reaches data, side effects, and external systems. Every agent in Solace Agent Mesh is a thin LLM loop plus a list of tools; everything interesting an agent does, it does by calling one.

Tools come in four wire-level kinds, declared on the agent's `tools:` list under the `tool_type` field. The four kinds correspond to four ways a tool can be implemented:

| `tool_type`     | What it is                                      | Where it runs |
| --------------- | ----------------------------------------------- | ------------- |
| `builtin`       | A capability built into the runtime, or a remote script dispatched to the Secure Tool Runtime | AWE (in-process) or STR |
| `builtin-group` | A named group of built-in tools enabled as one declaration | AWE (in-process) |
| `mcp`           | A tool served by an external MCP server | MCP server, contacted from AWE |
| `openapi`       | A tool generated from an OpenAPI specification | AWE issues HTTP calls |

This page covers all four. The configured-vs-built dimension — declare a tool in YAML, or write it in Go — applies to the `builtin` row: a remote tool authored with `pkg/samtoolsdk` is a *built* tool that the runtime dispatches over the Secure Tool Runtime (STR), but it still appears as `tool_type: builtin` on the agent's tool list. Tools are the one artifact type where that built path exists on the customer surface; see Concepts → Configured vs built for the framing.

## Where Each Tool Runs

The Agent-Workflow Executor (AWE) holds the agent's LLM loop. AWE-resident tools run in-process: when the LLM calls one, the agent invokes a Go function directly and the result comes back without leaving the process. The trade-off is that AWE-resident code has full access to the agent's memory and is not sandboxed.

The Secure Tool Runtime (STR) is a separate process that the runtime spawns to execute tool work that should not happen inside AWE. STR-routed tools talk to the agent over the event mesh: AWE publishes an invocation message, an STR worker picks it up, the worker executes the tool in a sandbox, and the result comes back over the broker. The trade-off is the broker hop, the sandbox cost, and the language boundary; the benefit is process isolation, language flexibility (Python or Go), and resource caps.

The split is not negotiable per agent — it is determined by the tool kind. Built-in tools shipped under `pkg/tools/` always run in AWE. Remote tools (Python scripts and Go binaries built with `pkg/samtoolsdk`) always run in STR. MCP tools always run in their external MCP server, with AWE acting as the MCP client. OpenAPI tools always run inside AWE as HTTP clients calling the target service.

## Tool Scopes and Authorization

Every tool, regardless of kind, can declare a list of OAuth scopes the caller must hold before the tool is invokable:

```yaml
tools:
  - tool_type: builtin
    tool_name: load_artifact
    required_scopes:
      - "artifact:read"
```

When a user message reaches the agent, the agent compares the user's scopes (extracted from the JWT or the gateway's identity layer) against each tool's `required_scopes` before exposing the tool to the LLM and again before dispatching the call. A tool with no `required_scopes` is callable by any authenticated user. See Administering → RBAC reference for the scope-to-role mapping and the RBAC defaults that ship out of the box.

## Embed Resolution in Tool Arguments

Tool arguments are not opaque to the runtime — they pass through an embed-resolution pass before the tool sees them. An embed is a `«type:params»` token that gets substituted with content drawn from elsewhere. The most common embed types reference artifacts:

```text
«artifact_content:report.md»          # full text content of an artifact
«artifact_meta:report.md»             # metadata only (size, version, type)
«artifact_content:report.md >>> apply_to_template:summary.liquid»
                                       # pipe the artifact through a Liquid template
```

Embeds are resolved on every string argument unless the tool's author has declared the argument as a raw-string parameter — in which case it bypasses embed resolution. Raw-string arguments are a property of the tool, not a configuration knob on the agent's side: a tool's Go implementation returns the argument names via `RawStringArgs()`, and the agent honours that list on every invocation. This is how SQL-bearing tools, regex tools, and code-bearing tools opt their query arguments out of substitution.

The resolver enforces a recursion-depth cap and ignores unknown embed types (they pass through verbatim), so the syntax is safe to use in user-facing strings without worrying about reflection or remote fetches. Inline Liquid templates between triple-guillemet markers (`«««template_liquid: ... »»»`) are also supported when the tool's argument value needs more than a single artifact substitution.

## Built-In Tools

Built-in tools are Go implementations shipped inside the runtime. They live under `pkg/tools/` and are listed in the agent's tool list with `tool_type: builtin` and a `tool_name:` identifying which built-in to expose.

The built-ins fall into several families:

- **Artifact tools** — `list_artifacts`, `load_artifact`, `append_to_artifact`, `delete_artifact`, `artifact_search_and_replace_regex`, `artifact_grep`. The CRUD, search/replace, and extract/append operations for the artifact service.
- **Data tools** — `query_data_with_sql` (run SQL against an in-memory SQLite DB), `create_sqlite_db` (load CSV / JSON into a queryable DB), `transform_data_with_jmespath` (JMESPath transforms), `merge_structured_data` (combine objects with conflict policy). `create_chart_from_plotly_config` (render a chart from a Plotly spec) is also part of this family but is implemented as a Python remote tool — agents see it as `tool_type: builtin` and the dispatcher routes it through STR.
- **Web tools** — `web_request` (general HTTP), `web_search_google` (web search through a search provider).
- **Multimodal tools** — `create_image_from_description`, `describe_image`, `describe_audio`, `edit_image_with_gemini`, `generate_image_with_gemini`.
- **Time** — `get_current_time` (timezone-aware current time).
- **File conversion** — `convert_file_to_markdown`, `convert_pdf_to_markdown`.
- **Human-in-the-loop** — `ask_user_question` (prompt the user mid-conversation, suspending the agent until the response arrives).
- **Research** — `deep_research` (multi-step research workflow over the web tools).

To enable one built-in, list it by name:

```yaml
# configs/agents/research_agent.yaml
...
agents:
  - name: research_agent
    model: anthropic/claude-sonnet-4-5
    tools:
      - tool_type: builtin
        tool_name: web_request
      - tool_type: builtin
        tool_name: web_search_google
      - tool_type: builtin
        tool_name: ask_user_question
        required_scopes: ["agent:research:interact"]
...
```

### Built-In Groups

When several built-ins are commonly enabled together, the runtime exposes a named **group**. A `builtin-group` entry enables every tool in the group with one declaration. The shipped groups are:

| `group_name`           | Members |
| ---------------------- | ------- |
| `artifact_management`  | `list_artifacts`, `load_artifact`, `delete_artifact`, `append_to_artifact`, `artifact_search_and_replace_regex`, `artifact_grep` |
| `data_analysis`        | `query_data_with_sql`, `create_sqlite_db`, `transform_data_with_jmespath`, `merge_structured_data`, `create_chart_from_plotly_config` |
| `general_agent_tools`  | `get_current_time`, `convert_file_to_markdown`, `convert_pdf_to_markdown`, `ask_user_question` |
| `image_tools`          | `create_image_from_description`, `describe_image`, `describe_audio`, `edit_image_with_gemini`, `generate_image_with_gemini` |
| `web_tools`            | `web_request`, `web_search_google` |
| `research`             | `web_search_google`, `deep_research` |
| `hil_tools`            | `ask_user_question` |

```yaml
# configs/agents/file_agent.yaml
...
agents:
  - name: file_agent
    tools:
      - tool_type: builtin-group
        group_name: artifact_management
      - tool_type: builtin-group
        group_name: data_analysis
...
```

The `artifact_management` and `data_analysis` groups are special: they are auto-injected onto every agent that does not opt out. If an agent never declares either group, the runtime prepends both — workflow result-embeds and the data-shaping tools have to be available for the runtime's own machinery to function. To opt out (rare), set `auto_inject_artifact_tools: false` or `auto_inject_data_analysis_tools: false` on the agent config.

## MCP Tools

MCP tools are served by an external Model Context Protocol server. The agent's config declares the toolset — the connection parameters, the auth scheme, and which tools to expose — and the runtime takes care of negotiating with the server, listing tools, and routing calls.

### Connection Transports

MCP supports three transports, selected by `connection_params.type`:

- `stdio` — spawn the MCP server as a subprocess and speak over its stdin/stdout. Used when the server is a local binary.
- `sse` — connect to a remote MCP server over Server-Sent Events.
- `streamable-http` — connect to a remote MCP server using the streamable-HTTP transport (the modern remote transport).

A minimal stdio entry:

```yaml
# configs/agents/filesystem_agent.yaml
...
tools:
  - tool_type: mcp
    connection_params:
      type: stdio
      command: "/usr/local/bin/mcp-filesystem-server"
      args: ["--root", "/srv/data"]
    tool_name_prefix: "fs"
...
```

A remote MCP server with bearer-token auth and TLS verification:

```yaml
- tool_type: mcp
  connection_params:
    type: streamable-http
    url: "https://mcp.example.com/v1"
    ssl_config:
      verify: true
      ca_bundle: "/etc/ssl/example-ca.pem"
  auth:
    type: bearer
    token: "${MCP_BEARER_TOKEN}"
  allow_list:
    - "get_record"
    - "search_records"
  tool_name_prefix: "records"
```

A remote MCP server with OAuth2 (authorization code, per-user tokens):

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
```

### Auth Options

`auth.type` accepts:

- `none` (or omit `auth:` entirely) — no auth header.
- `bearer` — static `Authorization: Bearer <token>` from `token`.
- `basic` — HTTP Basic from `username` / `password`.
- `headers` — arbitrary static headers from a `headers:` map. This is also how API-key-in-header auth is supplied — declare the key under `connection_params.headers` rather than expecting a dedicated `apikey` auth type.
- `oauth2` — OAuth2 with per-user tokens. The flow is authorization-code when `authorization_url` is set, client-credentials when only `token_url` is set.

For mutual TLS, set `ssl_config.client_cert` and `ssl_config.client_key` together. Setting only one is a parse-time error.

A static API key in a header:

```yaml
- tool_type: mcp
  connection_params:
    type: streamable-http
    url: "https://mcp.example.com/v1"
    headers:
      X-API-Key: "${MCP_API_KEY}"
```

### Filtering and Naming

The toolset can ship dozens of tools. To narrow what the agent sees:

- `allow_list: [tool_name, ...]` — expose only these.
- `deny_list: [tool_name, ...]` — expose everything except these.
- `tool_name: <single>` — expose exactly one tool.
- `tool_name_prefix: <prefix>` — prepend a prefix to every exposed tool's name.

LLM providers restrict tool names to `[a-zA-Z0-9_-]`, so the runtime sanitises the prefix-plus-name before exposure. The prefix is what tells the LLM and the human reading the agent's call log which MCP toolset a tool came from.

### MCP Hardening

A few operational points worth knowing:

- Prefer `ca_bundle` to disabling verification. Setting `ssl_config.verify: false` is permitted for development but is not appropriate for production traffic.
- Use `allow_list` to limit attack surface. An MCP server's tool descriptions are attacker-controlled text from the agent's perspective — prompt injection through a malicious tool description is a real consideration on third-party servers.
- Per-user OAuth tokens are scoped by `(agent, user, credential_key)`. Set `credential_key` explicitly when two MCP servers on the same agent might otherwise share storage.

## OpenAPI Tools

OpenAPI tools turn an OpenAPI specification into a set of tools the agent can call. Each operation in the spec becomes a tool; the tool name comes from the spec's `operationId`. The runtime issues HTTP calls directly — there is no separate process, and the connection is AWE-resident.

A minimal example:

```yaml
# configs/agents/petstore_agent.yaml
...
tools:
  - tool_type: openapi
    specification_url: "https://petstore3.swagger.io/api/v3/openapi.json"
    base_url: "https://petstore3.swagger.io/api/v3"
    auth:
      type: apikey
      name: "X-API-Key"
      value: "${PETSTORE_API_KEY}"
      in: "header"
    allow_list:
      - "getPetById"
      - "findPetsByStatus"
    tool_name_prefix: "pet"
...
```

### Spec Sources

Provide exactly one of:

- `specification_url: <url>` — fetch the spec at startup.
- `specification_file: <path>` — read a local file.
- `specification: <inline yaml or json>` — inline the spec into the agent config.

`specification_format: json|yaml` is an optional hint for inline specs when the format cannot be inferred.

### Auth Options

`auth.type` accepts `none`, `bearer`, `apikey`, `basic`, `oauth2`, and `serviceaccount`. The OAuth2 variants:

- `oauth2` with `authorization_url` set — authorization-code flow with per-user tokens that refresh on expiry. Used when each user authenticates against the API in their own right.
- `oauth2` with only `token_url` set — client-credentials flow with one shared token per agent. Used for machine-to-machine APIs.
- `serviceaccount` — Google Service Account flow. The `service_account_json` field carries the raw JSON of a service account key, which the runtime exchanges for a bearer token via a signed JWT.

`use_pkce: true` opts the authorization-code flow into PKCE when the IdP requires it (default is off for OpenAPI).

### Response Size and Filtering

The runtime caps the HTTP response body at 10 MiB by default to prevent a misbehaving API from exhausting agent memory. Override with `max_response_size: <bytes>`.

`allow_list` and `deny_list` work the same as MCP — entries are `operationId` values from the spec. `tool_name_prefix` namespaces all exposed tools.

## Remote Tools — Python

A **remote tool** is a tool authored in Python or Go that runs inside the Secure Tool Runtime rather than inside AWE. Remote tools appear on the agent's `tools:` list as `tool_type: builtin` with a `tool_name:` that matches an entry in the STR's manifest; the runtime's dispatcher falls through to STR when the name isn't in the in-process built-in registry.

Python tools use the `sam-tool-sdk` package, which provides the base classes and the CLI runner. Three patterns cover the common cases.

### A Simple Function-Style Tool

`DynamicToolProvider` discovers tools from decorated functions in a module:

```python
# tools/weather/weather_tools.py
from sam_tool_sdk import DynamicToolProvider, provider_cli, register_tool

class WeatherTools(DynamicToolProvider):
    pass

@register_tool(WeatherTools)
async def get_forecast(city: str) -> dict:
    """Return the current forecast for a city."""
    return {"forecast": f"Sunny in {city}, 22 C."}

if __name__ == "__main__":
    provider_cli(WeatherTools())
```

### A Class-Based Tool with an Explicit Schema

For tools that need a hand-written JSON Schema (artifact-typed parameters, optional fields, custom validation), subclass `DynamicTool`:

```python
# tools/greet/greet_tool.py
from typing import Optional
from sam_tool_sdk import DynamicTool, dynamic_tool_cli
from google.genai import types as adk_types

class Greet(DynamicTool):
    @property
    def tool_name(self) -> str:
        return "get_greeting"

    @property
    def tool_description(self) -> str:
        return "Return a configurable greeting."

    @property
    def parameters_schema(self) -> adk_types.Schema:
        return adk_types.Schema(
            type=adk_types.Type.OBJECT,
            properties={
                "name": adk_types.Schema(type=adk_types.Type.STRING),
                "punctuation": adk_types.Schema(
                    type=adk_types.Type.STRING, nullable=True),
            },
            required=["name"],
        )

    async def _run_async_impl(self, args, tool_context, credential: Optional[str] = None):
        name = args.get("name", "World")
        punctuation = args.get("punctuation", "!")
        prefix = self.tool_config.get("greeting_prefix", "Hello")
        return {"greeting": f"{prefix}, {name}{punctuation}"}

if __name__ == "__main__":
    dynamic_tool_cli(Greet())
```

`tool_config` is the operator-supplied configuration block from the agent's tool entry — see Operator-supplied tool config.

### Manifest Entry

Each Python tool needs an entry in the STR manifest:

```yaml
# tools/weather/manifest.yaml
version: 1
tools:
  get_forecast:
    executable: weather_tools
    tool_dir: weather
    timeout_seconds: 30
```

The STR probes `<tool_dir>/<executable>` first and `<tool_dir>/python/bin/<executable>` second. The convention is to `pip install --target python/` so the entry-point lands in `python/bin/`.

### Operator-Supplied Tool Config

A tool can take operator-supplied configuration through `tool_config:` on the agent's entry:

```yaml
# configs/agents/greeter_agent.yaml
tools:
  - tool_type: builtin
    tool_name: get_greeting
    tool_config:
      greeting_prefix: "Bonjour"
```

The runtime delivers `tool_config` to the tool process as part of the invocation envelope — the Python tool reads it from `self.tool_config`. This is how you wire credentials, endpoint URLs, and per-deployment behaviour into a remote tool without rebuilding it.

## Remote Tools — Packaged SQL Tool

The runtime ships a remote tool that connects an agent to a persistent SQL database — Postgres, MySQL, SQLite (on-disk file), MS SQL Server, or Oracle. The binary ships pre-installed at `~/.config/sam/tools/sql/sql`, where the Secure Tool Runtime picks it up. Reach for this tool when the agent needs to query a real database the operator runs; reach for the in-process `query_data_with_sql` built-in (listed under Built-in tools) when the agent should query a small in-memory copy assembled from artifacts within the conversation.

The tool is a remote tool but operators do not author it. They wire it into an agent by name and supply a connection string.

### Wiring

A single agent can attach multiple copies of the tool — one per database — by giving each a distinct outer `tool_name:`. The dispatcher routes by `_str_binary:` inside `tool_config`, so all copies share the same underlying binary while exposing different names and schemas to the LLM.

```yaml
# configs/agents/analytics_agent.yaml
...
tools:
  - tool_type: builtin
    tool_name: query_orders_db
    tool_config:
      _str_binary: execute_sql_query
      tool_name: query_orders_db
      tool_description: "Query the orders database. Tables: customers, products, orders."
      connection_string: "${ORDERS_DB_URL}"
      auto_detect_schema: true
...
```

The outer `tool_name:` is what appears on the agent's tool list. The inner `tool_config.tool_name` is echoed back to the runtime so the schema-discovery pass can override the tool's LLM-facing name and description; keep the two values identical.

### `tool_config` Keys

| Key | Type | Default | Required | Description |
|---|---|---|---|---|
| `_str_binary` | string | — | yes | Names the STR binary to dispatch this entry to. Always `execute_sql_query` for this tool. |
| `tool_name` | string | — | yes | The LLM-facing tool name. Match the outer `tool_name:` on the agent's entry. |
| `tool_description` | string | — | no | Prose the LLM reads when deciding whether to call the tool. Best practice: list the tables and what the database is for. |
| `connection_string` | string | — | yes | The database URL. Treated as a secret — supply via `${ENV_VAR}` rather than embedding credentials in the file. |
| `auto_detect_schema` | bool | `true` | no | When true, the runtime opens the database at startup, samples each table, and appends the schema YAML to `tool_description` so the LLM sees the column layout. |
| `schema_summary_override` | string | — | no | Hand-written schema summary used in place of introspection. Only consulted when `auto_detect_schema: false`. |
| `max_enum_cardinality` | int | `100` | no | Columns with at most this many distinct values are surfaced as enums in the schema description. |
| `schema_sample_size` | int | `100` | no | Number of rows sampled per table during schema introspection. |

The `connection_string` URL scheme decides the database driver. The five schemes the runtime accepts:

- `postgres://user:pass@host:port/dbname` (or `postgresql://...`).
- `mysql://user:pass@host:port/dbname`.
- `sqlite:////absolute/path/to/file.db` — note the four slashes (three for the URL scheme, one for the absolute path). Use `sqlite:///:memory:` for an ephemeral in-process database.
- `sqlserver://user:pass@host:port?database=dbname` (or `mssql://...`).
- `oracle://user:pass@host:port/service_name`.

SQLAlchemy-style driver suffixes — `postgresql+psycopg2://`, `mysql+pymysql://` — are accepted and the `+driver` portion is ignored. This makes Agent Mesh YAML drop-in compatible with connection strings copied from Python codebases.

### Schema Introspection

When `auto_detect_schema: true`, the runtime opens the database during agent startup, samples each table up to `schema_sample_size` rows, and appends a YAML schema description to the `tool_description` the LLM sees. The description includes column names, types, foreign-key relations, and enum-like columns. With introspection off (or when the database is unreachable at startup) the LLM has to guess at column names. If the database is reachable but you do not want startup-time queries, set `auto_detect_schema: false` and supply a hand-written `schema_summary_override`.

A connection failure at startup does not block the agent — the runtime registers the tool with a warning prefix on its description so the LLM is told the database is currently unreachable. The next invocation retries the connection.

For a tutorial that walks through seeding a SQLite database, attaching the tool, and hardening the same agent against a production Postgres deployment, see Tutorials → SQL database integration.

## Remote Tools — Go via `samtoolsdk`

Go remote tools are single-binary tools built against `pkg/samtoolsdk`. The same STR dispatches them; the difference from a Python tool is that the executable is a compiled Go binary and the parameter type is a Go struct rather than a JSON Schema.

A complete Go tool:

```go
// tools/go/greet/main.go
package main

import (
    "context"

    sdk "github.com/SolaceDev/solace-agent-mesh-go/pkg/samtoolsdk"
)

type GreetParams struct {
    Name        string `json:"name" desc:"The person to greet"`
    Punctuation string `json:"punctuation,omitempty" desc:"Trailing punctuation"`
}

func greet(ctx context.Context, p GreetParams, tc *sdk.ToolContext) (*sdk.Result, error) {
    tc.SendStatus("Greeting " + p.Name + "...")
    if p.Punctuation == "" {
        p.Punctuation = "!"
    }
    return sdk.OK("Hello, " + p.Name + p.Punctuation), nil
}

func main() {
    sdk.Run(sdk.NewTool("greet", "Greet a person.", greet))
}
```

The `NewTool` call binds the tool name, the human-readable description, and the handler. The handler receives a context, a typed parameter struct, and a `*sdk.ToolContext` for status updates, artifact I/O, and LLM callbacks. The handler returns a `*sdk.Result` produced by `sdk.OK(...)`, `sdk.Error(...)`, `sdk.Partial(...)`, `sdk.Pending(...)`, or `sdk.AuthRequired(...)`.

### Schema Discovery

The STR runs each Go tool binary with the `--schema` flag at startup. The binary emits the tool's JSON Schema, including the parameter types derived from the Go struct's `json:` tags and `desc:` field annotations. The STR caches the result and publishes it to AWE as part of the per-tool init message, so the agent sees the same schema the binary advertises. To force re-discovery (after rebuilding a tool, for example), set `schema_refresh_seconds:` on the manifest entry.

### Manifest Entry

```yaml
# tools/go/greet/manifest.yaml
version: 1
tools:
  greet:
    executable: greet
    tool_dir: greet
    timeout_seconds: 10
```

Drop the compiled binary at `<tool_dir>/<executable>` and the STR picks it up.

### Dual-Target Builds

The host runs the STR in one of three modes: `direct` (the binary runs natively, no isolation), `bwrap` (the binary runs natively inside Linux user namespaces with `prlimit` resource caps), or `prlimit-only` (resource caps but no namespacing). The `bwrap` and `prlimit-only` modes still target the host architecture; deploying a Go tool to a Linux-based Kubernetes cluster from a macOS workstation needs a Linux binary regardless.

For a tool you run on the **local STR**, a plain `go build` to the tool directory is enough. The STR picks it up at the path the manifest declares.

For a tool you ship to a **deployed STR** (the Platform service), use `sam config apply` and let the CLI cross-compile for the target. It queries the Platform service for the deployed architecture and produces a matching binary automatically. Set `SAM_TOOL_TARGET_OS` and `SAM_TOOL_TARGET_ARCH` to override the target when the platform is unreachable. A fleet running mixed architectures fails fast at apply time rather than picking one silently.

### Tool Options

`samtoolsdk` provides several `WithX` options to enrich a tool declaration:

```go
sdk.NewTool("upload",
    "Upload a file to the configured bucket.",
    handler,
    sdk.WithTimeout(60),
    sdk.WithInstructions("Use only when the user explicitly asks to upload."),
    sdk.WithVolumeParams(sdk.VolumeParamDecl{
        Name:      "outputs",
        MountPath: "/work/outputs",
        Mode:      "readwrite",
    }),
    sdk.WithConfigSchema(sdk.ConfigSchemaField{
        Key:      "bucket_name",
        Type:     "string",
        Required: true,
    }),
)
```

- `WithTimeout(n)` — per-tool timeout in seconds.
- `WithInstructions(s)` — long-form LLM guidance attached to the tool.
- `WithVolumeParams(...)` — declare volume mounts the tool expects.
- `WithConfigSchema(...)` — declare the shape of operator-supplied `tool_config:` so the platform UI can render a form for it.
- `WithAuth(...)` — declare an auth requirement (OAuth flow) the runtime should drive before invoking the tool.

## The STR Sandbox Model

Every remote tool — Python or Go — runs inside the Secure Tool Runtime sandbox. The sandbox model has two operator knobs.

### Modes

`sandbox.mode` on the STR's config selects how STR-resident tools are isolated:

| Mode            | Isolation                                                                 | When to use |
| --------------- | ------------------------------------------------------------------------- | ----------- |
| `direct`        | None. Tools run as ordinary subprocesses with the STR's UID and environment. | Local development only. |
| `prlimit-only`  | `prlimit` resource caps (CPU, file size, open files, processes, stack), but no namespacing. | Hosts where `bubblewrap` is unavailable but resource caps are still wanted. |
| `bwrap`         | Linux user namespaces via `bubblewrap`, plus `prlimit` resource caps.     | Production deployments on Linux. |

The rule is simple: `direct` is never appropriate in production. It does not isolate the tool from the host, and any credentials in the STR's environment are visible to the tool. Use `bwrap` on Linux for full isolation, falling back to `prlimit-only` if `bubblewrap` is not installed.

### Profiles

Within `bwrap` and `prlimit-only` modes, each tool runs under a named profile. The shipped profiles:

- `standard` — host filesystem mounted read-only; network unrestricted. The default.
- `restrictive` — no network access (the network namespace is unshared).
- `permissive` — relaxed filesystem and network isolation for tools that legitimately need broader host access.

Pick `restrictive` for tools that have no business making network calls — image transforms, PDF extraction, local file conversion. Pick `permissive` only for tools that document a need for it.

Set the profile per tool in the STR manifest:

```yaml
# tools/go/image_resize/manifest.yaml
version: 1
tools:
  image_resize:
    executable: image_resize
    tool_dir: image_resize
    sandbox_profile: restrictive
    timeout_seconds: 30
```

### Resource Caps

`resource_limits:` on a manifest entry overrides the profile defaults:

```yaml
tools:
  heavy_pdf:
    executable: heavy_pdf
    tool_dir: heavy_pdf
    timeout_seconds: 120
    resource_limits:
      max_cpu_seconds: 60
      max_file_size_mb: 100
      max_open_files: 256
      max_processes: 32
      max_stack_size_mb: 64
```

Memory limits are intentionally enforced by the container layer (Docker / Kubernetes) rather than by `prlimit --as`, because address-space limits on Go binaries collide with the runtime's heap reservation.

### Timeouts

`timeout_seconds:` is the wall-clock budget for a single tool invocation. The STR cancels the tool process if it overruns. The default is 300 seconds; lower it for tools that should finish quickly, or raise it for tools that legitimately need longer to finish — large file conversions, long-running searches, multi-step workflows.

## Skill-Bundled Tools

When a tool is part of a skill, it does not appear on the agent's `tools:` list directly. The agent declares the skill under `skills:`, and the tool is registered automatically with the prefixed name `<skill>__<tool>`. See Building → Skills for the bundle layout, the `SKILL.md` manifest, and the lazy-loading behaviour that makes skill-bundled tools work.

The tools inside a skill are themselves Python or Go remote tools — the authoring patterns on this page apply unchanged. What differs is the loading mechanism and the namespacing.

## What Next?

Once you have a tool authored, the next step is to wire it into an agent — and to choose how the agent should reason about when to call it. Building → Agents covers the agent YAML, the LLM loop, peer routing, and the session backends that hold the conversation state your tools see. If you want to bundle reusable tools with the instructions that drive their use, Building → Skills is the next stop.
