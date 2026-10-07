# Python remote tools (`sam-tool-sdk`)

A Python remote tool is a subprocess the STR forks in a sandbox. It is **not** Python Agent Mesh's in-process tool model: Agent Mesh has no `tool_type: python`, no `component_module` / `component_base_path` / `function_name` keys, and no ADK `ToolContext` import — a `tool_type: python` entry logs a migration warning and registers nothing. If the user is migrating from Python Agent Mesh, that is the message to deliver first.

The SDK is the **`sam-tool-sdk` package from PyPI** (scaffold pins `sam-tool-sdk>=0.1,<0.2`). Its CLI runner answers the STR's `--schema` probe and the runner-args execution protocol — your code never touches the wire format.

## Start from the scaffold — always

```bash
sam toolset init mytools --lang python              # toolset package
sam skill init myskill --with-tool --lang python    # skill with a bundled Python tool
```

The scaffold writes `pyproject.toml` (depending on `sam-tool-sdk`, with a `[project.scripts]` entry that becomes the manifest's `executable: python/bin/<name>`), a working tool module, and `manifest.yaml`. A **toolset** scaffold (`sam toolset init --lang python`) also writes `build.sh`/`build.bat`; a **skill-bundle** tool (`sam skill init --with-tool --lang python`) does **not** — there is no per-tool build script to run, and `sam skill validate` / `sam skill package` perform the `pip install --target` build for you. Local dev: `pip install -e .` into a venv for autocomplete. The build re-installs via `pip install --target` into the deployment-shaped tree (AWS-Lambda-Layer convention: `python/bin/`, site-packages under `python/`); default Python is 3.11 (`SAM_TOOL_PYTHON_VERSION` to change).

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

Schema derivation rules: the function **must have a docstring** — its first line is the tool description the LLM uses to choose the tool, and the SDK raises at schema discovery if it is empty (strict providers like Amazon Bedrock reject a tool advertised with an empty description); annotated params become properties (`str`/`int`/`float`/`bool`/`list[X]`/`dict`, nested `TypedDict`/`@dataclass`/pydantic models); **a default value makes a param optional, no default makes it required**; per-param descriptions come from the docstring `Args:` block; a `SandboxToolContextFacade`-annotated param is framework-injected, invisible to the LLM; an `Artifact`-annotated param (or `list[Artifact]`) is pre-loaded by the STR before the call (`doc.as_text()`, `doc.filename`). `@with_dynamic_schema(fn)` is the escape hatch for runtime-computed schemas.

**Results** — `ToolResult.ok(message, data=, data_objects=)` / `.error(message, code=, data=)` / `.partial(message, data=, error_code=)` / `.pending(...)` / `.auth_required(...)`. **`.error()`'s keyword is `code=`, not `error_code=`** — the serialized wire field is `error_code`, but passing `error_code=` to `.error()` raises `TypeError` at call time (only `.partial()` takes `error_code=`). `sam skill validate` will *not* catch this: it runs `--schema` discovery only, so the error branch never executes — exercise the failure path (call the built tool with an argsfile) before you ship. Returning a plain dict is legacy-accepted, but `ToolResult` is the failure path and the only way to attach artifacts. `data=` is inline (small scalar summaries the LLM sees); `data_objects=[DataObject(name=, content=, mime_type=, disposition=DataDisposition.ARTIFACT, description=)]` for file outputs (`AUTO` / `ARTIFACT` / `INLINE` / `ARTIFACT_WITH_PREVIEW`).

**Context facade** — `ctx.send_status(text)`; `ctx.call_llm(system_prompt, user_prompt, temperature=)` (raises `IPCError` when the STR has no LLM IPC); `await ctx.load_artifact(filename, version=, as_text=)`, `await ctx.list_artifacts()`, `ctx.save_artifact(name, content, ...)`; `ctx.get_config(key, default)`; `ctx.session_id` / `ctx.user_id` / `ctx.app_name` / `ctx.task_id`; `ctx.user_profile` (the gateway-forwarded user profile as a dict, empty when none; unsigned, so scope and audit with it but never authorize on it alone). `ctx.send_signal(...)` is **not** supported in the sandbox and raises.

**Operator config & secrets** — declare with `@with_config_schema([ConfigSchemaField(key="api_token", type="string", required=True, secret=True), ...])`; the platform renders a form on attach (secret fields masked) and injects values (precedence: agent overlay > toolset `spec.config` > schema default). Read via the injected `tool_config` param or `ctx.get_config`. This — not hardcoded env — is the supported path for API keys.

**Decorators** — `@tool_timeout(seconds=120)`.

**Multiple tools / full schema control** — subclass `DynamicTool` (one tool, hand-written `parameters_schema`) or `DynamicToolProvider` + `@register_tool` (many tools, one executable), run with `dynamic_tool_cli` / `provider_cli`.

## Manifest (`manifest.yaml`, written by the scaffold)

```yaml
version: 1
tools:
  get_weather:                       # manifest KEY → exposed name skillname__get_weather
    runtime: python                  # set it — sam skill validate keys off it to put the bundled site-packages on PYTHONPATH
    tool_dir: weather                # REQUIRED — the STR does not infer it from the manifest key
    executable: python/bin/weather   # Lambda-layer path = the [project.scripts] name
    timeout_seconds: 30
    sandbox_profile: standard        # optional: restrictive | standard | permissive (default standard)
```

Emit the manifest exactly as the scaffold does — `runtime: python` and `tool_dir` are both load-bearing, but at *different* stages.

**`tool_dir` is required unconditionally.** The STR resolves a relative `tool_dir` against the skill's `tools/` directory and joins `executable` onto it. When `tool_dir` is omitted the STR falls back to `tools/` **itself, not to the manifest key** — so `executable: python/bin/weather` is looked up at `tools/python/bin/weather`, the fallback probe misses as well, and `PYTHONPATH` lands on `tools/` instead of the bundled `python/` layer. The tool never becomes callable. `sam skill validate` and the config-apply build *do* fall back to the manifest key, so when your directory happens to be named exactly the manifest key, an omitted `tool_dir` validates green locally and still fails on the deployed STR. Always write it.

**`runtime: python` is a validate-time requirement.** `sam skill validate` sets `PYTHONPATH` only when it is present, so omitting it makes the `--schema` probe fail with `ModuleNotFoundError`. It does not break the deployed tool — the config-apply build infers Python from `pyproject.toml` and the STR sets `PYTHONPATH` unconditionally.

The exposed agent-facing name is `skillname__<manifest-key>`, driven by the key, **not** the function name you pass to `tool_cli` — the Python scaffold deliberately ships a key (`<skill>_greet`) that differs from its function name (`greet`), and the sole-tool fallback binds it anyway. So the key is what your SKILL.md must reference. `sam skill validate` hard-fails a key matching none of a *multi*-tool binary's registered tools, but silently accepts any key when the binary registers exactly one tool — a single-tool mismatch ships quietly. A manifest may list several tools (multiple entries, or one provider executable that registers many).

## Build, validate, package

Same shape as Go, but the first step differs by package type. **Toolset:** `SAM_TOOL_TARGET_OS=linux SAM_TOOL_TARGET_ARCH=arm64 ./build.sh` (both variables are required; the script exits if either is unset) → `sam toolset validate` (runs the exact `--schema` discovery the STR performs) → `sam toolset package --url <platform>` → upload. **Skill bundle:** there is no build script — `sam skill validate` → `sam skill package --url <platform>` → upload; both of those run the `pip install --target` build for you. Either way the bundle must contain **every dependency** — there is no preinstalled Python environment in the sandbox; an unbundled `httpx` import fails at discovery or call time.

## Sharp edges

- **30s schema-discovery timeout includes import time.** Heavy imports (pandas, large clients) at module top level can blow the probe — defer imports into the handler.
- **`standard` is the default sandbox profile (network on).** Set `sandbox_profile` only to tighten to `restrictive` (which isolates the network — an HTTP-calling tool must stay on `standard` or above) or loosen to `permissive`.
- **No `.venv/` or `.whl` files in the uploaded zip** — server-side validation rejects them; the build's `pip install --target` tree is the correct shape.
- **Wrong-architecture wheels**: packages with native extensions must match the deployed STR's OS/arch — `sam toolset package --url <platform>` resolves the target; don't upload a zip built ad hoc on a Mac.
- **Secrets** go through `@with_config_schema(... secret=True)` fields, with the value set at the toolset- or skill-level `spec.config` — never hardcoded in source, never in the per-agent overlay. See [packaging-and-deploy.md](packaging-and-deploy.md) for the config-precedence and attach model.
