# Built-in tool groups

Two namespaces exist for the same catalog — don't mix them up:

- **Runtime group names** (used in agent runtime YAML `tools: - tool_type: builtin-group / group_name: <name>`)
- **Platform toolset IDs** (what the builder UI's toolsets picker and platform DB store; mostly `builtin_*`-prefixed aliases of the runtime groups)

Canonical registry: the Go runtime's builtin group lookup (verified 2026-06). Exact declarative-config syntax: `sam-declarative-config` skill.

## Core groups (runtime name → contents)

| Group | Tools | Notes |
|---|---|---|
| `web_tools` | `web_request`, `web_search_google` | **Web search is built in.** Don't recommend external search MCP servers for plain lookup. Platform alias: `builtin_web_request_tools`. `web_search_google` needs per-tool config (`google_search_api_key`, `google_cse_id` — Google Custom Search credentials); without them the tool errors on first use, so surface this up front. |
| `artifact_management` | list/load/delete/append artifacts, regex search-replace, grep | Alias: `builtin_artifact_tools`. |
| `general_agent_tools` | `get_current_time`, file→markdown converters, `ask_user_question` | The file→markdown converters are STR-backed. |
| `image_tools` | image generate/describe/edit, audio describe | Alias: `builtin_image_tools`. |
| `data_analysis` | SQL over data, sqlite, JMESPath transform, merge, reinterpret artifact, Plotly charts | Chart tool is STR-backed. |
| `research` | `web_search_google`, `deep_research` | Alias: `builtin_research_tools`. |
| `code_execution` | `execute_python_code` | STR-backed; platform visibility behind the python_code_execution feature flag. |
| `hil_tools` | `ask_user_question` | Human-in-the-loop prompt. |
| `notification_tools` | `notify_user` | |

Platform-only toolset IDs without a same-named runtime group: `builtin_file_tools` (the markdown converters), `builtin_time_tools`, `builtin_document_tools` (pptx/pdf/render — STR-backed), `builtin_diagram_tools` (mermaid), `builtin_media_tools` (ffmpeg/imagemagick — STR-backed). `builder_tools` and the `observability_*` groups power the built-in builder/observability agents — not for user agents.

## Choosing the path

- **UI**: toolsets picker → tick the toolset, optionally exclude individual tools, fill per-tool config where a schema exists.
- **Declarative config**: agent kind's toolset references — syntax via `sam-declarative-config`.
- STR-backed tools (documents, media, charts, python, file→markdown conversion) additionally require the deployment's STR fleet to host the matching binaries — if a tool silently does nothing in a trial environment, that's the first thing to check (hand off to `sam-operate` for diagnosis).
