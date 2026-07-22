# Task event logs (STIM)

A **task event log** — called a **STIM file** in SAM-Go — is a YAML record of the full broker event flow for one task: every request, status update, LLM call, tool invocation + result, artifact event, and the final response. It's the tool for "what exactly did this task do, and where did it go wrong." ("STIM" is the file/feature name; it isn't an acronym worth expanding.)

## Enable capture (two requirements, both needed)

On the entrypoint's `app_config`:

1. A **SQL** session service (SQLite or Postgres — not in-memory):
   ```yaml
   session_service:
     type: sql
     database_url: "sqlite:////absolute/path/to/entrypoint.db"   # 4 slashes = absolute
   ```
2. **Task logging on:**
   ```yaml
   task_logging:
     enabled: true
     # optional: log_status_updates / log_artifact_events / log_file_parts / max_file_part_size_bytes
   ```

Without **both**, the STIM endpoint returns 404 even though tasks run. The `task_events` table (STIM) is separate from the SSE reconnection buffer.

Common enable-time pitfalls:
- **SQLite path needs 4 slashes** for an absolute path (`sqlite:////abs/path`); 3 slashes is a relative path that silently produces an empty DB.
- A stale `sam` process still bound to the port means `sam task send` talks to the old process — `lsof -i :8800` and kill stragglers.
- Between local runs, remove `.db`, `.db-wal`, `.db-shm` to avoid SQLite lock errors.

The `task_logging` **feature flag** (`SAM_FEATURE_TASK_LOGGING`) only gates the *UI* log surface; backend capture is the `task_logging.enabled` YAML above. Don't conflate them.

## Locate / download the file for a specific task

- **Via the API:** `GET /api/v1/tasks/{taskId}` returns the STIM as a downloadable attachment, `Content-Type: application/yaml`, filename `{rootTaskId}.stim`. It includes the parent task chain + all descendants, so a workflow's sub-tasks come in one file.
- **Via the CLI:** `sam task send "<msg>" -u http://localhost:8800 -a <AgentName>` auto-saves the STIM under the task output dir (e.g. `/tmp/sam-task-{id}/{id}.stim`). `--no-stim` disables that. (`8800` is the entrypoint's default port; use your own entrypoint URL for a remote/K8s deployment.)
- **Find the taskId:** list tasks (`GET /api/v1/tasks`, paginated) or read it from the UI / the entrypoint log line for the conversation.
- **Auth against a deployed entrypoint:** a remote entrypoint with SSO/OIDC on rejects an unauthenticated CLI call with **401**. Run `sam auth login <entrypoint-url>` once first — `sam task send` / `sam api` then reuse the cached token (auto-refreshed), so you can drop `-u` and use `--target <name>`. Bearer tokens are refused over plain `http://` unless you pass `--insecure`. The full CLI-auth surface (`sam auth login/logout/status/list`, token precedence) is owned by `sam-declarative-config`'s CLI-auth reference — go there for details, don't guess token flags.

## Read it: the `stim-analyze` CLI

```
stim-analyze <file>.stim          # human-readable summary
stim-analyze <file>.stim --json   # machine-readable
stim-analyze <file>.stim --verbose
```

`stim-analyze` ships with the SAM tooling (run it on PATH; if it isn't present, fall back to reading the `.stim` YAML directly using the schema below). The summary surfaces task id, status, duration, LLM calls, tool calls, token usage, the sub-task tree, artifact operations, and a flow summary — i.e. exactly the "which step failed / which tool ran / how many tokens" view.

Reading it for a silent tool failure:
- A `tool_invocation_start` with **no matching `tool_result`** → the tool died mid-call (STR crash, timeout, sandbox kill).
- A `tool_result` **carrying an error** → the tool ran and reported failure.
- The flow **ends right after the `request`** with no LLM response or tool events → the task never got past the entrypoint→agent or agent→LLM hop. That's not a tool problem — go back to `traceID` correlation and the broker/LLM checks in [diagnose.md](diagnose.md).

## Event schema (for reading the raw YAML)

Top level:
```yaml
invocation_details:        # task_id, user_id, start/end time, status, initial_request_text, total_tasks, includes_child_tasks
invocation_flow:           # ordered array of events, sorted by created_time
  - id: evt-<prefix>-<seq>
    task_id: <uuid>
    created_time: <epoch-ms>
    topic: <namespace>/a2a/v1/<direction>/<agent|gateway>/<taskId>
    direction: request | status | response | error
    payload: <JSON-RPC envelope>
```

`direction` meanings: **request** (user/parent → agent), **status** (progress: LLM request/response, tool start/result, artifact ops — the signal is in `payload.result.status.message.parts[*].data.type`, e.g. `tool_invocation_start`, `tool_result`, `llm_response`), **response** (final, with token usage), **error** (JSON-RPC error envelope). Events are ordered by `created_time`.

## User-facing vs contributor-facing

Safe to walk a user through: enabling capture, downloading the `.stim`, running `stim-analyze`, reading the flow. Deep mechanics — capture internals, the DB schema, mock-LLM closed-loop generation — are contributor-facing (`sam-closed-loop-debug` skill, the internal stim-capture doc); point there only if the user is debugging SAM itself rather than their own task.

## Docs gap

There is currently **no published customer page** for task logging / STIM (it's mentioned only briefly under the entrypoints doc and the eval docs). Until one lands, this reference is the user-facing source; don't invent a doc URL for it.
