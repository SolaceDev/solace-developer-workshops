# The desktop trial flow

All artifacts come from the product portal (https://products.solace.com/prods/Agent_Mesh). The only prerequisite: an LLM API key.

## Desktop app (default)

- Installers: macOS `.dmg`, Windows `.msi`, Linux `.tar.gz`/binary. (Rolling out — if the portal doesn't list one for the user's OS yet, the Helm quickstart runs locally on minikube/Kind/Colima as a single-node trial — see `sam-deploy`.)
- First launch opens the chat UI with the **Orchestrator** and **Builder** agents already running; supply the LLM key when prompted and chat.
- Everything is embedded — no broker, no database, nothing else to install.
- WebUI + API on port 8800; the startup log prints the exact URL. The embedded broker is in-process — no `SOLACE_BROKER_*` vars for a solo trial (those are only for connecting to an external broker).
- User config lives at `~/Library/Application Support/sam` (macOS), `~/.config/sam` (Linux), `%APPDATA%\sam` (Windows) — useful when resetting a trial.
- No project-scaffold step: the desktop boots from bundled built-in defaults. `sam init` / `sam config init` do not exist in the Go CLI. For a version-controlled config repo, see `sam-declarative-config`.

## Pre-flight & first-failure triage

`SAM_DOCTOR_CONTEXT=local sam doctor` validates the LLM endpoint/key, port availability (8800), and runtime before first start. Run it before assuming the product is broken; its output names the failing prerequisite. Persistent failures after a clean doctor run → `sam-troubleshoot` / `sam-operate`.
