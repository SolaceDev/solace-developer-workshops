---
title: Built-in Tools
description: The first-class built-in tools the Solace Agent Mesh runtime registers at startup — names, parameters, returns, and behavioral notes for each.
sidebar_position: 4
---

# Built-In Tools

This page catalogs the first-class built-in tools the Agent Mesh-Go runtime registers at startup. Use it when you already know the tool name and need its parameters, return shape, or behavioral notes. This is not a how-to: for declaring tools in agent configuration, choosing between tool types (`builtin`, `builtin-group`, `mcp`, or `openapi`), or wiring up remote tools, see Building → Tools. The six artifact tools (the `artifact_management` group, opt out via `auto_inject_artifact_tools: false`) and the four data tools (the `data_analysis` group, opt out via `auto_inject_data_analysis_tools: false`) are auto-injected on every agent by default, so a reader who finds those tools "appearing" in their agent has the answer here.

## Artifact Tools

Six tools for working with the per-session versioned artifact store: listing, loading, deleting, appending, in-place search-and-replace, and regex grep across artifact content. All six belong to the `artifact_management` built-in group, which is auto-injected on every agent by default.

### `append_to_artifact`

Appends a chunk of content to an existing artifact, saving the result as a new version while preserving the original MIME type.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `filename` | string | yes | Artifact to append to; may contain embed expressions. |
| `content_chunk` | string | yes | Content to append (max ~3 KB). Base64-encode for binary types. |
| `mime_type` | string | yes | MIME type of the chunk; controls whether base64 decoding is attempted. |

**Returns:** A structured object containing the new version number and total artifact size in bytes.

**Notes:** Part of the `artifact_management` built-in group, which is auto-injected on every agent unless opted out via `auto_inject_artifact_tools: false`. The latest version is loaded, the chunk is concatenated, and the combined content is saved as a new version with metadata propagated from the prior version.

### `artifact_grep`

Searches artifact content for lines matching a regular expression and returns the matching lines with line numbers.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `pattern` | string | yes | Regular expression to search for. |
| `filename` | string | no | Artifact to search; if omitted, searches all artifacts in the session. |
| `version` | integer | no | Specific version to search; latest if omitted. |

**Returns:** A structured object listing matching lines (prefixed with line number, and filename when searching multiple files) and the total match count.

**Notes:** Part of the `artifact_management` built-in group, which is auto-injected on every agent unless opted out via `auto_inject_artifact_tools: false`. Binary or unreadable artifacts are silently skipped and reported in a `skipped_files` field.

### `artifact_search_and_replace_regex`

Performs literal or regex search-and-replace on artifact content, with single-operation and batch modes, saving the result to the same or a new filename.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `filename` | string | yes | Artifact filename, with optional `:version` suffix. |
| `search_expression` | string | no | Pattern to search for (single-replacement mode). |
| `replace_expression` | string | no | Replacement text; `$1`, `$2` reference capture groups, `$$` is a literal dollar. |
| `is_regexp` | boolean | no | If true, treat `search_expression` as a regular expression. |
| `regexp_flags` | string | no | Regex flags: `g` (global), `i` (case-insensitive), `m` (multiline), `s` (dotall). |
| `new_filename` | string | no | Save the result under a new filename instead of updating the original. |
| `new_description` | string | no | Description for the output artifact. |
| `replacements` | array | no | Batch mode: array of operations, each with `search`, `replace`, `is_regexp`, optional `regexp_flags`. |

**Returns:** A structured object reporting match count, replacements made, and source artifact reference; the rewritten artifact is saved as a new version (or under `new_filename`).

**Notes:** Part of the `artifact_management` built-in group, which is auto-injected on every agent unless opted out via `auto_inject_artifact_tools: false`. Provide either `search_expression` or `replacements`, not both. In batch mode, regex patterns that match more than once must set the `g` flag; otherwise the batch fails.

### `delete_artifact`

Deletes all versions of an artifact, requiring explicit confirmation on a second call.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `filename` | string | yes | Name of the artifact to delete. |
| `version` | integer | no | Reserved for future use; specifying it currently returns an error. |
| `confirm_delete` | boolean | no | Must be set to `true` to perform deletion. If false or omitted, returns a confirmation prompt with version count. |

**Returns:** A structured object reporting the filename and number of versions deleted; without `confirm_delete=true`, returns a confirmation prompt instead.

**Notes:** Part of the `artifact_management` built-in group, which is auto-injected on every agent unless opted out via `auto_inject_artifact_tools: false`. Version-specific deletion is not supported — only deletion of every version of an artifact.

### `list_artifacts`

Lists all artifacts in the current session, with versions and a metadata summary (description, source, MIME type, size, and schema) for each.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| _(none)_ | | | This tool takes no arguments. |

**Returns:** A structured object containing an `artifacts` array, each entry carrying filename, available versions, and a metadata summary.

**Notes:** Part of the `artifact_management` built-in group, which is auto-injected on every agent unless opted out via `auto_inject_artifact_tools: false`. Internal companion artifacts (metadata sidecars, converted-text sidecars) are filtered out of the listing.

### `load_artifact`

Loads artifact content (or just metadata) by filename, with optional version pinning, line range slicing, line-number prefixing, and content-length truncation.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `filename` | string | yes | Artifact filename to load. |
| `version` | integer | no | Specific version number (0-indexed). Latest if omitted. |
| `load_metadata_only` | boolean | no | If true, return only metadata without content. |
| `max_content_length` | integer | no | Maximum characters to return; clamped to 100–100,000. |
| `include_line_numbers` | boolean | no | If true, prefix each line with its 1-based line number. |
| `offset` | integer | no | Start reading from this 1-based line number. |
| `limit` | integer | no | Maximum number of lines to return. |

**Returns:** A structured object with the artifact content (text), or a binary summary for non-text MIME types, plus version, MIME type, size in bytes, and an optional message to the LLM noting truncation or other version hints.

**Notes:** Part of the `artifact_management` built-in group, which is auto-injected on every agent unless opted out via `auto_inject_artifact_tools: false`. Supported image types under 20 MB are attached as a visual content block so the LLM can see them directly. `include_line_numbers` is intended as a pre-step for targeted edits with `artifact_search_and_replace_regex`.

## Data Tools

Four tools for inspecting, querying, transforming, and merging structured data artifacts (CSV, JSON, YAML, SQLite). All four belong to the `data_analysis` built-in group, which is auto-injected on every agent by default.

### `create_sqlite_db`

Converts a CSV or JSON artifact into an SQLite database artifact, suitable for repeated querying with `query_data_with_sql`.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `input_filename` | string | yes | CSV or JSON artifact filename, with optional `:version` suffix. |
| `output_db_filename` | string | yes | Desired filename for the output SQLite database artifact. |
| `table_name` | string | no (default `data`) | Name of the table to create within the SQLite database. |

**Returns:** A structured object with the output filename, output version, table name, and row count.

**Notes:** Part of the `data_analysis` built-in group, which is auto-injected on every agent unless opted out via `auto_inject_data_analysis_tools: false`. Only CSV and JSON inputs are accepted; YAML and other formats are rejected. The output filename is normalised to end in `.sqlite`.

### `merge_structured_data`

Deep-merges a JSON or YAML patch into an existing artifact using RFC 7396 (JSON Merge Patch) semantics; null values delete keys.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `input_filename` | string | yes | JSON or YAML artifact to modify, with optional `:version` suffix. |
| `patch` | object | yes | Patch object to deep-merge; null values delete keys. |
| `path` | string | no | Dot-separated path to merge at (e.g., `server.logging`); merges at the root if omitted. |
| `result_description` | string | no | Description for the result artifact's metadata. |

**Returns:** A structured object with the output filename, new version, format (JSON or YAML), and merge path if specified.

**Notes:** Part of the `data_analysis` built-in group, which is auto-injected on every agent unless opted out via `auto_inject_data_analysis_tools: false`. Maps merge recursively; arrays and scalars replace wholesale. Because null deletes a key, this tool cannot explicitly set a value to null — use `artifact_search_and_replace_regex` for that case.

### `query_data_with_sql`

Executes a SQL query against one or more data artifacts loaded as named tables in an in-memory SQLite database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `input_files` | object | yes | Map of table name to artifact filename (with optional `:version`). |
| `sql_query` | string | yes | SQL query to execute against the loaded tables. |
| `output_filename` | string | no | Base name for the result artifact; auto-generated if omitted. |
| `result_description` | string | no | Description for the result artifact's metadata. |
| `output_format` | string | no (default `csv`) | Result format: `csv` or `json`. |

**Returns:** A result artifact (CSV or JSON) containing the query rows, plus a structured object summarising the source tables and row counts.

**Notes:** Part of the `data_analysis` built-in group, which is auto-injected on every agent unless opted out via `auto_inject_data_analysis_tools: false`. Supported input MIME types are CSV, JSON, YAML, and SQLite (`application/vnd.sqlite3`). JSON accepts both list-of-objects and columnar layouts. The connection is locked read-only (`PRAGMA query_only = ON`) before the query runs, so `INSERT`, `UPDATE`, `DELETE`, `DROP`, and `ATTACH` are blocked. JOINs with aggregate functions over a one-to-many relationship require pre-aggregating each table to avoid fan-out inflation.

### `transform_data_with_jmespath`

Applies a JMESPath expression to a JSON, YAML, or CSV artifact to filter, project, reshape, or aggregate its data; the result is saved as a JSON artifact.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `input_filename` | string | yes | Input JSON, YAML, or CSV artifact, with optional `:version` suffix. |
| `jmespath_expression` | string | yes | JMESPath expression to evaluate. |
| `output_filename` | string | no | Desired filename for the output JSON artifact; auto-generated if omitted. |
| `result_description` | string | no | Description for the result artifact's metadata. |

**Returns:** A JSON artifact containing the expression result, plus a structured object with the output filename, version, a preview of the rows, and a truncation flag.

**Notes:** Part of the `data_analysis` built-in group, which is auto-injected on every agent unless opted out via `auto_inject_data_analysis_tools: false`. CSV input is auto-converted to a JSON array of objects keyed by header. Expressions are capped at 4,096 characters and 32 levels of nesting; the evaluation is panic-guarded against adversarial input shapes.

## Image Tools

Four tools for generating and analysing images. Configuration (model, API key, API base URL) is supplied through `tool_config`; Gemini-backed tools require `gemini_api_key` and `gemini_api_base`.

### `create_image_from_description`

Generates a PNG image from a text prompt using an OpenAI-compatible image generation API and saves it as an artifact.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `image_description` | string | yes | Textual prompt for image generation. |
| `output_filename` | string | no | Desired filename for the output PNG; auto-generated if omitted. |

**Returns:** A PNG artifact containing the generated image, with metadata recording the source prompt and the generation model.

**Notes:** Requires `model`, `api_key`, and `api_base` in `tool_config`. The API may return base64-encoded image data or a URL; URL responses are SSRF-checked before being fetched. Output filenames are normalised to end in `.png`.

### `describe_image`

Describes an image artifact using an OpenAI-compatible multimodal API, optionally guided by a custom prompt.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `input_image` | string | yes | Filename (and optional `:version`) of the input image artifact. |
| `prompt` | string | no | Custom prompt for image analysis; defaults to a generic "what is in this image?" question. |

**Returns:** A structured object containing the generated description and the source image filename and version.

**Notes:** Supports `.png`, `.jpg`/`.jpeg`, `.webp`, and `.gif` artifacts. Requires a multimodal LLM callback to be configured on the agent; a text-only LLM cannot describe images and is rejected at call time.

### `edit_image_with_gemini`

Edits an existing image based on a text prompt using Google's Gemini image generation models.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `input_image` | string | yes | Filename (and optional `:version`) of the input image artifact. |
| `edit_prompt` | string | yes | Text description of the desired edits. |
| `output_filename` | string | no | Desired filename for the edited image; auto-generated if omitted. |
| `use_pro_model` | boolean | no | If true, use the pro model for professional quality output. |

**Returns:** An edited image artifact (JPEG), with metadata recording the original image, the edit prompt, the model used, and any text Gemini returned alongside the image.

**Notes:** Requires `gemini_api_key` and `gemini_api_base` in `tool_config`. Supported input formats are `.png`, `.jpg`/`.jpeg`, `.webp`, and `.gif`. The default model name is `gemini-3.1-flash-image-preview`; the pro model defaults to `gemini-3-pro-image-preview`. Both can be overridden via `model` and `pro_model` in `tool_config`.

### `generate_image_with_gemini`

Generates a PNG image from a text prompt using Google's Gemini image generation models; offers a standard and a pro model.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `image_description` | string | yes | Textual prompt for image generation. |
| `output_filename` | string | no | Desired filename for the output PNG; auto-generated if omitted. |
| `use_pro_model` | boolean | no | If true, use the pro model for high-fidelity output with text rendering up to 4K. |

**Returns:** A PNG artifact containing the generated image, plus a structured object with the output filename, version, model used, and a short preview line.

**Notes:** Requires `gemini_api_key` and `gemini_api_base` in `tool_config`. The pro model is meant for infographics, charts, diagrams, and images requiring precise text placement; the standard model is faster and cheaper for general use. The image is always re-encoded to PNG regardless of the format Gemini returned.

## Audio Tools

Three tools for working with audio: describing recordings via a multimodal API, picking a voice name from gender or tone criteria, and transcribing audio to text. Text-to-speech and audio concatenation are delivered as separate STR-hosted tools and are not in this catalog.

### `describe_audio`

Describes an audio recording using a multimodal API, optionally guided by a custom prompt.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `input_audio` | string | yes | Filename (and optional `:version`) of the input audio artifact. |
| `prompt` | string | no | Custom prompt for audio analysis; defaults to a generic "what is in this recording?" question. |

**Returns:** A structured object containing the generated description and the source audio filename and version.

**Notes:** Bundled with the `image_tools` built-in group (the group name is historical — the tool covers audio inputs). Supports `.wav` and `.mp3` artifacts. Requires a multimodal LLM callback to be configured on the agent.

### `select_voice`

Selects a suitable voice name from a curated set based on optional gender and tone preferences; intended to feed downstream text-to-speech calls.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `gender` | string | no | Desired gender: `male`, `female`, or `neutral`. |
| `tone` | string | no | Tone preference (e.g., `friendly`, `professional`, `informative`). |
| `exclude_voices` | array | no | List of voice names to exclude from the selection. |

**Returns:** A structured object containing the selected `voice_name`.

**Notes:** Tone aliases such as `professional`, `cheerful`, `calm`, `educational` are mapped to canonical tone keys before lookup. Both the tone-to-voice and gender-to-voice mappings can be overridden via `tool_config` (`voice_tone_mapping`, `gender_voice_mapping`).

### `transcribe_audio`

Transcribes an audio artifact to text via an OpenAI-compatible transcription endpoint and saves the transcription as a text artifact.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `input_audio` | string | yes | Filename (and optional `:version`) of the input audio artifact. |
| `output_filename` | string | no | Filename for the transcription text file (without `.txt`); auto-generated from the audio filename if omitted. |
| `description` | string | no | Description of the transcription for metadata; combined with the source audio description if available. |

**Returns:** A text artifact (`.txt`) containing the transcription, plus a structured object with word count, character count, and the source audio reference.

**Notes:** Requires `model`, `api_key`, and `api_base` in `tool_config`. Supports `.wav` and `.mp3` artifacts.

## Web Tools

Three tools for fetching content from the web: a generic HTTP client with HTML-to-Markdown conversion, a Google Custom Search wrapper, and an iterative deep-research workflow that combines web search with LLM analysis.

### `deep_research`

Performs iterative LLM-powered research on a topic using web search and produces a comprehensive report with citations.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `research_question` | string | yes | Research question or topic to investigate. |
| `research_type` | string | no | `quick` (3 iterations, 5 min) or `in-depth` (10 iterations, 10 min). Default: `quick`. |
| `max_iterations` | integer | no | Override the maximum number of research iterations. |
| `max_runtime_minutes` | integer | no | Maximum runtime in minutes (1–10). Overrides `tool_config` and `research_type`. |
| `max_runtime_seconds` | integer | no | Maximum runtime in seconds (60–600); use `max_runtime_minutes` for easier specification. |
| `sources` | array | no | Sources to search: `web`, `kb`. Default from `tool_config` or `['web']`. |
| `kb_ids` | array | no | Specific knowledge base IDs to search (only used when `kb` is in sources). |

**Returns:** A research report artifact, plus a structured object summarising sources, citations, and run metadata.

**Notes:** Long-running: the runtime treats this as an asynchronous tool and surfaces progress updates to the UI. Web search requires `google_search_api_key`, `google_cse_id`, and `api_base` to be configured in `tool_config` (commonly populated from `GOOGLE_API_KEY` and `GOOGLE_CSE_ID` environment variables). An interactive plan-verification step is enabled by default on UI surfaces that support it; disable it with `interactive_plan_verification: false` in `tool_config`.

### `web_request`

Makes an HTTP request to a URL, converts HTML responses to Markdown, and saves the result as an artifact.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `url` | string | yes | URL to fetch content from. |
| `method` | string | no | HTTP method: `GET`, `POST`, `PUT`, `DELETE`. Default: `GET`. |
| `headers` | object | no | HTTP headers as key-value pairs. |
| `body` | string | no | Request body for `POST` or `PUT` requests. |
| `output_artifact_filename` | string | no | Custom filename for the output artifact; auto-generated as `web_content_<id>` if omitted. |

**Returns:** An artifact containing the response body (Markdown for HTML, otherwise the raw content), plus a structured object reporting status code, original content type, and processed content type.

**Notes:** SSRF-protected: the URL must resolve to a public IP address, redirects are bounded to 20 hops, and each redirect target is re-validated. Set `allow_loopback: true` in `tool_config` to permit local addresses (development only). Responses are capped at 10 MB by default and hard-capped at 50 MB via `max_response_size_bytes` in `tool_config`. Transient network errors are retried with exponential backoff.

### `web_search_google`

Searches the web using the Google Custom Search API and returns ranked results suitable for citation.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `query` | string | yes | Search query. |
| `max_results` | integer | no (default `5`) | Maximum number of results, 1–10. |
| `search_type` | string | no | Set to `image` for image search; omit for web search. |
| `date_restrict` | string | no | Restrict results by recency (e.g., `d7` for last 7 days). |
| `safe_search` | string | no | Safe search level: `off`, `medium`, `high`. |

**Returns:** A structured object containing the search results, formatted text suitable for the LLM, RAG-style metadata for citations, and the list of valid citation identifiers for the turn.

**Notes:** Requires `google_search_api_key`, `google_cse_id`, and `api_base` to be configured in `tool_config`; no public-endpoint fallback is provided. Web (organic) and image results are separated in the response; image results are surfaced to the UI directly and are not intended to be cited inline.

## Utility Tools

Two utility tools: one for asking the user a structured follow-up question mid-task, and one for fetching the user's current local time.

### `ask_user_question`

Asks the user one or more structured questions mid-task and waits for a response, rendering as multiple-choice or free-text input depending on the question shape.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `questions` | array | yes | One to four questions to ask the user. |
| `message` | string | no | Overall context explaining why you are asking; displayed above the questions. |
| `component_name` | string | no | Name of the component this question relates to, used for status tracking. |

**Returns:** A structured object containing the user's answers (or a `cancelled` / `timed_out` status if the user declined or did not respond within the timeout).

**Notes:** Belongs to the `general_agent_tools` and `hil_tools` built-in groups. Each question carries a short `header` label, a `question` body, optional `options` (1–4 multiple-choice choices, with an automatic "Other" free-text fallback), an optional `placeholder` for open-ended questions, and an optional `multiSelect` flag. Default response timeout is 45 minutes; override via `hil_default_timeout` in `tool_config`.

Rendering depends on the originating gateway advertising the `interactive_user_input` capability (see A2A protocol): the web UI, Slack, and Teams render an interactive card; email sends a magic-link to a one-off web form when configured. On a channel that cannot prompt (MCP, event-mesh, or a misconfigured gateway), the tool returns a clean error instructing the model to ask inline rather than blocking until the timeout. The same capability gates volume `prompt_user` (clean error when unsupported) and HIL tool approval — an approval-gated tool on a channel that cannot prompt is **denied** for safety rather than silently auto-approved.

### `get_current_time`

Returns the current date and time in the user's local timezone, along with a full set of formatted time components.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| _(none)_ | | | This tool takes no arguments. |

**Returns:** A structured object containing `current_time` (ISO 8601 with microsecond precision), `timezone`, `timezone_offset`, `timezone_abbreviation`, `formatted_time`, `timestamp` (Unix seconds), `date`, `time`, and `day_of_week`.

**Notes:** The timezone is sourced from the user's session. If the session carries an invalid IANA timezone, the tool falls back to UTC and logs a warning rather than failing.
