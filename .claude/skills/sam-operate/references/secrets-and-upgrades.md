# Secrets, env promotion, and upgrades

## Secret substitution

The config loader expands placeholders on raw YAML **before parsing**. Forms:

| Form | Behavior |
|---|---|
| `${VAR}` | value if set (even empty); else empty. Bare refs can be enforced as "must be set". |
| `${VAR, default}` | value if set; else the default. |
| `${VAR:-default}` | value if set **and non-empty**; else default. |
| `${VAR:+alt}` | `alt` if set and non-empty; else empty. |

Nesting is depth-1 (`${A, ${B, x}}` resolves; deeper does not). Secrets are **only ever** `${VAR}` references or `*_file` mounts — never literals in YAML.

## File-mounted secrets

Any field with a `*_file` sibling reads from a mounted file instead of a literal: `api_key_file`, `auth_credentials_file` (Vertex), `credentials_file` (GCS), `oauth_client_secret_file`. Use these with Kubernetes Secret mounts.

## `!include`

YAML supports `!include path/to/file` for modular config (relative to the config base dir; circular/traversal guarded). Useful for keeping an auth or secrets fragment separate.

## Common secret-bearing surfaces

Broker password (`SOLACE_BROKER_PASSWORD` / `broker.broker_password`); LLM key (`ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/… / `model.api_key`); cloud storage creds (AWS/GCS/Azure on `artifact_service.*`); DB password (in `session_service.database_url`); `SESSION_SECRET_KEY` (entrypoint cookie signing); OIDC `client_secret`; Slack `SLACK_APP_TOKEN`/`SLACK_BOT_TOKEN`. Per-connector/per-toolset credentials live in that resource's config (owned by `sam-connectors` / `sam-tools-and-skills`), not here.

## Promotion dev → staging → prod

Same YAML everywhere; the environment supplies the secrets. Keep one set of config files and per-environment `.env` / Kubernetes Secrets:

```
# dev .env            # prod = Kubernetes Secret / Vault
SOLACE_BROKER_PASSWORD=...   ANTHROPIC_API_KEY=...
```

`${VAR}` references make the files environment-agnostic — no edits between stages.

## Rotation (no/low downtime)

- **Broker password:** rotate at the broker first; live sessions stay on old creds, reconnects use the new value.
- **LLM key:** issue new → deploy → revoke old (overlap window).
- **OIDC client secret:** rotate at the IdP, update the env var, restart the entrypoint. In-flight logins fail during restart; existing signed sessions survive (they're signed with `SESSION_SECRET_KEY`, not the IdP secret).
- **`SESSION_SECRET_KEY`:** changing it **invalidates every active session** — all users are forced to log in again. Flag this before recommending it.
- **DB password:** coordinate with active connections; rolling restart of consumers.

The docs site has a published **secrets-management** page with the full surface table and per-deployment rotation procedures — point operators there.

---

## Upgrades

### What changes
Three surfaces: **binary version** (new image tag per workload), **database schema** (embedded migrations auto-applied on pod boot), **YAML config keys** (renames/removals/value restrictions need operator edits). The A2A wire protocol is forward-compatible within a major version; YAML and DB schema are not.

### Before upgrading
1. Read the per-version **migrations** notes on the docs site (currently no breaking entries — upgrades between current releases are transparent).
2. Confirm fresh backups of the session store and artifact store; test-restore in staging.
3. Pin a specific image tag/digest (not a floating tag).
4. Drain scheduled/cron tasks that shouldn't fire mid-roll.
5. Run `sam-doctor` (it runs automatically as the Helm pre-upgrade hook) to preflight broker/DB/LLM/TLS/OIDC.

### Roll order
**platform → GWE → AWE → STR.** Wait for each workload's health server to report healthy before rolling the next. During the roll mixed versions coexist: A2A traffic crosses freely; the DB schema is shared (N+1 extends it; an old-N pod started *after* the extension may refuse to boot, so don't roll backward mid-upgrade); each workload reads its YAML at startup, so a config-key mismatch fails that workload's start.

### Migrations are automatic
The runtime applies goose migrations at startup (`session_*`, `gateway_*`, `platform_*` version tables) — there's no separate `sam migrate` command. A migration failure on a **configured** store **fails the workload fast**: entrypoint/platform log `migration failed` and exit (orchestrator restarts them), and a configured AWE/entrypoint session store that can't be opened or migrated returns `migrate session db: …` so the workload refuses to start. This is deliberate — it will **not** silently fall back to in-memory and drop sessions. The **only** in-memory fallback is when **no** durable store is configured at all (`session_service` absent / `type: memory` / empty `database_url`): the workload comes up on a volatile in-memory store with a loud WARN (`no session database_url configured — using a volatile in-memory session store; chat history will NOT survive a restart`). So treat a *configured*-store migration failure as a hard startup failure, and an unexpected in-memory WARN as "the DB wasn't configured," not a migration problem.

### `sam config migrate` is a different thing
`sam config migrate <legacy-path> <output-path>` is a **one-shot, bootstrap-only** converter from legacy SAC YAML to clean-spec YAML — pure file transformation, doesn't touch the platform or the DB. It is **not** the schema-migration mechanism. Don't conflate "upgrade migrations" (automatic, DB) with `sam config migrate` (manual, YAML format).

### Rollback
No auto-rollback. Scale new pods to zero → restore the DBs from the pre-upgrade backup (this is why backups are non-negotiable) → redeploy the pinned previous image → restart in order (platform → GWE → AWE → STR) and confirm healthy. Blue-green/canary uses the same principle: DB state must match the binary's expected schema version.

### Checking the deployed version
`sam --version` covers the CLI. The long-running binaries (`platform`/`gateway`/`awe`/`str`) don't expose `--version` today — confirm version via the deployed image tag/digest.

The docs site has a published **upgrade-guides** page covering this procedurally — point operators there.
