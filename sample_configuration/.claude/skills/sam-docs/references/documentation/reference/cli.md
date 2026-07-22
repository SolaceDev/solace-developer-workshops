---
title: CLI Reference
description: Every sam command and flag, covering authentication, declarative configuration, tasks, evaluations, tools and skills, and local run orchestration.
sidebar_position: 1010
---

# CLI Reference

The Solace Agent Mesh CLI (`sam`) is the single binary you use to manage an Agent Mesh deployment: authenticate to the platform service, apply declarative configuration, send tasks to running agents, run evaluations, scaffold and package tools and skills, inspect running components, and check your setup before you start.

Run `sam --help` for the current top-level command list, or `sam <command> --help` for a subcommand's flags. This page enumerates every command and its flags as a complete reference; the CLI's own help output is the source of truth for the version you run.

## Conventions

- Angle brackets (`<NAME>`) denote a required positional argument; square brackets (`[FLAGS]`) denote optional arguments.
- Where a flag has both a short and a long form (`-a` / `--agent`), the table lists them together.
- The default column shows the literal default. Where a default reads from an environment variable, the variable name is shown.
- "Target" throughout means a `sam auth login` cache entry for a platform service URL. Resolution order is documented under [`sam api`](#sam-api).

## Global Flags

Running `sam` with no subcommand prints help. The desktop build (`sam-desktop`) launches the desktop app instead.

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--version` | `-v` | — | Print the `sam` version and exit. |
| `--sam-home <PATH>` | — | `$SAM_HOME`, else the OS configuration directory plus `sam` | Override the Agent Mesh home directory. The resolved path is logged at startup. Available on every command. |

## `sam task send`

Send a task to an already-running entrypoint and stream the response. Target and token resolution mirror [`sam api`](#sam-api), with one difference: when nothing else resolves, `sam task send` falls back to `http://localhost:8800`.

:::warning
In CI or any automated context, always pin the target explicitly with `--url` or `--target`. Without one, `sam task send` falls back to `http://localhost:8800` and can silently send the task to the wrong entrypoint.
:::

```text
sam task send <MESSAGE> [FLAGS]
```

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--url <URL>` | `-u` | — | Base URL of the entrypoint. Highest priority in target resolution. |
| `--target <NAME>` | — | — | Use this `sam auth login` cache entry. |
| `--manifest <FILE>` | `-m` | — | Read the target URL from this manifest. |
| `--insecure` | — | `false` | Skip TLS verification; also required to send a bearer token over plain `http://`. |
| `--agent <NAME>` | `-a` | `orchestrator` | Target agent name. |
| `--session-id <ID>` | — | — | Continue an existing session by ID. |
| `--file <PATH>` | `-f` | — | Attach a file as an artifact (repeatable). |
| `--timeout <DURATION>` | — | `2m` | Timeout for the streaming connection (for example, `2m`, `90s`). |
| `--output-dir <PATH>` | `-o` | — | Write returned artifacts and logs to this directory. |
| `--quiet` | `-q` | `false` | Print only the final response, with no streaming chunks. |
| `--no-stim` | — | `false` | Do not fetch the STIM (status, info, and metric) event log on completion. |
| `--debug` | — | `false` | Enable verbose debug output. |
| `--data <STRING>` | `-d` | — | Send a JSON DataPart payload alongside the message. Inline JSON, or `@path/to/file.json` to load from disk. |
| `--si-input-schema <PATH>` | — | — | Structured-input schema (JSON Schema) for input validation. |
| `--si-output-schema <PATH>` | — | — | Structured-output schema (JSON Schema) for output validation. |
| `--message-file <PATH>` | — | — | Read the message body from a file instead of the positional argument. |
| `--hil-respond <FILE>` | — | — | Load a saved human-in-the-loop request file, post the answer supplied with `--hil-answer`, and stream the remaining output. |
| `--hil-answer <ANSWER>` | — | — | JSON answer payload for `--hil-respond` (inline JSON or `@filepath`). |
| `--hil-approve <FILE>` | — | — | Approve a saved tool-approval request file and stream the remaining output. |
| `--hil-deny <FILE>` | — | — | Deny a saved tool-approval request file and stream the remaining output. |
| `--hil-auto-approve` | — | `false` | Auto-approve every tool-approval request inline (no exit). |
| `--open-browser` | — | `true` | Open the default browser when a tool requests user OAuth. Pass `--open-browser=false` to just print the URL. |

**Target resolution (highest to lowest):** `--url` → `--target` → `--manifest` → `SAM_WEBUI_URL` → the single cached login (if exactly one) → `http://localhost:8800`.

**Token precedence (highest to lowest):** `SAM_AUTH_TOKEN` → `SAM_PLATFORM_TOKEN` → the cached OAuth token from `sam auth login` (auto-refreshed near expiry). There is no `--token` flag; supply tokens through the environment or `sam auth login`. The CLI rejects bearer tokens over `http://` unless you pass `--insecure`.

**Examples:**

```bash
sam task send "What is the weather today?"
sam task send "Analyze this" --agent data_analyst
sam task send "Summarize this document" --file ./document.pdf
sam task send --target dev "Run the data pipeline"
sam task send "Continue" --session-id abc-123
```

## `sam api`

Make an authenticated HTTP request to the Agent Mesh entrypoint API, modeled after `gh api`. It reuses the cached OAuth token from `sam auth login`, supports `gh`-style typed JSON-body construction, and follows the Agent Mesh paginated-response envelope when you pass `--paginate`.

```text
sam api [METHOD] <PATH> [FLAGS]
```

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--method <VERB>` | `-X` | `GET` (or `POST` when a body is present) | HTTP method. |
| `--header <H>` | `-H` | — | Extra request header (repeatable). Format: `"Name: value"`. |
| `--field <KEY=VAL>` | `-F` | — | Typed JSON field. `true`, `false`, `null`, and numeric literals are coerced. `key[]=v` accumulates an array; `key.sub=v` builds a nested object. |
| `--raw-field <KEY=VAL>` | — | — | String JSON field; identical to `--field` but the value is always a JSON string. |
| `--input <PATH>` | — | — | Read the full request body from a file path, `@file`, or `-` (stdin). Mutually exclusive with `--field` / `--raw-field`. |
| `--jq <FILTER>` | — | — | Filter the response with a jq expression. |
| `--raw` | — | `false` | Skip JSON parsing; write the response body to stdout verbatim. |
| `--include` | `-i` | `false` | Print the response status line and headers before the body. |
| `--paginate` | — | `false` | Follow `meta.pagination.nextPage` until exhausted, merging the `data` arrays. |
| `--target <NAME>` | — | — | Use this `sam auth login` cache entry. |
| `--url <URL>` | — | — | Platform URL (or bare hostname). Overrides `--target` / `--manifest`. |
| `--manifest <FILE>` | `-m` | — | Read the target URL from this manifest. |
| `--insecure` | — | `false` | Skip TLS verification; also required to send a bearer token over plain `http://`. |
| `--verbose` | `-v` | `false` | Print the method, resolved URL, redacted headers, and timings to stderr. |

**Target resolution (highest to lowest):** `--url` (or a bare hostname) → `--target` → `--manifest` → `SAM_WEBUI_URL` → the single cached login. Unlike `sam task send`, `sam api` has no `localhost:8800` fallback; an unresolved target is an error. Token precedence matches `sam task send`.

**Examples:**

```bash
sam api /api/v1/agents
sam api /api/v1/agents --jq '.data[].name'
sam api /api/v1/agents --paginate --jq '.data[].id'
sam api -X POST /api/v1/projects --field name=demo --field description="ad-hoc test"
sam api -X PATCH /api/v1/agents/$ID --field 'tags[]=oncall' --field 'tags[]=beta'
sam api /api/v1/agents/$ID --input agent.json -X PUT
sam api --target dev /api/v1/user
```

## `sam auth`

Authenticate the CLI to Agent Mesh through an interactive OAuth 2.0 authorization-code flow with Proof Key for Code Exchange (PKCE), and manage the cached credentials for one or more platform targets. The cache key is the target name (falling back to the URL host), and multiple targets can be logged in at the same time. Subsequent `sam config apply` and `sam eval run` invocations read the cache transparently.

```text
sam auth <subcommand> [target-or-url] [FLAGS]
```

| Subcommand | Description |
| --- | --- |
| `sam auth login [target-or-url]` | Open a browser, complete the OAuth flow, and cache the result. The positional argument is the canonical way to name the target (a cached name or a full URL). HTTPS is required; bare hostnames are upgraded to `https://`. |
| `sam auth logout` | Revoke and delete the cached credentials for a target. |
| `sam auth status` | Show the cached login status for a target (whether a token is cached, its expiry, the email claim, and the platform URL). |
| `sam auth list` | List every target with cached credentials, with the platform URL and token expiry for each. |

**`sam auth login` flags:**

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--url <URL>` | — | — | Platform URL for a first-time named login (for example, `https://platform.dev.example.com`). |
| `--target <NAME>` | — | (host or positional value) | Cache-key override. |
| `--timeout <DURATION>` | — | `90s` | Maximum wait for the browser callback. |
| `--manifest <FILE>` | `-m` | — | **Deprecated.** Read URL/name from a manifest file. Pass the hostname positionally instead. |

**`sam auth logout` / `status` flags:** `--target`, `--url`, and `--manifest` (`-m`) select the target. `status` also accepts `--format` (`text` or `json`).

**`sam auth list` flags:** `--format` (`text` or `json`).

## `sam config`

Describe agents, tools, and skills in YAML, then apply them to a running platform service. `sam config` is the operator-facing command set for spec-driven deployments: a directory of YAML resources reconciled idempotently with `sam config apply`. Edit the YAML, run `sam config plan` to preview, then `sam config apply` to make the changes; `sam config pull` does the reverse.

```text
sam config <subcommand> [FLAGS]
```

| Subcommand | Description |
| --- | --- |
| `sam config apply` | Apply a manifest's resources to a running platform service. |
| `sam config plan` | Show the changes a manifest would apply, without mutating state. |
| `sam config pull` | Export a running platform service's live state into editable, spec-format YAML. |
| `sam config migrate` | Convert legacy Solace AI Connector (SAC) YAML to clean-spec YAML (run once, to bootstrap). |
| `sam config schema` | Explore the auto-generated schema for declarative-config kinds. |
| `sam config refresh` | Force a fresh download of remote sources by wiping the local source cache. |
| `sam config cache` | Inspect and prune the local toolset build cache. |

All `sam config` commands auto-load a `.env` file from the nearest ancestor directory before resolving `${VAR}` references. Two global options apply to every subcommand: `--env-file <FILE>` (load an additional env file, repeatable; loaded after the auto-detected `.env` so its values override) and `--no-dotenv` (skip auto-loading the nearest `.env`).

### `sam config apply`

Apply a manifest's resources to a running platform service. It computes the same diff `sam config plan` produces, then executes the creates, updates, and (with `--prune`) deletes through the platform service's REST API. A failed operation does not abort the rest of the apply; the command exits non-zero if any operation failed.

```text
sam config apply [FLAGS]
```

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--manifest <FILE>` | `-m` | `./manifest.yaml` | Path to the manifest YAML to apply. |
| `--url <URL>` | — | — | Platform URL to apply to; overrides the manifest's `target.url`. |
| `--target <NAME>` | — | — | Named `sam auth login` target whose URL to apply to (alternative to `--url`). |
| `--prune` | — | `false` | Delete resources that exist on the platform service but aren't in the manifest. |
| `--dry-run` | — | `false` | Compute the plan but do not mutate the platform service (equivalent to `sam config plan`). |
| `--no-deploy` | — | `false` | Run configuration sync but skip the deployment phase, reconciling configuration without redeploying running services. |
| `--force` | — | `false` | Skip the `--prune` confirmation prompt; required when `--prune` runs non-interactively (for example, in CI). |
| `--no-build` | — | `false` | Skip toolset build steps. Cache misses are a hard error on `apply`; pair with `plan` first to populate the cache. |
| `--no-cache` | — | `false` | Bypass the source cache; force a fresh clone for every git source. |
| `--no-interactive` | — | `false` | Do not prompt for OAuth login when the token cache is empty (useful in CI). |
| `--allow-floating-refs` | — | `false` | Permit manifest sources without a pinned ref (branch, short SHA, or HEAD). Resolution becomes non-reproducible; a warning prints per floating ref. |
| `--skip-version-check` | — | `false` | Skip the CLI-to-platform version compatibility preflight (also settable with `SAM_SKIP_VERSION_CHECK=1`). |
| `--no-color` | — | `false` | Disable ANSI color in plan output. |
| `--verbose` | `-v` | `false` | Show per-field diffs for updated resources. Auth secrets render as `(changed)`. |

### `sam config plan`

Preview the changes a manifest would apply, without mutating state. It loads the manifest, resolves declared resources, fetches the platform service's current state, and prints a per-resource diff plus summary counts. It accepts the same flags as `sam config apply` except the apply-only options (`--prune`, `--dry-run`, `--no-deploy`, and `--force`).

### `sam config pull`

Serialize a running platform service's state into spec-format YAML—one file per resource under `--output`, with secret-typed fields replaced by `${VAR}` placeholders and a manifest generated alongside. By default it refuses to write into a non-empty directory.

```text
sam config pull -o <DIR> [FLAGS]
```

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--output <DIR>` | `-o` | (required) | Directory to write the pulled YAML repository into. |
| `--url <URL>` | — | — | Platform URL to pull from. |
| `--target <NAME>` | — | — | Named `sam auth login` target to pull from (alternative to `--url`). |
| `--only <KIND>` | — | — | Restrict the pull to one kind: `model`, `connector`, `toolset`, `skill`, `agent`, `entrypoint`, `workflow`, `dataset`, `evaluator`, `experiment`, `rbacRole`, or `rbacClaimMapping`. |
| `--name <NAME>` | — | — | Restrict the pull to a single resource by name. |
| `--force` | — | `false` | Wipe the contents of `--output` before writing. |
| `--merge` | — | `false` | Keep files for resources not on the platform service; rewrite only files for pulled resources. |
| `--auth-type <TYPE>` | — | — | Auth type for the target (for example, `bearer`). |
| `--auth-env <VAR>` | — | — | Environment variable holding the auth token. |
| `--manifest-name <NAME>` | — | (auto-generated) | Override the generated manifest filename (default `pulled-<UTC timestamp>.yaml`). |

### `sam config migrate`

Convert legacy SAC-format YAML to clean-spec YAML. This is a one-shot bootstrap preprocessor that does not talk to the platform service; heuristics are best-effort, and anything it can't safely translate is preserved with a warning for a human to fix. Review the output with `sam config plan` before applying.

```text
sam config migrate <LEGACY-PATH> <OUTPUT-PATH> [FLAGS]
```

| Flag | Default | Description |
| --- | --- | --- |
| `--dry-run` | `false` | Parse and transform without writing any output files. |
| `--force` | `false` | Permit writing into a non-empty output directory. |
| `--report <PATH>` | — | Write a structured JSON migration report to this path. |

### `sam config schema`

Print the auto-generated schema for declarative-config kinds, generated from the same data structures the platform service uses—so the output is the live truth for the running CLI version.

| Subcommand | Description |
| --- | --- |
| `sam config schema list` | List every declarative-config kind with a one-line description. |
| `sam config schema show <KIND>` | Show the field schema for a kind. |
| `sam config schema example <KIND>` | Print a templated YAML example for a kind. |
| `sam config schema manifest` | Print the manifest format reference. |
| `sam config schema layout` | Print the directory layout reference for a declarative-config repo. |

`list`, `show`, and `manifest` accept `--format` (`markdown` or `json`; default `markdown`). For kinds that use a discriminator, `show` and `example` accept `--type` (and, for connectors, `--subtype`) to drill into the per-type schema; `example` also accepts `--name` to seed the rendered resource name.

### `sam config refresh`

Wipe the local source cache used by `sam config apply` and `sam config plan`. The cache lives at `$XDG_CACHE_HOME/sam/sources` (or `~/.cache/sam/sources`). Pinned refs (tags, full SHAs) are reused forever, so `refresh` is the manual eviction control for a forced re-fetch. Running on a missing cache directory is a no-op.

| Flag | Default | Description |
| --- | --- | --- |
| `--cache-root <PATH>` | `$XDG_CACHE_HOME/sam/sources` | Override the cache root. |

### `sam config cache`

Inspect and prune the per-toolset build cache, which lives under `<repo>/toolsets/<name>/.sam-cache/build/`. Pruning is on demand only—`plan` and `apply` rebuild a toolset when its content hash misses the cache, so pruning never breaks anything; it just makes the next plan slower.

The one subcommand is `sam config cache prune`:

| Flag | Default | Description |
| --- | --- | --- |
| `--all` | `false` | Remove every cached entry regardless of age or size. |
| `--max-age <DURATION>` | `720h` (30 days) | Remove entries older than this duration (for example, `168h`, `720h`). |
| `--max-size <BYTES>` | `0` (no cap) | Cap total cache size in bytes; oldest entries are evicted until the running total fits. |
| `--repo <PATH>` | (working directory) | Repo root containing `toolsets/`. |

## `sam eval`

Run evaluation suites locally, or trigger and watch platform-managed evaluation experiments.

```text
sam eval <subcommand> [FLAGS]
```

| Subcommand | Description |
| --- | --- |
| `sam eval suite <PATH>` | Run an evaluation suite from a local JSON test-suite config. |
| `sam eval run <EXPERIMENT-NAME>...` | Trigger one or more platform-managed experiments by name and poll to completion. |
| `sam eval list` | List experiments registered on the platform service. |

### `sam eval suite`

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--verbose` | `-v` | `false` | Verbose output (per-case results). |

### `sam eval run`

Trigger one or more platform-managed experiments and poll to completion. `sam eval run` resolves each experiment, streams per-example results, and prints a per-evaluator summary; multiple experiments run concurrently. It exits `0` when every run passes (or clears `--threshold`), and non-zero otherwise.

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--url <URL>` | — | — | Platform URL. Resolves like `sam api`. |
| `--target <NAME>` | — | — | Cached `sam auth login` target name. |
| `--manifest <FILE>` | `-m` | — | Read the target URL from this manifest. |
| `--insecure` | — | `false` | Skip TLS verification; also required to send a bearer token over plain `http://`. |
| `--threshold <FLOAT>` | — | `1.0` | Minimum pass-rate (0.0–1.0) for a run to count as a success. |
| `--timeout <DURATION>` | — | `30m` | Overall wait timeout while polling run status. |
| `--poll-every <DURATION>` | — | `2s` | How often to poll run status while watching. |
| `--watch` | — | `true` | Poll runs to completion. Set `--watch=false` to fire-and-forget (print run IDs and exit). |
| `--cancel-on-interrupt` | — | `true` | Cancel in-flight runs when you press Ctrl-C. |
| `--output-dir <PATH>` | `-o` | — | Download each run's per-example trace under this directory. |
| `--format <FORMAT>` | — | `text` | Output format: `text` or `json`. |

### `sam eval list`

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--url <URL>` | — | — | Platform URL. Resolves like `sam api`. |
| `--target <NAME>` | — | — | Cached `sam auth login` target name. |
| `--manifest <FILE>` | `-m` | — | Read the target URL from this manifest. |
| `--insecure` | — | `false` | Skip TLS verification; also required to send a bearer token over plain `http://`. |
| `--format <FORMAT>` | — | `text` | Output format: `text` or `json`. |

## `sam toolset`

Scaffold and maintain toolset directories in a declarative-config repo. The tool SDK is embedded in the CLI binary, so `init` and `sync` need no network access; `package` and `build-target` consult the platform service only when you pass `--url` (or `--target`).

```text
sam toolset <subcommand> [FLAGS]
```

| Subcommand | Description |
| --- | --- |
| `sam toolset init <NAME> [PATH]` | Scaffold a new `toolsets/<name>/` directory with starter code and the SDK. Requires `--lang` (`go` or `python`). `--force` overwrites an existing non-empty `src/`. |
| `sam toolset validate <NAME> [PATH]` | Build the toolset for your host and run the Secure Tool Runtime's `--schema` discovery against it, confirming your tools load before you package and upload them. |
| `sam toolset package <NAME> [PATH]` | Build a toolset and zip it into a bundle you upload through the Toolsets page in the Agent Mesh UI. |
| `sam toolset sync [PATH]` | Re-vendor the embedded SDK in one or every toolset after a CLI upgrade. `--name` limits it to one toolset; `--lang` overrides the inferred language. |
| `sam toolset build-target` | Print the OS and CPU architecture (`GOOS`/`GOARCH`) the deployed Secure Tool Runtime expects toolset binaries to use. |

`package` and `build-target` accept `--url <URL>` or `--target <NAME>` to auto-detect the build target from the platform service (falling back to the `SAM_TOOL_TARGET_OS` / `SAM_TOOL_TARGET_ARCH` environment variables, then `linux/arm64`). `package` also accepts `--output` (`-o`) for the output zip path; `build-target` accepts `--format` (`text`, `json`, or `shell`). Pass `--url` (or `--target`) when packaging so the bundle matches the architecture your Secure Tool Runtime runs on—a mismatch is rejected at discovery time.

## `sam skill`

Scaffold and package deployable skill bundles (a `SKILL.md` plus optional `references/` and bundled `tools/`). These mirror `sam toolset`, so a skill author never needs the toolset commands. To install or check the CLI's generated AI-assistant guidance instead, see [`sam ai-assistance`](#sam-ai-assistance).

```text
sam skill <subcommand> [FLAGS]
```

| Subcommand | Description |
| --- | --- |
| `sam skill init <NAME> [PATH]` | Scaffold a new `skills/<name>/` bundle (a `SKILL.md` and `references/`). `--with-tool` adds a sample bundled tool under `tools/<name>/`; `--lang` (`go` default, or `python`) selects its language and implies `--with-tool`. `--force` overwrites an existing directory. |
| `sam skill validate <NAME> [PATH]` | Parse `SKILL.md`, build any bundled tools for your host, and run the Secure Tool Runtime's `--schema` discovery, reporting the agent-facing `<skill>__<tool>` name each yields—before you package. |
| `sam skill package <NAME> [PATH]` | Build a skill bundle (compiling bundled Go tools, building native wheels for bundled Python tools) and zip it for upload through the Agent Mesh UI. |
| `sam skill sync [PATH]` | Re-vendor the embedded Go SDK into a skill's bundled Go tools after a CLI upgrade. `--name` limits it to one skill. |
| `sam skill build-target` | Print the OS and CPU architecture the deployed Secure Tool Runtime expects bundled skill-tool binaries to use. Identical to `sam toolset build-target`. |

`package` and `build-target` accept `--url` / `--target` for build-target auto-detection, and `package` accepts `--output` (`-o`); the resolution rules match `sam toolset`.

## `sam ai-assistance`

Manage the AI-coding-assistant guidance the CLI generates for itself—the developer-assistant skill suite (concierge skills, `sam-docs`, and the `sam-declarative-config` authoring skill) generated from the CLI's own configuration schemas. This is distinct from `sam skill`, which packages deployable skill bundles.

```text
sam ai-assistance skill <subcommand> [FLAGS]
```

| Subcommand | Flags | Description |
| --- | --- | --- |
| `sam ai-assistance skill install` | `--to <DIR>` (default `.claude/skills/`), `--force` | Write the developer-assistant skill suite to disk. Refuses to overwrite existing skills unless `--force` is set. |
| `sam ai-assistance skill check` | `--path <DIR>` (default `.claude/skills/`) | Verify the installed suite matches this CLI version. Exits `0` on a clean match, non-zero otherwise. |

## `sam doctor`

Run connectivity and configuration checks against the environment an Agent Mesh deployment is about to start in—event broker, LLM endpoint, databases, object storage, OIDC, TLS certificate, port availability, and runtime version—and emit a `PASS`/`WARN`/`FAIL`/`SKIP` report. Set `SAM_DOCTOR_CONTEXT` to `helm`, `wheel`, or `local`; without it, the command exits `0` without running checks.

```text
sam doctor [FLAGS]
```

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--verbose` | `-v` | `false` | Enable debug logging. |
| `--no-fail-on-error` | — | `false` | Always exit `0`, even when checks fail. |

## `sam docs`

Start a local web server for the Agent Mesh documentation site (this site), rendered natively from its markdown source and served offline. Opens the docs in your default browser.

```text
sam docs [FLAGS]
```

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--port <PORT>` | `-p` | `8585` | Port to run the documentation server on. |

## Environment Variables

Variables consumed across multiple subcommands:

| Variable | Used by | Purpose |
| --- | --- | --- |
| `SAM_WEBUI_URL` | `sam task send`, `sam api`, `sam eval` | Default entrypoint URL when no `--url` / `--target` is given. |
| `SAM_AGENT` | `sam task send` | Default agent name. |
| `SAM_AUTH_TOKEN` | `sam task send`, `sam api`, `sam eval` | Bearer token; overrides the cached OAuth token. |
| `SAM_PLATFORM_TOKEN` | `sam task send`, `sam api`, `sam eval` | Lower-precedence bearer token (overridden by `SAM_AUTH_TOKEN`). |
| `SAM_HOME` | All commands | Override the Agent Mesh home directory (also settable per invocation with `--sam-home`). |

Per-app environment variables—event broker credentials, LLM keys, and artifact endpoints—come from a `.env` file that `sam config` auto-loads from the nearest ancestor directory (pass `--no-dotenv` to skip). For the full list of variables Agent Mesh reads, see [Environment Variables](./env-vars.md).

## Next Steps

- Create and deploy your first agent: [Getting Started with Agent Mesh](../getting-started/index.md).
- Configure the event broker, models, tools, and the declarative-config workflow: [Configuring Agent Mesh](../installing/configure.md).
- Build agents, entrypoints, tools, and skills: [Building Your Agent Mesh](../building/index.md).
