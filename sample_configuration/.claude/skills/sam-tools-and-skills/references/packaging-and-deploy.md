# Toolsets & skills: packaging, deploy, attach, config

## Toolset vs skill — the real distinction

| | Toolset | Skill |
|---|---|---|
| Is | A zip of remote tools + manifest | Instructions (SKILL.md) + references/assets + *optional* bundled tools |
| Agent sees | Tools always on its tool list | Skill metadata only; full instructions + tools register when the LLM calls `load_skill` (progressive disclosure) |
| Tool names | `toolsetname__toolname` | `skillname__toolname` |
| Pick when | Standalone utilities, no usage guidance needed | The tools have a workflow ("validate, then normalize, then dedupe") or the value is mostly knowledge/instructions |

Both are platform resources: uploaded once, versioned, attached to agents by name.

## On-disk layout (scaffolded — don't hand-build)

```
toolsets/<name>.yaml          # kind: toolset metadata (+ spec.config shared defaults)
toolsets/<name>/src/          # tool source (sam toolset init)

skills/<name>/SKILL.md        # frontmatter: name (kebab-case, must match dir), description; body = instructions
skills/<name>/references/     # on-demand docs        skills/<name>/assets/   # templates etc.
skills/<name>/tools/          # optional bundled tools + tools/manifest.yaml (sam skill init --with-tool)
```

Skills have **no** separate `<name>.yaml` header — the directory with SKILL.md *is* the resource; frontmatter `name` must match the directory name or `sam config plan` hard-errors.

## CLI lifecycle (`sam toolset …` and `sam skill …` mirror each other)

| Command | Does |
|---|---|
| `init NAME [PATH] --lang go\|python` (skill: `--with-tool [--lang …]`) | Working scaffold: code + manifest + build script; Go SDK vendored offline |
| `sync` | Re-vendor the embedded Go SDK after a CLI upgrade (no-op for Python) |
| `validate NAME` | Host build + the exact `--schema` discovery the STR runs — pre-upload preflight |
| `package NAME --url <platform>` | Cross-compile for the deployed STR's arch, zip for WebUI upload |
| `build-target --url <platform> [--format shell]` | Print the STR's GOOS/GOARCH (`SAM_TOOL_TARGET_OS`/`ARCH` env overrides) |

`--url` is the platform service base URL; CLI authentication against it is covered by `sam-declarative-config`'s `cli-auth.md` reference. One bundle may carry several tools: a manifest lists multiple entries, one Go binary or Python provider can register many tools, and a skill's `tools/` dir holds one subdirectory per tool.

## Two deploy paths

1. **Zip upload (UI-first):** `sam toolset|skill package` → WebUI **Toolsets** / **Skills** page → upload zip. Status runs `pending → ready | failed` as the STR syncs and probes schemas; `failed` shows discovery errors in the detail page.
2. **Declarative repo (config-as-code):** keep `toolsets/` and `skills/` in the repo; `sam config plan` builds (per-target cache) and shows the diff, `apply` uploads and waits for `ready`; `pull` exports deployed bundles back (mirror flow). **All YAML authoring — `kind: toolset`, `spec.config`, agent attachment — belongs to `sam-declarative-config`** (its `toolset.md`, `skill.md`, `tool-build.md` references); name keys here, write YAML there.

An agent can deploy while its toolset is still `pending` — deployment succeeds but the tools fail until the toolset turns `ready`. Check the status before debugging "my tool doesn't work".

**Updating a deployed bundle:** re-upload the new zip (or re-run `apply`; unchanged bundles are hash-diffed into a no-op). A changed bundle cycles `pending → ready` again and **redeploys every agent bound to it** — flag that before updating a shared toolset/skill in production hours.

## Attaching & per-agent config

- **UI:** agent editor → attach toolset/skill by name; tools with declared config fields render a form (secret fields masked). Built-in `sam-*` skills attach the same way.
- **Declarative:** agent spec lists names — `toolsets:` and `skillRefs:`, with per-agent overrides in `toolsetConfigs` / `skillConfigs` (key names; YAML via `sam-declarative-config`).
- **Config model:** the toolset's `spec.config` holds **shared defaults — put secrets here** (one key serves every agent). The agent's `toolsetConfigs` / `skillConfigs` overlay holds **non-secret per-agent tunables** (region, model, verbosity). Precedence per key: agent overlay > toolset/skill-level value > the tool's schema default. The reserved `auth` key carries the deployment's OAuth `client_id` (never secrets; the SDK-declared URLs/scopes are authoritative and can't be overridden).
- **Per-agent execution timeout does not exist.** `timeout_seconds` lives in the tool's manifest, fixed at package time — set it as the hard ceiling for all agents. If agents need different operational limits, declare a config field the tool itself reads and honors, and set it per agent via the overlay.
- **Skills load at runtime:** when `skills:` is configured the agent auto-registers `load_skill`/`unload_skill`. Changed skills are picked up on the next load/session — running conversations don't hot-refresh.

## Local/dev mode (no platform)

Agents can read skills straight from disk: agent config sets `skills_base_path` and lists skills by directory name (`SAM_SKILLS_DIR`, default `~/.config/sam/skills/`; container-sandbox STRs use `SAM_SKILLS_LINUX_DIR` for Linux tool variants). AWE and STR must see the **same skills filesystem** — a mismatch yields "agent lists the skill but tools are missing" (or vice versa). Symlinking a working tree into the skills dir is the standard dev loop; structural changes need an STR (or embedded-process) restart to re-discover.
