# Python remote tools (`sam-tool-sdk`)

A Python remote tool is a subprocess the STR forks in a sandbox. It is **not** Python SAM's in-process tool model: SAM-Go has no `tool_type: python`, no `component_module` / `component_base_path` / `function_name` keys, and no ADK `ToolContext` import — a `tool_type: python` entry logs a migration warning and registers nothing. If the user is migrating from Python SAM, that is the message to deliver first.

The SDK is the **`sam-tool-sdk` package from PyPI** (scaffold pins `sam-tool-sdk>=0.1,<0.2`). Its CLI runner answers the STR's `--schema` probe and the runner-args execution protocol — your code never touches the wire format.

## Start from the scaffold — always

```bash
sam toolset init mytools --lang python              # toolset package
sam skill init myskill --with-tool --lang python    # skill with a bundled Python tool
```

The scaffold writes `src/pyproject.toml` (depending on `sam-tool-sdk`, with a `[project.scripts]` entry that becomes the manifest's `executable: python/bin/<name>`), a working tool module, `manifest.yaml`, and `build.sh`/`build.bat`. Local dev: `pip install -e .` into a venv for autocomplete. The build re-installs via `pip install --target` into the deployment-shaped tree (AWS-Lambda-Layer convention: `python/bin/`, site-packages under `python/`); default Python is 3.11 (`SAM_TOOL_PYTHON_VERSION` to change).

## Verified API surface

**Function tool + `tool_cli`** — the default pattern. Schema is derived from the signature; you don't hand-write it:

```python
from sam_tool_sdk import tool_cli, ToolResult, SandboxToolContextFacade

async def get_weather(city: str, units: str = "metric", ctx: SandboxToolContextFacade = None) -> ToolResult:
    """Look up current weather.

    Args:
        city: City name.
        units: metric or imperial.
    """
    ctx.send_status(f"querying {city}…")
    return ToolResult.ok(message=f"Weather for {city}", data={"tempC": 21})

cli = tool_cli(get_weather)        # [project.scripts] points here
```

Schema derivation rules: annotated params become properties (`str`/`int`/`float`/`bool`/`list[X]`/`dict`, nested `TypedDict`/`@dataclass`/pydantic models); **a default value makes a param optional, no default makes it required**; per-param descriptions come from the docstring `Args:` block; a `SandboxToolContextFacade`-annotated param is framework-injected, invisible to the LLM; an `Artifact`-annotated param (or `list[Artifact]`) is pre-loaded by the STR before the call (`doc.as_text()`, `doc.filename`). `@with_dynamic_schema(fn)` is the escape hatch for runtime-computed schemas.

**Results** — `ToolResult.ok(message, data=, data_objects=)` / `.error(message, error_code=)` / `.partial(...)` / `.pending(...)` / `.auth_required(...)`. Returning a plain dict is legacy-accepted, but `ToolResult` is the failure path and the only way to attach artifacts. `data=` is inline (small scalar summaries the LLM sees); `data_objects=[DataObject(name=, content=, mime_type=, disposition=DataDisposition.ARTIFACT, description=)]` for file outputs (`AUTO` / `ARTIFACT` / `INLINE` / `ARTIFACT_WITH_PREVIEW`).

**Context facade** — `ctx.send_status(text)`; `ctx.call_llm(system_prompt, user_prompt, temperature=)` (raises `IPCError` when the STR has no LLM IPC); `await ctx.load_artifact(filename, version=, as_text=)`, `await ctx.list_artifacts()`, `ctx.save_artifact(name, content, ...)`; `ctx.get_config(key, default)`; `ctx.session_id` / `ctx.user_id` / `ctx.app_name` / `ctx.task_id`. `ctx.send_signal(...)` is **not** supported in the sandbox and raises.

**Operator config & secrets** — declare with `@with_config_schema([ConfigSchemaField(key="api_token", type="string", required=True, secret=True), ...])`; the platform renders a form on attach (secret fields masked) and injects values (precedence: agent overlay > toolset `spec.config` > schema default). Read via the injected `tool_config` param or `ctx.get_config`. This — not hardcoded env — is the supported path for API keys.

**Decorators** — `@tool_timeout(seconds=120)`, `@with_volume_params([VolumeParam(name=, mount_path=)])` (resolve with `ctx.get_volume_mount_path(mount_path)` — keyed by mount path, not name).

**Multiple tools / full schema control** — subclass `DynamicTool` (one tool, hand-written `parameters_schema`) or `DynamicToolProvider` + `@register_tool` (many tools, one executable), run with `dynamic_tool_cli` / `provider_cli`.

## Manifest (`manifest.yaml`, written by the scaffold)

```yaml
version: 1
tools:
  get_weather:
    executable: python/bin/weather    # Lambda-layer path = the [project.scripts] name
    timeout_seconds: 30
    sandbox_profile: standard         # restrictive | standard | permissive
```

The STR resolves `executable` against the tool dir, then `python/bin/`, and sets `PYTHONPATH` for the bundled site-packages. A manifest may list several tools (multiple entries, or one provider executable that registers many).

## Build, validate, package

Same lifecycle as Go: `./build.sh` → `validate` (runs the exact `--schema` discovery the STR performs) → `package --url <platform>` → upload. Use `sam toolset …` for a toolset package and `sam skill …` for a skill bundle — same subcommands either way. The bundle must contain **every dependency** — there is no preinstalled Python environment in the sandbox; an unbundled `httpx` import fails at discovery or call time.

## Sharp edges

- **30s schema-discovery timeout includes import time.** Heavy imports (pandas, large clients) at module top level can blow the probe — defer imports into the handler.
- **`standard` is the default sandbox profile (network on).** Set `sandbox_profile` only to tighten to `restrictive` (which isolates the network — an HTTP-calling tool must stay on `standard` or above) or loosen to `permissive`.
- **No `.venv/` or `.whl` files in the uploaded zip** — server-side validation rejects them; the build's `pip install --target` tree is the correct shape.
- **Wrong-architecture wheels**: packages with native extensions must match the deployed STR's OS/arch — `sam toolset package --url <platform>` resolves the target; don't upload a zip built ad hoc on a Mac.
- **Secrets** go through `@with_config_schema(... secret=True)` fields, with the value set at the toolset- or skill-level `spec.config` — never hardcoded in source, never in the per-agent overlay. See [packaging-and-deploy.md](packaging-and-deploy.md) for the config-precedence and attach model.
