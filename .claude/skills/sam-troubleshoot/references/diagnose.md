# Diagnosis: logs, traceID, sam-doctor, health

## Make logs queryable first

Set `LOG_FORMAT=json` on every component so slog fields parse cleanly. Logging is `log/slog` throughout — structured key-value pairs, no global logger.

**Identifier fields (camelCase):** `traceID`, `taskID`, `agentName`, `corrID`/`reqID`, `messageID`, `contextID`, `userID`, `publisherId`, `eventSeq`. **Metric fields (snake_case):** `duration_ms`, `elapsed_ms`, `timeout_s`.

Field roles when reading a chain:
- `traceID` — one per user task, end to end. The thing you grep.
- `taskID` — gateway-minted task addressing (SSE, cancel, artifacts).
- `corrID`/`reqID` — STR / peer-router pending-request key.
- `contextID` — A2A session/conversation grouping.
- `eventSeq` + `publisherId` — per-publisher monotonic sequence (gap detector input).

## Follow a request across components

```
# JSON logs
jq 'select(.traceID=="<uuid>")' <logs>
# text logs
grep 'traceID=<uuid>' <logs>
# Datadog Logs
@traceID:<uuid>
```

The chain crosses gateway → agent (AWE) → STR → tool, and survives peer delegation. Where it stops tells you the failing hop: gateway logs the request but no task published → gateway/routing; task published but agent never picks it up → broker connectivity or topic-namespace mismatch; agent picks up then stalls → LLM call (auth/egress/model).

**"Agent never discovered" check:** before chasing logs, confirm the gateway even knows the agent exists — the agent should appear in the UI's agent list (agents publish an agent card on the discovery topic at startup; a healthy AWE logs the card publish). If the agent isn't listed, the problem is registration/discovery (agent not started, broker namespace mismatch, or card never published), not request routing.

**Per-publisher stream gaps** (silent-failure detector): the gateway and task-logger watch `(taskID, publisherId, eventSeq)`. A `>+1` jump logs `slog.Error event sequence: gap detected on per-publisher stream` (fields `taskID`, `publisherID`, `lastSeq`, `currentSeq`, `gap`); a non-increase logs `slog.Warn ... duplicate or out-of-order event`. Either means events were dropped/split — suspect a shared broker subscription, duplicate `agent_name` or gateway id across pods, or a misrouted queue, **before** suspecting the tool.

## sam-doctor — preflight checks

Validates the environment independent of a running SAM. Runs as the Helm pre-install/pre-upgrade hook automatically, or as the `sam doctor` CLI subcommand.

```
SAM_DOCTOR_CONTEXT=helm  sam-doctor               # cluster preflight
SAM_DOCTOR_CONTEXT=local sam-doctor --verbose     # local/dev
SAM_DOCTOR_CONTEXT=wheel sam-doctor --no-fail-on-error
```

Checks (per context): **broker connectivity** (TCP + Solace auth), **LLM connectivity** (endpoint reachable + key accepted), **database** reachability + auth, **object storage** reachability + auth, **TLS certificate** validity, **OIDC** discovery reachability. Output is a PASS/FAIL/WARN/SKIP table with a reason per row; non-zero exit on a blocking failure unless `--no-fail-on-error`.

Controls:
- `SAM_DOCTOR_CONTEXT` selects the check set; **unset defaults to `local`** (developer-machine: unconfigured services SKIP rather than fail) and still runs — it prints `SAM_DOCTOR_CONTEXT not set — defaulting to 'local'…`. Set `helm`/`wheel` for the strict deployment check sets. A **misspelled** value is a hard error, not a silent pass.
- `SAM_DOCTOR_SKIP_CHECKS=broker_connectivity,oidc` skips named checks (comma-separated).

## Health endpoints — two distinct surfaces

1. **Gateway request-path `/health`** — shallow liveness ("the HTTP listener is up"), returns 200. Fine for an LB ping; **not** diagnostic of component health.
2. **Workload health server** — the real one. `GET /health` returns 200 `{"status":"healthy"}` or 503 `{"status":"unhealthy","error":"component <name> unhealthy: ..."}` aggregating every component's `Health()`. `GET /ready` returns readiness (`/ready` also reflects broker-connection status). Point Kubernetes liveness/readiness probes here.

Default health-server ports (multi-pod): GWE `:9090`, Platform `:9091`, AWE `:8090`, STR `:8090` (own pod) or `:8092` (colocated with AWE). Embedded mode: a single `:8090` speaks for all. Override with `--health-addr` or `SAM_<ROLE>_HEALTH_ADDR`.

## Per-deployment-mode log access

| Mode | Components | Get logs |
|---|---|---|
| Kubernetes / Helm | GWE, AWE, STR, Platform as separate pods | `kubectl logs <pod>` (`--previous` on crashloop); `kubectl describe pod <pod>` for events |
| Docker | usually all-in-one container | `docker logs <container>` |
| Embedded (`sam run`) | all components as goroutines, one process | the process's stdout/stderr |

Do **not** assume pod label selectors (e.g. `app=solace-agent-mesh`) — they depend on the Helm chart's conventions; list pods and read the names rather than guessing a selector.

## Common startup/runtime errors and where they originate

| Error shape | Meaning | Action |
|---|---|---|
| `parsing YAML: ...` / `missing required '<key>'` | bad config; a misspelled key is silently dropped then surfaces as "missing required" | fix YAML at the named line/key |
| `solace broker: connect to <url>: ...` (Access denied / VPN not found / tls: ... unknown authority) | broker connectivity / auth / TLS | check broker URL, credentials, VPN, trust store; `sam-doctor` broker check |
| `environment variable <KEY> not set for provider <p>` | LLM key missing | set the key on the component that runs the LLM (the agent/AWE) |
| `open ... database: ...` / `run migrations: goose up ...` | DB unreachable or migration failed | check DSN + permissions; see sam-operate upgrades for migration failures |
| `listen :<port>: bind: address already in use` | port conflict | `lsof -i :<port>`; kill stale process or change port |
| `... agent delegation denied` | caller lacks `agent:<name>:delegate` scope | RBAC config → sam-operate |

## Existing customer docs to point users at

These are published troubleshooting pages (cite the docs site, not repo paths): the installation **troubleshoot** page (deployment-time failures), the administering **scenario-troubleshooting** page (day-two failures), and the installation **monitor** page (health-probe wiring + traceID queries). They cover most failure classes above; this skill adds the symptom-routing and traceID-first workflow on top.
