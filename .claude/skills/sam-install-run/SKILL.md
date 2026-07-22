---
name: sam-install-run
description: Use when someone wants to install or try Solace Agent Mesh on their own machine — downloading and launching the desktop app, first chat with the built-in agents, or pre-flight checks for a local trial. Not for shared/team deployments (sam-deploy), building agents beyond the first chat (sam-author-agent), or fixing a broken installation (sam-troubleshoot).
version: main-v2.249.1-dirty
---

# sam-install-run

This skill gets one person from zero to chatting with SAM on their own machine. Deciding question: *is anyone else depending on this instance?* Yes → `sam-deploy`. Once they're chatting and want to build something → `sam-author-agent`.

**Tool preference overrides the audience axis.** If a solo user specifically wants **Helm / Kubernetes / a cluster** — even just to try it themselves — that is a legitimate local evaluation, not a team deployment: route them to `sam-deploy`'s Helm quickstart (local/connected eval) rather than steering them onto desktop. Don't reserve Helm for shared use.

## Where everything comes from

**All artifacts — desktop installers, the `sam` CLI binary, Helm charts — come from the Solace product portal: https://products.solace.com/ (login required; navigate to `Agent_Mesh`).** No portal access → Solace account team or solace.com/support.

- **Never** point users at GitHub (the product repos are not public).
- **Never** suggest `pip install solace-agent-mesh` — that is the *Python* implementation, a different runtime. There is no pip route to this product.

## The one hard prerequisite

**An LLM API key** (any OpenAI-compatible provider, or Anthropic). Everything else — broker, database, storage — is embedded/in-memory in the desktop trial. Don't *push* a user toward standing up brokers, Postgres, or Kubernetes for a solo trial — but if they specifically want Helm, the Helm quickstart bundles its own broker + persistence and is a valid solo eval (path 2).

## Paths, in order

1. **Desktop app — the default recommendation** (macOS, Windows, Linux). Download from the portal, launch, supply the LLM key, chat. See [references/trial-paths.md](references/trial-paths.md). *Caveat: desktop installers are rolling out — if the portal doesn't list one for the user's OS yet, the Helm quickstart (path 2) runs locally as a single-node trial; fall back to it without apology.*
2. **Helm quickstart — a local single-node trial or for users who want Kubernetes** (minikube/Kind/Colima, single-node, embedded broker + bundled persistence). Runs entirely on the user's own machine. Don't offer this proactively over desktop, but surface it when the user names Helm/Kubernetes/a cluster, or when a desktop installer isn't available for their OS — then hand off to `sam-deploy` → Helm quickstart for the mechanics (don't reproduce them here).

## What first run actually looks like

No example gallery (yet). The chat UI opens with two pre-seeded agents:
- **Orchestrator** — the conversational entry point; chat with it immediately.
- **Builder** — the AI-assisted creation path: describe an agent in plain language and it drafts one. This is the bridge to `sam-author-agent`.

## Hard rules

- **Go product only.** No `pip install`, no `sam init` (the Go CLI has no scaffold verb — the desktop app boots from bundled defaults), no `solace-ai-connector`, no Python SAM ports/paths.
- **Binary naming is not a user choice.** The docs list base and `-enterprise` binary filenames; use whichever the portal artifact ships — never present "base vs enterprise" as an edition decision (it isn't one; SAM is one product).
- **The WebUI/entrypoint lands on port 8800** (the desktop app opens it for you; the startup log prints the URL — tell users to trust that line over any remembered port).
- **Pre-flight on a laptop**: `sam doctor` with `SAM_DOCTOR_CONTEXT=local` checks the LLM key, ports, and runtime before first start — cheaper than debugging a blank chat.
- A failing *trial* (won't start, blank UI, LLM errors) routes to `sam-troubleshoot` / `sam-operate` only after `sam doctor` has been run and read.

## References

| Topic | File |
|---|---|
| The desktop trial flow in detail + pre-flight | [references/trial-paths.md](references/trial-paths.md) |

Graduation hand-offs: "now I want it to do X" → `sam-author-agent` (often just: talk to the Builder agent); "my team should use this" → `sam-deploy` (and `sam config pull` carries what they built — see `sam-declarative-config`).

The desktop instance runs a full platform whose config API is fronted by the entrypoint proxy (`http://127.0.0.1:8800` by default), so `sam config apply --url <that origin>` (or `--target desktop`) targets it directly — you can iterate declarative config against the desktop instance, not just `pull` from it. See `sam-declarative-config`.
