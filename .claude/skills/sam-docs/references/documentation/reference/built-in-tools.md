---
title: Built-In Tools
description: Reference catalog of the tools an agent in Solace Agent Mesh can attach without writing any code, covering the group each tool belongs to, its parameters, what it returns, and any scope or availability requirement.
sidebar_position: 1050
---

# Built-In Tools

Solace Agent Mesh ships with a catalog of built-in tools any agent can call. This page lists each tool with its parameters, return value, and any scope requirement.

Attach tools by selecting a toolset in the agent editor's **Toolsets** picker, or by listing an individual tool name or group name under `tools:` in agent YAML. The Artifact Tools toolset is attached to every new agent. For custom tool code your team packages, see [Creating Toolsets](../building/toolsets.md).

## Built-In Toolsets

| Toolset (UI) | Group name (YAML) | Tools it contains |
|---|---|---|
| Artifact Tools | `builtin_artifact_tools` | `list_artifacts`, `load_artifact`, `delete_artifact`, `append_to_artifact`, `artifact_search_and_replace_regex`, `artifact_grep` |
| Data Analysis Tools | `data_analysis` | `query_data_with_sql`, `create_sqlite_db`, `transform_data_with_jmespath`, `merge_structured_data`, `reinterpret_artifact`, `create_chart_from_plotly_config` |
| Diagram Tools | `builtin_diagram_tools` | `mermaid_diagram_generator` |
| Document Tools | `builtin_document_tools` | `pptx_create_presentation`, `pdf_ops`, `render_document_to_images`, `html_to_pdf` |
| File Tools | `builtin_file_tools` | `convert_file_to_markdown`, `convert_pdf_to_markdown` |
| Human-in-Loop Tools | `hil_tools` | `ask_user_question` |
| Image Tools | `builtin_image_tools` | `create_image_from_description`, `describe_image`, `describe_audio`, `edit_image_with_gemini`, `generate_image_with_gemini` |
| Media Tools | `builtin_media_tools` | `ffmpeg`, `ffprobe`, `image_magick` |
| Research Tools | `builtin_research_tools` | `web_search_google`, `deep_research` |
| Time Tools | `builtin_time_tools` | `get_current_time` |
| Web Request Tools | `builtin_web_request_tools` | `web_request`, `web_search_google` |

Two additional group names are valid in YAML: `builtin_code_execution` (for `execute_python_code`) and `builtin_volume_tools` (for the 11 `volume_*` tools).

## YAML-Only Tools

These tools do not appear in the toolset picker. Attach them by listing the individual tool or group name under `tools:` in agent YAML.

| Tool | YAML group | Scope |
|---|---|---|
| `notify_user` | `notification_tools` | `notify:send` |
| `schedule_task` | `scheduling_tools` | None |
| `list_scheduled_tasks` | `scheduling_tools` | None |
| `update_scheduled_task` | `scheduling_tools` | None |
| `delete_scheduled_task` | `scheduling_tools` | None |
| `set_scheduled_task_enabled` | `scheduling_tools` | None |
| `index_search` | None | None |
| `select_voice` | None | None |
| `transcribe_audio` | None | None |

## Artifact Management

Six tools that operate on session artifacts: the files an agent creates, edits, or receives during a task.

### `list_artifacts`

Lists artifact filenames and versions for the current session with a summary of each artifact's latest metadata.

No parameters.

Returns: an array under `artifacts`, each entry with filename, available integer versions, and a `metadata_summary` (`description`, `type`, `size`, `schema_type` when known).

### `load_artifact`

Loads artifact content by filename, returning text, a visual attachment for supported images, or a short binary summary.

| Name | Type | Required | Description |
|---|---|---|---|
| `filename` | string | Yes | Artifact filename to load. |
| `version` | integer | No | Zero-indexed version to pin to. Omit for latest. |
| `load_metadata_only` | boolean | No | Return only metadata (MIME type, size, schema). |
| `max_content_length` | integer | No | Maximum characters to return (clamped 100-100,000). |
| `include_line_numbers` | boolean | No | Prefix each line with its 1-based number. Useful before search-and-replace. |
| `offset` | integer | No | Start reading from this 1-based line. |
| `limit` | integer | No | Maximum lines to return. |

Returns: content plus filename, version, MIME type, and size. Supported image types (PNG, JPEG, WEBP, GIF) up to 20 MiB are attached as a visual block so a vision-capable model can see them directly.

### `delete_artifact`

Deletes all versions of an artifact. Two-phase: first call returns a warning; a second call with `confirm_delete: true` performs the deletion.

| Name | Type | Required | Description |
|---|---|---|---|
| `filename` | string | Yes | Artifact to delete. |
| `confirm_delete` | boolean | No | Must be `true` to perform the deletion. |

Returns: on confirmation, the number of versions deleted.

Notes: version-specific deletion is not supported; the tool deletes all versions or none.

### `append_to_artifact`

Appends a chunk to an existing artifact by loading its latest version, appending, and saving the result as a new version. Preserves the original MIME type.

| Name | Type | Required | Description |
|---|---|---|---|
| `filename` | string | Yes | Artifact to append to. |
| `content_chunk` | string | Yes | Content to append (about 3 KiB max). Binary MIME types require base64. |
| `mime_type` | string | Yes | MIME type of the chunk. Determines whether base64 decoding is attempted. |

Returns: the new version number and total size of the combined artifact in bytes.

### `artifact_search_and_replace_regex`

Runs literal or regex search-and-replace on an artifact's text content. Supports single or batch operations and saves either as a new version or a new file.

| Name | Type | Required | Description |
|---|---|---|---|
| `filename` | string | Yes | Artifact filename, with optional `:version` suffix. |
| `search_expression` | string | No | Pattern to search for in single-replacement mode. |
| `replace_expression` | string | No | Replacement text. Use `$1`, `$2` for capture groups, and `$$` for a literal dollar sign. |
| `is_regexp` | boolean | No | Treat `search_expression` as a regular expression. |
| `regexp_flags` | string | No | Regex flags: `g` (global), `i` (case-insensitive), `m` (multiline), `s` (dotall). |
| `new_filename` | string | No | Save the result under this new filename instead of updating the original. |
| `new_description` | string | No | Description for the output artifact. |
| `replacements` | array | No | Batch mode. Array of `{search, replace, is_regexp, regexp_flags}` applied in order. Cannot combine with `search_expression`. |

Returns: match and replacement counts and the saved output artifact. Batch mode adds a per-operation status list.

### `artifact_grep`

Searches artifact content for lines matching a regular expression.

| Name | Type | Required | Description |
|---|---|---|---|
| `pattern` | string | Yes | Regular expression to search for. |
| `filename` | string | No | Artifact to search. Omit to search every artifact in the session. |
| `version` | integer | No | Specific version. Latest if omitted. |

Returns: matching lines as `line:content` for a single-file search or `file:line:content` when searching across files, plus the total match count.

### Removed Since V1

Two artifact tools that shipped in the auto-injected Artifact Tools group in v1 are no longer present. The agent invoked them at runtime rather than an operator attaching them by name, so removing them does not break existing agents.

| Removed tool | What to use instead |
|---|---|
| `extract_content_from_artifact` | `load_artifact` and reason over the content directly. |
| `apply_embed_and_create_artifact` | Nothing to attach. The runtime resolves an `«artifact_content:...»` embed directive in an agent's output automatically when it creates the artifact. |

`extract_content_from_artifact` was used to summarize or qualitatively extract information from an artifact of any text-based type. In v2 the agent reads the artifact with `load_artifact` (already in the auto-attached Artifact Tools) and reasons over it in its own context. When an artifact is not directly readable as text, use a tool suited to its format. For a binary document, use a Markdown conversion tool; for an image, use an image-description tool.

An `extract_content_from_artifact_config` block carried over from a v1 agent configuration has no effect in v2; you can remove it.

## General Tools

Time, prompt-the-user, and Markdown conversion.

### `get_current_time`

Gets the current date and time in the user's local time zone.

No parameters. Timezone is resolved from the user's session.

Returns: an ISO 8601 timestamp plus separate fields for time zone, time zone offset, time zone abbreviation, formatted time, Unix timestamp, date, time, and day of week.

Notes: invalid IANA time zones fall back to UTC.

### `ask_user_question`

Renders a structured follow-up form in the user's chat and waits for the response. Use only for bounded multiple-choice questions (2-4 concrete options), multi-field structured input such as credentials, or explicit confirmation before an irreversible action. Ask ordinary clarifying questions as a normal assistant reply.

| Name | Type | Required | Description |
|---|---|---|---|
| `message` | string | No | Overall context shown above the questions. |
| `component_name` | string | No | Component this question relates to. Passed through to the Agent Mesh UI for status tracking. |
| `questions` | array | Yes | 1–4 question objects, each with `question`, `header` (max 12 chars), optional `options` (0–4 choices, each `label` and `description`), `placeholder`, and `multiSelect`. |

Returns: a `status` of `answered`, `cancelled`, or `timed_out`, plus the `answers` map when the user replied. Default timeout is 45 minutes.

Notes: interactive agents only; do not attach to autonomous or workflow agents. Fails if every question is text-only. Returns an error on channels that cannot render an interactive prompt (for example, an Event Mesh entrypoint).

### `convert_file_to_markdown`

Converts a file artifact into a Markdown artifact. Accepts DOCX, XLSX, PPTX, EPUB, Jupyter notebooks (`.ipynb`), HTML, CSV, and plain text; JSON, XML, YAML, and Markdown pass through unchanged. PDF input goes to `convert_pdf_to_markdown` (layout-aware extraction); calling this tool with a PDF returns an error. Images and audio are not chained in; use `describe_image`, `describe_audio`, or `transcribe_audio` instead. Does not recurse into ZIP archives. `pdf_ops` is unrelated (PDF-to-PDF, not Markdown conversion).

| Name | Type | Required | Description |
|---|---|---|---|
| `input_filename` | string | Yes | Input artifact filename, with optional `:version` suffix. |

Returns: a new artifact named `<basename>_converted.md` with the `text/markdown` MIME type.

### `convert_pdf_to_markdown`

Converts a PDF artifact to Markdown using markitdown / pdfminer.six for layout-aware text extraction.

| Name | Type | Required | Description |
|---|---|---|---|
| `input_filename` | string | Yes | PDF artifact to convert. |

Returns: a new artifact named `<basename>_converted.md` with the `text/markdown` MIME type and a short preview in the response data.

## Image and Audio

Generate, edit, describe, and transcribe images and audio. `select_voice` and `transcribe_audio` are not part of any built-in toolset; list them by name under `tools:` in agent YAML to attach them (see [YAML-Only Tools](#yaml-only-tools)).

### `create_image_from_description`

Generates an image from a text description using a configured OpenAI-compatible image generation model and saves it as a PNG artifact.

| Name | Type | Required | Description |
|---|---|---|---|
| `image_description` | string | Yes | Textual prompt for image generation. |
| `output_filename` | string | No | Desired filename for the output PNG. |

Returns: a PNG artifact plus generation metadata (`source_prompt`, `generation_model`, `generation_tool`, `description`, `request_timestamp`).

Notes: requires `tool_config` with `model`, `api_key`, and `api_base` for the OpenAI-compatible endpoint (optional `extra_params` merged into the request).

### `describe_image`

Describes an image artifact using the agent's configured multimodal large language model (LLM).

| Name | Type | Required | Description |
|---|---|---|---|
| `input_image` | string | Yes | Input image artifact, with optional `:version` suffix. |
| `prompt` | string | No | Custom prompt. Defaults to `What is in this image?`. |

Returns: the textual description plus the filename and version analyzed.

Notes: requires a multimodal LLM. Supported formats: PNG, JPEG, WEBP, GIF.

### `describe_audio`

Describes an audio recording using a multimodal model.

| Name | Type | Required | Description |
|---|---|---|---|
| `input_audio` | string | Yes | Input audio artifact, with optional `:version` suffix. |
| `prompt` | string | No | Custom prompt. Defaults to `What is in this recording?`. |

Returns: the textual description plus the filename and version analyzed.

Notes: requires a multimodal LLM. Supported formats: WAV, MP3.

### `edit_image_with_gemini`

Edits an existing image based on a text prompt using Google Gemini image generation models.

| Name | Type | Required | Description |
|---|---|---|---|
| `input_image` | string | Yes | Input image artifact. |
| `edit_prompt` | string | Yes | Text description of the edits to apply. |
| `output_filename` | string | No | Desired filename for the output image. |
| `use_pro_model` | boolean | No | Use the pro model for higher-fidelity output. |

Returns: the edited image as a JPEG artifact plus metadata linking it to the original. Always writes JPEG output regardless of input format or requested extension.

Notes: requires `tool_config` with `gemini_api_key` and `gemini_api_base` (optional `model` and `pro_model` override the defaults).

### `generate_image_with_gemini`

Generates an image from a text description using Google Gemini image generation models. Standard model is fast and cheaper; pro model targets higher fidelity.

| Name | Type | Required | Description |
|---|---|---|---|
| `image_description` | string | Yes | Textual prompt for image generation. |
| `output_filename` | string | No | Desired filename for the output PNG. |
| `use_pro_model` | boolean | No | Use the pro model. More expensive; reserve for infographics, charts, diagrams, or images that need precise text placement. |

Returns: a PNG artifact plus metadata (`source_prompt`, `generation_model`, `generation_tool`, `used_pro_model`, `original_requested_filename`, `request_timestamp`).

Notes: requires `tool_config` with `gemini_api_key` and `gemini_api_base`.

### `select_voice`

Selects a suitable voice name given optional gender and tone constraints. Pass the returned name to a `text_to_speech` tool for consistent voice across calls.

| Name | Type | Required | Description |
|---|---|---|---|
| `gender` | string | No | Desired gender: `male`, `female`, or `neutral`. |
| `tone` | string | No | Tone preference such as `friendly` or `professional`. |
| `exclude_voices` | array of string | No | Voice names to exclude. |

Returns: the selected `voice_name`.

### `transcribe_audio`

Transcribes an audio recording and saves the transcription as a text artifact.

| Name | Type | Required | Description |
|---|---|---|---|
| `input_audio` | string | Yes | Input audio artifact. |
| `output_filename` | string | No | Filename for the transcription text file, without `.txt`. Auto-generated from the source name if omitted. |
| `description` | string | No | Description recorded in the artifact metadata. |

Returns: the transcription text artifact plus word count and character count.

Notes: requires `tool_config` with `model`, `api_key`, and `api_base` for an OpenAI-compatible transcription endpoint. Supported formats: WAV, MP3.

## Web and Research

Fetch URLs, search, and run multi-step research.

### `web_request`

Makes an HTTP request to a URL, processes the content (for example converting HTML to Markdown), and saves the result as an artifact.

| Name | Type | Required | Description |
|---|---|---|---|
| `url` | string | Yes | URL to fetch. |
| `method` | string | No | HTTP method: `GET` (default), `POST`, `PUT`, `DELETE`. |
| `headers` | object | No | HTTP headers as key-value pairs. |
| `body` | string | No | Request body for `POST` and `PUT`. |
| `output_artifact_filename` | string | No | Custom filename. Omit for research fetches; auto-named results are saved as hidden working artifacts. |

Returns: the fetched content saved as an artifact plus its filename, size, and detected MIME type.

Notes: SSRF checks block loopback and non-public addresses by default (set `allow_loopback: true` in `tool_config` to permit). Transient network failures are retried; 4xx and 5xx responses return as-is.

### `web_search_google`

Searches the web using the Google Custom Search API.

| Name | Type | Required | Description |
|---|---|---|---|
| `query` | string | Yes | Search query. |
| `max_results` | integer | No | Number of results, 1-10. Defaults to 5. |
| `search_type` | string | No | Set to `image` for an image search. |
| `date_restrict` | string | No | Restrict by recency, for example `d7` for the last 7 days. |
| `safe_search` | string | No | Safe search level: `off`, `medium`, or `high`. |

Returns: search results with citation IDs the agent's response can reference. Image results are attached to the Agent Mesh UI automatically; do not cite them or reference them by URL in the response text.

Notes: requires `tool_config` with `google_search_api_key`, `google_cse_id`, and `api_base`. No public-endpoint fallback; missing any of the three errors out.

### `deep_research`

Runs deep, iterative research on a topic using web search and LLM analysis. Produces a research report with citations. A run takes about 5-10 minutes depending on depth.

| Name | Type | Required | Description |
|---|---|---|---|
| `research_question` | string | Yes | Research question or topic to investigate. |
| `research_type` | string | No | `quick` (3 iterations, about 5 minutes) or `in-depth` (10 iterations, about 10 minutes). Default `quick`. |
| `max_iterations` | integer | No | Override the maximum number of research iterations. |
| `max_runtime_minutes` | integer | No | Maximum runtime, 1-10 minutes. Takes precedence when both minutes and seconds are set. |
| `max_runtime_seconds` | integer | No | Maximum runtime, 60-600 seconds. |
| `sources` | array of string | No | Sources to search: `web`, `kb`. Web requires Google Custom Search credentials. |
| `kb_ids` | array of string | No | Specific knowledge base IDs to search when `kb` is in `sources`. |

Returns: a research report artifact with inline citations, plus progress and status events streamed while the run is in flight.

Notes: long-running tool. An interactive plan-verification step lets the user approve or amend the plan before the run starts; set `interactive_plan_verification: false` in `tool_config` to disable it.

## Data Analysis

Load, query, transform, and merge structured data.

### `query_data_with_sql`

Executes SQL queries against data artifacts (CSV, JSON, YAML, SQLite) loaded as tables in an in-memory SQLite database.

| Name | Type | Required | Description |
|---|---|---|---|
| `input_files` | object | Yes | Mapping of table name to artifact filename. Filenames may include a `:version` suffix. |
| `sql_query` | string | Yes | SQL query to execute. |
| `jmespath_transforms` | object | No | Mapping of table name to a JMESPath expression that reshapes the artifact after parsing and before load. Not supported for SQLite artifacts. |
| `output_filename` | string | No | Base name for the output artifact. Extension is added automatically. |
| `result_description` | string | No | Description for the result artifact's metadata. |
| `output_format` | string | No | `csv` (default) or `json`. |

Returns: the query results saved as a CSV or JSON artifact.

Notes: rejects queries that combine `JOIN` with a bare aggregate (`SUM`, `AVG`, `COUNT`) and `GROUP BY` at the same level; pre-aggregate each table in a CTE first.

### `create_sqlite_db`

Converts a CSV or JSON artifact into a SQLite database artifact. Pair with `query_data_with_sql` for a "prepare once, query many" workflow on larger datasets.

| Name | Type | Required | Description |
|---|---|---|---|
| `input_filename` | string | Yes | Input CSV or JSON artifact, with optional `:version` suffix. |
| `output_db_filename` | string | Yes | Filename for the output SQLite database artifact. |
| `table_name` | string | No | Table name inside the database. Defaults to `data`. |

Returns: a `.sqlite` artifact containing the input rows in the named table.

### `transform_data_with_jmespath`

Applies a JMESPath expression to a JSON, YAML, or CSV artifact to filter, project, reshape, or aggregate. Always saves the result as a JSON artifact.

| Name | Type | Required | Description |
|---|---|---|---|
| `input_filename` | string | Yes | Input artifact, with optional `:version` suffix. |
| `jmespath_expression` | string | Yes | JMESPath expression. |
| `output_filename` | string | No | Filename for the output JSON artifact. |
| `result_description` | string | No | Description for the result artifact's metadata. |

Returns: the transformed data as a JSON artifact.

### `merge_structured_data`

Deep-merges a patch object into an existing JSON or YAML artifact using RFC 7396 (JSON Merge Patch) semantics: maps merge recursively; arrays and scalars replace wholesale; `null` in the patch deletes the corresponding key.

| Name | Type | Required | Description |
|---|---|---|---|
| `input_filename` | string | Yes | JSON or YAML artifact to modify. |
| `patch` | object | Yes | Patch object to deep-merge into the artifact. |
| `path` | string | No | Dot-separated path to merge at (for example, `server.logging`). Merges at the root when omitted. |
| `result_description` | string | No | Description for the result artifact's metadata. |

Returns: the merged data saved as a new version of the same artifact.

### `reinterpret_artifact`

Re-saves an artifact's bytes unchanged under a new filename or MIME type. Performs no content conversion, only re-labels the type so a file whose extension misrepresents its contents (for example, a `.dat` file that is actually YAML) becomes acceptable to the data-analysis tools.

| Name | Type | Required | Description |
|---|---|---|---|
| `input_filename` | string | Yes | Artifact to reinterpret. |
| `output_filename` | string | No | Desired filename. Its extension implies the MIME type when `mime_type` is omitted. |
| `mime_type` | string | No | Target MIME type, for example `application/x-yaml`, `application/json`, or `text/csv`. |
| `description` | string | No | Description for the new artifact's metadata. |

Returns: a new artifact under the reinterpreted type plus the inferred schema, so the agent can query the data without a follow-up load.

Notes: the original artifact is left untouched. `output_filename` must differ from `input_filename`.

### `create_chart_from_plotly_config`

Generates a static chart image (PNG, JPG, SVG, or PDF) from a Plotly JSON or YAML configuration.

| Name | Type | Required | Description |
|---|---|---|---|
| `config_content` | string | Yes | Plotly configuration as a string. |
| `config_format` | string | Yes | `json` or `yaml`. |
| `output_filename` | string | Yes | Desired filename for the output image artifact. |
| `output_format` | string | No | Image format: `png` (default), `jpg`, `jpeg`, `webp`, `svg`, or `pdf`. |

Returns: the rendered chart saved as an image artifact.

Notes: runs in the Secure Tool Runtime.

:::note Desktop bundle
The `create_chart_from_plotly_config` tool renders with Chromium, which the desktop bundle does not include. The bundle finds an installed Google Chrome, Chromium, or Microsoft Edge automatically, so the tool works if you already run one of those browsers. See [Tool Availability](../installing/desktop.md#tool-availability).
:::

## Document, Diagram, and Media

Produce and manipulate documents, diagrams, and media files.

:::note Desktop bundle
The tools `render_document_to_images`, `html_to_pdf`, `mermaid_diagram_generator`, `image_magick`, `ffmpeg`, and `ffprobe` rely on external engines (LibreOffice, Chromium, ImageMagick, poppler, ffmpeg) that the desktop bundle does not include, so those tools do not work there unless the engine each one requires is available on your machine. The bundle finds an installed Chrome, Chromium, or Edge automatically, so the Chromium-based tools usually work with no setup. A Kubernetes deployment includes all of them. See [Tool Availability](../installing/desktop.md#tool-availability).
:::

### `pptx_create_presentation`

Creates a PowerPoint (`.pptx`) presentation from a slide-spec artifact you have already saved as YAML or JSON. Supports rich per-slide layouts (bullet lists, comparison, big number, timeline, icon grid, table, chart, quote, image variants) and a customizable theme.

| Name | Type | Required | Description |
|---|---|---|---|
| `slides` | string | Yes | Slide-spec artifact (YAML or JSON). The slide-spec shape is described in the tool's instructions, which the agent's LLM receives when the tool is attached. |
| `title` | string | Yes | Presentation title, applied to deck metadata. |
| `author` | string | No | Author name, applied to deck metadata. |
| `theme` | object | No | Color and font overlay (`headingFont`, `bodyFont`, `labelFont`, `colors`). Only include the fields you want to change; the deployment default fills the rest. |
| `style` | object | No | Card surface treatment: `card_style` (`elevated`, `flat`, `outlined`, `filled`) and `card_corners` (`rounded`, `square`). |
| `output_name` | string | No | Output filename. Defaults to `presentation`. |
| `images` | array | No | Array of image artifact filenames (PNG or JPEG). Slide specs reference them by 0-based index string in `image_ref` or `bg_image_ref`. |

Returns: a `.pptx` artifact.

Notes: a template profile in `tool_config` applies its colors, fonts, logos, and footer automatically.

### `pdf_ops`

Performs PDF-to-PDF operations: merge multiple PDFs, split into individual pages, extract a page range, rotate pages, add a text watermark, encrypt or decrypt, or read PDF metadata.

| Name | Type | Required | Description |
|---|---|---|---|
| `operation` | string | Yes | One of `merge`, `split`, `extract_pages`, `rotate`, `watermark`, `encrypt`, `decrypt`, `info`. |
| `input_pdf` | artifact | Yes | Primary input PDF. |
| `additional_pdfs` | array of artifact | No | Additional PDFs merged after `input_pdf` (merge only, in order). |
| `page_range` | string | No | pdfcpu page selector, for example `1-3,5,7-`. Required for `extract_pages`, optional for `rotate`. |
| `rotation` | integer | No | Rotation in degrees; must be 90, 180, or 270. Required for `rotate`. |
| `watermark_text` | string | No | Text content for the watermark operation. |
| `watermark_opts` | string | No | Optional pdfcpu watermark description string. |
| `password` | string | No | User password for `encrypt` or `decrypt`. |
| `output_filename` | string | No | Output filename. Defaults per operation. |

Returns: the output PDF (or PDFs for `split`) as artifacts. `info` returns structured metadata.

Notes: does not perform OCR or convert to or from non-PDF formats. Output files are capped at 200 MiB each.

### `render_document_to_images`

Renders a document (PowerPoint, Word, Excel, OpenDocument, HTML, or PDF) to one PNG per page so the agent can visually inspect its own output.

| Name | Type | Required | Description |
|---|---|---|---|
| `input_document` | artifact | Yes | Document to render. |
| `dpi` | integer | No | Render resolution. Default 150. |
| `pages` | string | No | 1-based page selector: `N`, `N-M`, or `N-`. Default all pages. |
| `max_pages` | integer | No | Maximum pages to render. Default 50. |
| `timeout_seconds` | integer | No | Maximum execution time. Default 180. |

Returns: one PNG artifact per page, named `<document>-page-<N>.png`. Load each page PNG with `load_artifact` to attach it to the conversation.

Notes: HTML renders through LibreOffice, so modern CSS and JavaScript are not fully supported. Use `html_to_pdf` for high-fidelity HTML.

### `html_to_pdf`

Renders a styled HTML artifact to a high-fidelity PDF using headless Chromium. Supports modern CSS, web fonts, `@page` rules, page breaks, and running headers or footers.

| Name | Type | Required | Description |
|---|---|---|---|
| `input_document` | artifact | Yes | HTML artifact to render. Save the complete HTML document as an artifact first, then pass its filename. |
| `output_filename` | string | No | Defaults to the input basename with `.pdf`. |
| `page_size` | string | No | `letter` (default), `legal`, `tabloid`, `a3`, `a4`, or `a5`. |
| `orientation` | string | No | `portrait` (default) or `landscape`. |
| `margins_inches` | number | No | Uniform margin in inches for all four sides. |
| `print_background` | boolean | No | Render background colors and images. Defaults to true. |
| `timeout_seconds` | integer | No | Maximum execution time. Default 120. |

Returns: a PDF artifact.

Notes: embed images and fonts as `data:` URIs or reference absolute `https://` URLs so the renderer can reach them.

### `mermaid_diagram_generator`

Generates a PNG or SVG image from Mermaid diagram syntax and saves it as an artifact.

| Name | Type | Required | Description |
|---|---|---|---|
| `mermaid_syntax` | string | Yes | Mermaid diagram source. |
| `output_filename` | string | No | Desired output filename. The extension controls the format when `format` is unset. |
| `format` | string | No | `png` (default) or `svg`. SVG is significantly faster and smaller. |

Returns: the rendered diagram as an image artifact.

### `ffmpeg`

Executes FFmpeg commands for audio or video processing: convert, resize, trim, merge, extract, apply filters. Reference inputs with `{input[N]}` placeholders; use `{output}` for the output path.

| Name | Type | Required | Description |
|---|---|---|---|
| `command` | string | Yes | FFmpeg arguments (without the `ffmpeg` prefix). Use `{input[N]}`, `{output}`, and `{output_dir}` placeholders. |
| `input_files` | array of artifact | Yes | Input media artifacts. Send an empty array for commands that generate media from scratch. |
| `output_filename` | string | Yes | Filename for the output. The extension determines the container format. |
| `timeout_seconds` | integer | No | Maximum execution time. Default 300. |

Returns: the output media as one or more artifacts.

### `ffprobe`

Inspects media file metadata using FFprobe: codecs, resolution, duration, bitrate, streams.

| Name | Type | Required | Description |
|---|---|---|---|
| `input_file` | artifact | Yes | Media artifact to inspect. |
| `command` | string | No | Additional FFprobe arguments. Defaults to full format and stream information as JSON. |
| `timeout_seconds` | integer | No | Maximum execution time. Default 30. |

Returns: the FFprobe JSON output as inline data.

### `image_magick`

Executes ImageMagick commands for image manipulation: resize, crop, convert, composite, annotate, apply effects.

| Name | Type | Required | Description |
|---|---|---|---|
| `command` | string | Yes | ImageMagick command arguments (without the binary name). Use `{input[N]}`, `{output}`, and `{output_dir}` placeholders. |
| `input_images` | array of artifact | Yes | Input image artifacts. Send an empty array for commands that create images from scratch. |
| `output_filename` | string | Yes | Filename for the output. Use a pattern such as `frame_%04d.png` for multi-file output. |
| `timeout_seconds` | integer | No | Maximum execution time. Default 60. |

Returns: the output images as artifacts plus the binary actually used (`magick` under ImageMagick 7 or `convert` under ImageMagick 6).

## Code Execution and Volumes

Sandboxed Python execution and filesystem tools that operate against a mounted volume.

### `execute_python_code`

Runs arbitrary Python in a sandbox for any computation: calculations, data generation, analysis, simulations, format conversion, and chart/file creation. Ships with pandas, numpy, scipy, scikit-learn, matplotlib, sympy, faker, and more. No network access.

| Name | Type | Required | Description |
|---|---|---|---|
| `python_code` | string | Yes | Python source to execute. |
| `input_artifacts` | array of string | No | Filenames to stage into the sandbox as `INPUT_ARTIFACTS[<name>]`. Omit when the code reads no artifacts. |

Returns: captured stdout plus any artifacts the code creates via the `save_artifact(...)` helper.

Notes: the sandbox has no network access. For anything requiring external HTTP, use `web_request` or a connector instead.

The remaining tools in this section all operate against a workspace volume mounted into the Secure Tool Runtime sandbox. Every path is resolved relative to the volume root; paths cannot escape via `..` or symlinks.

### `volume_read`

Reads a file from the workspace volume. Returns the contents as text.

| Name | Type | Required | Description |
|---|---|---|---|
| `path` | string | Yes | Path within the workspace volume. |
| `start_line` | integer | No | 1-based inclusive start line. |
| `end_line` | integer | No | 1-based inclusive end line. |

Returns: the file contents, capped at 256 KiB with a truncation marker if longer.

### `volume_list`

Lists entries in a directory in the workspace volume as `<kind> <size> <modtime> <name>`.

| Name | Type | Required | Description |
|---|---|---|---|
| `path` | string | No | Directory path within the workspace volume. Defaults to the volume root. |
| `recursive` | boolean | No | Recurse into subdirectories. |
| `glob` | string | No | Optional filter pattern. |
| `max_entries` | integer | No | Cap on entries returned. Default 1000. |

Returns: one entry per line in the shape described above.

### `volume_glob`

Finds files matching a pattern under the workspace volume. Supports `*`, `**`, `?`, and character classes.

| Name | Type | Required | Description |
|---|---|---|---|
| `pattern` | string | Yes | Glob pattern. |
| `root` | string | No | Subdirectory to search under. Defaults to the volume root. |
| `max_entries` | integer | No | Cap on matches returned. Default 1000. |

Returns: the matched paths sorted lexicographically.

### `volume_grep`

Searches file contents under the workspace volume using a Go regular expression.

| Name | Type | Required | Description |
|---|---|---|---|
| `pattern` | string | Yes | Regular expression to search for. |
| `path` | string | No | Directory to search under. |
| `file_glob` | string | No | Restrict to files matching this glob. |
| `case_sensitive` | boolean | No | Match case exactly. Defaults to `false`, which wraps the regex with `(?i)`. |
| `output_mode` | string | No | `content` (matching lines, default), `files_with_matches`, or `count`. |
| `context_lines` | integer | No | Lines of context around each match. |
| `head_limit` | integer | No | Cap on returned matches. Default 100. |

Returns: matches in the chosen output mode.

Notes: skips `.git`, `node_modules`, `vendor`, `.venv`, and `__pycache__` by default.

### `volume_stat`

Returns metadata for a single path: kind, size, mode, modtime. Symlinks are reported as `link` and not followed.

| Name | Type | Required | Description |
|---|---|---|---|
| `path` | string | Yes | Path within the workspace volume. |

Returns: the file metadata.

### `volume_write`

Creates or replaces a file under the workspace volume.

| Name | Type | Required | Description |
|---|---|---|---|
| `path` | string | Yes | Destination path within the workspace volume. |
| `content` | string | Yes | Content to write. |
| `overwrite` | boolean | No | Required to overwrite an existing file. |
| `create_parents` | boolean | No | Recursively create the destination's parent directories. |

Returns: confirmation of the write.

### `volume_edit`

In-place exact-string find and replace in a file. Matches verbatim, with no regex and no whitespace normalization. Fails without modification if `old_string` is ambiguous or absent.

| Name | Type | Required | Description |
|---|---|---|---|
| `path` | string | Yes | File to edit. |
| `old_string` | string | Yes | Exact string to find. |
| `new_string` | string | Yes | Replacement. |
| `replace_all` | boolean | No | Replace every occurrence rather than the first. |

Returns: the edit result.

### `volume_append`

Appends content to an existing file. Use `volume_write` to create new files. Refuses to write through symlinks.

| Name | Type | Required | Description |
|---|---|---|---|
| `path` | string | Yes | Existing file to append to. |
| `content` | string | Yes | Content to append. |

Returns: the append result.

### `volume_delete`

Deletes a file, symlink, or directory under the workspace volume. Non-empty directories require `recursive: true`. Refuses to delete the workspace root.

| Name | Type | Required | Description |
|---|---|---|---|
| `path` | string | Yes | Path within the workspace volume. |
| `recursive` | boolean | No | Required to delete a non-empty directory. |

Returns: confirmation of the deletion.

### `volume_move`

Renames or moves a path within the workspace volume.

| Name | Type | Required | Description |
|---|---|---|---|
| `from` | string | Yes | Source path. |
| `to` | string | Yes | Destination path. |
| `overwrite` | boolean | No | Required to overwrite an existing destination. |
| `create_parents` | boolean | No | Recursively create the destination's parent directories. |

Returns: confirmation of the move.

### `volume_mkdir`

Creates a directory under the workspace volume.

| Name | Type | Required | Description |
|---|---|---|---|
| `path` | string | Yes | Directory to create. |
| `recursive` | boolean | No | `mkdir -p` behavior. |

Returns: confirmation of creation. No-op if the directory already exists; fails if the path exists as a file or symlink.

## Task, Notification, and Search

Schedule follow-up work, notify users, and search indexed project documents.

### `schedule_task`

Schedules a workflow or agent to be invoked later: once at a specific time, or repeatedly on a cron or interval schedule. The scheduled invocation runs as a fresh task under the caller's identity.

| Name | Type | Required | Description |
|---|---|---|---|
| `target_name` | string | Yes | Name of the workflow or agent to invoke. |
| `target_type` | string | No | `agent` or `workflow`. Defaults to `agent`. |
| `schedule_type` | string | Yes | `one_time`, `cron`, or `interval`. |
| `schedule` | string | Yes | ISO 8601 timestamp for `one_time`, cron expression for `cron`, or duration for `interval` (for example, `15m`, `24h`). |
| `message` | string | Yes | Instruction delivered to the target when the schedule fires. |
| `name` | string | No | Human-readable label. A unique name is generated when omitted. |
| `timezone` | string | No | IANA timezone for `cron` and `one_time` schedules. Defaults to UTC. |
| `timeout_seconds` | integer | No | Maximum seconds the fired invocation may run. Defaults to 3600. |

Returns: a `scheduled_task_id` once the broker has accepted the request. The call does not block until the task fires.

Notes: the scheduled invocation runs under the creator's identity and re-checks their invoke scopes when it fires.

The remaining `scheduling_tools` let an agent view and manage the caller's scheduled tasks conversationally on any gateway (web, Slack, Teams, WhatsApp). They enforce ownership on the gateway (a caller sees and changes only their own tasks plus namespace-level tasks), so they declare no dedicated scope.

### `list_scheduled_tasks`

Lists the scheduled tasks the caller owns, with each task's id, name, schedule, target, enabled state, and next/last run times. Use the returned ids with the tools below.

| Name | Type | Required | Description |
|---|---|---|---|
| `enabled_only` | boolean | No | When true, return only enabled tasks. Defaults to false. |

### `update_scheduled_task`

Changes an existing scheduled task's schedule, message, name, description, or timezone. Only the supplied fields change. Use `set_scheduled_task_enabled` to pause/resume and `delete_scheduled_task` to remove.

| Name | Type | Required | Description |
|---|---|---|---|
| `task_id` | string | Yes | ID of the task to update (from `list_scheduled_tasks`). |
| `name` | string | No | New human-readable name. |
| `description` | string | No | New description. |
| `schedule_type` | string | No | `one_time`, `cron`, or `interval`. Provide `schedule_expression` to match. |
| `schedule_expression` | string | No | New schedule expression matching `schedule_type`. |
| `timezone` | string | No | New IANA timezone for `cron`/`one_time`. |
| `message` | string | No | New instruction delivered to the target when the task fires. |

### `delete_scheduled_task`

Permanently removes a scheduled task so it no longer fires. Cannot be undone; confirm with the user first. To pause without deleting, use `set_scheduled_task_enabled` with `enabled=false`.

| Name | Type | Required | Description |
|---|---|---|---|
| `task_id` | string | Yes | ID of the task to delete (from `list_scheduled_tasks`). |

### `set_scheduled_task_enabled`

Enables (resumes) or disables (pauses) a scheduled task without deleting it.

| Name | Type | Required | Description |
|---|---|---|---|
| `task_id` | string | Yes | ID of the task (from `list_scheduled_tasks`). |
| `enabled` | boolean | Yes | `true` to enable/resume, `false` to disable/pause. |

### `notify_user`

Sends a fire-and-forget notification to a user through their configured channels, for example a web inbox, a webhook, or a Slack, Teams, or email connector. Unlike `ask_user_question`, this does not wait for a reply.

| Name | Type | Required | Description |
|---|---|---|---|
| `message` | string | Yes | Notification body text. |
| `title` | string | No | Short headline shown above the message. |
| `recipient_user_id` | string | No | User to notify. Defaults to the current user. Notifying a different user may require additional permissions. |
| `channels` | array of string | No | Restrict delivery to these channel types, for example `["web", "webhook"]`. When omitted, uses all of the recipient's configured channels. |

Returns: the `request_id` and recipient once the broker has accepted the request. Delivery is asynchronous.

Notes: requires the `notify:send` scope.

### `index_search`

Searches project documents using BM25 full-text indexing. Returns relevant text chunks from uploaded files (PDF, DOCX, PPTX, and text files) with precise location citations.

| Name | Type | Required | Description |
|---|---|---|---|
| `query` | string | Yes | Search query. Use specific keywords, not conversational questions. |
| `top_k` | integer | No | Number of results, 1-10. Default 5. |
| `min_score` | number | No | Relevance threshold, 0–100, relative to the top hit. 0 keeps all results; 50 keeps only hits at least half as relevant as the best. |

Returns: matching chunks with unique citation IDs (`idx0r0`, `idx0r1`, and so on) plus location information such as `Page 5`, `Paragraph 8`, or `Slide 3`. Place citations after the period in the response text; the Agent Mesh UI displays sources automatically.

Notes: requires a project with uploaded documents and a built BM25 index.

## Next Steps

- To attach these tools to an agent, see [Creating Agents](../building/agents/index.md).
- To ship custom tools alongside these built-ins, see [Creating Toolsets](../building/toolsets.md).
- To bundle on-demand instructions and tools, see [Creating Skills](../building/skills.md).
