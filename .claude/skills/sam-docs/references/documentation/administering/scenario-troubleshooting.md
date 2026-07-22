---
title: Troubleshooting a Running Deployment
description: Failure scenarios organized by what broke — broker connectivity, crash loops, persistence, and tool execution — each with symptoms, diagnostics, resolution, and prevention.
sidebar_position: 890
---

# Troubleshooting a Running Deployment

This page is the day-two playbook. Each entry covers one failure scenario from the **operator's** point of view — what you see, how to confirm the diagnosis, what to do, and how to keep it from recurring.

Entries are organized by **what broke**, not by surface symptom, because the same symptom (a stuck agent, a 503, a probe failure) can have several root causes. The diagnostic step in each entry is what separates them.

Before you open a scenario:

- Logs are JSON when `log.format: json` is set — set this on every component so a single `traceID` grep returns a complete chain across the Entrypoint Executor, the Agent-Workflow Executor, the Secure Tool Runtime, and tool boundaries. The format, levels, rotation keys, and `traceID` story are in [Monitoring Your Agent Mesh](./observability.md).
- Probes: the entrypoint's request-path `/health` returns `200 OK` with a JSON body (`{"status":"A2A Web UI Backend is running"}`) *unconditionally* — it confirms the HTTP listener is up, nothing more. The dedicated workload health server returns the JSON envelope (`{"status":"healthy"}` or `{"status":"unhealthy","error":"component <name> unhealthy: <wrapped error>"}`) and is the one to point Kubernetes probes at.
- Audit records on RBAC denies and authentication failures carry the failure context you need to tell a policy problem from a credential problem. The audit schema is in [Managing Audit and Compliance](./audit-and-compliance.md).

---

## Broker Connectivity Failures

A Solace event broker (or the dev broker for local development) is the transport that realizes the event mesh — every Agent Mesh component publishes and subscribes on it. When it is unreachable, using the wrong credentials, or refusing the Transport Layer Security (TLS) handshake, every cross-process flow stops — discovery, task submission, Agent-to-Agent (A2A) peer routing, status streams. Restarting components in a loop without fixing the broker is the usual amplifier.

**Symptoms**

- Operational stderr / log file shows `solace broker: connect to <url>: <underlying error>` at startup, repeated on every reconnect attempt.
- The dedicated workload health server returns `{"status":"unhealthy","error":"component broker unhealthy: <wrapped error>"}` with HTTP 503.
- Task submissions (an HTTP `POST` to the entrypoint) succeed on the HTTP listener but never produce Server-Sent Events (SSE); the entrypoint-side log carries the `traceID` but no agent ever consumes the task.
- In the broker's own logs, you see authentication-failure lines, or no TCP accept from the Agent Mesh IP at all (DNS / network policy).

**Diagnostic steps**

1. From the workload host, exercise the broker URL directly:

   ```bash
   curl -fsS --connect-timeout 5 "${SOLACE_BROKER_URL}" || echo "unreachable"
   ```

2. If the URL resolves but authentication fails, grep the log file for the connect line and read the wrapped error — it carries the broker software development kit (SDK) reason (`Access denied`, `Authentication failed`, `Host not found`).
3. If the broker is using TLS, confirm the certificate chain the workload sees matches what the broker presents. The TLS-side procedure is in [Configuring TLS](./tls.md).
4. If the broker is reachable from one workload but not another, suspect a network policy or egress rule — Agent Mesh does not buffer through a sidecar.

**Resolution**

- **Wrong credentials** — Update the relevant environment variable (`SOLACE_BROKER_USERNAME`, `SOLACE_BROKER_PASSWORD`) or file-mounted secret. The rotation procedure is in [Managing Secrets](./secrets-management.md). Restart every component that holds the credential.
- **Unreachable URL** — Confirm `SOLACE_BROKER_URL` matches the broker's exposed protocol and port (`tcps://broker.example:55443` versus `tcp://broker.example:55555`). If the broker has moved, every component's environment must be updated and rolled.
- **TLS handshake failure** — Push the missing certificate authority (CA) certificate into the workload's trust store or point the broker configuration at the right CA file. See [Configuring TLS](./tls.md).
- **Network policy** — Open the egress rule from the workload's namespace / host to the broker's Solace Message Format (SMF) / SMF-over-TLS (SMFS) port.

**Prevention**

- Pin the broker URL and credential into a single `Secret` / `ConfigMap` and apply it across all components together so they cannot drift apart.
- In Kubernetes, set the deployment's readiness probe to the dedicated workload health server (not the request-path `/health`). A broker outage then takes the pod out of rotation instead of silently dropping requests.
- Alert on the workload health server returning 503 for more than one probe interval. Cross-check the broker's own connection-count metric.

---

## Agent-Workflow Executor and Entrypoint Executor Crash Loops

A crash loop is what you see when a workload comes up, fails fast at startup or within the first inbound task, and the orchestrator restarts it. The runtime is deliberately fail-fast on configuration: a missing required key or an unparseable YAML block is preferred over silent degradation. Expect to read stderr (and, sometimes, a panic string) to find the cause.

**Symptoms**

- Container or process exits within seconds of startup. `kubectl get pods` shows `CrashLoopBackOff`.
- stderr contains a panic, a YAML parse error from the configuration loader, or an explicit `fatal:` line and nothing else before exit.
- The dedicated workload health server is never reached — connection refused — because the process did not finish startup.

**Diagnostic steps**

1. Capture the most recent stderr from the failing instance:

   ```bash
   kubectl logs --previous deployment/solace-agent-mesh-go-awe
   ```

2. Categorize the message:
   - **YAML parse / schema error** — a line / column or unknown-field message → fix the configuration.
   - **Missing required environment variable** — a downstream SDK reports the problem (the large language model (LLM) client failing to authenticate, the broker SDK failing to resolve the URL). Confirm every `${VAR}` placeholder in the active YAML has a value set in the process environment.
   - **Database connection or migration startup error** (`run migrations: goose up (table=gateway_goose_version): …`) — see the following Persistence-Layer Failures scenario.
   - **No log output at all** — the binary may be exiting on a Go panic before logging is wired. Run the binary directly (without the orchestrator wrapper) and capture stderr.
3. If startup succeeded but the workload crashes on the first inbound task, the failure is in the request path. Submit a task with operational logs at `DEBUG` and follow the `traceID` chain — see [Monitoring Your Agent Mesh](./observability.md).

**Resolution**

- **Configuration error** — Fix the YAML and redeploy. Where the same key is set in YAML and overridden by an environment variable, the environment wins; check both layers before concluding the YAML is wrong.
- **Missing secret** — Substitution against the process environment treats an unset `${VAR}` as the empty string. Downstream consumers reject the empty value, often with a confusing message. Set the variable explicitly to a known-bad sentinel during diagnosis so the failure is loud: `export ANTHROPIC_API_KEY="sentinel-fix-me"`.
- **Resource constraint** — If the out-of-memory (OOM) killer is involved, container memory limits are the issue. Raise the limit or split the workload (run the Agent-Workflow Executor and the Entrypoint Executor in separate pods rather than co-located in one).
- **Dependency failure** — A broker outage, a database outage, or an LLM provider returning 5xx during startup can manifest as a crash loop. Resolve the dependency first, then re-roll.

**Prevention**

- Validate the production configuration in CI before it reaches a running pod — boot the binary against it in a sandbox, or run the equivalent validation step in your release pipeline, so a misconfigured YAML fails the build rather than the pod.
- Treat every `${VAR}` placeholder in production YAML as a required variable. Document them in the runbook. The canonical list of secret-bearing variables is in [Managing Secrets](./secrets-management.md).
- Set the container restart policy to a finite back-off; do not let a tight crash loop saturate the broker's reconnect queue.

---

## Persistence-Layer Failures

The session store and the artifact store are the two stateful surfaces. Failures fall into two buckets: **unavailable at startup** (the workload refuses to start) and **unavailable mid-operation** (individual requests return errors; the workload stays up). The split matters because the response is different — a startup failure means "fix the dependency and restart"; a mid-operation failure means "fix the dependency, then drain in-flight tasks".

**Symptoms**

- *Startup* — the workload exits before the dedicated workload health server reaches `healthy`. The wrapped startup error names the surface that failed. Common forms:

  ```text
  open platform database: <wrapped error>
  run migrations: goose up (table=gateway_goose_version): <wrapped error>
  platform migrations: goose up (table=platform_goose_version): <wrapped error>
  ```

- *Mid-operation* — the workload stays healthy, but task submissions return HTTP 5xx with the error envelope (`{"message": "...", "errorId": "..."}`). You can find the `errorId` in the workload log with grep.
- Artifact-write failures surface as tool errors inside the agent loop (the tool returned an error to the LLM, which then reports the failure to the user). On the operational stream, look for `put` / `get` / `list` operations against the backend type (S3, GCS, filesystem).

**Diagnostic steps**

1. Decide which bucket the failure is in:
   - Process is up and the dedicated health server returns `{"status":"healthy"}` → **mid-operation**.
   - Process refuses to start / health server unreachable → **startup**.
2. For startup failures, run a connectivity check against the same connection string your session store's `database_url` resolves to:

   ```bash
   psql "$DATABASE_URL" -c 'SELECT 1'
   ```

   ```bash
   sqlite3 /var/lib/sam/sam.db '.tables'
   ```

3. For mid-operation failures, grep the workload log for the request's `errorId` (it appears once at `ERROR` level with the underlying cause) and the request's `traceID` (it appears at every hop). Together they pinpoint which backend call failed.
4. For artifact-store failures, verify the credential the workload is using has the expected permissions on the bucket / path. Use the cloud provider's CLI (`aws s3 ls`, `gsutil ls`, `az storage blob list`) impersonating the same identity.

**Resolution**

- **SQLite is locked** — Almost always another process holding the file (a manual `sqlite3` shell, an old workload instance that did not shut down, a backup process with the wrong mode). Drop the holder; the runtime reconnects on the next operation.
- **Postgres unreachable** — Restart Postgres or fail over to a replica; bring the workload back. The runtime opens a fresh pool on restart; there is no database-side reconciliation step required.
- **Migration failure at startup** — Migrations are one-way and run automatically; a failed migration aborts startup with the wrapped error and the workload never reaches ready. Roll back manually: stop the new pods, restore each affected database to its pre-upgrade backup, redeploy the previous pinned binary version, and restart the workloads in deploy order (Platform service, then the Entrypoint Executor, then the Agent-Workflow Executor, then the Secure Tool Runtime), confirming each reports ready. Then reproduce the failure against a staging copy of production data before retrying.
- **Artifact store unwritable** — Restore write permission on the path / bucket (filesystem disk-full, S3 bucket-policy change, GCS service-account key rotation). The runtime does not buffer writes locally; failed writes surface to the caller immediately.

**Prevention**

- Back the session store with the storage the runtime targets in production (SQLite for single-node and development, Postgres for everything else). Backup procedure: see [Managing Backups and Data Retention](./backups-and-data-retention.md).
- For artifact stores, prefer identity and access management (IAM) role / workload-identity credentials over long-lived keys. They rotate transparently and remove the "the key rotation broke writes" failure mode. See [Managing Secrets](./secrets-management.md).
- Monitor the workload's per-operation outbound-duration histogram (`sam.outbound.request.duration`) — a sudden flattening or 99th-percentile spike on the artifact-store label is the early signal of a backend going bad. See [Monitoring Your Agent Mesh](./observability.md).

---

## Tool Execution Failures

Tool execution covers built-in tools (the runtime's Go-native catalog), Secure Tool Runtime-hosted tools (the sandbox-worker bridge that runs Python and Go tool binaries), Model Context Protocol (MCP) server tools (external MCP servers the agent connects to), and OpenAPI tools (external HTTP APIs the agent invokes). Each has a distinct failure shape; the agent loop surfaces all of them as a tool-error event to the LLM, which is why "the agent said the tool failed" by itself is not diagnostic.

**Symptoms**

- The response reports a tool failure to the user (the behavior the user sees).
- An audit record carries the failed tool along with the invoking identity, the agent, the session, and the duration. The audit-channel schema is in [Managing Audit and Compliance](./audit-and-compliance.md).
- On the operational stream, the agent loop emits a per-tool-call entry with the tool name and `traceID` fields and a wrapped error.

**Diagnostic steps**

1. Pin down which class of tool failed. The tool name is on the audit record and on the operational entry; the class (built-in versus MCP versus Secure Tool Runtime versus OpenAPI) is part of the tool's configured identity.
2. **Secure Tool Runtime sandbox-worker crash** — look on the Secure Tool Runtime workload's operational log for one of the manifest-level messages:

   ```text
   skipping invalid manifest entry
   manifest entry is unservable
   tool not found in manifest
   ```

   These are emitted at workload startup (manifest load) or on dispatch (tool not registered). The fields tell you which tool and why.
3. **MCP server unreachable** — the agent loop logs the MCP tool failure with the kind of error the MCP transport reported (`connection refused`, `dial timeout`, `401`, `403`). Bearer tokens are redacted in the logged error string.
4. **OpenAPI auth failure** — the tool emits an HTTP status (typically `401` or `403`) wrapped into the error. If the API returned a body, it is captured (truncated) in the error field.
5. **Tool timeout versus tool error** — both surface as a tool-call failure, but the timeout case carries a duration close to the configured timeout, while a "tool returned an error" case typically completes well below it.

**Resolution**

- **Secure Tool Runtime worker crashed** — Restart the Secure Tool Runtime workload. The agent loop retries on the next user request transparently. If the worker is crashing repeatedly, the tool's manifest or its code is the issue; check the manifest entry the workload rejected.
- **MCP server unreachable** — Restart the MCP server, fix its network reachability, or remove the MCP tool entry from the agent's YAML if the MCP server is intentionally retired. A new Entrypoint Executor or agent does not need to wait for the MCP server to come back if the MCP tool is optional.
- **OpenAPI auth** — Rotate the credential on the upstream API and update the workload's environment variable or the relevant OAuth client secret. See [Managing Secrets](./secrets-management.md).
- **Timeout** — The default agent-loop / tool-call timeouts are conservative, but a real long-running tool (web research, image generation, large file conversion) can exceed them. Raise the tool's timeout in YAML; do not raise the agent loop's global timeout indiscriminately.

**Prevention**

- Treat the MCP servers and OpenAPI endpoints your agents depend on as **first-class dependencies** in your alerting. The Agent Mesh runtime does not own their health; an MCP server hung in production looks identical to a configuration error.
- For OpenAPI tools, prefer credentials with monitored rotation (workload identity, OAuth client credentials with short-lived tokens) over long-lived API keys. The expiry window is then visible and alertable.
- For Secure Tool Runtime-hosted tools, validate the manifest in CI by booting the Secure Tool Runtime workload against the production manifest in a sandbox and asserting no `skipping invalid manifest entry` lines appear at startup.

## What Next?

When troubleshooting confirms the system is healthy and the immediate incident is resolved, day-two also covers the routine work: backups, log rotation, and automatic data cleanup. The procedures are in [Managing Backups and Data Retention](./backups-and-data-retention.md).
