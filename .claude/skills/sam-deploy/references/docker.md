# Docker on one VM (secondary path)

Legitimate for a small team on a single VM; the trade is no HA/scaling and a manual upgrade story. If the instance matters to the org, steer to Helm ([helm-cloud.md](helm-cloud.md)).

## Supported shapes — and what NOT to invent

**There is no official docker-compose file.** Do not fabricate one with guessed entrypoints. The product image (registry reference + pull credentials from the product portal, same as the charts) supports two shapes:

1. **All-in-one container (embedded mode)** — the image's default entrypoint runs the full stack (gateway, agents, tools, platform) in one process with baked-in configs. Simplest team setup. Storage defaults are container-local — mount volumes for the database/artifact paths or the instance loses state on recreate.
2. **Per-binary containers** — the image also carries the standalone component binaries (gateway, agent executor, tool runtime, platform), one container each, against an **external Solace broker** and Postgres. This mirrors the Kubernetes topology; if you're going this far, Helm on a small cluster is usually less work.

The deployment-options documentation that ships with the product covers both layouts — defer to it for port mappings and per-component env rather than reconstructing them.

## What must be configured regardless

- **Auth**: enable OIDC for anything team-facing (without it, every user is effectively admin). Keycloak in a sidecar container works when no corporate IdP exists.
- **TLS in front**: nginx/Caddy/Traefik on the VM terminating TLS in front of the gateway port — it serves the team over the network and streams SSE (mind proxy idle timeouts).
- **Secrets**: LLM keys etc. via env / `--env-file`, never baked into config files or images.
- **State & backups**: the database and artifact volumes are the instance's state — volume-mount and back them up.
- **Pre-flight**: the image ships the `sam doctor` diagnostics — run it inside the container against your env before first start to catch broker/LLM/DB/TLS issues early.

Content authoring and promotion work exactly as on Helm: `sam config pull/plan/apply` (→ `sam-declarative-config`).
