---
title: Managing Audit and Compliance
description: The audit event types Agent Mesh emits, the audit slog schema, the JSON-handler requirement, and how to ship audit records to your log aggregator for retention and query.
sidebar_position: 860
---

# Managing Audit and Compliance

Audit logging in Agent Mesh is **structured JSON slog output**. Every security-relevant event — authentication, role-based access control (RBAC) decisions on tools, agents, and the control plane, tool-execution outcomes, and resource-sharing changes — is emitted as a record on the process's standard slog handler. There is no built-in audit database, no audit query API, and no retention engine inside the runtime. Operators ship slog output to an external log aggregator (Datadog, Splunk, CloudWatch, Loki, or `journald` plus cold storage) and decide retention, immutability, query, and alerting *there*.

Secrets that appear alongside audit records are handled separately — see [Managing Secrets](./secrets-management.md). The TLS material that protects the broker and HTTP listeners is in [Configuring TLS](./tls.md). The roles and scopes that the RBAC events reference are in [RBAC Reference](../reference/rbac-reference.md).

## Enable Audit Logging

Audit logging is on by default. It is controlled by the optional top-level `audit_log:` YAML section on each component's runtime configuration, and it can be disabled per component.

```yaml
# gateway runtime config
...
audit_log:
  enabled: true
...
```

Precedence: the `SAM_AUDIT_LOG` environment variable wins — any value other than `false` or `0` enables audit logging, and `false` or `0` disables it — then the YAML `enabled:` key, then the default of `true` when the section is absent.

When audit logging is enabled, the runtime constructs the structured audit logger and wires it into the RBAC authorizers, the trust manager's authentication hooks, and the agent task loop. When it is disabled, every emission site is routed to a no-op logger — RBAC still enforces, but nothing is recorded — and the runtime logs an `INFO` line noting that audit logging is disabled.

## Audit Event Types

The audit pipeline emits nine event types. Five are security-decision events; four record resource-sharing changes. Each fires at a fixed slog level and carries a fixed set of fields.

The five security-decision events:

| Event | Trigger | Slog level | Key fields |
|---|---|---|---|
| Authentication | An authentication attempt completed (success or failure). Fired at HTTP entry points (the OpenID Connect (OIDC) callback, Agent Mesh-token validation, logout) and on every inbound task in the agent loop. | `INFO` on success, `WARN` on failure | `seq`, `userID`, `taskID`, plus `reason` on failure |
| Tool-access decision | RBAC decided whether the caller's scopes allow a tool invocation. | `DEBUG` on grant, `WARN` on deny | `seq`, `userID`, `tool`, plus `scopes` on grant / `requiredScopes` on deny |
| Agent-access decision | RBAC decided whether the caller can delegate to a peer agent. | `DEBUG` on grant, `WARN` on deny | `seq`, `userID`, `agentName` |
| Tool execution | A tool invocation finished. One event per tool call, fired by the agent task loop after the tool returns. | `INFO` on success; `WARN` or `ERROR` on failure | `seq`, `userID`, `agentName`, `tool`, `sessionID`, `duration_ms`, plus `error` on failure |
| Control-plane access decision | RBAC decided whether the caller can perform a control-plane operation (a Platform service or entrypoint admin endpoint). | `DEBUG` on grant, `WARN` on deny | `seq`, `userID`, `method`, `appName` |

Tool-execution failures split by error class: expected, caller-domain outcomes (a tool returning an error, a validation failure, a cancellation, a required-authorization prompt, an upstream `4xx`) log at `WARN`, and unexpected failures log at `ERROR`. Alert on the `ERROR`-level tool-execution records first.

The four resource-sharing events all fire at `INFO` and record who changed a share and how:

| Event | Trigger | Key fields |
|---|---|---|
| Share granted | A resource was shared with a recipient. | `actor`, `resourceType`, `resourceID`, `recipientEmail`, `accessLevel` |
| Share level changed | An existing share's access level was changed. | `actor`, `resourceType`, `resourceID`, `recipientEmail`, `accessLevel` |
| Share revoked | A share was revoked. | `actor`, `resourceType`, `resourceID`, `recipientEmail` |
| Template deleted | A shared template was deleted. | `actor`, `resourceType`, `resourceID`, `recipientEmails` |

Authoritative field lists ship with the binary. When authoring alerts, query a live stream to confirm the exact field set in your release.

## The Audit Schema

Audit records carry a bounded set of fields — the security-decision fields, the resource-sharing fields, and the standard slog envelope:

`seq`, `userID`, `taskID`, `agentName`, `tool`, `sessionID`, `scopes`, `requiredScopes`, `method`, `appName`, `duration_ms`, `error`, `reason`, `actor`, `resourceType`, `resourceID`, `recipientEmail`, `recipientEmails`, `accessLevel` — plus the slog-level `time`, `level`, `msg`, the `logger_name=audit` tag added by the audit logger, and the `component=<service>` tag that names the emitting binary.

Deliberately excluded from the security-decision events:

- **No request bodies.** Tool arguments, large language model (LLM) prompts, LLM responses, and any other user content never reach the audit stream.
- **No `Authorization` headers.** The JSON Web Token (JWT) that carried the request is verified upstream; the audit record carries the resolved `userID` from the JWT `sub` claim, not the raw token.
- **No cookies.** Session cookies and bearer-token cookies are not in the schema.
- **No PII beyond the identifier.** `userID` is the normalized identifier — typically an email, an employee ID, or the OIDC `sub` value, depending on your identity provider (IdP). No display name, group membership, or contact information is added.

The resource-sharing events are the one place a recipient's email address appears (`recipientEmail` / `recipientEmails`), because naming the party a resource was shared with is the point of a sharing-audit record. If your data-classification scope treats recipient emails as sensitive, account for those four event types when you size and gate the audit stream.

Custom slog handlers that wrap the audit logger to inject additional fields are not supported — see the following JSON-handler requirement.

## The `seq` Counter

Every audit event carries a `seq` field — a per-process, strictly-monotonic, post-increment counter starting at `1`. Within a single process, `seq` gives you a total ordering even when two events share a wall-clock timestamp.

Across processes the counter resets at startup and is independent per process, so cross-process ordering still relies on the slog `time` field plus your aggregator's clock-skew handling. For a multi-pod deployment where you need a single timeline, sort first by `time`, then by `(component, seq)`.

## JSON-Handler Requirement

The audit logger checks at construction that its underlying slog handler is a `*slog.JSONHandler` (or a recognized wrapper around one). If it is not, a startup `WARN` is emitted:

```text
audit logger initialised with non-JSON slog handler; recommended deployment is format: json — custom handlers may re-introduce log injection
```

The reason: audit field values include user-controlled material — the `userID` from a JWT claim, the `tool` and `agentName` values from request payloads. The standard library's JSON handler escapes those values safely. A text handler, a CSV handler, or an OpenTelemetry Protocol (OTLP)-flattening handler can reopen log injection, so an attacker who controls the `userID` claim could inject newlines or fake fields into your audit stream.

Set `log.format: json` in the component's runtime configuration (or `LOG_FORMAT=json` in the environment) to keep the audit logger on its supported path.

## Where Audit Logs Land

Audit events go to the same slog handler as everything else the component emits. By default that is stderr in JSON format. There is no separate audit file, no separate channel, and no separate level threshold — audit records mingle with operational logs and are filtered downstream by the `logger_name=audit` tag.

Two shipping recipes:

- **Kubernetes.** Scrape pod stdout / stderr with the cluster's log collector (Fluent Bit, Vector, the Datadog Agent, Promtail). No sidecar is required when the collector runs as a DaemonSet — every Agent Mesh pod's slog output is already on the container's stdout. The Helm chart sets `format: json` by default.
- **Bare metal / systemd.** Run the component under systemd and let `journald` collect stderr; ship the journal to your aggregator with `journalctl --output=json` or the `journald` source in Vector.

Retention and immutability are properties of the aggregator, not the runtime. Audit records are not specially stamped, hashed, or sealed by Agent Mesh. If your compliance posture requires write-once retention, configure that on the destination (S3 Object Lock, SmartStore in Splunk with frozen-tier retention, an immutable log index in your security information and event management (SIEM) system).

## Stable Reason Codes

Authentication-event failures carry stable, short reason codes so log queries and alerts stay robust across releases. The HTTP-layer codes are:

| Reason | Emitted when |
|---|---|
| `missing_token` | The request reached an authenticated route with no Agent Mesh access cookie or bearer token. |
| `invalid_token` | A token was present but failed JWT signature, audience, or issuer verification. |
| `expired_token` | The token verified cleanly but its `exp` claim has passed. |
| `oidc_missing_code` | The OIDC callback was hit with no authorization code in the query string. |
| `oidc_state_mismatch` | The OIDC callback `state` did not match the value the entrypoint set at login. |
| `oidc_code_exchange_failed` | The authorization-code exchange against the IdP token endpoint failed. |
| `oidc_userinfo_failed` | The OIDC userinfo lookup against the IdP failed. |
| `oidc_idtoken_verify_failed` | The IdP `id_token` failed JSON Web Key Set (JWKS) verification (signature, `aud`, `iss`, `exp`). |
| `oidc_sam_mint_failed` | The OIDC handshake succeeded but the entrypoint failed to mint the Agent Mesh access token. |
| `oidc_login` | A successful OIDC login (carried on the matching successful authentication record). |
| `logout` | The user invoked the logout endpoint. |

The agent task loop emits its own authentication-failure records with a different reason set, sourced from the authenticator's error message — common values include a missing authentication token, a task-ID binding mismatch, and a call-depth-exceeded rejection. The task-loop reasons are taken directly from the underlying error string and are not as stable as the HTTP-layer codes, so alert on the HTTP codes first.

## Connector Audit Channels

The email connector ships its own audit channel. It uses the same slog pipe with a different schema: every send emits an `email_sent` (`INFO`), `email_blocked` (`WARN`), or `email_failed` (`WARN`) record. These records are tagged `logger_name=email_connector`, not `logger_name=audit`, so they do not appear in `logger_name=audit` queries. When you alert on outbound-mail compliance (volume thresholds, blocked-recipient patterns), match on the connector's `logger_name` tag and the `result` field.

The email-audit channel carries **metadata only** — never the message body or the HTML / plain payload that was sent, and not the recipient addresses or the subject line. Each record carries the connector ID, the agent name, the invoking `userID`, the session, a `recipientCount`, a `hasHTML` flag, the attachment count, a `result` classification, and the send duration; failures add an error type and message. The `result` classification is one of `sent`, `rejected`, `throttled`, or `error` — both `rejected` and `throttled` map to the `email_blocked` record.

## Compliance Posture

The audit pipeline is designed to give you the records a compliance review typically asks for — *who* attempted *what*, *when*, and whether it was allowed — without leaking the bodies that would broaden the data-classification scope.

What you get:

- **Who-did-what records.** Every authenticated request emits an authentication event; every RBAC decision emits a tool, agent, or control-plane access event; every tool invocation emits a tool-execution event. The bounded schema means a SOC 2 access review or a GDPR access request can be answered by querying `userID`.
- **Stable identifiers.** The `taskID` and `sessionID` fields let you correlate audit records with operational logs across the Entrypoint Executor, the Agent-Workflow Executor, the Secure Tool Runtime, and tool boundaries. The `traceID` that operational logs carry end-to-end is not in the audit schema — correlate through `taskID` instead.
- **No PII leakage in tool arguments.** The schema excludes tool arguments and LLM bodies, so a tool call against a customer-PII system (a CRM, a support-ticket system, HR records) emits an audit record naming the tool and the user — not the content of the call.

What is left to your control:

- **Immutability** is a property of the destination store (S3 Object Lock, a SIEM frozen tier, a write-once log index). The runtime does not seal records.
- **Retention** is a property of the destination store; the runtime does not rotate or expire audit records.
- **Access control on the audit stream** is a property of the destination store; the runtime writes to the same slog pipe that operational logs use, and your aggregator decides who can read it.
- **Alerting** is a property of the destination store; useful alert seeds are the authentication-failure rate by `reason`, the tool-access-denied rate by `tool`, and any control-plane-access-denied event.

Agent Mesh does **not** carry a SOC 2 or GDPR attestation as a product. The audit pipeline is one input to your own attestation; the bounded schema, the JSON-handler requirement, and the redaction discipline elsewhere in the runtime (see [Managing Secrets](./secrets-management.md)) are designed to make that attestation possible without runtime modifications.

## What Next?

You have audit emissions flowing, the schema understood, and a shipping path picked. The companion topic is what to do when those records flag a failure — the day-two playbook for broker, agent, persistence, and tool-execution failures is in [Troubleshooting a Running Deployment](./scenario-troubleshooting.md).
