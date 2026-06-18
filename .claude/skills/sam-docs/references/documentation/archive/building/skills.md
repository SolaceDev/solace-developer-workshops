---
title: Building Skills
description: Bundle reusable instructions and tools as a SKILL.md directory loaded on demand by an agent and its Secure Tool Runtime.
sidebar_position: 4
---

# Building Skills

A **skill** is a bundle of instructions and tools that an agent loads on demand. The bundle is a directory: a `SKILL.md` manifest at the top, reference material the agent can consult, optional assets, and an optional set of tools the skill ships with. The agent reads the manifest and decides whether the skill is relevant to the task at hand. If it is, the agent loads the skill, picks up the instructions, and gains access to the bundled tools.

Skills exist so that an agent can stay small at the prompt level and still reach a large library of capabilities. Putting every reference document and every tool into one agent config is a recipe for a slow, expensive, and easily-distracted LLM. Skills move that material into named bundles that the agent pulls in only when needed.

This page covers the bundle layout, the `SKILL.md` format, how an agent loads a skill at runtime, how to ship a bundled tool inside a skill, and how to package a skill for distribution. The configured-vs-built dimension applies to the *tools* inside a skill, not to the bundle itself — see Concepts → Configured vs built for the broader picture.

## The Bundle Layout

A skill is one directory. The directory name is the skill's identifier — the agent references the skill by directory name, not by path.

```text
skills/
  manim/
    SKILL.md                    # required
    references/                 # optional reference material
      api_reference.md
      examples.md
    assets/                     # optional static assets
      template.tex
    tools/                      # optional bundled tools
      manifest.yaml             # tool manifest
      render_manim/             # one directory per tool
        pyproject.toml
        render_manim_tool.py
```

The `SKILL.md` file is the only required element. Everything else is optional. A skill that only ships instructions has no `tools/`. A skill that only ships tools has a minimal `SKILL.md` and no `references/`.

## The SKILL.Md Manifest

`SKILL.md` is Markdown with YAML frontmatter. The frontmatter carries the metadata the agent uses to decide when to load the skill; the body carries the instructions the agent receives once it does.

```markdown
---
name: manim
description: Render mathematical animations and diagrams using the Manim library. Use when the user asks for math animations, geometric visualizations, or algorithm walkthroughs.
---

# Manim skill

When the user requests an animation, draft a short Manim script, then call
`manim__render_manim` to produce the video artifact.

See `references/api_reference.md` for the Manim API subset this skill supports.
```

The `description` field is the trigger text the LLM sees during skill discovery. Write it so the model can tell from one sentence whether the skill applies to the task. Avoid restating the skill name; lead with the user-visible problem the skill solves.

The body is free-form Markdown. The agent receives it verbatim as additional instructions when the skill is loaded, so write it the way you would write an agent prompt: terse, directive, and oriented around the tool calls the skill enables.

## How an Agent Loads a Skill

Skills live under a base path on disk. The agent declares the path through the `skills_base_path` field in its YAML config, and lists the skill names it can load under `skills:`:

```yaml
# configs/agents/my_agent.yaml
...
agents:
  - name: my_agent
    model: anthropic/claude-sonnet-4-5
    instructions: "You are a helpful assistant."
    skills_base_path: "${SAM_SKILLS_DIR}"
    skills:
      - name: manim
      - name: data_viz
...
```

`SAM_SKILLS_DIR` is the environment variable the runtime sets to `~/.config/sam/skills/` by default. Each entry under `skills:` matches a directory name beneath that path.

When the agent starts, it does not read the `SKILL.md` files itself. The Secure Tool Runtime (STR) scans the skills directory, reads each `SKILL.md`, and broadcasts a skill-init message over the broker for every skill it finds. The agent subscribes to those messages and accepts the entries whose names appear in its `skills:` block. By the time the agent is serving traffic, it has a list of available skills with their descriptions and bundled tools.

Declaring any entry under `skills:` is what enables skill loading on the agent — the `load_skill` and `unload_skill` tools are registered automatically when the block is non-empty. You do not add them to the agent's `tools:` list.

At runtime the LLM calls `load_skill` when it decides a skill applies to the current task. `load_skill` injects the body of `SKILL.md` into the conversation and registers the skill's bundled tools so they become callable on the next turn. `unload_skill` reverses both. While a skill is loaded the agent can also call `list_skill_resources`, `read_skill_resource`, and `grep_skill_resources` to walk the skill's `references/` directory.

This lazy-loading model is the point of the skill abstraction. An agent with twenty available skills only pays the prompt-size cost of the skills it actually loads for a given task.

## Skill-Bundled Tools

A skill that ships tools declares them in `tools/manifest.yaml`. The manifest is the same shape Secure Tool Runtime (STR) manifests use elsewhere — see Building → Tools for the tool-authoring side of this story. The skill-specific behavior is that bundled tools are surfaced under a namespaced name and routed through STR.

The naming convention is `<skill_name>__<tool_name>` — two underscores between the skill and the tool. The convention exists because LLM providers restrict tool names to alphanumerics, underscores, and hyphens, so the separator must avoid `:` and `/`.

```yaml
# skills/manim/tools/manifest.yaml
version: 1
tools:
  render_manim:
    executable: render_manim
    tool_dir: render_manim
    timeout_seconds: 120
```

`executable` is the binary or script the STR invokes; `tool_dir` is the subdirectory of `tools/` that holds the tool's files. The same tool is invoked from the agent's perspective as `manim__render_manim` — the prefix comes from the bundle's directory name.

A bundled tool can be Python or Go. The two share the manifest shape; what differs is whether the executable is a Python script run from a virtual environment alongside it, or a compiled Go binary. The full authoring story for both is on Building → Tools; this page concerns itself with how the skill bundles them up.

## How the Agent and the STR Coordinate

A skill has two consumers — the Agent-Workflow Executor (AWE) that runs the agent's LLM loop, and the Secure Tool Runtime that executes the skill's tools. Only the STR touches the filesystem; AWE learns about skills indirectly.

The STR scans `SAM_SKILLS_DIR` at startup, reads each `SKILL.md`, parses the bundled-tool manifest, and stands up a worker that subscribes to the broker topics carrying invocations for each `<skill>__<tool>` name. It also broadcasts a skill-init message per skill carrying the metadata (description, bundled tools, whether the skill has `references/`). When the skill bundle changes — a re-built tool, an edited `SKILL.md` — the STR re-discovers and broadcasts again.

The agent subscribes to skill-init messages, filters by the names in its `skills:` block, and uses the broadcast metadata to populate `load_skill`'s catalogue. When `load_skill` runs, the agent registers the bundled tools as STR-routed `builtin` tools under the prefixed name. Invocations from the LLM flow through AWE to the STR worker over the broker.

The implication: if you change a skill's directory structure or rename it, the STR has to see the change. Restart the STR — or, in embedded mode, the single process — to trigger re-discovery. With a Platform service in the path, `sam config apply` pushes the change through and restarts the affected components.

The Linux equivalent of `SAM_SKILLS_DIR`, used when the STR runs tools inside a container sandbox, is `SAM_SKILLS_LINUX_DIR` (default `~/.config/sam/skills-linux/`). When a tool needs OS-specific binaries, ship the macOS or host variant under `SAM_SKILLS_DIR` and the Linux variant under `SAM_SKILLS_LINUX_DIR`. The container-mode STR mounts the Linux directory; direct-mode and bwrap-mode STR use the host directory.

## Authoring a Minimal Skill End-To-End

A complete skill that ships one Python tool and one piece of reference material looks like this. Start from an empty directory under `SAM_SKILLS_DIR`:

```bash
mkdir -p ~/.config/sam/skills/weather/tools/get_forecast
mkdir -p ~/.config/sam/skills/weather/references
cd ~/.config/sam/skills/weather
```

Write the manifest:

```markdown
---
name: weather
description: Look up the current forecast for a city using a public weather API. Use when the user asks about weather, temperature, or conditions.
---

# Weather skill

When the user asks about weather, call `weather__get_forecast` with the city name. The forecast comes back as plain text suitable for direct inclusion in the response.
```

Implement the tool as a Python `DynamicTool` subclass with a CLI entry point. The full authoring details — schema, artifact-typed parameters, async invocation — live on Building → Tools; the structure looks like this:

```python
# skills/weather/tools/get_forecast/get_forecast_tool.py
from sam_tool_sdk import DynamicTool, dynamic_tool_cli

class GetForecast(DynamicTool):
    @property
    def tool_name(self) -> str:
        return "get_forecast"

    @property
    def tool_description(self) -> str:
        return "Return the current forecast for a city."

    async def _run_async_impl(self, args, tool_context, credential=None):
        city = args.get("city", "unknown")
        return {"forecast": f"Sunny in {city}, 22 C."}

if __name__ == "__main__":
    dynamic_tool_cli(GetForecast())
```

Declare the tool in the manifest:

```yaml
# skills/weather/tools/manifest.yaml
version: 1
tools:
  get_forecast:
    executable: get_forecast_tool
    tool_dir: get_forecast
    timeout_seconds: 10
```

`executable` is the entry-point name; the STR probes for it at `<tool_dir>/<executable>` for a Go binary or Python script at the package root, and at `<tool_dir>/python/bin/<executable>` for a Python entry-point script installed by `pip --target python/`.

Reference the skill from an agent config:

```yaml
# configs/agents/weather_agent.yaml
...
agents:
  - name: weather_agent
    model: anthropic/claude-sonnet-4-5
    instructions: "You answer weather questions."
    skills_base_path: "${SAM_SKILLS_DIR}"
    skills:
      - name: weather
...
```

Run the agent through `sam run` (or any of the other run modes). Ask "what's the weather in Toronto?" The LLM calls `load_skill` to pull in the weather skill, then calls `weather__get_forecast` with `city: "Toronto"`, then returns the result.

## Authoring a Python Skill Tool

The fastest way to get the layout right is `sam skill init <name> --with-tool --lang python`, which scaffolds the `pyproject.toml`, a sample `sam-tool-sdk` tool, and the matching `tools/manifest.yaml` entry. To wire one up by hand instead: Python skill tools are packaged as a directory with a `pyproject.toml` and a script using `sam-tool-sdk`. The build step installs the SDK and the tool into a `python/` directory under the tool's `tool_dir`, so that the runtime's executable probe finds the entry-point script at `<tool_dir>/python/bin/<executable>`:

```bash
cd skills/weather/tools/get_forecast
uv pip install --target python/ sam-tool-sdk .
```

Full Python authoring details — `DynamicTool` vs `DynamicToolProvider`, artifact-typed parameters, `tool_config` passthrough, virtual-environment management — are on Building → Tools.

## Authoring a Go Skill Tool

`sam skill init <name> --with-tool` (or `--lang go`) scaffolds a Go tool — `go.mod`, a sample `samtoolsdk` tool, and the manifest entry — and `sam skill sync` re-vendors the embedded SDK afterward. Go skill tools are single-binary tools built with `pkg/samtoolsdk`. The manifest entry points at the compiled binary:

```yaml
# skills/charts/tools/manifest.yaml
version: 1
tools:
  render_chart:
    executable: bin/render-chart
    timeout_seconds: 30
```

The full Go authoring path — including dual-target builds (host and Linux), the `--schema` discovery contract, and the `samtoolsdk` API surface — is covered on Building → Tools. Skills carry Go tools the same way they carry Python tools; the difference is in what the executable does.

## Development Workflow

Skills are most often developed in-tree and consumed through `SAM_SKILLS_DIR`. The convention during development is to symlink each skill from the repository into `~/.config/sam/skills/`:

```bash
ln -s "$PWD/skills/weather" ~/.config/sam/skills/weather
```

The runtime follows symlinks when scanning the skills directory, so changes to the in-tree skill take effect on the next restart of AWE and STR. For tools, the venv (Python) or compiled binary (Go) still has to be rebuilt; for instruction-only changes, no rebuild is needed.

## Packaging and Distributing a Skill

A skill directory is the unit of distribution. Tar or zip the directory, ship it to the target host, unpack it into `SAM_SKILLS_DIR`, and restart AWE and STR.

```bash
tar -czf weather-skill.tar.gz -C ~/.config/sam/skills weather
```

```bash
# On the target host:
tar -xzf weather-skill.tar.gz -C ~/.config/sam/skills
```

For Go tools the archive carries the compiled binary, so the target host architecture matters — build the binary for the right OS and architecture, or use the dual-target build pattern documented on Building → Tools. For Python tools the venv is host-specific; either ship the source and rebuild on the target, or ship a venv built on a machine matching the target.

When a Platform service is in the path, skills can also be applied declaratively through `sam config apply`, in which case the platform stores the skill bundle and reconciles it across the agents that reference it.

## Managing Skills Through the Platform Service

Everything above describes the config-file path — skills on disk under `SAM_SKILLS_DIR`, consumed by `sam run`. With a Platform service in the path, skills are also a first-class resource you upload, browse, and attach to agents through the web UI. For the concept and lifecycle, see Concepts → Skills. This surface parallels Building → Toolsets — same upload model and `discoveryStatus` lifecycle.

### Scaffold, Validate, and Package the Skill

If you are starting from scratch, scaffold the bundle with the CLI rather than laying out the files by hand:

```bash
sam skill init weather --with-tool --lang python   # or --lang go
```

This writes `skills/weather/` with a `SKILL.md`, a `references/` directory, and a sample bundled tool under `tools/weather/` in the chosen language (`--lang` implies `--with-tool`; default `go`). Drop both flags for an instruction-only skill.

Before uploading, confirm the STR can discover the bundled tools:

```bash
sam skill validate weather
```

`validate` builds the bundled tools for your host and runs the same `--schema` discovery the STR performs, reporting the agent-facing `<skill>__<tool>` name each manifest entry yields, so a bad `executable`/`tool_dir`, import error, or schema failure surfaces locally instead of after upload.

Then build the skill directory into an uploadable zip:

```bash
sam skill package weather --url https://platform.example.com
```

This produces `weather.zip`, compiling any bundled Go tools and building native wheels for any bundled Python tools for the deployed STR's architecture and Python version (set `SAM_TOOL_TARGET_OS` / `SAM_TOOL_TARGET_ARCH` / `SAM_TOOL_PYTHON_VERSION` to override when the platform is unreachable; default `linux/arm64`). See Reference → CLI → `sam skill`.

### Upload Through the Skills Page

Open the web UI and select **Skills** in the navigation:

1. Choose to upload a skill and select `weather.zip`. The skill name comes from the `name` field in the bundle's `SKILL.md` frontmatter; you can add an optional description.
2. The skill starts in `pending` while STR syncs and discovers it, then flips to `ready` (or `failed`, with the discovery errors shown on the detail page).
3. The detail page shows the skill's description, tags, bundled tools, and resource counts once discovery completes.

Re-upload a new zip from the detail page to iterate — running agents pick up the change on the next `load_skill` or a new session, with no redeploy.

### Built-In Skills

The skills list also shows curated built-in skills — `sam-knowledge` and `sam-docs` — that you attach to an agent by name without uploading anything. The `sam-` name prefix is reserved for these.

### Attach Skills to an Agent

In the agent editor, the skills section lets you attach both custom (uploaded) and built-in skills. Under the hood the agent carries two reference fields:

- `skillRefs` — built-in or filesystem skills referenced by name (for example, `sam-knowledge`).
- `skillIds` — Platform-managed custom skills referenced by their UUID.

For a skill whose bundled tools declare config fields, the editor renders a per-skill configuration form (secret fields masked), stored per agent-and-skill. Deploy the agent; it loads attached skills on demand at runtime exactly as in the config-file path.

### Bundled Upload

If you developed an agent and its skills together, the bundled upload flow accepts an agent YAML plus skill zips (and toolset zips) in one submission — the Platform service creates the skills and the agent with them already attached. See Building → Toolsets → Bundled upload.

For a structured walkthrough of skill discovery and load failures, see Installing → Troubleshoot.

## What Next?

The bundled tools you ship inside a skill are themselves the subject of the next chapter. Building → Tools covers the built-in tool families, MCP and OpenAPI tool declarations, the Python and Go remote-tool authoring paths, and the Secure Tool Runtime sandbox model that runs every skill-bundled tool. For the concept-level view of skills as a Platform resource, see Concepts → Skills. Once you have a skill and a tool wired up, Building → Agents covers wiring both into an agent's YAML config.
