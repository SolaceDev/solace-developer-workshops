# Built-in tool groups

Two namespaces exist for the same catalog — don't mix them up:

- **Runtime group names** (used in agent runtime YAML `tools: - tool_type: builtin-group / group_name: <name>`)
- **Platform toolset IDs** (what the builder UI's toolsets picker and platform DB store; mostly `builtin_*`-prefixed aliases of the runtime groups)

Canonical registry: the Go runtime's builtin group lookup (verified 2026-08). Exact declarative-config syntax: `sam-declarative-config` skill.

## Core groups (runtime name → contents)

| Group | Tools | Notes |
|---|---|---|
| `web_tools` | `web_request`, `web_search_google` | **Web search is built in.** Don't recommend external search MCP servers for plain lookup. Platform alias: `builtin_web_request_tools`. `web_search_google` needs per-tool config — all three of `google_search_api_key`, `google_cse_id` (Google Custom Search credentials) **and `api_base`** (the Custom Search endpoint; there is no public-endpoint fallback). Missing any one → the tool errors on first use, so surface this up front. |
| `artifact_management` | list/load/delete/append artifacts, regex search-replace, grep | Alias: `builtin_artifact_tools`. |
| `general_agent_tools` | `get_current_time`, file→markdown converters, `pdf_extract_text`, `ask_user_question` | All STR-backed except `get_current_time` and `ask_user_question`. `pdf_extract_text` is the Go-hosted PDF route, so it is the one that works in embedded and desktop. |
| `image_tools` | image generate/describe/edit, audio describe | Alias: `builtin_image_tools`. |
| `data_analysis` | SQL over data, sqlite, JMESPath transform, merge, reinterpret artifact, Plotly charts | Chart tool is STR-backed. |
| `research` | `web_search_google`, `deep_research` | Alias: `builtin_research_tools`. |
| `hil_tools` | `ask_user_question` | Human-in-the-loop prompt. |
| `scheduling_tools` | `schedule_task`, `list_scheduled_tasks`, `update_scheduled_task`, `delete_scheduled_task`, `set_scheduled_task_enabled` | Lets the agent create *and manage* Agent Mesh **Scheduled Tasks** — a one-time, `cron`, or `interval` schedule that fires an agent or workflow with a given message (e.g. a daily 9am summary). Attaching the group grants the full lifecycle (create/list/update/delete/enable-disable), not just creation. This is Agent Mesh's own scheduler, not an OS cron job; the same Scheduled Task can also be created no-code in the Agent Mesh UI scheduled-task builder. |

Additional builder-catalog toolset IDs — reference each by its `builtin_*` id (the runtime resolves the same members under that id; there is no shorter unprefixed group name for these): `builtin_file_tools` (the two markdown converters plus `pdf_extract_text`, which returns per-page PDF text with page numbers for citation), `builtin_time_tools`, `builtin_document_tools` (pptx/pdf/render — STR-backed), `builtin_diagram_tools` (mermaid), `builtin_media_tools` (ffmpeg/imagemagick — STR-backed). `builder_tools` powers the built-in builder agent — not for user agents.

## `web_request` fetch behavior

`web_request` (in `web_tools`) **saves its response as an artifact**, not inline — HTML is converted to Markdown; binary/non-text bodies (e.g. an image) are stored as-is. Two gotchas when a later step must consume the fetched file:

- **The saved artifact's name comes back as `filename`, NOT as the `output_artifact_filename` you passed in.** Bind the consuming step to `filename` (`{{fetch.output.filename}}` in a workflow) — that works whether you named the artifact or let it auto-name to `web_content_<suffix>`. Never hardcode the name you passed in, and never bind to `output_filename`: `web_request` has no such field in either namespace, and four generated workflows died on that guess.
- **Set `output_artifact_filename` with an explicit extension** anyway when a later step depends on the type: the extension drives correct downstream handling, and an explicit name also keeps the artifact out of the hidden `__working` set that auto-named fetches land in.
- **`max_response_size_bytes` is `tool_config`, not a per-call `input:` arg** (default 10 MB, hard cap ~50 MB / `52428800`). An oversize response is **truncated, not rejected**: the call still returns OK, but it logs a WARN and sets `truncated: true` in its output. For a binary body a truncated response is a corrupt file downstream, so size the cap to the payload.

## Per-tool field names — inputs vs results

Generated from the tool registry, so these are the names the runtime accepts and produces. A tool's argument names and its result field names are **separate sets**: `web_request` takes `output_artifact_filename` and returns `filename`, while `query_data_with_sql` both takes and returns `output_filename`. Read the row rather than inferring one side from the other.

Result fields matter most in a workflow tool node, where a downstream node binds to `{{<node-id>.output.<field>}}` and a field the tool cannot produce is reported as a warning by `sam config plan`, logged again when the workflow starts, and fails the node at run time. `**req**` marks a required argument; `*opt*` marks a result field only some successful runs produce, and referencing one on a run that omits it **fails the node**. Nothing guards it: `artifact_grep` reports `success` whether it matched or not, and `coalesce` propagates the error rather than falling through. Bind `{{<id>.output}}` as a whole map, or do not reference an optional field. In the workflow's own `output_mapping` the same miss is left verbatim and logged instead, so a completed run is not thrown away. Every tool node output also carries `status`, and carries `message` when the tool set one — neither is added if the tool already supplied that key, and several rows below declare one or both themselves, so treat `message` as optional in the sense above.

Two kinds of tool are absent. Tools reached through a toolset, an MCP server, or a connector have no static schema to generate from. And several registered built-ins — the scheduling and platform families — are not generated into this table yet, even though their arguments are checked just as strictly; read those tools' own descriptions rather than inferring a parameter name from a neighbour, since that family is where the naming is least consistent.

<!-- BEGIN GENERATED: builtin-tool-fields -->
| Tool | `input:` parameter names | Result field names (`{{<id>.output.<field>}}`) |
|---|---|---|
| `append_to_artifact` | `content_chunk` (string) **req**, `filename` (string) **req**, `mime_type` (string) **req** | `appended_from_version` (integer) *opt*, `filename` (string), `new_version` (integer), `total_size_bytes` (integer) |
| `artifact_grep` | `file_path` (string), `filename` (string), `pattern` (string) **req**, `version` (integer) | `binary_files` (array) *opt*, `count` (integer) *opt*, `matches` (string) *opt*, `message_to_llm` (string) *opt*, `skipped_files` (array) *opt* |
| `artifact_search_and_replace_regex` | `filename` (string) **req**, `is_regexp` (boolean), `new_description` (string), `new_filename` (string), `regexp_flags` (string), `replace_expression` (string), `replacements` (array), `search_expression` (string) | `filename` (string), `match_count` (integer) *opt*, `no_matches` (boolean) *opt*, `replacement_results` (array) *opt*, `replacements_made` (integer) *opt*, `source_filename` (string) *opt*, `source_version` (integer) *opt*, `total_matches` (integer) *opt*, `total_replacements` (integer) *opt*, `version` (integer) |
| `ask_user_question` | `component_name` (string), `message` (string), `questions` (array) **req** | `answers` (object) *opt*, `message` (string) *opt*, `status` (string) |
| `create_image_from_description` | `image_description` (string) **req**, `output_filename` (string) | *no result fields — the output is an artifact* |
| `create_sqlite_db` | `input_filename` (string) **req**, `output_db_filename` (string) **req**, `table_name` (string) | `message` (string), `output_filename` (string), `output_version` (integer), `row_count` (integer), `status` (string), `table_name` (string) |
| `deep_research` | `kb_ids` (array), `max_iterations` (integer), `max_runtime_minutes` (integer), `max_runtime_seconds` (integer), `research_question` (string) **req**, `research_type` (string), `sources` (array) | `artifact_filename` (string) *opt*, `artifact_version` (integer) *opt*, `iterations_completed` (integer) *opt*, `plan_id` (string) *opt*, `rag_metadata` (array) *opt*, `reason` (string) *opt*, `response_artifact` (object) *opt*, `status` (string), `total_sources` (integer) *opt* |
| `delete_artifact` | `confirm_delete` (boolean), `filename` (string) **req**, `version` (integer) | `confirmation_required` (boolean) *opt*, `filename` (string), `version_count` (integer) *opt*, `versions` (array) *opt*, `versions_deleted` (integer) *opt* |
| `describe_audio` | `input_audio` (string) **req**, `prompt` (string) | `audio_filename` (string), `audio_version` (integer), `description` (string) |
| `describe_image` | `input_image` (string) **req**, `prompt` (string) | `description` (string), `image_filename` (string), `image_version` (integer) |
| `edit_image_with_gemini` | `edit_prompt` (string) **req**, `input_image` (string) **req**, `output_filename` (string), `use_pro_model` (boolean) | `original_filename` (string), `original_version` (integer) |
| `generate_image_with_gemini` | `image_description` (string) **req**, `output_filename` (string), `use_pro_model` (boolean) | `model_used` (string), `output_filename` (string), `output_version` (integer), `result_preview` (string), `used_pro_model` (boolean) |
| `get_current_time` | *none* | `current_time` (string), `date` (string), `day_of_week` (string), `formatted_time` (string), `time` (string), `timestamp` (integer), `timezone` (string), `timezone_abbreviation` (string), `timezone_offset` (string) |
| `list_artifacts` | *none* | `artifacts` (array) |
| `load_artifact` | `filename` (string) **req**, `include_line_numbers` (boolean), `limit` (integer), `load_metadata_only` (boolean), `max_content_length` (integer), `offset` (integer), `version` (integer) | `content` (string) *opt*, `description` (string) *opt*, `filename` (string), `message_to_llm` (string) *opt*, `metadata` (object) *opt*, `mime_type` (string), `schema` (object) *opt*, `size_bytes` (integer), `status` (string), `total_lines` (integer) *opt*, `version` (integer) |
| `merge_structured_data` | `input_filename` (string) **req**, `patch` (object) **req**, `path` (string), `result_description` (string) | `format` (string), `merge_path` (string) *opt*, `message` (string), `output_filename` (string), `output_version` (integer), `status` (string) |
| `query_data_with_sql` | `input_files` (object) **req**, `jmespath_transforms` (object), `output_filename` (string), `output_format` (string), `result_description` (string), `sql_query` (string) **req** | `message` (string), `output_filename` (string), `output_version` (integer), `result_preview` (array), `result_rows` (integer), `result_truncated` (boolean), `status` (string) |
| `reinterpret_artifact` | `description` (string), `input_filename` (string) **req**, `mime_type` (string), `output_filename` (string) | `mime_type` (string), `output_filename` (string), `output_version` (integer), `schema` (any), `status` (string) |
| `select_voice` | `exclude_voices` (array), `gender` (string), `tone` (string) | `voice_name` (string) |
| `transcribe_audio` | `description` (string), `input_audio` (string) **req**, `output_filename` (string) | `audio_filename` (string), `audio_version` (integer), `transcription_char_count` (integer), `transcription_word_count` (integer) |
| `transform_data_with_jmespath` | `input_filename` (string) **req**, `jmespath_expression` (string) **req**, `output_filename` (string), `result_description` (string) | `message` (string), `output_filename` (string), `output_version` (integer), `result_preview` (any), `result_rows` (integer) *opt*, `result_truncated` (boolean), `status` (string) |
| `web_request` | `body` (string), `headers` (object), `method` (string), `output_artifact_filename` (string), `url` (string) **req** | `filename` (string), `original_content_type` (string), `processed_content_type` (string), `response_status_code` (integer), `size_bytes` (integer), `truncated` (boolean) *opt* |
| `web_search_google` | `date_restrict` (string), `max_results` (integer), `query` (string) **req**, `safe_search` (string), `search_type` (string) | `formatted_results` (string), `num_results` (integer), `search_turn` (integer) |
<!-- END GENERATED: builtin-tool-fields -->

## Choosing the path

- **UI**: toolsets picker → tick the toolset, optionally exclude individual tools, fill per-tool config where a schema exists.
- **Declarative config**: agent kind's toolset references — syntax via `sam-declarative-config`.
- STR-backed tools (documents, media, charts, file→markdown conversion) additionally require the deployment's STR fleet to host the matching binaries — if a tool silently does nothing in a trial environment, that's the first thing to check (hand off to `sam-operate` for diagnosis).
