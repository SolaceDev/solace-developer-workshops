# Connector credentials & security

## The shared-credential model (lead with this)

One connector = one set of credentials = **identical access for every agent attached to it**. SAM cannot restrict which queries or calls an agent makes through a connector — access control lives at the external system:

- SQL: a dedicated **read-only** DB user, granted only the schemas/tables the agents should see.
- API keys: scoped to the operations needed; use `allow_list` to narrow the exposed operations besides.
- Slack: minimal bot scopes (`chat:write` and only what's needed); the bot posts as the same identity for every agent.
- AWS types (Bedrock, DynamoDB, Neptune, OpenSearch): a minimal IAM policy (e.g. just `bedrock:Retrieve` on the one KB); prefer `iam` role chaining over long-lived access keys when SAM runs on AWS, with `external_id` for cross-account.

If two groups of agents need different access levels, create **two connectors** with different credentials — that is the supported isolation mechanism.

## Secrets hygiene in the session

- A credential pasted into chat is **exposed**: say so once, advise rotating it after setup, and never repeat the literal value — not in YAML, not in an `export` line, not in a recap. Identifying *which* credential by a short redacted prefix (`ak_live_…`) is fine; the full value never reappears. Refer to it as `${VAR}` from then on.
- Secret-typed fields (passwords, tokens, keys) are write-only in practice: the UI masks them after save, and `sam config pull` exports them as `${VAR}` environment-variable placeholders. Values are supplied via the environment at apply time.
- Never invent a secrets-handling mechanism (vault syntax, k8s secret refs) the product doesn't have — the supported pattern is `${VAR}` substitution.

## Connection probes

Today **only the Bedrock knowledge base probes the connection at create/update** — a failed probe blocks the save and reports why (treat it as a reachability/credentials diagnosis, not a reason to retry blindly). **Every other type saves without any connection check.** So "it saved" ≠ "it works": verify by asking an attached agent to use the tool, and remember the connection happens from where the SAM agents run — that host needs network reach to the database/API/server, which is the most common first failure.

## Who can manage connectors

Connector CRUD is RBAC-gated (`connector:_:create` to create; `connector:*:read`/`:update`/`:delete` to manage — per-instance `connector:<name>:…` is accepted by the matcher but not yet enforced; `connector:*:*` is a valid wildcard grant) — if a user can't see or create connectors in the UI, that's a role/scope question for `sam-operate`, not a missing feature. A connector attachment can also carry per-instance scopes restricting which callers may invoke its tool — key names via `sam-declarative-config`.

## Change blast radius

Updating or deleting a connector **redeploys every attached agent**. Before editing shared credentials in production: check the connector's agent count (shown in the UI), schedule accordingly, and prefer creating a second connector + migrating agents when the change is risky.
