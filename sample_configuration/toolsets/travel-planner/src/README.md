# travel-planner

Scaffolded by `sam toolset init` (SAM CLI version main-v2.381.3).

## Authoring

To have your AI coding assistant write the tool with the correct
`samtoolsdk` API, install the Agent Mesh authoring skills once at your
repo root:

```bash
sam ai-assistance skill install                 # OpenAI Codex CLI
sam ai-assistance skill install --target claude # Claude Code
```

Then edit `main.go`. It defines the `compile_itinerary` and `calculate_budget` tools.

## Build

```bash
./build.sh
```

The Go SDK is vendored at `_sdk/samtoolsdk/` and wired in via
`go.mod`'s `replace` directive — no `go get` step is needed.
(The directory is named `_sdk` rather than the conventional
`vendor/` so Go does not switch to vendor-mode for the whole tool.)

Run `sam toolset sync` to refresh the vendored SDK after
upgrading the CLI.

## Layout

```
toolsets/travel-planner.yaml            # kind: toolset metadata header
toolsets/travel-planner/
  src/                             # this directory
    main.go                        # tool entry point (uses samtoolsdk)
    go.mod                         # replace samtoolsdk => ./_sdk/samtoolsdk
    _sdk/samtoolsdk/              # vendored SDK source (gitignored by default)
    build.sh / .bat                # cross-platform build scripts
    manifest.yaml                  # STR registration
  dist/                            # build output (gitignored)
  .sam-cache/                      # build cache (gitignored)
```
