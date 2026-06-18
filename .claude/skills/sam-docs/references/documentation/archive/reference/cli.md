---
title: CLI Reference
description: Every sam command and flag, covering scaffolding, run, tasks, auth, declarative configuration, evaluations, tools, and control-plane commands.
sidebar_position: 1
---

# CLI Reference

The Solace Agent Mesh CLI (`sam`) is the single binary that scaffolds projects, runs the local stack, sends tasks, authenticates the CLI to a Platform service, applies declarative configuration, runs evaluations, and inspects built-in tools.

Run `sam --help` for the current top-level command list, or `sam <command> --help` for a subcommand's flags. This page enumerates every subcommand and its flags as a one-stop reference.

## Conventions

- Square brackets (`[FLAGS]`) denote optional arguments. Angle brackets (`<NAME>`) denote required positional arguments.
- Flag short forms (`-a`) and long forms (`--agent`) are interchangeable. Where both exist, the table shows them together.
- The default value column shows the literal default. Where the default reads from an environment variable, the env var name is shown.
- "Target" everywhere means the `sam auth login` cache entry for a Platform service URL. Resolution order is documented under `sam api`.

## Top-Level

```text
sam [--version] [--show-console] <command> [flags]
```

With no subcommand, `sam` launches the desktop app (when using the desktop binary `sam-desktop` or `sam-desktop-enterprise`); otherwise it prints help.

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--version` | bool | — | Print the `sam` version and exit. |
| `--show-console` | bool | `false` | Show the in-app developer console overlay (testing only). |

---

## `sam run`

Run Agent Mesh apps from one or more YAML files. With no positional arguments, `sam run` discovers every `*.yaml` under `configs/`.

By default `sam run` launches each Go component (the Gateway Executor (GWE), the Agent-Workflow Executor (AWE), the Secure Tool Runtime (STR), and any peer agents) as a subprocess and connects them through a TCP `devbroker`. Pass `--embedded` to collapse all components into goroutines sharing an in-memory broker inside a single process. No subprocesses, no TCP.

```text
sam run [FILES...] [FLAGS]
```

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--skip <FILE>` | `-s` | — | Skip a specific config file (repeatable). |
| `--system-env` | — | `false` | Use only the inherited process environment; do not load `.env`. |
| `--embedded` | — | `false` | Run all Go components in-process with an in-memory broker. Single-process, single-binary. |
| `--static-dir <PATH>` | — | (embedded assets) | Directory with frontend static assets (served at `/` in embedded mode). |
| `--trace-file <PATH>` | — | — | NDJSON dev-broker message-trace output. |
| `--trace-filter <PATTERN>` | — | — | Topic filter for tracing (Solace wildcards; repeatable). Default: trace all. |
| `--trace-acks` | — | `false` | Also trace message ACK events. |
| `--listen <ADDR>` | — | — | Gateway/proxy listen address (for example, `:8080`). **Embedded mode only.** |
| `--health-addr <ADDR>` | — | — | Health-probe listen address (for example, `:8090`, or `disabled` to skip). **Embedded mode only.** |
| `--debug-subscribe <TOPIC>` | — | — | Subscribe a logging consumer to this topic on the shared broker (repeatable, wildcards allowed). **Embedded mode only**; non-embedded use is a hard error. |
| `--debug-subscribe-file <PATH>` | — | — | Write `--debug-subscribe` events as newline-delimited JSON to this file (truncated on startup) instead of stderr. **Embedded mode only.** |
| `--network-broker-port <PORT>` | — | `0` | When `>0`, start a TCP `DevBrokerServer` on this port so external STR containers or Python processes can connect to the embedded broker. `0` = no TCP server. **Embedded mode only.** |

---

## `sam task run`

Start Agent Mesh from a configuration directory, send a single task to an agent, stream the response, then stop. Useful for CI and one-shot scripted runs. The entire stack lives only for the duration of the call.

```text
sam task run <MESSAGE> [FLAGS]
```

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--config <FILE>` | `-c` | — | Config file to load (repeatable). |
| `--skip <FILE>` | `-s` | — | Skip a config file (repeatable). |
| `--url <URL>` | `-u` | `SAM_WEBUI_URL` or `http://localhost:8800` | Gateway URL. |
| `--agent <NAME>` | `-a` | `SAM_AGENT` or `orchestrator` | Target agent name. |
| `--session-id <ID>` | — | — | Continue an existing session by ID. |
| `--file <PATH>` | `-f` | — | Attach a file as an artifact (repeatable). |
| `--timeout <DURATION>` | — | `5m` | Per-task timeout (for example, `5m`, `300s`). |
| `--startup-timeout <DURATION>` | — | `1m` | Maximum wait for the embedded stack to become ready (for example, `60s`, `2m`). |
| `--output-dir <PATH>` | `-o` | — | Write returned artifacts to this directory. |
| `--quiet` | `-q` | `false` | Print only the final response (no streaming chunks). |
| `--no-stim` | — | `false` | Disable STIM (status/info/metric) event capture. |
| `--system-env` | — | `false` | Use only the inherited process environment. |
| `--debug` | — | `false` | Enable verbose debug output. |
| `--data <STRING>` | `-d` | — | Send a JSON DataPart payload alongside the message. Inline JSON, or `@path/to/file.json` to load from disk. |
| `--si-input-schema <PATH>` | — | — | Structured-input schema (JSON Schema). |
| `--si-output-schema <PATH>` | — | — | Structured-output schema (JSON Schema). |
| `--trace-file <PATH>` | — | — | Broker-trace log path. |
| `--trace-filter <PATTERN>` | — | — | Trace topic filter (repeatable). |
| `--trace-acks` | — | `false` | Include broker acks/nacks in the trace. |
| `--mock-llm` | — | `false` | Run against the in-process mock LLM (testing). |
| `--mock-llm-addr <ADDR>` | — | `127.0.0.1:8088` | Mock LLM bind address. |
| `--mock-llm-delay <DURATION>` | — | `0` | Per-token mock-LLM delay. |
| `--mock-llm-scenario <FILE>` | — | — | Mock-LLM scenario YAML (repeatable). |
| `--message-file <PATH>` | — | — | Read the message body from a file instead of the positional argument. |
| `--hil-auto-approve` | — | `false` | Auto-approve every human-in-the-loop prompt. |
| `--open-browser` | — | `true` | Open the streamed task in a browser tab (set `false` to disable). |

---

## `sam task send`

Send a task to an already-running gateway and stream the response. Target and token resolution mirror `sam api`, so a `sam auth login` cache works with no flags. The one difference: when nothing resolves, `sam task send` falls back to `http://localhost:8800`. That is convenient after a local `sam run`, but a risk in CI. In CI or platform deployments, always pin a target explicitly.

```text
sam task send <MESSAGE> [FLAGS]
```

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--url <URL>` | `-u` | — | Gateway URL. Highest priority in target resolution. |
| `--target <NAME>` | — | — | Use this `sam auth login` cache entry. |
| `--manifest <FILE>` | `-m` | — | Read target URL/name from this manifest. |
| `--insecure` | — | `false` | Allow bearer tokens over plain `http://`. |
| `--agent <NAME>` | `-a` | `SAM_AGENT` or `orchestrator` | Target agent name. |
| `--session-id <ID>` | — | — | Continue an existing session by ID. |
| `--file <PATH>` | `-f` | — | Attach a file as an artifact (repeatable). |
| `--timeout <DURATION>` | — | `2m` | Per-task timeout (for example, `2m`, `90s`). |
| `--output-dir <PATH>` | `-o` | — | Write returned artifacts to this directory. |
| `--quiet` | `-q` | `false` | Print only the final response. |
| `--no-stim` | — | `false` | Disable STIM event capture. |
| `--debug` | — | `false` | Verbose debug output. |
| `--data <STRING>` | `-d` | — | Send a JSON DataPart payload alongside the message. Inline JSON, or `@path/to/file.json` to load from disk. |
| `--si-input-schema <PATH>` | — | — | Structured-input schema. |
| `--si-output-schema <PATH>` | — | — | Structured-output schema. |
| `--message-file <PATH>` | — | — | Read the message body from a file. |
| `--hil-respond <HIL-REQUEST-FILE>` | — | — | Load a saved HIL request JSON file (for example, `hil_request_<id>.json` written by an earlier `task send`), post the answer supplied via `--hil-answer`, and stream the remaining output. |
| `--hil-answer <ANSWER>` | — | — | JSON answer payload for `--hil-respond` (inline JSON or `@filepath`). |
| `--hil-approve <HIL-REQUEST-FILE>` | — | — | Approve a saved tool-approval HIL request file and stream the remaining output. |
| `--hil-deny <HIL-REQUEST-FILE>` | — | — | Deny a saved tool-approval HIL request file and stream the remaining output. |
| `--hil-auto-approve` | — | `false` | Auto-approve every human-in-the-loop prompt inline (no exit). |
| `--open-browser` | — | `true` | Open the streamed task in a browser tab (set `false` to disable). |

**Target resolution (highest → lowest):** `--url` → `--target` → `--manifest` → `SAM_WEBUI_URL` → the single cached entry (if exactly one) → `http://localhost:8800`.

**Token precedence (highest → lowest):** `SAM_AUTH_TOKEN` → `SAM_PLATFORM_TOKEN` → cached OAuth (auto-refreshed). There is no `--token` flag; supply tokens via the environment or `sam auth login`. The CLI refuses bearer tokens over `http://` unless you pass `--insecure`.

**Examples:**

```bash
sam task send "What is the weather today?"
sam task send "Analyze this" --agent data_analyst
sam task send "Summarize this document" --file ./document.pdf
sam task send --target dev "Run the data pipeline"
sam task send "Continue" --session-id abc-123
```

---

## `sam api`

Authenticated HTTP client for the Agent Mesh gateway, modeled after `gh api`. Reuses the cached OAuth token from `sam auth login`, supports `gh`-style typed JSON-body construction, and follows the Agent Mesh `PaginatedResponse[T]` envelope when you pass `--paginate`.

```text
sam api [METHOD] <PATH> [FLAGS]
```

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--method <VERB>` | `-X` | `GET` (or `POST` when a body is provided) | HTTP method. |
| `--header <H>` | `-H` | — | Extra request header (repeatable). Format: `"Name: value"`. |
| `--field <KEY=VAL>` | `-F` | — | Typed JSON field. `true` / `false` / `null` and numeric literals become JSON literals. `key[]=v` accumulates an array. `key.sub=v` builds a nested object. |
| `--raw-field <KEY=VAL>` | — | — | String JSON field (no type coercion). |
| `--input <PATH or ->` | — | — | Read the body from a file or stdin. |
| `--jq <FILTER>` | — | — | Filter the response with a jq expression. |
| `--raw` | — | `false` | Print the response verbatim, no formatting. |
| `--include` | `-i` | `false` | Print the status line and headers before the body. |
| `--paginate` | — | `false` | Follow `meta.pagination` and merge the `data` arrays. |
| `--target <NAME>` | — | — | Use this `sam auth login` cache entry. |
| `--url <URL>` | — | — | Override the resolved target URL. |
| `--manifest <FILE>` | `-m` | — | Read target from this manifest. |
| `--insecure` | — | `false` | Skip TLS verification on `https://`, allow plain `http://` URLs (the CLI refuses any `http://` target without this flag, with or without a token), and permit bearer tokens over `http://`. |
| `--verbose` | `-v` | `false` | Print request and response timing details. |

**Body construction.** `--field` is typed; `--raw-field` is always a JSON string. Use `key[]=val` to accumulate arrays; `key.sub=val` to build nested objects. `--input -` reads stdin; `--input @file.json` reads from a file.

**Target resolution (highest → lowest):** `--url` (or a bare hostname) → `--target` → `--manifest` → `SAM_WEBUI_URL` → the single cached entry. Unlike `sam task send`, `sam api` has no `localhost:8800` fallback. An unresolved target is a hard error.

**Token precedence:** identical to `sam task send`.

**Exit codes:** `0` (success), `1` (4xx), `2` (5xx or usage error), `3` (target-URL resolution, network, TLS, or response-decode failure). On non-2xx, `sam api` writes the error envelope to stdout for scripting and a one-line summary including `errorId` to stderr.

**Examples:**

```bash
sam api /api/v1/agents
sam api /api/v1/agents --jq '.data[].name'
sam api /api/v1/agents --paginate --jq '.data[].id'
sam api -X POST /api/v1/projects --field name=demo --field description="ad-hoc test"
sam api -X PATCH /api/v1/agents/$ID --field 'tags[]=oncall' --field 'tags[]=beta'
sam api -i /api/v1/nonexistent          # status line + headers + body, exit 1 on 404
sam api /api/v1/agents/$ID --input agent.json -X PUT
sam api --target dev /api/v1/user
```

---

## `sam auth`

Manage cached OAuth credentials for one or more Platform service targets. All `sam auth` subcommands share `--target`, `--url`, and `--manifest` for selecting which target to operate on.

```text
sam auth <subcommand> [target-or-url] [FLAGS]
```

| Subcommand | Description |
| --- | --- |
| `sam auth login [target-or-url]` | Open a browser, complete the OAuth flow, and cache the result. The positional argument is the canonical way to specify the platform target (a cached target name, or a full URL). |
| `sam auth logout` | Revoke and remove the cached credentials for a target. |
| `sam auth list` | List every target with cached credentials. |
| `sam auth status` | Show login status for a specific target. |

**Shared flags:**

| Flag | Short | Description |
| --- | --- | --- |
| `--target <NAME>` | — | Cache key for this command (defaults to the URL host or, on `login`, the positional argument). |
| `--url <URL>` | — | Platform service URL (for example, `https://platform.dev.example.com`). |
| `--manifest <FILE>` | `-m` | **Deprecated.** Read URL/name from a manifest file. Pass the hostname positionally to `sam auth login` instead. |
| `--format <text\|json>` | — | Output format. `json` emits machine-readable JSON. (`list` and `status` only; default `text`.) |

**`sam auth login` additional flags:**

| Flag | Default | Description |
| --- | --- | --- |
| `--timeout <DURATION>` | `90s` | Maximum wait for the browser callback. |

---

## `sam config`

Manage the declarative-config workflow against a running Platform service. `sam config` is the operator's surface for spec-driven deployments: a directory of YAML resources (agents, projects, RBAC roles, identity claims, MCP integrations, …) reconciled idempotently with `sam config apply`.

```text
sam config <subcommand> [FLAGS]
```

| Subcommand | Description |
| --- | --- |
| `sam config apply` | Apply a manifest's resources to a running platform. |
| `sam config plan` | Show changes a manifest would apply, without mutating state. |
| `sam config refresh` | Wipe the local source cache used by `sam config apply` and `sam config plan`. |
| `sam config pull` | Serialize a running platform's state into spec-format YAML. |
| `sam config migrate` | Convert legacy Solace AI Connector (SAC) YAML to clean-spec YAML (bootstrap only). |
| `sam config schema` | Print the auto-generated schema for declarative-config kinds. |
| `sam config cache` | Inspect and prune local caches used by `sam config`. |

`sam config apply` and `sam config plan` share a base flag set; the table below documents those once, then each subcommand lists only its extras.

**Shared `apply` / `plan` flags:**

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--manifest <FILE>` | `-m` | (required) | Path to the manifest YAML. |
| `--url <URL>` | — | — | Platform URL to apply to; overrides the manifest's `target.url`. |
| `--target <NAME>` | — | — | Named `sam auth login` target whose URL to apply to; overrides the manifest's `target.url` (alternative to `--url`). |
| `--no-color` | — | `false` | Disable ANSI color in plan output. |
| `--verbose` | `-v` | `false` | Show per-field diffs for updated resources. Auth secrets render as `(changed)`. |
| `--allow-floating-refs` | — | `false` | Permit manifest sources without a pinned ref (branch, short SHA, HEAD). Resolution becomes non-reproducible; a warning prints per floating ref. |
| `--no-cache` | — | `false` | Bypass the source cache; force a fresh clone for every git source. |
| `--no-build` | — | `false` | Skip toolset build steps. On `plan`, cache misses surface as `[BUILD: skipped]`. On `apply`, cache misses are a hard error. |
| `--no-interactive` | — | `false` | Do not prompt for OAuth login when the token cache is empty (useful in CI). |

### `sam config apply`

In addition to the shared flags:

| Flag | Default | Description |
| --- | --- | --- |
| `--prune` | `false` | Delete resources that exist on the platform but aren't in the manifest. |
| `--dry-run` | `false` | Compute the plan but do not mutate the platform (equivalent to `sam config plan`). |
| `--no-deploy` | `false` | Run config sync (phase 1) but skip deployment (phase 2). Use to reconcile configuration without redeploying running services. |
| `--force-toolset` | `false` | Append `?force=true` to toolset uploads so the platform overwrites a package currently referenced by deployed agents (the platform auto-redeploys affected agents). Without this flag the upload returns `409 PackageInUse`. |

### `sam config plan`

Uses only the shared `apply`/`plan` flag set documented above. No extras.

### `sam config refresh`

Wipes the local source cache used by `sam config apply` and `sam config plan`. The cache lives at `$XDG_CACHE_HOME/sam/sources` (or `~/.cache/sam/sources` when `XDG_CACHE_HOME` is unset). Pinned refs (tags, full SHAs) live in the cache forever. Use `refresh` to evict them manually and force a re-fetch. Running on a missing cache directory is a no-op.

| Flag | Default | Description |
| --- | --- | --- |
| `--cache-root <PATH>` | `$XDG_CACHE_HOME/sam/sources` (or `~/.cache/sam/sources`) | Override the cache root. |

### `sam config pull`

Serializes a running platform's state into spec-format YAML. `--output` is required (Cobra-enforced); one of `--url` / `--target` is also required and validated at run time.

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--output <DIR>` | `-o` | (required) | Directory to write the pulled YAML repo into. |
| `--url <URL>` | — | (required) | Platform URL to pull from. |
| `--target <NAME>` | — | — | Named `sam auth login` target to pull from (alternative to `--url`). |
| `--auth-type <TYPE>` | — | — | Auth type for the target (for example, `bearer`). |
| `--auth-env <VAR>` | — | — | Env var holding the auth token. |
| `--force` | — | `false` | Wipe the contents of `--output` before writing. |
| `--merge` | — | `false` | Keep files for resources not on the platform; rewrite only files for resources that are pulled. |
| `--only <KIND>` | — | — | Restrict the pull to one kind: `model`, `connector`, `toolset`, `skill`, `agent`, `gateway`, `workflow`, `dataset`, `evaluator`, `experiment`, `rbacRole`, `rbacClaimMapping`, or `rbacAssignment`. `sam config pull` also accepts the legacy `kind=X` form. |
| `--name <NAME>` | — | — | Restrict the pull to a single resource by name. |
| `--manifest-name <NAME>` | — | (auto-generated) | Override the generated manifest filename (default `pulled-<UTC timestamp>.yaml`). |

### `sam config migrate`

```text
sam config migrate <LEGACY-PATH> <OUTPUT-PATH> [FLAGS]
```

| Flag | Default | Description |
| --- | --- | --- |
| `--dry-run` | `false` | Print the converted YAML to stdout. |
| `--force` | `false` | Overwrite an existing output file. |
| `--report <PATH>` | — | Write a JSON migration report. |

### `sam config schema`

| Subcommand | Description |
| --- | --- |
| `sam config schema list` | List every declarative-config kind with a one-line description. |
| `sam config schema show <KIND>` | Show the field schema for a kind. |
| `sam config schema example <KIND>` | Print a templated YAML example. |
| `sam config schema manifest` | Print the manifest format reference. |
| `sam config schema layout` | Print the directory layout reference. |

`list`, `show`, and `manifest` accept `--format markdown|json`. `show` and `example` accept `--type` and `--subtype` to disambiguate kinds with type/subtype discriminators. `example` additionally accepts `--name` (the seed name for the rendered resource). `layout` has no flags.

### `sam config cache`

| Subcommand | Description |
| --- | --- |
| `sam config cache prune` | Remove stale entries from the toolset build cache. |

**`sam config cache prune` flags:**

| Flag | Default | Description |
| --- | --- | --- |
| `--repo <PATH>` | (working directory) | Repo root containing `toolsets/`. |
| `--all` | `false` | Remove every cached entry regardless of age or size. Mutually exclusive with `--max-age` and `--max-size`. |
| `--max-age <DURATION>` | `720h` (30 days) | Remove entries older than this duration (for example, `168h`, `720h`). |
| `--max-size <BYTES>` | `0` (no cap) | Cap total cache size in bytes; oldest entries are evicted until the running total fits. |

---

## `sam eval`

Run evaluation suites locally, or trigger and watch platform-managed eval experiments.

```text
sam eval <subcommand> [FLAGS]
```

| Subcommand | Description |
| --- | --- |
| `sam eval suite <PATH>` | Run an evaluation suite from a local JSON config. |
| `sam eval run <EXPERIMENT-NAME>` | Trigger a platform-managed experiment by name and poll to completion. |
| `sam eval list` | List experiments registered on the platform. |

### `sam eval suite`

| Flag | Default | Description |
| --- | --- | --- |
| `-v` | `false` | Verbose output (per-case results). |

### `sam eval run`

| Flag | Default | Description |
| --- | --- | --- |
| `--url <URL>` | — | Platform URL. Resolves like `sam api` (`--url` > `--target` > `--manifest` > `SAM_WEBUI_URL` > single cached login). |
| `--target <NAME>` | — | Cached `sam auth login` target name. |
| `--manifest <FILE>` (`-m`) | — | Read the target URL from this manifest. |
| `--insecure` | `false` | Allow bearer tokens over plain `http://`. |
| `--timeout <DURATION>` | `30m` | Maximum wait for the experiment to complete. |
| `--threshold <FLOAT>` | `1.0` | Pass threshold (0.0–1.0). Lower scores exit non-zero. |
| `--format <text\|json>` | `text` | Output format. `json` emits the run summary as JSON. |
| `--output-dir <PATH>` (`-o`) | — | Download each run's per-example trace under this directory. |
| `--watch` | `true` | Stream progress events while polling. |
| `--cancel-on-interrupt` | `true` | Cancel the platform-side run on Ctrl-C. |
| `--poll-every <DURATION>` | `2s` | Polling interval. |

### `sam eval list`

| Flag | Default | Description |
| --- | --- | --- |
| `--url <URL>` | — | Platform URL. Resolves like `sam api` (`--url` > `--target` > `--manifest` > `SAM_WEBUI_URL` > single cached login). |
| `--target <NAME>` | — | Cached `sam auth login` target name. |
| `--manifest <FILE>` (`-m`) | — | Read the target URL from this manifest. |
| `--insecure` | `false` | Allow bearer tokens over plain `http://`. |
| `--format <text\|json>` | `text` | Output format. `json` emits the experiment list as a JSON array. |

---

## `sam toolset`

Scaffold and maintain toolset directories in a declarative-config repo. The injected SDK is embedded in the CLI binary, so subcommands require no network access.

```text
sam toolset <subcommand> [FLAGS]
```

| Subcommand | Description |
| --- | --- |
| `sam toolset init <NAME> [PATH]` | Scaffold a new toolset. Requires `--lang go\|python`. |
| `sam toolset validate <NAME> [PATH]` | Build a toolset for your host and run the STR's `--schema` discovery against it to confirm tools load before packaging. |
| `sam toolset sync [PATH]` | Re-vendor the SDK in one or every toolset. |
| `sam toolset package <NAME> [PATH]` | Build a toolset and zip it into a WebUI-uploadable bundle you upload through the Toolsets web UI. |
| `sam toolset build-target` | Print the GOOS/GOARCH the deployed STR expects toolset binaries to use. |

| Flag | Default | Description |
| --- | --- | --- |
| `--lang go\|python` | — | Toolset language. Required for `init`; on `sync`, overrides the inferred language. |
| `--force` | `false` | Overwrite an existing non-empty toolset directory (for `init`). |
| `--name <NAME>` | — | Sync only this toolset (for `sync`). |
| `--url <URL>` | — | Platform URL to auto-detect the build target. Used by `package` and `build-target`; falls back to `SAM_TOOL_TARGET_OS` / `SAM_TOOL_TARGET_ARCH`, then `linux/arm64`. |
| `--target <NAME>` | — | Named `sam auth login` target to auto-detect the build target from (alternative to `--url`). |
| `--output <PATH>` (`-o`) | `<NAME>.zip` | Output zip path (for `package`). |
| `--format <text\|json\|shell>` | `text` | `build-target` output format. `shell` emits `GOOS=… GOARCH=…` pairs, suitable for `eval "$(sam toolset build-target --format shell --url URL)"`. |

`sam toolset package` does not upload to the platform; it produces a local zip you then upload through the web UI (or include in a bundled agent upload). The build target governs how dependencies are cross-installed (Python) or cross-compiled (Go); see Building → Toolsets. A fleet running mixed architectures fails fast rather than choosing one silently.

---

## `sam skill`

Scaffold and package deployable skill bundles (skills uploaded to the Platform service). To install or check the `sam-declarative-config` authoring skill, see `sam ai-assistance`.

```text
sam skill <subcommand> [FLAGS]
```

| Subcommand | Flags | Description |
| --- | --- | --- |
| `sam skill init <NAME> [PATH]` | `--force`, `--with-tool`, `--lang <go\|python>` | Scaffold a new `skills/<name>/` bundle (`SKILL.md` + `references/`). `--with-tool` adds a sample bundled tool under `tools/<name>/`; `--lang` selects its language (`go` default, or `python`) and implies `--with-tool`. |
| `sam skill validate <NAME> [PATH]` | — | Build the skill's bundled tools for your host and run the STR's `--schema` discovery, confirming each tool loads and reporting the agent-facing `<skill>__<tool>` name before you package. |
| `sam skill sync [PATH]` | `--name <NAME>` | Re-vendor the embedded Go SDK in one or every skill's bundled Go tools (`skills/<name>/tools/<dir>/` with a `go.mod`). Skills without bundled Go tools are skipped. |
| `sam skill package <NAME> [PATH]` | `--url <URL>`, `--target <NAME>`, `--output <PATH>` (`-o`) | Build a skill (compiling bundled Go tools, building native wheels for bundled Python tools) and zip it into a WebUI-uploadable bundle. |
| `sam skill build-target` | `--url <URL>`, `--target <NAME>`, `--format <text\|json\|shell>` | Print the GOOS/GOARCH the deployed STR expects bundled skill tool binaries to use. Identical to `sam toolset build-target` (the STR target is platform-wide). |

These mirror `sam toolset`, so a skill author never has to reach for the toolset commands.

---

## `sam ai-assistance`

Manage AI-coding-assistant guidance the CLI generates for itself. The only subgroup today is `skill`, which installs and checks the `sam-declarative-config` authoring skill: Claude Code (and compatible) guidance generated from the CLI's own DTO schemas. This is distinct from `sam skill`, which packages deployable skills.

```text
sam ai-assistance skill <subcommand> [FLAGS]
```

| Subcommand | Flags | Description |
| --- | --- | --- |
| `sam ai-assistance skill install` | `--to <DIR>` (default `.claude/skills`), `--force` | Write the authoring skill to disk. |
| `sam ai-assistance skill check` | `--path <DIR>` | Verify the installed authoring skill matches this CLI version. |

---

## `sam control`

Manage running Agent Mesh components (agents, workflows, and other AWE-hosted instances) via the broker-routed control plane. Requires a running broker (dev broker or Solace) that the CLI can reach; configure the connection via `SAM_DEV_BROKER_HOST` / `SAM_DEV_BROKER_PORT` or `SOLACE_BROKER_URL`.

```text
sam control <subcommand> [FLAGS]
```

| Subcommand | Description |
| --- | --- |
| `sam control list` | List all running components. |
| `sam control get <NAME>` | Show details of one component. |
| `sam control start <NAME>` | Start a stopped instance. |
| `sam control stop <NAME>` | Stop a running instance. |
| `sam control delete <NAME>` | Stop and remove an instance. Prompts for confirmation in an interactive terminal; pass `--force` to skip. |
| `sam control create <CONFIG-FILE>` | Create a new instance from a YAML config file. |

Every subcommand accepts `--format text|json` (`text` is the default; `json` emits the raw server response).

| Persistent flag | Default | Description |
| --- | --- | --- |
| `--namespace <NS>` | `solace-agent-mesh` | Agent Mesh namespace. |
| `--timeout <DURATION>` | `30s` | Control-plane request timeout. |

`sam control delete` additionally accepts `--force` to skip the confirmation prompt.

---

## `sam volume`

Note: `sam volume` is a hidden/internal command (not shown in `sam --help`).

Manage Agent Mesh volumes. A volume is a named filesystem-store entry that tools use for persistent file access across `sam run` invocations.

```text
sam volume <subcommand> [FLAGS]
```

| Subcommand | Description |
| --- | --- |
| `sam volume list` | List all volumes. Accepts `--format text\|json`. |
| `sam volume create <NAME>` | Create a new volume. |
| `sam volume delete <ID-OR-NAME>` | Delete a volume. Prompts for confirmation in an interactive terminal; pass `--force` to skip. |
| `sam volume get <ID-OR-NAME>` | Show volume details. Accepts `--format text\|json`. |

| Persistent flag | Default | Description |
| --- | --- | --- |
| `--root <DIR>` | `<XDG cache dir>/sam/volumes` (for example, `~/.cache/sam/volumes` on Linux) | Volume root directory. |

**`sam volume create` flags:**

| Flag | Default | Description |
| --- | --- | --- |
| `--ttl <DURATION>` | `0` (no expiry) | Time-to-live (for example, `24h`, `7d`). |
| `--description <TEXT>` | — | Human-readable volume description. |

---

## `sam str`

Manage the STR (Secure Tool Runtime) container.

```text
sam str <subcommand> [FLAGS]
```

| Subcommand | Description |
| --- | --- |
| `sam str build` | Build the STR container image. |
| `sam str status` | Show container and image status. |

**`sam str build` flags:**

| Flag | Default | Description |
| --- | --- | --- |
| `--str-binary <PATH>` | (auto) | Override the STR binary path baked into the image. |

---

## `sam docs`

Start a local web server for the Agent Mesh documentation site (this site).

```text
sam docs [FLAGS]
```

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--port <PORT>` | `-p` | `8585` | Port to listen on. |

---

## Environment Variables

Variables consumed by multiple subcommands:

| Variable | Used by | Purpose |
| --- | --- | --- |
| `SAM_WEBUI_URL` | `sam task run`, `sam task send`, `sam api` | Default gateway URL when no `--url` / `--target` is given. |
| `SAM_AGENT` | `sam task run`, `sam task send` | Default agent name. |
| `SAM_AUTH_TOKEN` | `sam task run`, `sam task send`, `sam api` | Bearer token (overrides the cached OAuth token). |
| `SAM_PLATFORM_TOKEN` | `sam task send`, `sam api` | Lower-precedence bearer token (overridden by `SAM_AUTH_TOKEN`). |
| `SAM_DEV_BROKER_HOST` / `SAM_DEV_BROKER_PORT` | `sam control`, `sam run` | Dev broker connection for the control plane. `SAM_DEV_BROKER_PORT` is the canonical name; the legacy `DEV_BROKER_PORT` is still read as a fallback. |
| `SAM_HOME` | All commands | Override the Agent Mesh home directory (default: the XDG config dir + `sam`). Also settable per-invocation with `--sam-home`. |
| `NAMESPACE` | Per-app `.env` substitution | Topic-prefix substitution for YAML configs (for example, `${NAMESPACE}`). |

Per-app environment variables (broker URLs, LLM keys, artifact endpoints) are loaded from a project's `.env` unless you pass `--system-env`. For the full per-app variable list, see Configure Agent Mesh.

## What Next?

- Scaffolding and first run: Get Started.
- Configuring agents, gateways, tools, and the declarative-config workflow: Configure Agent Mesh.
- Sending tasks programmatically: Building → Agents.
