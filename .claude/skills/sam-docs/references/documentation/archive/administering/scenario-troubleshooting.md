---
title: Scenario Troubleshooting
description: Failure scenarios organized by what broke — broker connectivity, crash loops, persistence, tool execution, upgrades — each with symptoms, diagnostics, resolution, and prevention.
sidebar_position: 11
---

# Scenario Troubleshooting

This page is the day-two playbook. Each entry covers one failure scenario from the **operator's** point of view — what you see, how to confirm the diagnosis, what to do, and how to keep it from recurring.

Entries are organized by **what broke**, not by surface symptom, because the same symptom (a stuck agent, a 503, a probe failure) can have several root causes. The diagnostic step in each entry is what separates them.

Before you open a scenario:

- Logs are JSON when `log.format: json` is set — set this on every component so a single `traceID` grep returns a complete chain across the Gateway Executor (GWE), the Agent-Workflow Executor (AWE), the Secure Tool Runtime (STR), and tool boundaries. The format, levels, rotation keys, and `traceID` story are in Observability and alerting.
- Probes: the gateway request-path `/health` returns `200 OK` with body `ok` *unconditionally* — it confirms the HTTP listener is up, nothing more. The dedicated workload health server returns the JSON envelope (`{"status":"healthy"}` or `{"status":"unhealthy","error":"component <name> unhealthy: <wrapped error>"}`) and is the one to point Kubernetes probes at.
- Audit records on RBAC denies and authentication failures carry stable reason codes. The reason set is in Audit and compliance.

---

## Broker Connectivity Failures

Solace PubSub+ (or the dev broker for local development) is the transport that realises the event mesh — every Solace Agent Mesh component publishes and subscribes on it. When it is unreachable, mis-credentialed, or refusing the TLS handshake, every cross-process flow stops — discovery, task submission, A2A peer routing, status streams. Restarting components in a loop without fixing the broker is the usual amplifier.

**Symptoms**

- Operational stderr/log file shows `solace broker: connect to <url>: <underlying error>` at startup, repeated on every reconnect attempt.
- The dedicated workload health server returns `{"status":"unhealthy","error":"component broker unhealthy: <wrapped error>"}` with HTTP 503.
- Task submissions (HTTP `POST` against the gateway) succeed on the HTTP listener but never produce SSE events; the gateway-side log carries the trace ID but no agent ever picks the task up.
- In the broker's own logs, you see auth-failed lines or no TCP accept from the Agent Mesh IP at all (DNS / network policy).

**Diagnostic steps**

1. From the workload host, exercise the broker URL directly:

   ```bash
   curl -fsS --connect-timeout 5 "${SOLACE_BROKER_URL}" || echo "unreachable"
   ```

2. If the URL resolves but auth fails, grep the log file for the connect line and read the wrapped error — it carries the broker SDK's reason (`Access denied`, `Authentication failed`, `Host not found`).
3. If the broker is using TLS, confirm the certificate chain the workload sees matches what the broker presents. The TLS-side procedure is in TLS.
4. If the broker is reachable from one workload but not another, suspect a network policy or egress rule — Agent Mesh does not buffer through a sidecar.

**Resolution**

- **Wrong credentials** — Update the relevant environment variable (`SOLACE_BROKER_USERNAME`, `SOLACE_BROKER_PASSWORD`) or file-mounted secret. The rotation procedure is in Secrets management. Restart every component that holds the credential.
- **Unreachable URL** — Confirm `SOLACE_BROKER_URL` matches the broker's exposed protocol and port (`tcps://broker.example:55443` vs. `tcp://broker.example:55555`). If the broker has moved, every component's env must be updated and rolled.
- **TLS handshake failure** — Push the missing CA into the workload's trust store or point the broker config at the right CA file. See TLS.
- **Network policy** — Open the egress rule from the workload's namespace/host to the broker's SMF / SMFS port.

**Prevention**

- Pin the broker URL and credential into a single `Secret` / config map and apply it across all components together so they cannot drift apart.
- In Kubernetes, set the deployment's readiness probe to the dedicated workload health server (not the request-path `/health`). A broker outage then takes the pod out of rotation instead of black-holing requests.
- Alert on the workload health server returning 503 for more than one probe interval. Cross-check the broker's own connection-count metric.

---

## AWE and GWE Crash Loops

A crash loop is what you see when a workload comes up, fails fast at startup or within the first inbound task, and the orchestrator restarts it. The runtime is deliberately fail-fast on configuration: a missing required key or an unparseable YAML block is preferred over silent degradation. The instrumentation around *which* startup step failed is uneven today — expect to read stderr (and, sometimes, a panic string) to find the cause.

**Symptoms**

- Container or process exits within seconds of `Start`. `kubectl get pods` shows `CrashLoopBackOff`; `docker ps -a` shows repeated short `Up`/`Exited` cycles.
- stderr contains a panic, a YAML parse error from the config loader, or an explicit `fatal:` line and nothing else before exit.
- The dedicated workload health server is never reached — connection refused — because the process did not finish startup.

**Diagnostic steps**

1. Capture the most recent stderr from the failing instance:

   ```bash
   kubectl logs --previous deployment/agent-mesh-awe
   ```

   ```bash
   docker logs --tail 200 agent-mesh
   ```

2. Categorize the message:
   - **YAML parse / schema error** — line/column or unknown field message → fix the config.
   - **Missing required env var** — a downstream SDK reports the problem (e.g., the LLM client failing to authenticate, the broker SDK failing to resolve the URL). Confirm every `${VAR}` placeholder in the active YAML has a value set in the process environment.
   - **Database connection or `goose up (table=<store>_goose_version): …` startup error** — see the Persistence-layer failures scenario.
   - **No log output at all** — the binary may be exiting on a Go panic before slog is wired. Run the binary directly (without the orchestrator wrapper) and capture stderr.
3. If startup succeeded but the workload crashes on the first inbound task, the failure is in the request path. Submit a task with `traceID` correlation enabled (operational logs at `DEBUG`) and follow the chain — see Observability and alerting.

**Resolution**

- **Config error** — Fix the YAML and redeploy. Where the same key is set in YAML and overridden by an environment variable, the env wins; check both layers before concluding the YAML is wrong.
- **Missing secret** — Substitution against the process environment treats an unset `${VAR}` as the empty string. Downstream consumers reject the empty value, often with a confusing message. Set the variable explicitly to a known-bad sentinel during diagnosis so the failure is loud: `export ANTHROPIC_API_KEY="sentinel-fix-me"`.
- **Resource constraint** — If the OOM killer is involved, container memory limits are the issue. Raise the limit or split the workload (run AWE and GWE in separate pods rather than embedded).
- **Dependency failure** — A broker outage, a database outage, or an LLM provider returning 5xx during startup can manifest as a crash loop. Resolve the dependency first, then re-roll.

**Prevention**

- Add a CI step that runs the binary against the production config with `--dry-run` (or the equivalent `sam config validate` in your release pipeline) so a misconfigured YAML never reaches a running pod.
- Treat every `${VAR}` placeholder in production YAML as a required variable. Document them in the runbook. The canonical list of secret-bearing variables is in Secrets management.
- Set container restart policy to `OnFailure` with a finite back-off; do not let a tight crash loop saturate the broker's reconnect queue.

---

## Persistence-Layer Failures

The session store and the artifact store are the two stateful surfaces. Failures fall into two buckets: **unavailable at startup** (the workload refuses to start, often with a panic) and **unavailable mid-operation** (individual requests return errors; the workload stays up). The split matters because the response is different — a startup failure means "fix the dependency and restart", a mid-operation failure means "fix the dependency, then drain in-flight tasks".

**Symptoms**

- *Startup* — workload exits before the dedicated workload health server reaches `healthy`. The wrapped startup error names the surface that failed. Common forms:

  ```text
  open platform database: <wrapped error>
  run migrations: goose up (table=gateway_goose_version): <wrapped error>
  platform migrations: goose up (table=platform_goose_version): <wrapped error>
  ```

- *Mid-operation* — workload stays healthy, but task submissions return HTTP 5xx with the error envelope (`{"message": "...", "errorId": "..."}`). The `errorId` is grep-able in the workload log.
- Artifact-write failures surface as tool errors inside the agent loop (the tool returned an error to the LLM, which then narrates the failure to the user). On the operational stream, look for `put`/`get`/`list` against the backend type (S3, GCS, filesystem).

**Diagnostic steps**

1. Decide which bucket the failure is in:
   - Process is up + dedicated health server returns `{"status":"healthy"}` → **mid-operation**.
   - Process refuses to start / health server unreachable → **startup**.
2. For startup failures, run the database engine's connectivity check from the workload host:

   ```bash
   psql "${SAM_DATABASE_URL}" -c 'SELECT 1'
   ```

   ```bash
   sqlite3 /var/lib/sam/sam.db '.tables'
   ```

3. For mid-operation failures, grep the workload log for the request's `errorId` (it appears once at `ERROR` level with the underlying cause) and the request's `traceID` (it appears at every hop). Together they pinpoint which backend call failed.
4. For artifact-store failures, verify the credential the workload is using has the expected permissions on the bucket / path. Use the cloud provider's CLI (`aws s3 ls`, `gsutil ls`, `az storage blob list`) impersonating the same identity.

**Resolution**

- **SQLite is locked** — Almost always another process holding the file (a manual `sqlite3` shell, an old workload instance that didn't shut down, a backup process with the wrong mode). Drop the holder; the runtime will reconnect on the next operation.
- **Postgres unreachable** — Restart Postgres or fail over to a replica; bring the workload back. The runtime opens a fresh pool on restart; there is no DB-side reconciliation step required.
- **Migration failure at startup** — Migrations are one-way and run automatically; a failed migration panics with the wrapped error. Restore the database to its pre-upgrade backup, fix the migration (or the destination cluster state), then retry. See Upgrade failures below.
- **Artifact store unwritable** — Restore write permission on the path / bucket (filesystem disk-full, S3 bucket policy change, GCS service-account key rotation). The runtime does not buffer writes locally; failed writes surface to the caller immediately.

**Prevention**

- Back the session store with the storage the runtime targets in production (SQLite for single-node and dev, Postgres for everything else). Backup procedure: see Maintenance.
- For artifact stores, prefer IAM-role / workload-identity credentials over long-lived keys. They rotate transparently and remove the "the key rotation broke writes" failure mode. See Secrets management.
- Monitor the workload's per-operation outbound duration histogram (`sam.outbound.request.duration`) — a sudden flat-line or 99p spike on the artifact-store label is the early signal of a backend going bad. See Observability and alerting.

---

## Tool Execution Failures

Tool execution covers built-in tools (the runtime's Go-native catalog), STR-hosted tools (the sandbox-worker bridge that runs Python and Go tool binaries), MCP-server tools (external MCP servers the agent talks to), and OpenAPI tools (external HTTP APIs the agent invokes). Each has a distinct failure shape; the agent loop surfaces all of them as a tool-error event to the LLM, which is why "the agent said the tool failed" by itself is not diagnostic.

**Symptoms**

- The LLM narrates a tool failure to the user (the visible UI behavior).
- An audit record at `Error` level carries the failed tool: `seq`, `userID`, `agent`, `tool`, `sessionID`, `duration_ms`, `error`. The audit-channel schema is in Audit and compliance.
- On the operational stream, the agent loop emits a per-tool-call entry with the `tool` and `traceID` fields and a wrapped error.

**Diagnostic steps**

1. Pin down which class of tool failed. The tool name is in the audit record's `tool` field and on the operational entry; the class (built-in vs. MCP vs. STR vs. OpenAPI) is part of the tool's configured identity.
2. **STR sandbox-worker crash** — look on the STR workload's operational log for one of the manifest-level messages:

   ```text
   skipping invalid manifest entry
   manifest entry is unservable
   tool not found in manifest
   ```

   These are emitted at workload startup (manifest load) or on dispatch (tool not registered). The `tool` and `error` fields tell you which tool and why.
3. **MCP server unreachable** — the agent loop logs the MCP-tool-failure audit record with an `error_type` of the kind reported by the MCP transport (`connection refused`, `dial timeout`, `401`, `403`). Bearer tokens are redacted in the logged error string.
4. **OpenAPI auth failure** — the tool emits an HTTP status (typically `401` or `403`) wrapped into the error. If the API returned a body, it is captured (truncated) in the error field.
5. **Tool timeout vs. tool error** — both surface as a tool-call failure on the audit channel, but the timeout case carries a `duration_ms` close to the configured timeout (default depends on the tool kind). A "tool returned an error" case typically completes well below the timeout.

**Resolution**

- **STR worker crashed** — Restart the STR workload. The agent loop will retry the next user request transparently. If the worker is crashing repeatedly, the tool's manifest or its code is the issue; check the manifest entry the workload rejected.
- **MCP server unreachable** — Restart the MCP server, fix its network reachability, or remove the `tool_type: mcp` entry from the agent's YAML if the MCP server is intentionally retired. A new GWE / agent does not need to wait for the MCP server to come back if the MCP tool is optional.
- **OpenAPI auth** — Rotate the credential on the upstream API and update the workload's environment variable (`*_OPENAPI_API_KEY`, `*_OPENAPI_BEARER_TOKEN`, or the relevant OAuth client secret). See Secrets management.
- **Timeout** — The default agent-loop / tool-call timeouts are conservative, but a real long-running tool (web research, image generation, large file conversion) can exceed them. Raise the tool's timeout in YAML; do not raise the agent loop's global timeout indiscriminately.

**Prevention**

- Treat the MCP servers and OpenAPI endpoints your agents depend on as **first-class dependencies** in your alerting. The Agent Mesh runtime does not own their health; an MCP server hung in production looks identical to a configuration error.
- For OpenAPI tools, prefer credentials with monitored rotation (workload identity, OAuth client credentials with short-lived tokens) over long-lived API keys. The expiry window is then visible and alertable.
- For STR-hosted tools, validate the manifest in CI by booting the STR workload against the production manifest in a sandbox and asserting no `skipping invalid manifest entry` log lines appear at startup.

---

## Upgrade Failures

Upgrades touch three surfaces at once: the binary version, the database schema (session store, gateway event log), and the YAML config compatibility. Failures are usually one of: a migration the upgrade introduced fails against the existing data, a YAML key was renamed and the operator's config still uses the old name, or the binary refuses to start against an older / newer schema version than its embedded migrations expect.

**Symptoms**

- *Gateway or platform-service migration failure* — workload exits at startup with an `Error`-level operational record `migration failed` (carrying the offending migration `version` and the underlying SQL error) followed by a wrapped startup error of the form `run migrations: goose up (table=gateway_goose_version): <wrapped error>` or `platform migrations: goose up (table=platform_goose_version): <wrapped error>`. The dedicated health server never reaches `healthy`.
- *AWE session-store migration failure* — AWE logs `failed to migrate session db, using memory` at `Error` and **stays up**. The dedicated health server reports `{"status":"healthy"}`, but conversation history written by the previous binary is invisible because every new session is being held in memory. See Migrations → The auto-apply contract for the asymmetry.
- Workload starts but YAML keys silently fall back to defaults — the symptom is a feature you configured no longer takes effect.
- Mixed-version deployment: some pods are on the new binary, some on the old; broker traffic continues but feature semantics diverge in confusing ways (e.g., one agent uses the new tool timeout, the other uses the old one).

**Diagnostic steps**

1. Confirm the binary version each workload is running. The CLI exposes it:

   ```bash
   sam --version
   ```

   For non-CLI workloads (`awe`, `gateway`, `str`), the container image tag is the canonical version source.
2. Read the per-version migration notes for the upgrade path — those land in Migrations when the release ships a schema change. If a YAML key was renamed, the migration note documents it; the runtime does not auto-translate the old key.
3. For a stuck migration, capture the operational log from the failing pod. The `migration failed` Error record names the version that did not apply; the wrapped startup error names which store's version table it belongs to. Together they pinpoint the migration and the underlying SQL error (constraint violation, type mismatch, missing column on a custom-schema database).
4. For mixed-version deployments, the workload health server's JSON envelope does not include a version field today — confirm the version per pod by inspecting the image tag or running the version command.

**Resolution**

- **Pre-upgrade check failed** — Restore the database to the pre-upgrade backup, abort the upgrade, and re-plan. There is no automatic rollback inside the runtime; the upgrade procedure documented in Upgrade guides is what gets you back to a known state.
- **Migration failed** — Same answer: restore from backup, address the underlying issue (a custom column, a data row the new migration rejects, an insufficient role on the database user), retry.
- **YAML key rename** — Update the YAML to use the new key. The old key is silently ignored when it has been renamed; the migration note for the release tells you the mapping.
- **Mixed-version deployment** — Finish the roll. Do not run mixed versions long-term; the A2A wire format is forward-compatible within a major version but the YAML schema is not.

**Prevention**

- Always back up the session store and the gateway database before an upgrade. Cloud-managed Postgres / managed SQLite snapshots are the simplest path; for self-hosted, use the native dump tool. The backup procedure is in Maintenance.
- Run the new binary against a copy of production data in a staging environment first. The migration is what is new; the data in your production database is what is novel.
- Roll the deployment one workload class at a time (Platform first, then GWE, then AWE, then STR). Each can independently report a healthy / unhealthy state via the dedicated health server, and an unhealthy step can be aborted before it cascades.

## What Next?

When troubleshooting confirms the system is healthy and the immediate fire is out, day-two also covers the routine work: backups, log rotation, and automatic data cleanup. The procedures are in Maintenance.
