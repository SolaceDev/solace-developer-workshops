---
title: Packaging Skills
description: Bundle reusable instructions and tools as a SKILL.md directory loaded on demand by an agent and its Secure Tool Runtime.
sidebar_position: 650
---

# Packaging Skills

Skills exist so that an agent can stay small at the prompt level and still reach a large library of capabilities. Putting every reference document and every tool into one agent config is a recipe for a slow, expensive, and easily-distracted LLM. Skills move that material into named bundles that the agent pulls in only when needed.

This page covers the bundle layout, the `SKILL.md` format, how an agent loads a skill at runtime, how to ship a bundled tool inside a skill, and how to package a skill for distribution. The configured-vs-built dimension applies to the *tools* inside a skill, not to the bundle itself — see [Concepts → Configured vs built](../concepts/configured-vs-built.md) for the broader picture.

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

A skill that ships tools declares them in `tools/manifest.yaml`. The manifest is the same shape Secure Tool Runtime (STR) manifests use elsewhere — see [Building → Tools](./tools.md) for the tool-authoring side of this story. The skill-specific behavior is that bundled tools are surfaced under a namespaced name and routed through STR.

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

A bundled tool can be Python or Go. The two share the manifest shape; what differs is whether the executable is a Python script run from a virtual environment alongside it, or a compiled Go binary. The full authoring story for both is on [Building → Tools](./tools.md); this page concerns itself with how the skill bundles them up.

## How the Agent and the STR Coordinate

A skill has two consumers — the Agent-Workflow Executor (AWE) that runs the agent's LLM loop, and the Secure Tool Runtime that executes the skill's tools. Only the STR touches the filesystem; AWE learns about skills indirectly.

The STR scans `SAM_SKILLS_DIR` at startup, reads each `SKILL.md`, parses the bundled-tool manifest, and stands up a worker that subscribes to the broker topics carrying invocations for each `<skill>__<tool>` name. It also broadcasts a skill-init message per skill carrying the metadata (description, bundled tools, whether the skill has `references/`). When the skill bundle changes — a re-built tool, an edited `SKILL.md` — the STR re-discovers and broadcasts again.

The agent subscribes to skill-init messages, filters by the names in its `skills:` block, and uses the broadcast metadata to populate `load_skill`'s catalogue. When `load_skill` runs, the agent registers the bundled tools as STR-routed `builtin` tools under the prefixed name. Invocations from the LLM flow through AWE to the STR worker over the broker.

The implication: if you change a skill's directory structure or rename it, the STR has to see the change. Restart the STR — or, in embedded mode, the single process — to trigger re-discovery. With a Platform service in the path, `sam config apply` pushes the change through and restarts the affected components.

The Linux equivalent of `SAM_SKILLS_DIR`, used when the STR runs tools inside a container sandbox, is `SAM_SKILLS_LINUX_DIR` (default `~/.config/sam/skills-linux/`). When a tool needs OS-specific binaries, ship the macOS or host variant under `SAM_SKILLS_DIR` and the Linux variant under `SAM_SKILLS_LINUX_DIR`. The container-mode STR mounts the Linux directory; direct-mode and bwrap-mode STR use the host directory.

## Asset Templates

A skill's `assets/` directory holds static files the skill ships — a logo, a boilerplate document, a reference PDF, or a report template. An agent brings one of these files into the session's artifact store with the `instantiate_skill_asset` tool. The tool has two modes, decided entirely by whether the asset has a sidecar:

- **Plain asset** (no sidecar) — the file is copied **verbatim** into the artifact store. Any MIME type is fine, including binary; the bytes are not interpreted. Use this to drop in a logo or a starting-point file the agent then edits with the artifact tools.
- **Template** (has a `.template.yaml` sidecar) — a deliverable file (HTML, Markdown, …) whose sidecar declares a contract. The tool fills in `@@KEY@@` placeholders, validates that the file will render cleanly against the session's data, and saves it. The saved artifact keeps its embeds and Liquid blocks and **renders live every time it is downloaded or viewed** — so a report stays a live view over the session's data rather than a frozen snapshot.

Asset templates let a skill ship report and document templates with no generation code, and they are one of the larger token-efficiency levers in Solace Agent Mesh: the model produces only the small data artifact, and the template engine renders the large document — instead of the model typing the whole document token by token.

The tool is offered to the agent automatically whenever any loaded skill has an `assets/` directory; its template-specific behavior is surfaced when any loaded skill ships templates. A skill author writes no wiring — dropping the files in `assets/` is the entire declaration.

### The `instantiate_skill_asset` Tool

```text
instantiate_skill_asset(
  skill_name:      string,            # the skill that owns the asset
  asset:           string,            # path under assets/ — the file, or its .template.yaml sidecar
  output_filename: string,            # optional: name for the saved artifact
  substitutions:   object             # optional, template mode only: values for the @@KEY@@ placeholders
) -> { filename: string, version: int }
```

The tool is **fail-closed**: for a template, nothing is written unless substitution, data validation, and a clean-render check all pass. On failure it returns `{ ok: false, errors: [...] }` echoing the part of the contract that failed, so the agent can fix the data or the substitutions and retry in one round-trip. Passing `substitutions` for a plain (non-template) asset is an error.

### Two Layers of Binding

A template separates two substitutions that happen at different times and are satisfied by different actors:

| Layer | When | Mechanism | Satisfied by |
|---|---|---|---|
| **Substitution** | instantiate time | literal `@@KEY@@` text replacement | the `instantiate_skill_asset` call |
| **Resolution** | serve time (download / view) | embeds (`«…»`) and Liquid (`{% %}` / `{{ }}`) | session artifacts that already exist |

`instantiate_skill_asset` performs only the substitution layer, then *validates* that the resolution layer will succeed — it deliberately does not resolve the embeds, so the stored artifact stays a live view. Resolution happens on the normal artifact-serving path.

### The `.template.yaml` Sidecar

A file in `assets/` becomes a template when a sibling `<name>.template.yaml` exists — for example, `report.html` paired with `report.template.yaml`. The sidecar is the single source of truth for the template's contract: the agent reads it (with `read_skill_resource`) before producing data, and the tool echoes the relevant slice of it on failure. It has three sections:

```yaml
# skills/quarterly_report/assets/report.template.yaml
template:
  file: report.html                       # the asset this sidecar describes, relative to assets/
  output_filename: quarterly_report.html  # default output name; the tool's output_filename arg overrides
  mime_type: text/html                    # MIME the output is saved with — must be a text type
  description: Quarterly sales summary with a per-month table

substitutions:                            # Layer 1 — bound at instantiate time
  report_title:
    description: H1 title shown at the top of the report
    default: "Quarterly Report"
    required: false
  prepared_by:
    description: Name the report is attributed to
    required: true

data_inputs:                              # Layer 2 — bound at serve time, satisfied by session artifacts
  sales_rows:
    description: One row per month, oldest first
    artifact: sales_data.json             # the artifact name the template's embeds/Liquid reference
    mime_type: application/json
    required: true
    schema:                               # JSON Schema the data artifact must satisfy
      type: array
      items:
        type: object
        required: [month, revenue]
        properties:
          month:   { type: string }
          revenue: { type: number }
```

**`template`** — `file` and `mime_type` are required. `mime_type` must be a **text** type (a template carries embeds that are resolved at serve time, which only works on text); a binary `mime_type` with a sidecar is rejected as a configuration error. `output_filename` and `description` are optional.

**`substitutions`** (Layer 1) — each entry declares a `@@KEY@@` placeholder the template body contains. Fields: `description`, `default` (optional), `required` (default `false`). The `@@KEY@@` delimiter is chosen because it essentially never occurs in real text or code, so it never collides with the `${…}` of a JavaScript template literal or the `{{ … }}` of Liquid — those are left untouched and need no escaping. Substitution is **closed-set**: the tool replaces only the declared keys, and it enforces three rules at instantiate time:

- every `required` key must be satisfied by the call or its `default`, or nothing is written;
- a provided key that is not declared is an error (a typo guard, with a "did you mean" hint);
- any leftover `@@word@@` after substitution is an error (catches a misspelled or undeclared key).

**`data_inputs`** (Layer 2) — each entry declares a session artifact the template's embeds/Liquid will consume at serve time, keyed by a logical name:

| Field | Meaning |
|---|---|
| `description` | What the data represents — guidance for the agent. |
| `artifact` | The artifact filename the template references and that the agent must create. |
| `mime_type` | Expected MIME of the data artifact. |
| `required` | Whether the artifact must exist for instantiation to succeed. |
| `schema` | JSON Schema, validated against the artifact content (for JSON data). |
| `columns` | A lighter spec for tabular/CSV data: a list of `{ name, type, required }`. |

An entry uses **either** `schema` (JSON) **or** `columns` (CSV), never both. This validation is what catches the silent-failure class that this feature exists to prevent: a missing or mistyped field renders as blank rather than erroring, so a report can "succeed" while quietly full of holes. The tool runs both a schema/column conformance check **and** a clean-render check before saving — the first catches malformed-but-permissive data, the second catches missing artifacts, bad references, and size or depth limits.

### Worked Example: A `quarterly_report` Skill

```text
skills/quarterly_report/
  SKILL.md
  assets/
    report.html
    report.template.yaml
```

The template body pairs `@@KEY@@` substitutions with a Liquid block that renders the data at serve time. The `${…}` in the inline script is a JavaScript template literal — substitution leaves it untouched because it is not a declared key:

```html
<!doctype html>
<html>
  <head><title>@@report_title@@</title></head>
  <body>
    <h1>@@report_title@@</h1>
    <p>Prepared by @@prepared_by@@</p>
    <table>
      <tr><th>Month</th><th>Revenue</th></tr>
      «««template_liquid: data="sales_data.json"
      {% for row in data %}
        <tr><td>{{ row.month }}</td><td>{{ row.revenue }}</td></tr>
      {% endfor %}»»»
    </table>
    <script>
      document.querySelectorAll('td').forEach((c, i) => { c.dataset.idx = `cell-${i}`; });
    </script>
  </body>
</html>
```

The `SKILL.md` body tells the agent the workflow — read the contract, produce the data, then instantiate:

```markdown
This skill produces quarterly sales reports.

Workflow:
1. Read `report.template.yaml` to see the data contract.
2. Produce the data artifact it requires (here, `sales_data.json`).
3. Call instantiate_skill_asset with skill_name="quarterly_report",
   asset="report.html", and substitutions set (at least prepared_by).
```

At runtime the agent loads the skill, sees the template listed, reads `report.template.yaml`, writes `sales_data.json` as `[{month, revenue}, …]`, then calls `instantiate_skill_asset`. The tool fills `@@report_title@@` and `@@prepared_by@@` (leaving the JavaScript `${i}` alone), validates `sales_data.json` against the schema, confirms the file renders cleanly, and saves `quarterly_report.html`. When the user downloads that artifact, the Liquid block expands against the current `sales_data.json`.

### Serve-Time Caveats

Because a template's saved artifact renders on download, three properties of the serving path apply:

- A **truncated preview** (a download capped with `?maxBytes`) skips rendering and shows the literal embeds. A full download renders them.
- The **scheduled-artifact** delivery path returns raw bytes and does not render — a report delivered that way ships with its embeds unresolved.
- Very large or deeply nested reports can hit the serve-time size and depth limits even though instantiation validated cleanly; the validation check uses the same limits to stay faithful.

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

Implement the tool as a Python `DynamicTool` subclass with a CLI entry point. The full authoring details — schema, artifact-typed parameters, async invocation — live on [Building → Tools](./tools.md); the structure looks like this:

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

Run the agent through `sam run` (or any of the other [run modes](../installing/index.md)). Ask "what's the weather in Toronto?" The LLM calls `load_skill` to pull in the weather skill, then calls `weather__get_forecast` with `city: "Toronto"`, then returns the result.

## Authoring a Python Skill Tool

The fastest way to get the layout right is `sam skill init <name> --with-tool --lang python`, which scaffolds the `pyproject.toml`, a sample `sam-tool-sdk` tool, and the matching `tools/manifest.yaml` entry. To wire one up by hand instead: Python skill tools are packaged as a directory with a `pyproject.toml` and a script using `sam-tool-sdk`. The build step installs the SDK and the tool into a `python/` directory under the tool's `tool_dir`, so that the runtime's executable probe finds the entry-point script at `<tool_dir>/python/bin/<executable>`:

```bash
cd skills/weather/tools/get_forecast
uv pip install --target python/ sam-tool-sdk .
```

Full Python authoring details — `DynamicTool` vs `DynamicToolProvider`, artifact-typed parameters, `tool_config` passthrough, virtual-environment management — are on [Building → Tools](./tools.md).

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

The full Go authoring path — including dual-target builds (host and Linux), the `--schema` discovery contract, and the `samtoolsdk` API surface — is covered on [Building → Tools](./tools.md). Skills carry Go tools the same way they carry Python tools; the difference is in what the executable does.

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

For Go tools the archive carries the compiled binary, so the target host architecture matters — build the binary for the right OS and architecture, or use the dual-target build pattern documented on [Building → Tools](./tools.md). For Python tools the venv is host-specific; either ship the source and rebuild on the target, or ship a venv built on a machine matching the target.

When a Platform service is in the path, skills can also be applied declaratively through `sam config apply`, in which case the platform stores the skill bundle and reconciles it across the agents that reference it.

## Managing Skills Through the Platform Service

Everything above describes the config-file path — skills on disk under `SAM_SKILLS_DIR`, consumed by `sam run`. With a Platform service in the path, skills are also a first-class resource you upload, browse, and attach to agents through the web UI. For the concept and lifecycle, see [Concepts → Skills](../concepts/skills.md). This surface parallels [Building → Toolsets](./toolsets.md) — same upload model and `discoveryStatus` lifecycle.

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

This produces `weather.zip`, compiling any bundled Go tools and building native wheels for any bundled Python tools for the deployed STR's architecture and Python version (set `SAM_TOOL_TARGET_OS` / `SAM_TOOL_TARGET_ARCH` / `SAM_TOOL_PYTHON_VERSION` to override when the platform is unreachable; default `linux/arm64`). See [Reference → CLI → `sam skill`](../reference/cli.md#sam-skill).

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

If you developed an agent and its skills together, the bundled upload flow accepts an agent YAML plus skill zips (and toolset zips) in one submission — the Platform service creates the skills and the agent with them already attached. See [Building → Toolsets → Bundled upload](./toolsets.md#bundled-upload-agent-and-toolsets-together).

For a structured walkthrough of skill discovery and load failures, see [Installing → Troubleshoot](../installing/troubleshoot.md#skill-discovery-or-activation-failure).

## What Next?

The bundled tools you ship inside a skill are themselves the subject of the next chapter. [Building → Tools](./tools.md) covers the built-in tool families, MCP and OpenAPI tool declarations, the Python and Go remote-tool authoring paths, and the Secure Tool Runtime sandbox model that runs every skill-bundled tool. For the concept-level view of skills as a Platform resource, see [Concepts → Skills](../concepts/skills.md). Once you have a skill and a tool wired up, [Building → Agents](./agents.md) covers wiring both into an agent's YAML config.
