# The three trial flows

All artifacts from the product portal (https://products.solace.com/prods/Agent_Mesh). The only prerequisite for every flow: an LLM API key.

## 1. Desktop app (default)

- Installers: macOS `.dmg`, Windows `.msi`, Linux `.tar.gz`/binary. (Rolling out — if absent from the portal, use the CLI flow below.)
- First launch opens the chat UI with the **Orchestrator** and **Builder** agents already running; supply the LLM key when prompted and chat.
- Everything is embedded — no broker, no database, nothing else to install.
- User config lives at `~/Library/Application Support/sam` (macOS), `~/.config/sam` (Linux), `%APPDATA%\sam` (Windows) — useful when resetting a trial.

## 2. Local Docker (secondary)

Single all-in-one container; image reference and pull access come with the portal artifacts/release notes — never guess a registry path.

```
docker run --rm -it \
  -p 8800:8800 \
  -e ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}" \   # or your provider's key var
  -v sam-data:/tmp/sam-data \
  <image-ref-from-portal>
```

- Port 8800 = WebUI + API. The volume keeps sessions/artifacts across container restarts.
- Broker env vars are NOT needed for a solo trial — the embedded broker is in-process. (Some doc examples show `SOLACE_BROKER_*` vars; those are for connecting to an external broker.)

## 3. `sam run --embedded` (terminal-centric)

```
sam run --embedded          # gateway + agents + tools + in-memory broker, one process
```

- No scaffold step — with no config files present, `sam run --embedded` boots from bundled built-in defaults, seeding the **Orchestrator** and **Builder** agents and serving the WebUI.
- WebUI at http://localhost:8800 (the startup log prints the exact URL; `--listen :PORT` overrides).
- To run your own agents instead of the defaults, drop YAML under `configs/` (auto-discovered) or pass paths/dirs: `sam run --embedded configs/`. Authoring that config directory is `sam-declarative-config`'s job.
- All components log to one terminal stream — the best "see the moving parts" view. Ctrl+C stops everything.
- Fire a task without the UI: the CLI has task subcommands (`sam task run` one-shot / `sam task send` to a running gateway).
- **There is no project-scaffold verb.** `sam init` (the Python product's verb) and `sam config init` both do **not** exist in the Go CLI — the embedded trial needs no scaffold. For a version-controlled config repo, see `sam-declarative-config`.

## Pre-flight & first-failure triage

`SAM_DOCTOR_CONTEXT=local sam doctor` validates the LLM endpoint/key, port availability (8800), and runtime before first start. Run it before assuming the product is broken; its output names the failing prerequisite. Persistent failures after a clean doctor run → `sam-troubleshoot` / `sam-operate`.
