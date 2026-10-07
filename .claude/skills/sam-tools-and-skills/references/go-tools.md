# Go remote tools (`samtoolsdk`)

A Go remote tool is a standalone binary the STR forks in a sandbox. The SDK handles schema discovery (`--schema`), typed parameter decoding, artifact I/O, status updates, and LLM callbacks. The agent never links your code — it sees the tool through the STR manifest.

## Start from the scaffold — always

```bash
sam toolset init mytools --lang go        # toolset package
sam skill init myskill --with-tool        # skill with a bundled Go tool
```

Both scaffolds write compilable Go, a `go.mod` with a `replace` to the vendored `_sdk/samtoolsdk/` (offline, no Agent Mesh repo access needed), and a `manifest.yaml` — but the layouts differ. A **toolset** scaffold writes `src/main.go` plus `build.sh`/`build.bat`, and re-vendors with `sam toolset sync`. A **skill-bundle** tool writes `tools/manifest.yaml` + `tools/<name>/main.go` with no `src/` and no build script — the omission is deliberate, so `sam skill validate` / `sam skill package` / `sam config apply` detect the Go convention and build it for you — and it re-vendors with `sam skill sync`. Run the sync verb after upgrading the `sam` CLI. If `_sdk/` is missing at build time (gitignored clone), the build pipeline re-injects it automatically.

The offline guarantee covers the SDK only — third-party libraries (e.g. an xlsx package) are added with ordinary `go get` and fetched through the normal Go module cache at build time. Keep the scaffold's `replace` line untouched.

## Verified API surface

Everything below exists in `pkg/samtoolsdk` — do not use symbols that aren't listed here or in the scaffold.

**Registration & entry point**

```go
sdk.Run(tools ...*sdk.ToolDef)                       // call from main(); handles --schema and execution
sdk.NewTool[P any](name, description string,
    handler sdk.HandlerFunc[P], opts ...sdk.ToolOption) *sdk.ToolDef
// HandlerFunc[P] = func(ctx context.Context, params P, tc *sdk.ToolContext) (*sdk.Result, error)
```

One binary may register multiple tools — `sdk.Run` dispatches by tool name (exact, case-sensitive match).

`description` is **required and must be non-empty** — it is the field the LLM uses to choose the tool, and strict providers (e.g. Amazon Bedrock) reject a tool advertised with an empty description. `sdk.NewTool` panics at registration if it is blank.

**Parameter structs** — fields use `json:"name"` for the wire name and `desc:"…"` for the LLM-visible description. Fields are required by default; make one optional with a pointer type (`*string`) and nil-check it. A non-pointer field tagged `,omitempty` is also treated as optional, but for scalars that is ambiguous (the zero value is indistinguishable from absent) and the SDK logs a warning — use a pointer instead. Supported: string, int*/float*/bool, slices, maps, nested structs, and `sdk.Artifact` / `*sdk.Artifact` / `[]sdk.Artifact` (artifact contents are loaded *before* your handler runs; `Artifact` has `Content`, `Filename`, `Version`, `MIMEType`, `Metadata`, plus `AsText()` / `AsBytes()`).

**Results**

```go
sdk.OK(msg, opts...)  sdk.Error(msg, opts...)  sdk.Partial(msg, opts...)  sdk.Pending(msg, opts...)
sdk.AuthRequired(msg)                       // error code that triggers the OAuth flow
sdk.WithData(map[string]any{...})           // inline data returned to the LLM
sdk.WithDataObjects(sdk.DataObject{         // file outputs
    Name: "out.xlsx", Content: b, MIMEType: "...",
    Disposition: sdk.DispositionArtifact,   // or DispositionInline / DispositionAuto / DispositionArtifactWithPreview
})
```

**Tool options** — `sdk.WithInstructions(s)`, `sdk.WithTimeout(seconds)`, `sdk.WithAuth(sdk.AuthSchemaConfig{...})`, `sdk.WithConfigSchema(fields...)`, `sdk.WithDynamicSchema(fn)`.

`sdk.ConfigSchemaField{Key, Type, Description, Required, Secret, Default, Options}` declares operator-supplied config; the agent editor renders a form for these on attach, masking `Secret: true` fields.

**ToolContext** — `tc.SendStatus(msg)`, `tc.GetConfigString(key, default)` / `tc.GetConfig(key)`, `tc.CallLLM(ctx, systemPrompt, userPrompt, temperature)`, `tc.GetAuthToken()`, `tc.SaveArtifact(filename, content, "")`, `tc.LoadArtifactBytes(key)`, `tc.UserProfile()` (the gateway-forwarded user profile as a map, empty when none; unsigned, so scope and audit with it but never authorize on it alone), plus fields `UserID`, `SessionID`, `AppName`, `TaskID`.

**Static `basic` / `bearer` auth** — a tool that calls an authenticated upstream can let the framework build and inject the credential. Declare a default scheme with `sdk.WithAuth(sdk.AuthSchemaConfig{Type: "basic"})` (or `"bearer"`, `"oauth2"`). The deployer supplies the credential under the reserved `auth` config key (`type`, plus `credential.username` / `credential.password` for `basic` or `credential.token` for `bearer`), and may set `auth.type` to override the declared scheme, so one binary can serve OAuth2 for one agent and Basic for another. This is the answer for unattended or event-triggered agents that can never complete an interactive OAuth flow. `password` and `token` are secrets (redacted on read, like `client_secret`); keep them as `${VAR}` placeholders in the toolset's `spec.config`. In the tool, send `tc.AuthorizationHeader()`: it returns the injected header for `basic`/`bearer`, `"Bearer <token>"` when only an OAuth token is present, and `""` when the tool has no auth. `tc.AuthHeaders()` returns the whole injected header map for a custom-header scheme.

## One worked example (artifact in → artifact out)

The scaffold's `main.go` already declares `package main` and imports the vendored SDK aliased `sdk` (wired through its `go.mod` `replace`). Leave that import exactly as generated — no `go get`, no Agent Mesh-repo access — and edit the body:

```go
type UppercaseParams struct {
    Input  sdk.Artifact `json:"input"  desc:"File to transform"`
    Suffix *string      `json:"suffix" desc:"Optional text to append"`
}

func uppercase(_ context.Context, p UppercaseParams, tc *sdk.ToolContext) (*sdk.Result, error) {
    _ = tc.SendStatus("transforming…")
    out := strings.ToUpper(p.Input.AsText())
    if p.Suffix != nil {
        out += "\n" + *p.Suffix
    }
    return sdk.OK("done", sdk.WithDataObjects(sdk.DataObject{
        Name: "output.txt", Content: []byte(out),
        MIMEType: "text/plain", Disposition: sdk.DispositionArtifact,
    })), nil
}

func main() {
    sdk.Run(sdk.NewTool("uppercase_file", "Convert a text artifact to uppercase", uppercase,
        sdk.WithInstructions("Use when the user asks to uppercase a file."),
    ))
}
```

## Manifest (`manifest.yaml`, written by the scaffold)

The two scaffolds write different manifests. A **skill** bundle's `tools/manifest.yaml` (`sam skill init mysk --with-tool --lang go`) names each tool's source subdirectory under `tools/`:

```yaml
version: 1
tools:
  mysk_greet:                     # key = exposed name (mysk__mysk_greet)
    runtime: go
    tool_dir: mysk                # subdir under tools/ — required: omit it and the build (tools/<key>/) and the STR (tools/) look in different places, undetected by validate
    executable: mysk              # binary basename the build produces, relative to tool_dir
    timeout_seconds: 60           # default 300
```

A **toolset**'s `manifest.yaml` (`sam toolset init mytools --lang go`) has no `tool_dir`; `executable` names the binary sitting beside `manifest.yaml` at the bundle root (uploaded toolsets do not resolve subdirectory paths):

```yaml
version: 1
tools:
  mytools_tools:                  # fallback name only; the exposed name comes from sdk.NewTool via --schema
    runtime: go
    executable: ./mytools
    timeout_seconds: 60           # default 300
```

Either may add `sandbox_profile: restrictive | standard | permissive` per tool.

**Skill and toolset name binding differ — don't assume the key wins.** For a **skill**, the manifest key drives the exposed name (`skillname__<key>`), so keep the key identical to the `sdk.NewTool` name; rename one, rename the other, and `sam skill validate`'s `exposed as …` line confirms the result. For a **toolset**, the exposed name follows the `sdk.NewTool` name discovered via `--schema` (`toolsetname__<discovered-name>`) — the manifest key is only a fallback when discovery finds nothing, so a key that differs from the tool name is harmless (the Go scaffold itself ships key `<name>_tools` alongside tool `<name>_greet`). `sam toolset validate` lists the discovered tool names but has no `exposed as …` line.

Per-tool `resource_limits:` may set `max_cpu_seconds`, `max_file_size_mb`, `max_open_files`, `max_processes`, `max_stack_size_mb`. Memory is **not** capped here (container-layer limits only). `standard` is the default profile (network on); set `sandbox_profile` only to tighten to `restrictive` (which isolates the network — so an HTTP-calling tool must stay on `standard` or above) or loosen to `permissive`.

## Build, validate, package

```bash
SAM_TOOL_TARGET_OS=linux SAM_TOOL_TARGET_ARCH=arm64 ./build.sh   # both required; build.sh exits if either is unset
sam toolset validate mytools            # host build + the exact --schema probe the STR runs
sam toolset build-target --url <platform>            # prints e.g. linux/arm64
sam toolset package mytools --url <platform>         # cross-compiles + zips → ./mytools.zip (cwd)
# no platform yet? package without --url by pinning the target arch (unset, it defaults to linux/arm64):
SAM_TOOL_TARGET_OS=linux SAM_TOOL_TARGET_ARCH=amd64 sam toolset package mytools
```

`validate` before every `package` — it catches schema problems locally instead of after upload. `package` writes `<name>.zip` to the current working directory (the config-repo root), not into the tool's source dir.

## Sharp edges

- **Reserved config key `auth`** — `WithConfigSchema` with `Key: "auth"` panics at registration (the platform routes OAuth credentials there). The deployment half of OAuth (client_id etc.) is configured on the toolset resource, not in the tool — see packaging-and-deploy.md.
- **Schema discovery has a 30s timeout.** Keep `main()` start-up instant; do heavy init inside the handler.
- **Timeout = process kill.** Watch `ctx.Done()` for cleanup; don't run close to the limit.
- **A missing required artifact fails the whole call** before your handler runs — make artifacts optional (`*sdk.Artifact`) if partial input is meaningful.
- **`SendStatus` is best-effort** (named pipe, non-blocking) — never depend on it for correctness.
- **`CallLLM` errors at call time** if the STR has no LLM service configured — degrade gracefully.
- **Multi-tool binaries**: the dispatch name must exactly match what `NewTool` registered; the manifest entry for a multi-tool binary expands to all discovered tools.
