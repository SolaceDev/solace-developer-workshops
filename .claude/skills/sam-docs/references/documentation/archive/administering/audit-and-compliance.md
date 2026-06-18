---
title: Audit and Compliance
description: The five audit event types Agent Mesh emits, the closed slog schema, the JSON-handler requirement, and how to ship audit records to your log aggregator for retention and query.
sidebar_position: 8
---

# Audit and Compliance

Audit logging in Agent Mesh is **structured JSON slog output**. Every security-relevant event — authentication, RBAC tool / agent / control-plane decisions, tool execution outcomes — is emitted as a record on the process's standard slog handler. There is no built-in audit database, no audit query API, and no retention engine inside the runtime. Operators ship slog output to an external log aggregator (Datadog, Splunk, CloudWatch, Loki, journald + cold storage) and decide retention, immutability, query, and alerting *there*.

Secrets that appear alongside audit records are handled separately — see Secrets management. The TLS material that protects the broker and HTTP listeners is in TLS. The roles and scopes that the RBAC events reference are in RBAC reference.

## Enable Audit Logging

Audit logging is configured by the optional top-level `audit_log:` YAML section on each component's runtime config. The structured logger ships with the `-enterprise` build; on the base `sam` build the same YAML key is accepted but the no-op logger is wired regardless, and a startup WARN reminds you (so an operator who copies an enterprise config onto a base build does not silently lose every audit record).

```yaml
# configs/gateway.yaml
...
audit_log:
  enabled: true
...
```

Precedence: the `SAM_AUDIT_LOG` environment variable wins (any value other than `false` or `0` enables; `false` or `0` disables), then the YAML `enabled:` key, then the default of `true` when the section is absent.

When audit logging is enabled, the runtime constructs the structured audit logger and wires it into the RBAC authorizers, the trust manager's authentication hooks, and the agent task loop. When disabled, every emission site is routed to a no-op — RBAC still enforces, but nothing is recorded.

## The Five Event Types

The audit pipeline emits five event types. Each fires at a fixed slog level and carries a fixed set of fields. Authoritative field lists ship with the binary — when authoring alerts, query a live stream to confirm the exact field set in your release.

| Event type | Trigger | Slog level | Key fields |
|---|---|---|---|
| Authentication | An authentication attempt completed (success or failure). Fired at HTTP entry points (OIDC callback, Solace Agent Mesh-token validation, logout) and on every inbound task in the agent loop. | `Info` on success, `Warn` on failure | `seq`, `userID`, `taskID`, `reason` (failure only) |
| Tool-access decision | RBAC decided whether the caller's scopes allow a tool invocation. | `Debug` on grant, `Warn` on deny | `seq`, `userID`, `tool`, `scopes` (grant) / `requiredScopes` (deny) |
| Agent-access decision | RBAC decided whether the caller can delegate to a peer agent. | `Debug` on grant, `Warn` on deny | `seq`, `userID`, `agent` |
| Tool execution | A tool invocation finished (success or failure). One event per tool call, fired by the agent task loop after the tool returns. | `Info` on success, `Error` on failure | `seq`, `userID`, `agent`, `tool`, `sessionID`, `duration_ms`, `error` (failure only) |
| Control-plane access decision | RBAC decided whether the caller can perform a control-plane operation (Platform service or gateway admin endpoints). | `Debug` on grant, `Warn` on deny | `seq`, `userID`, `method`, `appName` |

## The Closed Schema

Audit records carry **only** these fields:

`seq`, `userID`, `taskID`, `agent`, `tool`, `sessionID`, `scopes`, `requiredScopes`, `method`, `appName`, `duration_ms`, `error`, `reason`, plus the slog-level `time`, `level`, `msg`, and the `component=audit` tag added by the structured logger constructor.

Deliberately excluded:

- **No request bodies.** Tool arguments, LLM prompts, LLM responses, and any other user content never reach the audit stream.
- **No `Authorization` headers.** The JWT that carried the request is verified upstream; the audit record carries the resolved `userID` from the JWT `sub` claim, not the raw token.
- **No cookies.** Session cookies and bearer-token cookies are not in the schema.
- **No PII beyond the identifier.** `userID` is the normalized identifier (typically an email, employee ID, or OIDC `sub` value depending on your IdP); no display name, group membership, or contact info is added.

This is the contract the audit pipeline is designed around. Custom slog handlers that wrap the audit logger to inject additional fields are not supported — see the JSON-handler requirement below.

## The `seq` Counter

Every audit event carries a `seq` field — a per-process, strictly-monotonic, post-increment counter starting at `1`. Within a single process, `seq` gives you a total ordering even when two events share a wall-clock timestamp.

Across processes the counter resets at startup and is independent per process, so cross-process ordering still relies on the slog `time` field plus your aggregator's clock-skew handling. For multi-pod deployments where you need a single timeline, sort first by `time`, then by `(process_id, seq)`.

## JSON Handler Requirement

The structured logger checks at construction that its underlying slog handler is a `*slog.JSONHandler` (or a wrapper that implements `JSONHandlerInside() bool` and returns true). If it is not, a startup WARN is emitted:

```text
audit logger initialised with non-JSON slog handler; recommended deployment is format: json — custom handlers may re-introduce log injection
```

The reason: audit field values include user-controlled material (the `userID` from a JWT claim, the `tool` and `agent` names from request payloads). The standard library's JSON handler escapes those values safely. A text handler, a CSV handler, or an OTLP-flattening handler can reopen log injection — an attacker who controls the `userID` claim could inject newlines or fake fields into your audit stream.

Set `log.format: json` in the component's runtime config (or `LOG_FORMAT=json` in the environment) to keep the structured logger on its supported path.

## Where Audit Logs Land

Audit events go to the same slog handler as everything else the component emits. By default that is stderr in JSON format. There is no separate audit file, no separate channel, no separate level threshold — audit records mingle with operational logs and are filtered downstream by the `component=audit` tag.

Three shipping recipes:

- **Docker.** Use a Docker logging driver (`json-file`, `journald`, `fluentd`, `gelf`, `awslogs`) on the container. The driver streams stderr to the configured backend.

  ```bash
  docker run --log-driver=fluentd --log-opt fluentd-address=fluentd:24224 ${IMAGE}
  ```

- **Kubernetes.** Scrape pod stdout/stderr with the cluster's log collector (Fluent Bit, Vector, Datadog Agent, Promtail). No sidecar required if the collector runs as a DaemonSet — every Agent Mesh pod's slog output is already on the container's stdout. The Helm chart sets `format: json` by default.

- **Bare metal / systemd.** Run the component under systemd and let `journald` collect stderr; ship the journal to your aggregator with `journalctl --output=json` or vector's `journald` source.

Retention and immutability are properties of the aggregator, not the runtime. Audit records are not specially stamped, hashed, or sealed by Agent Mesh; if your compliance posture requires write-once retention, configure that in the destination (S3 Object Lock, Splunk's Smart Store with frozen-tier retention, an immutable log index in your SIEM).

## Stable Reason Codes

Authentication-event failures carry stable, short reason codes so log queries and alerts remain robust across releases. The HTTP-layer codes are:

| Reason | Emitted when |
|---|---|
| `missing_token` | The request reached an authenticated route with no Agent Mesh access cookie or bearer token. |
| `invalid_token` | A token was present but failed JWT signature, audience, or issuer verification. |
| `expired_token` | The token verified cleanly but its `exp` claim has passed. |
| `oidc_missing_code` | OIDC callback hit without an authorization code in the query string. |
| `oidc_state_mismatch` | OIDC callback `state` did not match the value the gateway set at login. |
| `oidc_code_exchange_failed` | Authorization-code exchange against the IdP token endpoint failed. |
| `oidc_userinfo_failed` | OIDC userinfo lookup against the IdP failed. |
| `oidc_idtoken_verify_failed` | The IdP id_token failed JWKS verification (signature, `aud`, `iss`, `exp`). |
| `oidc_sam_mint_failed` | OIDC handshake succeeded but the gateway failed to mint the Agent Mesh access token. |
| `oidc_login` | Successful OIDC login (carried on the matching successful authentication record). |
| `logout` | The user invoked the logout endpoint. |

The agent task loop emits its own authentication-failure records with a different reason set, sourced from the authenticator's error message — common values include `missing auth token`, `task_id binding mismatch`, and `call depth N exceeds maximum M`. The task-loop reasons are taken directly from the underlying error string today and are not as stable as the HTTP-layer codes; alert on the HTTP codes first.

## Connector Audit Channels

The email connector ships its own audit channel. Same slog pipe, different schema — every send emits an `email_sent` (info), `email_blocked` (warn), or `email_failed` (error) record with the recipients, subject, connector ID, attachment count, message ID, and result classification (`sent`, `rejected`, `throttled`, `error`).

These records are tagged `component=email_connector`, not `component=audit`, so they do not appear in `component=audit` queries. If you alert on outbound-mail compliance (volume thresholds, blocked-recipient patterns), match on the connector's component tag and the result field.

The email-audit channel carries metadata only (recipients, subject, attachment count, result classification) — not the message body or the HTML/plain payload that was sent.

## Compliance Posture

The audit pipeline is designed to give you the records a compliance review typically asks for — *who* attempted *what*, *when*, and whether it was allowed — without leaking the bodies that would broaden the data-classification scope.

What you get:

- **Who-did-what records.** Every authenticated request emits an authentication event; every RBAC decision emits a tool / agent / control-plane access event; every tool invocation emits a tool-execution event. The closed schema means a SOC 2 access-review or a GDPR access-request can be answered by querying `userID`.
- **Stable identifiers.** The `taskID` and `sessionID` fields let you correlate audit records with operational logs across GWE, AWE, STR, and tool boundaries. (The `traceID` that operational logs carry end-to-end is not in the audit schema — correlate via `taskID` instead.)
- **No PII leakage in tool arguments.** The schema excludes tool arguments and LLM bodies, so a tool call against a customer-PII system (CRM, support tickets, HR records) emits an audit record naming the tool and the user — not the content of the call.

What is left to your control:

- **Immutability** is a property of the destination store (S3 Object Lock, SIEM frozen tier, write-once log index). The runtime does not seal records.
- **Retention** is a property of the destination store; the runtime does not rotate or expire records.
- **Access control on the audit stream** is a property of the destination store; the runtime writes to the same slog pipe that operations logs use, and your aggregator decides who can read.
- **Alerting** is a property of the destination store; sample alert seeds are the authentication-failure rate by `reason`, the tool-access-denied rate by `tool`, and any control-plane-access-denied event.

Agent Mesh does **not** carry a SOC 2 or GDPR attestation as a product. The audit pipeline is one input to your own attestation; the closed schema, the JSON-handler requirement, and the redaction discipline elsewhere in the runtime (Secrets management) are designed to make that attestation possible without runtime modifications.

## What Next?

You have audit emissions flowing, the closed schema understood, and a shipping path picked. The companion topic is what to do when those records flag a failure — the day-two playbook for broker, agent, persistence, and tool-execution failures is in Scenario troubleshooting.
