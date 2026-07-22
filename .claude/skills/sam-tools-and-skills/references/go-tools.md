# Go remote tools (`samtoolsdk`)

A Go remote tool is a standalone binary the STR forks in a sandbox. The SDK handles schema discovery (`--schema`), typed parameter decoding, artifact I/O, status updates, and LLM callbacks. The agent never links your code — it sees the tool through the STR manifest.

## Start from the scaffold — always

```bash
sam toolset init mytools --lang go        # toolset package
sam skill init myskill --with-tool        # skill with a bundled Go tool
```

The scaffold writes a compilable `src/main.go`, `go.mod` (with a `replace` to the vendored `_sdk/samtoolsdk/` — offline, no SAM repo access needed), `manifest.yaml`, and `build.sh`/`build.bat`. After upgrading the `sam` CLI, run `sam toolset sync` to re-vendor the SDK. If `_sdk/` is missing at build time (gitignored clone), the build pipeline re-injects it automatically.

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

**Parameter structs** — fields use `json:"name"` for the wire name and `desc:"…"` for the LLM-visible description. Pointer-typed fields are optional; non-pointer are required. Supported: string, int*/float*/bool, slices, maps, nested structs, and `sdk.Artifact` / `*sdk.Artifact` / `[]sdk.Artifact` (artifact contents are loaded *before* your handler runs; `Artifact` has `Content`, `Filename`, `Version`, `MIMEType`, `Metadata`, plus `AsText()` / `AsBytes()`).

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

**Tool options** — `sdk.WithInstructions(s)`, `sdk.WithTimeout(seconds)`, `sdk.WithAuth(sdk.AuthSchemaConfig{...})`, `sdk.WithConfigSchema(fields...)`, `sdk.WithVolumeParams(...)`, `sdk.WithDynamicSchema(fn)`.

`sdk.ConfigSchemaField{Key, Type, Description, Required, Secret, Default, Options}` declares operator-supplied config; the agent editor renders a form for these on attach, masking `Secret: true` fields.

**ToolContext** — `tc.SendStatus(msg)`, `tc.GetConfigString(key, default)` / `tc.GetConfig(key)`, `tc.CallLLM(ctx, systemPrompt, userPrompt, temperature)`, `tc.GetAuthToken()`, `tc.SaveArtifact(filename, content, "")`, `tc.LoadArtifactBytes(key)`, plus fields `UserID`, `SessionID`, `AppName`, `TaskID`.

## One worked example (artifact in → artifact out)

The scaffold's `main.go` already declares `package main` and imports the vendored SDK aliased `sdk` (wired through its `go.mod` `replace`). Leave that import exactly as generated — no `go get`, no SAM-repo access — and edit the body:

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

```yaml
version: 1
tools:
  mytool:
    executable: ./mytool          # relative to the tool dir
    timeout_seconds: 120          # default 300
    sandbox_profile: standard     # restrictive | standard | permissive
```

Per-tool `resource_limits:` may set `max_cpu_seconds`, `max_file_size_mb`, `max_open_files`, `max_processes`, `max_stack_size_mb`. Memory is **not** capped here (container-layer limits only). `standard` is the default profile (network on); set `sandbox_profile` only to tighten to `restrictive` (which isolates the network — so an HTTP-calling tool must stay on `standard` or above) or loosen to `permissive`.

## Build, validate, package

```bash
./build.sh                              # respects SAM_TOOL_TARGET_OS / SAM_TOOL_TARGET_ARCH
sam toolset validate mytools            # host build + the exact --schema probe the STR runs
sam toolset build-target --url <platform>            # prints e.g. linux/arm64
sam toolset package mytools --url <platform>         # cross-compiles + zips for upload
```

`validate` before every `package` — it catches schema problems locally instead of after upload.

## Sharp edges

- **Reserved config key `auth`** — `WithConfigSchema` with `Key: "auth"` panics at registration (the platform routes OAuth credentials there). The deployment half of OAuth (client_id etc.) is configured on the toolset resource, not in the tool — see packaging-and-deploy.md.
- **Schema discovery has a 30s timeout.** Keep `main()` start-up instant; do heavy init inside the handler.
- **Timeout = process kill.** Watch `ctx.Done()` for cleanup; don't run close to the limit.
- **A missing required artifact fails the whole call** before your handler runs — make artifacts optional (`*sdk.Artifact`) if partial input is meaningful.
- **`SendStatus` is best-effort** (named pipe, non-blocking) — never depend on it for correctness.
- **`CallLLM` errors at call time** if the STR has no LLM service configured — degrade gracefully.
- **Multi-tool binaries**: the dispatch name must exactly match what `NewTool` registered; the manifest entry for a multi-tool binary expands to all discovered tools.
