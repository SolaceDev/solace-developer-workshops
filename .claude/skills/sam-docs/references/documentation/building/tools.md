---
title: Configuring Tools
description: Built-in tools, MCP servers, OpenAPI services, and remote tools (Python and Go via samtoolsdk) — what they are, where they run, and how to declare them on an agent.
sidebar_position: 630
---

# Configuring Tools

A tool is a discrete capability that an agent can call. Tools are the unit through which an agent reaches data, side effects, and external systems. Every agent in Solace Agent Mesh is a thin large language model (LLM) loop plus a list of tools; everything interesting an agent does, it does by calling one.

Tools come in four wire-level kinds, declared on the agent's `tools:` list under the `tool_type` field. The four kinds correspond to four ways a tool can be implemented:

| `tool_type`     | What it is                                      | Where it runs |
| --------------- | ----------------------------------------------- | ------------- |
| `builtin`       | A capability built into the runtime, or a remote tool dispatched to the Secure Tool Runtime | Agent-Workflow Executor (in-process) or Secure Tool Runtime |
| `builtin-group` | A named group of built-in tools enabled as one declaration | Agent-Workflow Executor (in-process) |
| `mcp`           | A tool served by an external Model Context Protocol (MCP) server | MCP server, contacted from the Agent-Workflow Executor |
| `openapi`       | A tool generated from an OpenAPI specification | Agent-Workflow Executor issues HTTP calls |

Note that `builtin` is a dispatch mechanism, not a guarantee the tool ships with the runtime. Custom remote tools you author in Python or Go also declare `tool_type: builtin` — the runtime decides in-process versus Secure Tool Runtime by whether the `tool_name` is in the in-process registry. See [Remote Tools: Python](#remote-tools-python).

This page covers all four. The configuration-or-code choice (declare a tool in YAML, or write it in Go) applies to the `builtin` row, and tools are the one artifact type where that code path exists on the customer surface. For the framing, see [Extending Agent Mesh: Configuration or Code](../concepts/configured-vs-built.md).

## Where Each Tool Runs

The Agent-Workflow Executor holds the agent's LLM loop. Tools that run there run in-process: when the LLM calls one, the agent invokes a Go function directly and the result comes back without leaving the process. The trade-off is that in-process code has full access to the agent's memory and is not sandboxed.

The Secure Tool Runtime is a separate workload that runs alongside the Agent-Workflow Executor to execute tool work that should not happen in-process. Tools routed there communicate over the event broker: the Agent-Workflow Executor publishes an invocation message, a Secure Tool Runtime worker picks it up, executes the tool in isolation, and returns the result over the event broker. The trade-off is the event broker hop, the sandbox cost, and the language boundary. The benefit is process isolation, language flexibility (Python or Go), and resource caps.

The split is not negotiable per agent. It is determined by the tool kind. Built-in tools shipped inside the runtime always run in-process. Remote tools (Python scripts and Go binaries built with `pkg/samtoolsdk`) always run in the Secure Tool Runtime. MCP tools always run in their external MCP server, with the agent acting as the MCP client. OpenAPI tools always run in-process as HTTP clients calling the target service.

## Tool Scopes and Authorization

Built-in tools require no scopes: access to the agent (`agent:<name>:invoke`) implies access to every tool configured on it, so role setup never enumerates per-tool grants. This includes `schedule_task` — the scheduled invocation re-authorizes against the creator's invoke scopes when it fires. The deliberate exceptions are capabilities with externalized side effects — `notify_user` (`notify:_:send`), `send_email` (`tool:email:send`), and `datadog_logs` (`tool:datadog_logs:invoke`) — which stay individually grantable.

Custom tools (Secure Tool Runtime packages, MCP, OpenAPI, connectors) can declare a list of role-based access control (RBAC) scopes the caller must hold before the tool is invokable:

```yaml
tools:
  - tool_type: mcp
    tool_name: query_database
    required_scopes:
      - "connector:database:invoke"
```

Scope strings follow the standard `<category>:<resource>:<verb>` grammar — see [RBAC Reference](../reference/rbac-reference.md).

When a user message reaches the agent, the agent compares the user's scopes (resolved from the JSON Web Token (JWT) minted by the entrypoint) against each tool's `required_scopes` before exposing the tool to the LLM and again before dispatching the call. A tool with no `required_scopes` is callable by any authenticated user.

## Embed Resolution in Tool Arguments

Tool arguments are not opaque to the runtime. They pass through an embed-resolution pass before the tool sees them. An embed is a `«type:params»` token that gets substituted with content drawn from elsewhere. The most common embed types reference artifacts:

```text
«artifact_content:report.md»          # full text content of an artifact
«artifact_meta:report.md»             # metadata only (size, version, type)
«artifact_content:report.md >>> apply_to_template:summary.liquid»
                                       # pipe the artifact through a Liquid template
```

By default, the runtime resolves embed tokens in every tool argument before calling the tool. A tool can prevent this for specific arguments by declaring them as raw-string parameters via `RawStringArgs()`. SQL queries, regex patterns, and similar content that must arrive at the tool unchanged are common examples. The runtime skips embed resolution for any argument on that list.

The resolver enforces a recursion-depth cap and ignores unknown embed types (they pass through verbatim), so the syntax is safe to use in user-facing strings without worrying about reflection or remote fetches. The runtime also supports inline Liquid templates between triple-guillemet markers (`«««template_liquid: ... »»»`) when the tool's argument value needs more than a single artifact substitution.

## Built-In Tools

Built-in tools are Go implementations shipped inside the runtime, listed in the agent's tool list with `tool_type: builtin` and a `tool_name:` identifying which built-in to expose.

The built-ins span several families covering artifact management, data analysis, web requests, image and audio handling, time, file conversion, human-in-the-loop interaction, and research. For the complete list with parameters, returns, and per-tool behavior, see [Built-In Tools](../reference/built-in-tools.md).

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
...
```

### Built-In Groups

When several built-ins are commonly enabled together, the runtime exposes a named group. A `builtin-group` entry enables every tool in the group with one declaration. The shipped groups cover artifact management, data analysis, image, web, research, time, file conversion, document conversion, diagram generation, media (FFmpeg / ImageMagick), volume access, code execution, and human-in-the-loop interaction. For each group's slug and members, see [Built-In Tools](../reference/built-in-tools.md).

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

The `artifact_management` and `data_analysis` groups are special: the runtime auto-injects both onto every agent that does not opt out. If an agent never declares either group, the runtime prepends both, because workflow result-embeds and the data-shaping tools have to be available for the runtime's own machinery to function. To opt out (rare), set `auto_inject_artifact_tools: false` or `auto_inject_data_analysis_tools: false` on the agent config.

## MCP Tools

MCP tools are served by an external MCP server. The agent's configuration declares the toolset (the connection parameters, the auth scheme, and which tools to expose) and the runtime takes care of negotiating with the server, listing tools, and routing calls.

### Connection Transports

MCP supports three transports, selected by `connection_params.type`:

- `stdio`: spawn the MCP server as a subprocess and speak over its stdin/stdout. Used when the server is a local binary.
- `sse`: connect to a remote MCP server over Server-Sent Events.
- `streamable-http`: connect to a remote MCP server using the streamable-HTTP transport (the modern remote transport).

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
    credential:
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
    credential:
      client_id: "${MCP_OAUTH_CLIENT_ID}"
      client_secret: "${MCP_OAUTH_CLIENT_SECRET}"
    scheme:
      authorization_url: "https://idp.example.com/oauth2/authorize"
      token_url: "https://idp.example.com/oauth2/token"
      scopes: ["mcp:read", "mcp:write"]
  tool_name_prefix: "ex"
```

### Auth Options

`auth.type` accepts:

- `none` (or omit `auth:` entirely): no auth header.
- `bearer`: static `Authorization: Bearer <token>` from `credential.token`.
- `basic`: HTTP Basic from `credential.username` and `credential.password`.
- `headers`: arbitrary static headers from a `headers:` map. This is also how API-key-in-header auth is supplied. Declare the key under `connection_params.headers` rather than expecting a dedicated `apikey` auth type.
- `oauth2`: OAuth2 with per-user tokens. Credentials live under `credential:` (`client_id`, `client_secret`); the endpoints and scopes live under `scheme:` (`authorization_url`, `token_url`, `scopes`). MCP supports the authorization-code flow only — declare both `authorization_url` and `token_url`.

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

- `allow_list: [tool_name, ...]`: expose only these.
- `deny_list: [tool_name, ...]`: expose everything except these.
- `tool_name: <single>`: expose exactly one tool.
- `tool_name_prefix: <prefix>`: prepend a prefix to every exposed tool's name.

`allow_list`, `deny_list`, and `tool_name` are mutually exclusive. Combining any two is a parse-time error. `tool_name_prefix` composes freely with the other three.

LLM providers restrict tool names to `[a-zA-Z0-9_-]`, so the runtime sanitizes the prefix-plus-name before exposure. The prefix is what tells the LLM and the human reading the agent's call log which MCP toolset a tool came from.

### MCP Hardening

Consider these points before deploying MCP tools in production:

- Prefer `ca_bundle` to disabling verification. Setting `ssl_config.verify: false` is permitted for development but is not appropriate for production traffic.
- Use `allow_list` to limit attack surface. An MCP server's tool descriptions are attacker-controlled text from the agent's perspective. Prompt injection through a malicious tool description is a real consideration on third-party servers.
- Per-user OAuth tokens are scoped by `(agent, user, credential_key)`. Set `credential_key` explicitly when two MCP servers on the same agent might otherwise share storage.

## OpenAPI Tools

OpenAPI tools turn an OpenAPI specification into a set of tools the agent can call. Each operation in the spec becomes a tool; the tool name comes from the spec's `operationId`. The runtime issues HTTP calls directly. There is no separate process; the tool runs in-process.

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
...
```

### Spec Sources

Provide exactly one of:

- `specification_url: <url>`: fetch the spec at startup.
- `specification_file: <path>`: read a local file.
- `specification: <inline yaml or json>`: inline the spec into the agent config.

`specification_format: json|yaml` is an optional hint for inline specs when the format cannot be inferred.

### Auth Options

`auth.type` accepts `none`, `bearer`, `apikey`, `basic`, `oauth2`, and `serviceaccount`. The OAuth2 variants:

- `oauth2` with `authorization_url` set: authorization-code flow with per-user tokens that refresh on expiry. Used when each user authenticates against the API in their own right.
- `oauth2` with only `token_url` set: client-credentials flow with one shared token per agent. Used for machine-to-machine APIs.
- `serviceaccount`: Google Service Account flow. The `service_account_json` field carries the raw JSON of a service account key, which the runtime exchanges for a bearer token via a signed JWT.

`use_pkce: true` opts the authorization-code flow into Proof Key for Code Exchange (PKCE) when the IdP requires it (default is off for OpenAPI).

### Response Size and Filtering

The runtime caps the HTTP response body at 10 MiB by default to prevent a misbehaving API from exhausting agent memory. Override with `max_response_size: <bytes>`.

`allow_list` and `deny_list` work the same as MCP. Entries are `operationId` values from the spec.

## Remote Tools: Python

A remote tool is a tool authored in Python or Go that runs inside the Secure Tool Runtime rather than in-process. Remote tools appear on the agent's `tools:` list as `tool_type: builtin` with a `tool_name:` that matches an entry in the tool manifest. The runtime's dispatcher routes there when the name isn't in the in-process built-in registry.

Python tools use the [`sam-tool-sdk`](https://pypi.org/project/sam-tool-sdk/) package, which provides the base classes and the CLI runner. Two patterns cover the common cases.

### A Simple Function-Style Tool

For a single tool exposed by one binary, define a function, annotate its parameters with types, and wrap it with `tool_cli`:

```python
# tools/weather/weather.py
from sam_tool_sdk import SandboxToolContextFacade, ToolResult, tool_cli


def get_forecast(city: str, ctx: SandboxToolContextFacade) -> ToolResult:
    """Return the current forecast for a city.

    Args:
        city: City to look up the forecast for.
    """
    ctx.send_status(f"looking up forecast for {city}")
    return ToolResult.ok({"forecast": f"Sunny in {city}, 22 C."})


cli = tool_cli(get_forecast)


if __name__ == "__main__":
    cli()
```

The software development kit (SDK) reflects the function's type annotations into the JSON Schema the LLM sees. The docstring's first line becomes the tool's description and is **required** — the SDK rejects a tool with no docstring, because strict model providers such as Amazon Bedrock refuse a tool advertised with an empty description. The `Args:` section of the docstring supplies human-readable descriptions for each parameter. Annotating one parameter as `SandboxToolContextFacade` gives the handler access to `send_status`, `load_artifact`, and `call_llm`; the SDK injects the context at runtime and excludes it from the schema.

### A Multi-Tool Provider

When several related tools share configuration, helpers, or state, expose them from one executable using `DynamicToolProvider`. Subclass the provider, override the abstract `create_tools()` method, and register each tool after the class body with `@<Provider>.register_tool`:

```python
# tools/weather/weather_tools.py
from sam_tool_sdk import DynamicToolProvider, ToolResult, provider_cli


class WeatherTools(DynamicToolProvider):
    """A provider that exposes related weather tools."""

    def create_tools(self, tool_config=None):
        return []


@WeatherTools.register_tool
async def get_forecast(self, city: str) -> dict:
    """Return the current forecast for a city.

    Args:
        city: City to look up the forecast for.
    """
    return ToolResult.ok(
        message=f"Forecast for {city}",
        data={"forecast": f"Sunny in {city}, 22 C."},
    ).model_dump()


@WeatherTools.register_tool
async def get_alerts(self, region: str) -> dict:
    """Return active weather alerts for a region.

    Args:
        region: Region code to check for alerts.
    """
    return ToolResult.ok(
        message=f"Alerts for {region}",
        data={"alerts": []},
    ).model_dump()


cli = provider_cli(WeatherTools)


if __name__ == "__main__":
    cli()
```

The decorator must be applied after the class body, because the class name has to be bound before its classmethod can decorate the function. The `create_tools()` override is required because it is an `@abstractmethod` on the base provider class; return an empty list when all tools are declared via the decorator. `provider_cli(WeatherTools)` (the class itself, no parentheses) routes each invocation to the right tool based on the `tool_name` in the runner_args file.

### Manifest Entry

Each Python tool requires an entry in the tool manifest:

```yaml
# tools/weather/manifest.yaml
version: 1
tools:
  get_forecast:
    executable: weather
    tool_dir: weather
    timeout_seconds: 30
```

The Secure Tool Runtime probes `<tool_dir>/<executable>` first and `<tool_dir>/python/bin/<executable>` second. The convention is to `pip install --target python/` so the entry-point lands in `python/bin/`.

### Operator-Supplied Tool Configuration

A tool can take operator-supplied configuration through `tool_config:` on the agent's entry:

```yaml
# configs/agents/greeter_agent.yaml
tools:
  - tool_type: builtin
    tool_name: get_greeting
    tool_config:
      greeting_prefix: "Bonjour"
```

The runtime delivers `tool_config` to the tool process as part of the invocation envelope. The Python tool reads it from `self.tool_config`. This is how you wire credentials, endpoint URLs, and per-deployment behavior into a remote tool without rebuilding it.

## Remote Tools: Packaged SQL Tool

The runtime ships a remote tool that connects an agent to a persistent SQL database: Postgres, MySQL, SQLite (on-disk file), MS SQL Server, or Oracle. The binary ships with the Secure Tool Runtime image, which loads it from the configured toolsets directory. Use this tool when the agent needs to query a real database the operator runs. Use the in-process `query_data_with_sql` built-in (listed under [Built-In Tools](#built-in-tools)) when the agent should query a small in-memory copy assembled from artifacts within the conversation.

The tool is a remote tool but operators do not author it. They wire it into an agent by name and supply a connection string.

### Wiring

A single agent can attach multiple copies of the tool, one per database, by giving each a distinct outer `tool_name:`. The dispatcher routes by `_str_binary:` inside `tool_config`, so all copies share the same underlying binary while exposing different names and schemas to the LLM.

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
| `_str_binary` | string | — | yes | Names the Secure Tool Runtime binary to dispatch this entry to. Always `execute_sql_query` for this tool. |
| `tool_name` | string | — | yes | The LLM-facing tool name. Match the outer `tool_name:` on the agent's entry. |
| `tool_description` | string | — | no | Prose the LLM reads when deciding whether to call the tool. Best practice: list the tables and what the database is for. |
| `connection_string` | string | — | yes | The database URL. Treated as a secret. Supply via `${ENV_VAR}` rather than embedding credentials in the file. |
| `auto_detect_schema` | bool | `true` | no | When true, the runtime opens the database at startup, samples each table, and appends the schema YAML to `tool_description` so the LLM sees the column layout. |
| `schema_summary_override` | string | — | no | Hand-written schema summary used in place of introspection. Only consulted when `auto_detect_schema: false`. |
| `max_enum_cardinality` | int | `100` | no | Columns with at most this many distinct values appear as enums in the schema description. |
| `schema_sample_size` | int | `100` | no | Number of rows sampled per table during schema introspection. |

The `connection_string` URL scheme decides the database driver. The five schemes the runtime accepts:

- `postgres://user:pass@host:port/dbname` (or `postgresql://...`).
- `mysql://user:pass@host:port/dbname`.
- `sqlite:////absolute/path/to/file.db`: note the four slashes (three for the URL scheme, one for the absolute path). Use `sqlite:///:memory:` for an ephemeral in-process database.
- `sqlserver://user:pass@host:port?database=dbname` (or `mssql://...`).
- `oracle://user:pass@host:port/service_name`.

SQLAlchemy-style driver suffixes (`postgresql+psycopg2://`, `mysql+pymysql://`) are accepted and the `+driver` portion is ignored. This makes Agent Mesh YAML drop-in compatible with connection strings copied from Python codebases.

### Schema Introspection

When `auto_detect_schema: true`, the runtime opens the database during agent startup, samples each table up to `schema_sample_size` rows, and appends a YAML schema description to the `tool_description` the LLM sees. The description includes column names, types, foreign-key relations, and enum-like columns. With introspection off (or when the database is unreachable at startup) the LLM has to guess at column names. If the database is reachable but you do not want startup-time queries, set `auto_detect_schema: false` and supply a hand-written `schema_summary_override`.

A connection failure at startup does not block the agent. The runtime registers the tool with a warning prefix in its description so the LLM reads the database as currently unreachable. The next invocation retries the connection.

## Remote Tools: Go via `samtoolsdk`

Go remote tools are single-binary tools built against `samtoolsdk`. You do not install the SDK yourself: `sam toolset init <name> --lang go` scaffolds the toolset directory with a sample `main.go`, a `go.mod`, a `manifest.yaml`, and the SDK vendored under `_sdk/samtoolsdk/`. The Secure Tool Runtime dispatches Go tools the same way it dispatches Python tools; the difference is that the executable is a compiled Go binary and the parameter type is a Go struct rather than a JSON Schema.

A complete Go tool:

```go
// main.go
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

The Secure Tool Runtime runs each Go tool binary with the `--schema` flag at startup. The binary emits the tool's JSON Schema, including the parameter types derived from the Go struct's `json:` tags and `desc:` field annotations. It caches the result and publishes it to the Agent-Workflow Executor as part of the per-tool init message, so the agent sees the same schema the binary advertises. Use `schema_refresh_seconds:` on the manifest entry to override the default refresh interval (after rebuilding a tool, for example).

### Manifest Entry

```yaml
# manifest.yaml
version: 1
tools:
  greet:
    executable: greet
    tool_dir: greet
    timeout_seconds: 10
```

Drop the compiled binary at `<tool_dir>/<executable>` and the Secure Tool Runtime picks it up.

### Dual-Target Builds

The host runs the Secure Tool Runtime in one of three modes: `direct` (the binary runs natively, no isolation), `bwrap` (the binary runs natively inside Linux user namespaces with `prlimit` resource caps), or `prlimit-only` (resource caps but no namespacing). The `bwrap` and `prlimit-only` modes still target the host architecture; deploying a Go tool to a Linux-based Kubernetes cluster from a macOS workstation needs a Linux binary regardless.

For a tool you run on the local Secure Tool Runtime, a plain `go build` to the tool directory is enough. It picks the binary up at the path the manifest declares.

For a tool you ship to a deployed Secure Tool Runtime (the Platform service), use `sam config apply` and let the CLI cross-compile for the target. It queries the Platform service for the deployed architecture and produces a matching binary automatically. Set `SAM_TOOL_TARGET_OS` and `SAM_TOOL_TARGET_ARCH` to override the target when the platform is unreachable. A fleet running mixed architectures fails fast at apply time rather than picking one silently.

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

- `WithTimeout(n)`: per-tool timeout in seconds.
- `WithInstructions(s)`: long-form LLM guidance attached to the tool.
- `WithVolumeParams(...)`: declare volume mounts the tool expects.
- `WithConfigSchema(...)`: declare the shape of operator-supplied `tool_config:` so the platform UI can render a form for it.
- `WithAuth(...)`: declare an auth requirement (OAuth flow) the runtime should drive before invoking the tool.

## The Tool Sandbox Model

Every remote tool (Python or Go) runs inside the Secure Tool Runtime sandbox. The sandbox model has two operator knobs.

### Modes

`sandbox.mode` in the Secure Tool Runtime configuration selects how sandboxed tools are isolated:

| Mode            | Isolation                                                                 | When to use |
| --------------- | ------------------------------------------------------------------------- | ----------- |
| `direct`        | None. Tools run as ordinary subprocesses with the Secure Tool Runtime's UID and environment. | Local development only. |
| `prlimit-only`  | `prlimit` resource caps (CPU, file size, open files, processes, stack), but no namespacing. | Hosts where `bubblewrap` is unavailable but resource caps are still wanted. |
| `bwrap`         | Linux user namespaces via `bubblewrap`, plus `prlimit` resource caps.     | Production deployments on Linux. |

Do not use `direct` in production. It does not isolate the tool from the host, and any credentials in the Secure Tool Runtime's environment are visible to the tool. Use `bwrap` on Linux for full isolation, falling back to `prlimit-only` if `bubblewrap` is not installed.

### Profiles

Within `bwrap` and `prlimit-only` modes, each tool runs under a named profile. The shipped profiles:

- `standard`: host filesystem mounted read-only; network unrestricted. The default.
- `restrictive`: no network access (the network namespace is unshared).
- `permissive`: relaxed filesystem and network isolation for tools that legitimately need broader host access.

Pick `restrictive` for tools that do not need network access: image transforms, PDF extraction, local file conversion. Pick `permissive` only for tools that document a need for it.

Set the profile per tool in the tool manifest:

```yaml
# manifest.yaml
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

The container layer (Kubernetes) intentionally enforces memory limits rather than `prlimit --as`, because address-space limits on Go binaries collide with the runtime's heap reservation.

### Timeouts

`timeout_seconds:` is the wall-clock budget for a single tool invocation. The Secure Tool Runtime cancels the tool process if it overruns. The default is 300 seconds; lower it for tools that should finish quickly, or raise it for tools that legitimately need longer to finish (large file conversions, long-running searches, multi-step workflows).

## Skill-Bundled Tools

When a tool is part of a skill, it does not appear on the agent's `tools:` list directly. The agent declares the skill under `skills:`, and the runtime registers the tool automatically with the prefixed name `<skill>__<tool>`. For the bundle layout, the `SKILL.md` manifest, and the lazy-loading behavior that makes skill-bundled tools work, see [Creating Skills](./skills.md).

The tools inside a skill are themselves Python or Go remote tools. The authoring patterns on this page apply unchanged. What differs is the loading mechanism and the namespacing.

### Toolsets vs Skills

Toolsets and skills are separate constructs, not synonyms. Both can bundle remote tools that run in the Secure Tool Runtime. They differ in how they are delivered to the runtime and when the runtime loads them:

|  | Toolset | Skill |
| --- | --- | --- |
| What it is | Platform-uploaded zip of remote tools | `SKILL.md` bundle: instructions + optional `references/`, `assets/`, `tools/` |
| When it loads | Always-on, expanded into the agent's tool list at deploy time | On demand, when the LLM calls `load_skill` |
| Carries tools? | Always | Optional |

A skill can ship tools or be instruction-only. An instruction-only skill is just `SKILL.md` plus optional `references/` and `assets/` — no `tools/` directory and no `tools/manifest.yaml`. Add a `tools/manifest.yaml` and the skill also carries sandboxed remote tools named `<skill>__<tool>`.

## Next Steps

- To wire a tool into an agent and shape the LLM loop around it, see [Creating Agents](./agents/index.md).
- To bundle reusable tools with the instructions that drive their use, see [Creating Toolsets](./toolsets.md).
- For the framing of when to configure a tool in YAML versus build one in Go, see [Extending Agent Mesh: Configuration or Code](../concepts/configured-vs-built.md).
