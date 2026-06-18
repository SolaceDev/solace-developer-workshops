---
title: Troubleshoot
description: Common installation failure modes and how to diagnose them.
sidebar_position: 7
---

# Troubleshoot

This page covers deploy-time failures — the deployment never came up cleanly, or fell over on the first task. Day-two failures (a broker drop mid-task, an agent crash after running for hours, an upgrade migration that fails halfway) live on Administering — Scenario troubleshooting. When in doubt: did the system ever work? If yes, the failure is day-two. If no, it is here.

Two preparation steps make every scenario faster:

- **Set `LOG_FORMAT=json` (or `log.format: json`) on every component before the first task.** With JSON logs, a single `traceID` search returns the full causal chain across the Gateway Executor (GWE), the Agent-Workflow Executor (AWE), the Secure Tool Runtime (STR), and tool boundaries. With text logs, you fall back to `grep`. The full operational-log story is on Observability and alerting.
- **Know which `/health` is which.** The gateway proxy's `/health` returns `200 OK` with body `ok` as long as the HTTP listener is up — it is *not* diagnostic. The dedicated workload health server returns the JSON envelope with the failing component name and is the one to point Kubernetes probes at. See Monitor — Health endpoints.

YAML parsing has one important caveat. Solace Agent Mesh does not strict-decode YAML at the file-parse stage: an unknown or misspelled key is silently dropped. A typo on `agent_name` does not surface as "unknown field" — it surfaces later as "missing required `agent_name`". When a value seems to be ignored, the first thing to check is the key spelling.

---

### YAML Parse or Required-Key Validation Failure

**Symptoms** — Workload exits at startup with a parse error or a "missing required key" error. Common forms in the operational log:

```text
reading config file "configs/agent.yaml": no such file or directory
parsing YAML: yaml: line 12: did not find expected key
app_config missing required 'agent_name'
gateway config: 'gateway_id' is required
gateway config: 'namespace' is required
```

**Diagnostic steps** — Read the line and column from the parser error if present. For "missing required" errors, search the file for the named key — a misspelling on `agent_name`, `gateway_id`, or `namespace` is silently dropped during parse and surfaces here as if the key were absent.

**Resolution** — Fix the syntax or add the missing key. Re-run.

**Prevention** — Validate YAML in CI by running `sam-enterprise config plan` (for declarative-config projects) or by booting each app against a CI-only `LOG_FORMAT=text` configuration that fails fast.

---

### Broker Connection Refused at Boot

**Symptoms** — Workload exits early with one of:

```text
solace broker: connect to tcps://broker.example.com:55443: <wrapped error>
connect dev broker: <wrapped error>
broker_url is required when dev_mode is not enabled
```

The dedicated workload health server is unreachable because startup never finished. The wrapped error carries the broker SDK's reason — host not found, connection refused, network unreachable.

**Diagnostic steps** — From the workload host, exercise the broker URL directly:

```bash
nc -zv broker.example.com 55443 || echo "unreachable"
```

If `nc` fails, the workload is hitting a network problem, not a configuration one. Confirm DNS resolves, the egress firewall allows the broker port (`55443` for SMFS, `55555` for SMF), and `${SOLACE_BROKER_URL}` resolved correctly after environment expansion.

**Resolution** — Fix `SOLACE_BROKER_URL` to match the broker's exposed protocol and port. If the broker is reachable but the workload still cannot connect, suspect a network policy between namespaces.

**Prevention** — Run `sam-enterprise doctor` before the first deploy. The broker check exits non-zero with the exact reason when the URL is wrong or unreachable.

For mid-task drops after the broker was previously reachable, see Scenario troubleshooting — Broker connectivity failures.

---

### Broker Authentication Failure at Boot

**Symptoms** — Same `solace broker: connect to <url>: <wrapped error>` envelope, but the wrapped error names authentication or the Message VPN:

```text
solace broker: connect to tcps://broker.example.com:55443: Access denied
solace broker: connect to tcps://broker.example.com:55443: VPN not found
```

**Diagnostic steps** — The host resolves and a TCP connection succeeded, so the network is fine. Check that `SOLACE_BROKER_USERNAME`, `SOLACE_BROKER_PASSWORD`, and `SOLACE_BROKER_VPN` are set in the process environment to values the broker accepts. In Kubernetes, confirm the values in the mounted Secret match what the broker is provisioned for.

**Resolution** — Update the credential or the VPN name and restart every component that holds it.

**Prevention** — Pin broker credentials in a single Kubernetes `Secret` shared across every workload so they cannot drift apart. Rotate via the procedure in Secrets management — rotation procedures.

---

### Broker TLS Failure at Boot

**Symptoms** — The connect error wraps a TLS handshake failure:

```text
solace broker: connect to tcps://broker.example.com:55443: tls: failed to verify certificate: x509: certificate signed by unknown authority
```

Other TLS failures surface as `certificate has expired`, `x509: certificate is not valid for any names`, or `tls: handshake failure`.

**Diagnostic steps** — Confirm the certificate chain the workload sees against what the broker presents:

```bash
openssl s_client -connect broker.example.com:55443 -showcerts < /dev/null
```

Compare the issuer to the trust store the workload is configured to use. On Linux containers, the trust store is typically `/etc/ssl/certs/`; the broker URL `tcps://` and `wss://` scheme pull from `SOLACE_TLS_TRUST_STORE_DIR` or the default Linux trust path.

**Resolution** — Mount the missing CA into the workload's trust store. For a private CA, set `SOLACE_TLS_TRUST_STORE_DIR` to the directory holding the PEM bundle.

**Prevention** — On macOS hosts, set `SOLACE_TLS_TRUST_STORE_DIR` explicitly; the Solace messaging SDK uses OpenSSL, which cannot read the macOS Keychain. The full TLS troubleshooting story is in Administering — TLS.

---

### LLM Provider Authentication Failure at First Call

**Symptoms** — Startup completes, but the first task that calls the LLM fails with:

```text
environment variable OPENAI_API_KEY not set for provider openai
```

(or the equivalent for `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, and so on). The audit record shows a tool-execution failure with the LLM in the path; the LLM narrates the failure to the user.

**Diagnostic steps** — The error names both the missing variable and the provider. Confirm either the YAML `api_key:` field is set or the provider's default environment variable is exported to the process. If the LLM endpoint is OAuth2-protected, confirm `oauth_token_url`, `oauth_client_id`, and `oauth_client_secret` are all three set together — setting only one or two falls back to `api_key` silently.

**Resolution** — Set the missing variable or update the YAML. The change takes effect on the next task; no restart is required for env-var changes only if the workload was launched with the variable present from process start.

**Prevention** — Add the LLM API key to the deploy-time `Secret` along with the broker credentials. Run `sam-enterprise doctor` — when `LLM_SERVICE_ENDPOINT` is set, the doctor probes the endpoint at boot.

---

### Session-Store Database Connection or Migration Failure at Boot

**Symptoms** — Workload exits at startup with one of:

```text
open database: <wrapped error>
run migrations: goose up (table=gateway_goose_version): <wrapped error>
platform migrations: goose up (table=platform_goose_version): <wrapped error>
```

`open database` means the database connection could not be opened — the DSN is malformed, the database is unreachable, or credentials are wrong. `run migrations` means the connection succeeded but a goose migration step failed — most often a permissions issue, an existing schema with conflicting objects, or a partial prior migration.

**Diagnostic steps** — From the workload host, exercise the connection directly. Each service that owns its own database reads a distinct environment variable — `PLATFORM_DATABASE_URL` for the Platform service, `ORCHESTRATOR_DATABASE_URL` for AWE, `WEB_UI_GATEWAY_DATABASE_URL` for GWE. Substitute the one that matches the failing workload:

```bash
psql "${PLATFORM_DATABASE_URL}" -c 'SELECT 1'
```

```bash
sqlite3 /var/lib/agent-mesh/sam.db '.tables'
```

If `SELECT 1` fails, the connection is the problem; fix the DSN or the database availability. If it succeeds and the workload still cannot migrate, the database role lacks the privileges goose needs (create table, create index).

**Resolution** — Restore the database to a known state, grant the migration role the needed permissions, and restart.

**Prevention** — Use a database role with `CREATE` privileges scoped to the migration schema. Back up the database before every upgrade — see Maintenance — backups.

For database failures after a successful boot, see Scenario troubleshooting — Persistence-layer failures.

---

### Port Already in Use

**Symptoms** — Workload exits at startup:

```text
proxy listen :8800: listen tcp :8800: bind: address already in use
health server listen: listen tcp :8090: bind: address already in use
```

Bind retries are not performed. Two GWE replicas sharing a port on the same host, or `fastapi_port` colliding with another service, are fatal at startup.

**Diagnostic steps** — Identify the process holding the port:

```bash
lsof -i :8800
```

```bash
ss -ltnp | grep ':8800'
```

**Resolution** — Stop the conflicting process, or change Agent Mesh's port. The gateway YAML uses `fastapi_port`; the health server uses `--health-addr`. In Kubernetes, two pods sharing a port is not the typical failure — confirm the deployment isn't running `hostNetwork: true` unintentionally.

**Prevention** — For local development with multiple gateways, set `fastapi_port: 0` to let the OS assign a free port. Do not do this in production — pinning the port is what makes ingress routing predictable.

---

### Filesystem Permission Failure on Artifact `base_path`

**Symptoms** — The first artifact write fails with:

```text
create artifact dir: mkdir /var/lib/agent-mesh/artifacts: permission denied
write data: open .../artifact-0001: permission denied
```

Startup succeeds (the directory check is deferred to first write), so the dedicated health server reports healthy. The failure surfaces inside the agent loop as a tool error narrated to the user.

**Diagnostic steps** — From the workload host, confirm the volume mount is writable by the UID the container runs as:

```bash
kubectl exec -it deployment/agent-mesh-awe -- id
kubectl exec -it deployment/agent-mesh-awe -- ls -ld /var/lib/agent-mesh/artifacts
```

**Resolution** — Set the volume's `fsGroup` (or the Kubernetes `securityContext.runAsUser`) to match the directory ownership, or change the directory's mode to be writable by the container UID.

**Prevention** — In Helm values, set `securityContext.fsGroup` to the container's effective UID; the kubelet will chown the mount to that group on attach.

---

### Missing Required Environment Variable (Silent Empty-String Expansion)

**Symptoms** — A workload reports a confusing downstream error: "broker_url is required", "URL is malformed", "environment variable not set", or just an empty value where one was expected. The YAML referenced a `${VAR}` that is unset.

**Diagnostic steps** — The bare form `${VAR}` expands to an empty string when `VAR` is unset — not a startup error, and not a fallback to a default. Inspect the rendered configuration before launch, or grep the workload's stderr for `URL is malformed` and `is required` lines that point at the affected key.

**Resolution** — Export the missing variable, or use one of the explicit forms:

| Form | Behavior |
|---|---|
| `${VAR}` | Value if set (even empty); empty string otherwise. |
| `${VAR, default}` | Value if set (even empty); `default` if `VAR` is unset. |
| `${VAR:-default}` | Value if set and non-empty; `default` otherwise (unset or empty). |
| `${VAR:+alt}` | `alt` if set and non-empty; empty string otherwise. |

**Prevention** — Treat every `${VAR}` placeholder in production YAML as a required variable. Document them in the deployment runbook. The canonical list of secret-bearing variables is on Secrets management — the secret-bearing surfaces.

---

### `app_exec` Binary Not Found or Not Executable

**Symptoms** — `sam run` exits at startup:

```text
spawn /opt/sam/bin/sam-awe-enterprise: no such file or directory
spawn /opt/sam/bin/sam-awe-enterprise: permission denied
```

Or, for STR-side tool binaries:

```text
executable "pptx-tool" not found in /opt/sam/builtin-tools or /opt/sam/builtin-tools/python/bin/
```

**Diagnostic steps** — The error reports the resolved path. Confirm the file exists and is executable:

```bash
ls -l /opt/sam/bin/sam-awe-enterprise
```

In Kubernetes, the path is inside the container image — exec into a running container or use `kubectl debug` to inspect.

**Resolution** — Use an absolute path in `app_exec` matching what is actually in the container image. Do not rely on `$PATH` resolution inside a container that may not have a shell.

**Prevention** — Pin every `app_exec` to an absolute path. For Go-built tool binaries, place them in `/opt/sam/builtin-tools/` (the path the bundled image uses) or set the search path explicitly via the relevant `tool_config` field.

---

### Duplicate `agent_name` or `gateway_id`

**Symptoms** — In a single-process layout (`sam run --embedded` with two app blocks declaring the same name), startup fails with:

```text
instance "my_agent" already exists
instance "my_gateway" already exists
```

Across separate pods, there is no boot-time error. The symptom is different: two AWE pods publishing as the same agent race on the named queue (one wins the message, the other does not); two GWE pods publishing the same gateway ID collide on broker discovery and on the session-key store. Behavior is intermittent and looks like missing messages or wrong-tenant responses.

**Diagnostic steps** — Confirm the names are unique across every workload in the namespace:

```bash
grep -r 'agent_name:' configs/agents/
grep -r 'gateway_id:' configs/gateways/
```

For Kubernetes deployments, two replicas of the same Helm release share their config and therefore share the names — confirm whether the replica count is what you intended.

**Resolution** — Either dedupe the names in YAML, or template the name from a per-pod value such as the pod name. The Downward API and an environment substitution at boot give each replica a unique value:

```yaml
# values.yaml
awe:
  env:
    - name: POD_NAME
      valueFrom:
        fieldRef:
          fieldPath: metadata.name
```

```yaml
# configs/agents/example_agent.yaml
app_config:
  agent_name: "agent-${POD_NAME}"
```

**Prevention** — Treat `agent_name` and `gateway_id` as instance identifiers, not type identifiers. Derive them from the pod name or the Helm release name in production deployments.

---

### Helm Install Failure: Image Pull, Namespace, or Secret

**Symptoms** — `helm install` either fails directly:

```text
Error: namespaces "agent-mesh" not found
```

…or it succeeds but the pods never reach `Ready`. `kubectl describe pod` shows one of:

```text
Failed to pull image "registry.example.com/solace-agent-mesh:1.2.3": authentication required
ImagePullBackOff
ErrImagePull
CreateContainerConfigError: secret "agent-mesh-secrets" not found
```

**Diagnostic steps** — Inspect pod events directly:

```bash
kubectl get events -n agent-mesh --sort-by=.lastTimestamp
kubectl describe pod -n agent-mesh -l app.kubernetes.io/name=agent-mesh
```

Confirm that the namespace exists, the image pull secret exists in the same namespace, and the referenced Secrets and ConfigMaps are all present.

**Resolution** — Create the missing resource, then re-roll the deployment. For image pull failures, attach `imagePullSecrets` to the ServiceAccount the workload uses, or pass the secret name in the chart's `samDeployment.image.imagePullSecret` value.

**Prevention** — Use `helm install --create-namespace` to ensure the namespace exists before resources are applied. Create the pull secret and any referenced configuration Secrets in CI before the chart rolls out, not as part of the chart itself.

---

### Toolset Discovery or Tool Execution Failure

**Symptoms** — A toolset uploaded through the Toolsets page never reaches `ready`. The status dot stays on `pending` and then flips to `failed`, and the toolset detail page shows discovery errors such as:

```text
schema discovery failed: exec: "python/bin/weather": file does not exist
```

Or the toolset reaches `ready` but an agent that uses it surfaces a tool error in chat at invocation time:

```text
Tool get_forecast failed: ModuleNotFoundError: No module named 'requests'
```

**Diagnostic steps** — First separate a discovery failure (the package or its schema is wrong, caught before any call) from a runtime failure (the tool errors during an invocation).

- For a `failed` status, read the discovery errors on the toolset detail page. They name the tool and the reason.
- Confirm the manifest entry point matches what the package actually contains. The most common cause is a `manifest.yaml` `executable:` that points at a path the zip does not have (a typo, or `python/bin/<script>` when the script landed elsewhere).
- Confirm dependencies were vendored into the package. A `ModuleNotFoundError` at runtime means a dependency was not pre-extracted under `python/` — the STR sandbox installs nothing at runtime.
- Confirm the package was built for the deployed STR's architecture. Run `sam toolset build-target --url https://platform.example.com` and compare it against what you packaged for.

**Resolution** — Fix the root cause and re-upload the corrected zip from the toolset detail page:

- Wrong entry point → correct the `executable:` in `manifest.yaml` and re-package.
- Missing dependency → ensure `sam toolset package` ran (it cross-installs dependencies); a hand-built zip must carry already-extracted dependencies, not `.whl` files or a `.venv/`.
- Wrong architecture → re-run `sam toolset package` with `--target` pointed at the platform, or set `SAM_TOOL_TARGET_OS` / `SAM_TOOL_TARGET_ARCH` to match.

A failed re-upload leaves the previous package intact, so a bad fix does not take a working toolset offline.

**Prevention** — Build the package with `sam toolset package` rather than zipping by hand; it produces the correct Lambda-Layer shape and cross-installs dependencies for the target. Test the tool locally with `sam run --embedded` before uploading, and verify the entry point responds to `--schema`. See Building → Toolsets.

---

### Skill Discovery or Activation Failure

**Symptoms** — A skill uploaded through the Skills page never reaches `ready` and the detail page shows a discovery error, or the skill is `ready` but the agent never loads it during a conversation.

**Diagnostic steps** — Separate a discovery failure (the bundle is malformed) from an activation problem (the agent never decides to load the skill).

- For a `failed` status, read the discovery errors on the skill detail page. A skill needs a `SKILL.md` with at least a `name` and `description`; a bundle missing `SKILL.md` at its root will not discover.
- If a bundled tool is missing, the usual causes are a `tools/manifest.yaml` entry that points nowhere or a skipped `sam skill package` step (it cross-compiles Go tools for the deployed STR architecture).
- If the skill is `ready` but the agent never loads it, confirm the skill name is in the agent's configured skill list — the agent only accepts skills it is attached to (`skillRefs` for built-in/filesystem skills, `skillIds` for custom skills). A skill that is not attached is never offered to the LLM.
- If the agent is attached but still does not load the skill, the `description` is likely too vague. The LLM decides to call `load_skill` based on the description text — make it state plainly when the skill applies.

**Resolution** — Fix the bundle or the attachment and re-upload the corrected zip from the skill detail page. To improve activation, sharpen the `description` so it names the user-visible problem the skill solves, then re-upload.

**Prevention** — Keep `SKILL.md` descriptions specific and task-oriented. Build bundles with `sam skill package` so any bundled tools match the deployed STR. Verify the agent is attached to the skill before testing. See Building → Skills.

---

## What Next?

The deployment is up and the immediate failure is resolved. Day-two operational failures — broker drops after a successful boot, persistence outages mid-task, tool execution failures, upgrade migrations that fail halfway — are on Scenario troubleshooting.
