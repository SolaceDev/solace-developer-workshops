---
title: Troubleshooting Your Installation
description: Common installation and startup failure modes, how to diagnose them, and how to prevent them.
sidebar_position: 380
---

# Troubleshooting Your Installation

This page covers deploy-time failures: the deployment never came up cleanly, or it fell over on the first task. Day-two failures, such as an event broker drop mid-task, an agent crash after running for hours, or an upgrade migration that fails halfway, are covered in [Troubleshooting a Running Deployment](../administering/scenario-troubleshooting.md). When in doubt, ask whether the system ever worked. If it did, the failure is a day-two failure. If it did not, the failure belongs here.

Two preparation steps make every scenario faster to diagnose:

- Set `LOG_FORMAT=json` (or `log.format: json`) on every component before the first task. With JSON logs, a single `traceID` search returns the full causal chain across the Entrypoint Executor, the Agent-Workflow Executor, the Secure Tool Runtime, and tool boundaries. With text logs, you fall back to `grep`. For more information about the operational-log setup, see [Monitoring Your Agent Mesh](../administering/observability.md).
- Know which `/health` endpoint is which. The entrypoint proxy `/health` endpoint returns `200 OK` with a JSON body (`{"status":"A2A Web UI Backend is running"}`) as long as the HTTP listener is up, so it is not diagnostic. The dedicated workload health server returns a JSON envelope with the failing component name, and it is the endpoint to point Kubernetes probes at. For more information, see [Monitoring Your Deployment](./monitor.md).

:::warning
Agent Mesh does not strict-decode YAML at the file-parse stage, so an unknown or misspelled key is silently dropped. A typo on `agent_name` does not appear as an "unknown field" error. It appears later as a "missing required `agent_name`" error. When a value seems to be ignored, check the key spelling first.
:::

## Agent Mesh Does Not Start

The following scenarios cause a workload to exit during startup or on its first task.

### YAML Parse or Required-Key Validation Failure

The workload exits at startup with a parse error or a "missing required key" error. Common forms in the operational log include:

```text
reading config file "configs/agent.yaml": no such file or directory
parsing YAML: yaml: line 12: did not find expected key
app_config missing required 'agent_name'
gateway config: 'gateway_id' is required
gateway config: 'namespace' is required
```

- Read the line and column from the parser error if the error includes them. For a "missing required" error, search the file for the named key. A misspelling on `agent_name`, `gateway_id`, or `namespace` is silently dropped during parse and appears here as if the key were absent.
- Fix the syntax or add the missing key, then re-run.
- To prevent this failure, validate YAML in your continuous integration (CI) pipeline. Run `sam config plan` for projects managed as declarative configuration, or boot each app against a CI-only configuration that fails fast.

### LLM Provider Authentication Failure at First Call

Startup completes, but the first task that calls the large language model (LLM) fails with an error such as:

```text
environment variable OPENAI_API_KEY not set for provider openai
```

The same failure appears for other providers such as `ANTHROPIC_API_KEY` or `GROQ_API_KEY`. The audit record shows a tool-execution failure with the LLM in the path, and the LLM narrates the failure to the user.

- Read the error message. It names both the missing variable and the provider. Confirm that either the YAML `api_key:` field is set or the provider default environment variable is exported to the process.
- If the LLM endpoint is protected by OAuth 2.0, confirm that `oauth_token_url`, `oauth_client_id`, and `oauth_client_secret` are all set together. Setting only one or two of them falls back to `api_key` silently.
- Set the missing variable or update the YAML. The change takes effect on the next task. No restart is required for an environment-variable change if the workload was launched with the variable present from process start.
- To prevent this failure, add the LLM API key to the deploy-time secret alongside the event broker credentials. Run `sam doctor` before the first deploy. When `LLM_SERVICE_ENDPOINT` is set, the doctor probes the endpoint at boot.

### Port Already in Use

The workload exits at startup with an error such as:

```text
proxy listen :8800: listen tcp :8800: bind: address already in use
management server listen: listen tcp :8090: bind: address already in use
```

Agent Mesh does not retry the bind. Two replicas of the Entrypoint Executor that share a port on the same host, or a `fastapi_port` value that collides with another service, are fatal at startup.

- Identify the process that holds the port:

  ```bash
  lsof -i :8800
  ```

  ```bash
  ss -ltnp | grep ':8800'
  ```

- Stop the conflicting process, or change the Agent Mesh port. The entrypoint YAML uses `fastapi_port`, and the management server uses the `--health-addr` flag. In Kubernetes, each pod has its own network namespace, so a port collision between pods is not the typical failure.
- To prevent this failure in local development with multiple entrypoints, set `fastapi_port: 0` to let the operating system assign a free port.

:::warning
Do not set `fastapi_port: 0` in production. Pinning the port is what makes ingress routing predictable.
:::

### Missing Required Environment Variable

A workload reports a confusing downstream error, such as "broker_url is required", "URL is malformed", or "environment variable not set", or it reports an empty value where one was expected. The YAML referenced a `${VAR}` placeholder that is unset.

- The bare form `${VAR}` expands to an empty string when `VAR` is unset. An empty expansion is not a startup error, and it is not a fallback to a default. Inspect the rendered configuration before launch, or search the workload stderr for the "URL is malformed" and "is required" lines that point at the affected key.
- Export the missing variable, or use one of the explicit substitution forms:

  | Form | Behavior |
  |---|---|
  | `${VAR}` | Value if set, even if empty. Empty string otherwise. |
  | `${VAR, default}` | Value if set, even if empty. `default` if `VAR` is unset. |
  | `${VAR:-default}` | Value if set and non-empty. `default` if the variable is unset or empty. |
  | `${VAR:+alt}` | `alt` if set and non-empty. Empty string otherwise. |

- To prevent this failure, treat every `${VAR}` placeholder in production YAML as a required variable and document each one in the deployment runbook. For the list of secret-bearing variables, see [Managing Secrets](../administering/secrets-management.md).

### The Tool Binary Is Not Found or Not Executable

A workload exits at startup with an error such as:

```text
spawn /opt/sam/bin/sam-awe: no such file or directory
spawn /opt/sam/bin/sam-awe: permission denied
```

For tool binaries that run in the Secure Tool Runtime, the error takes this form:

```text
executable "pptx-tool" not found in /opt/sam/builtin-tools or /opt/sam/builtin-tools/python/bin/
```

- Read the resolved path in the error. Confirm that the file exists and is executable:

  ```bash
  ls -l /opt/sam/bin/sam-awe
  ```

  In Kubernetes, the path is inside the container image. Exec into a running container or use `kubectl debug` to inspect it.
- Use an absolute path in `app_exec` that matches what is in the container image. Do not rely on `$PATH` resolution inside a container that may not have a shell.
- To prevent this failure, pin every `app_exec` value to an absolute path. For Go-built tool binaries, place them in `/opt/sam/builtin-tools/`, the path the bundled image uses, or set the search path explicitly through the relevant `tool_config` field.

### Duplicate Agent Name or Entrypoint ID

When two app blocks declare the same name, startup fails with an error such as:

```text
instance "my_agent" already exists
instance "my_gateway" already exists
```

- Confirm that every agent and entrypoint declares a unique name:

  ```bash
  grep -r 'agent_name:' configs/agents/
  grep -r 'gateway_id:' configs/gateways/
  ```

- Deduplicate the names in your configuration so that each agent has a unique `agent_name` and each entrypoint a unique `gateway_id`, then re-run.
- Treat `agent_name` and `gateway_id` as unique instance identifiers rather than shared type identifiers, so that no two workloads reuse a name.

## Cannot Connect to the Event Broker

The following scenarios cause a workload to fail before startup finishes because it cannot reach or authenticate to the event broker. In each case the dedicated workload health server is unreachable, because startup never finished. These scenarios do not apply to the desktop bundle, which runs an embedded event broker.

### Event Broker Connection Refused at Boot

The workload exits early with one of the following errors:

```text
solace broker: connect to tcps://broker.example.com:55443: <wrapped error>
connect dev broker: <wrapped error>
broker_url is required when dev_mode is not enabled
```

The wrapped error carries the reason from the event broker software development kit (SDK), such as host not found, connection refused, or network unreachable.

- From the workload host, exercise the event broker URL directly:

  ```bash
  nc -zv broker.example.com 55443 || echo "unreachable"
  ```

  If `nc` fails, the workload has a network problem, not a configuration one. Confirm that domain name system (DNS) resolves, that the egress firewall allows the event broker port (`55443` for Solace Message Format (SMF) over TLS, `55555` for plaintext SMF), and that `${SOLACE_BROKER_URL}` resolved correctly after environment expansion.
- Fix `SOLACE_BROKER_URL` to match the exposed protocol and port of the event broker. If the event broker is reachable but the workload still cannot connect, suspect a network policy between namespaces.
- To prevent this failure, run `sam doctor` before the first deploy. The event broker check exits with a non-zero status and the exact reason when the URL is wrong or unreachable.

For a mid-task drop after the event broker was previously reachable, see [Troubleshooting a Running Deployment](../administering/scenario-troubleshooting.md).

### Event Broker Authentication Failure at Boot

The workload exits with the same `solace broker: connect to <url>: <wrapped error>` envelope, but the wrapped error names authentication or the Message VPN:

```text
solace broker: connect to tcps://broker.example.com:55443: Access denied
solace broker: connect to tcps://broker.example.com:55443: VPN not found
```

- The host resolves and a TCP connection succeeded, so the network is not the problem. Confirm that `SOLACE_BROKER_USERNAME`, `SOLACE_BROKER_PASSWORD`, and `SOLACE_BROKER_VPN` are set in the process environment to values the event broker accepts. In Kubernetes, confirm that the values in the mounted Secret match what the event broker is provisioned for.
- Update the credential or the VPN name, then restart every component that holds it.
- To prevent this failure, pin the event broker credentials in a single Kubernetes Secret shared across every workload so they cannot drift apart. For more information about rotation, see [Managing Secrets](../administering/secrets-management.md).

### Event Broker TLS Failure at Boot

The connect error wraps a Transport Layer Security (TLS) handshake failure:

```text
solace broker: connect to tcps://broker.example.com:55443: tls: failed to verify certificate: x509: certificate signed by unknown authority
```

Other TLS failures appear as `certificate has expired`, `x509: certificate is not valid for any names`, or `tls: handshake failure`.

- Confirm the certificate chain the workload sees against what the event broker presents:

  ```bash
  openssl s_client -connect broker.example.com:55443 -showcerts < /dev/null
  ```

  Compare the issuer to the trust store the workload is configured to use. On Linux containers, the trust store is typically `/etc/ssl/certs/`. The `tcps://` and `wss://` event broker URL schemes pull from `SOLACE_TLS_TRUST_STORE_DIR` or the default Linux trust path.
- Mount the missing certificate authority (CA) into the workload trust store. For a private CA, set `SOLACE_TLS_TRUST_STORE_DIR` to the directory that holds the PEM bundle.
- On macOS hosts, set `SOLACE_TLS_TRUST_STORE_DIR` explicitly. The Solace messaging SDK uses OpenSSL, which cannot read the macOS Keychain. For more information about the full TLS setup, see [Configuring TLS](../administering/tls.md).

## Session-Store Database Fails at Boot

The workload exits at startup with one of the following errors:

```text
open database: <wrapped error>
run migrations: goose up (table=gateway_goose_version): <wrapped error>
platform migrations: goose up (table=platform_goose_version): <wrapped error>
```

An `open database` error means the database connection could not be opened, because the data source name (DSN) is malformed, the database is unreachable, or the credentials are wrong. A `run migrations` error means the connection succeeded but a migration step failed, most often because of a permissions issue, an existing schema with conflicting objects, or a partial prior migration.

- From the workload host, exercise the connection directly. Each service that owns its own database reads a distinct environment variable: `PLATFORM_DATABASE_URL` for the Platform service, `DATABASE_URL` for the Agent-Workflow Executor, and `WEB_UI_GATEWAY_DATABASE_URL` for the Entrypoint Executor. Substitute the one that matches the failing workload:

  ```bash
  psql "${PLATFORM_DATABASE_URL}" -c 'SELECT 1'
  ```

  ```bash
  sqlite3 /var/lib/agent-mesh/sam.db '.tables'
  ```

  If `SELECT 1` fails, the connection is the problem. Fix the DSN or the database availability. If it succeeds and the workload still cannot migrate, the database role lacks the privileges the migrations need to create tables and indexes.
- Restore the database to a known state, grant the migration role the needed permissions, and restart.
- To prevent this failure, use a database role with `CREATE` privileges scoped to the migration schema. Back up the database before every upgrade. For more information, see [Managing Backups and Data Retention](../administering/backups-and-data-retention.md).

For a database failure after a successful boot, see [Troubleshooting a Running Deployment](../administering/scenario-troubleshooting.md).

## Filesystem Permission Failure on the Artifact Path

The first artifact write fails with an error such as:

```text
create artifact dir: mkdir /var/lib/agent-mesh/artifacts: permission denied
write data: open .../artifact-0001: permission denied
```

:::warning
Startup succeeds because the directory check is deferred to the first write, so the dedicated health server reports healthy. The failure appears inside the agent loop as a tool error narrated to the user.
:::

- From the workload host, confirm that the volume mount is writable by the user ID (UID) the container runs as:

  ```bash
  kubectl exec -it deployment/agent-mesh-awe -- id
  kubectl exec -it deployment/agent-mesh-awe -- ls -ld /var/lib/agent-mesh/artifacts
  ```

- Set the `fsGroup` value of the volume, or the Kubernetes `securityContext.runAsUser` value, to match the directory ownership. Alternatively, change the directory mode so the container UID can write to it.
- To prevent this failure, set `securityContext.fsGroup` in your Helm values to the effective UID of the container. The kubelet chowns the mount to that group on attach.

## Toolset Discovery or Tool Execution Failure

A toolset uploaded through the Toolsets page never reaches `ready`. The status indicator stays on `pending` and then changes to `failed`, and the toolset detail page shows a discovery error such as:

```text
schema discovery failed for weather: fork/exec python/bin/weather: no such file or directory
```

Alternatively, the toolset reaches `ready`, but an agent that uses it reports a tool error in chat at invocation time:

```text
Tool get_forecast failed: ModuleNotFoundError: No module named 'requests'
```

- First separate a discovery failure (the package or its schema is wrong and the error is caught before any call) from a runtime failure (the tool errors during an invocation).
- For a `failed` status, read the discovery errors on the toolset detail page. They name the tool and the reason.
- Confirm that the manifest entry point matches what the package actually contains. The most common cause is an `executable:` value in `manifest.yaml` that points at a path the archive does not contain: either a typo or a `python/bin/<script>` reference used after the script landed elsewhere.
- Confirm that dependencies were vendored into the package. A `ModuleNotFoundError` at runtime means a dependency was not pre-extracted under `python/`. The sandbox installs nothing at runtime.
- Confirm that the package was built for the architecture of the deployed Secure Tool Runtime. Run `sam toolset build-target --url https://platform.example.com` and compare the result against what you packaged for.

To resolve the failure, fix the root cause and re-upload the corrected archive from the toolset detail page:

- For a wrong entry point, correct the `executable:` value in `manifest.yaml` and re-package.
- For a missing dependency, run `sam toolset package`, which cross-installs dependencies. A hand-built archive must carry already-extracted dependencies, not `.whl` files or a `.venv/` directory.
- For a wrong architecture, re-run `sam toolset package` with `--target` pointed at the platform, or set `SAM_TOOL_TARGET_OS` and `SAM_TOOL_TARGET_ARCH` to match.

To prevent this failure, build the package with `sam toolset package` rather than compressing it by hand. The command produces the correct Lambda-Layer form and cross-installs dependencies for the target. Verify that the entry point responds to `--schema` before uploading. For more information, see [Creating Toolsets](../building/toolsets.md).

:::note
A failed re-upload leaves the previous package intact, so a bad fix does not take a working toolset offline.
:::

## Skill Discovery or Activation Failure

A skill uploaded through the Skills page never reaches `ready` and the detail page shows a discovery error, or the skill is `ready` but the agent never loads it during a conversation.

- Separate a discovery failure, where the bundle is malformed, from an activation problem, where the agent never loads the skill.
- For a `failed` status, read the discovery errors on the skill detail page. A skill needs a `SKILL.md` file with at least a `name` and a `description`. A bundle that is missing `SKILL.md` at its root does not discover.
- If a bundled tool is missing, the usual causes are a `tools/manifest.yaml` entry that points nowhere, or a skipped `sam skill package` step, which cross-compiles Go tools for the architecture of the deployed Secure Tool Runtime.
- If the skill is `ready` but the agent never loads it, confirm that the skill name is in the configured skill list of the agent. The agent only accepts skills it is attached to: `skillRefs` for built-in and filesystem skills, and `skillIds` for custom skills. A skill that is not attached is never offered to the LLM.
- If the agent is attached but still does not load the skill, the `description` is likely too vague. The LLM calls `load_skill` based on the description text, so make the description state plainly when the skill applies.

To resolve the failure, fix the bundle or the attachment and re-upload the corrected archive from the skill detail page. To improve activation, sharpen the `description` so it names the user-visible problem the skill solves, then re-upload.

To prevent this failure, keep `SKILL.md` descriptions specific and task-oriented. Build bundles with `sam skill package` so any bundled tools match the deployed Secure Tool Runtime. Verify that the agent is attached to the skill before testing. For more information, see [Creating Skills](../building/skills.md).

## The Agent Mesh UI Does Not Load

Navigating to the Agent Mesh UI at a URL such as `http://localhost:8800` returns a connection-refused error or a blank page.

- Confirm that Agent Mesh is running and the health endpoint is responding:

  ```bash
  curl -fsS http://localhost:8800/health
  ```

  If the health check fails, Agent Mesh is not running or is not bound to the expected port.
- Verify the `gateway_id` and `fastapi_port` fields in your entrypoint configuration file.
- For a Kubernetes deployment, confirm that the port-forward command is running and targeting the correct service and port. For more information, see [The Port-Forward Command Fails](#the-port-forward-command-fails).

## Kubernetes Installation Issues

The following issues are specific to Helm-based Kubernetes deployments. For the deployment steps these issues relate to, see [Deploying with Kubernetes](./kubernetes/index.md).

The commands in this section use `<sam-namespace>` for the namespace you installed into and `<release>` for the Helm release name you gave in `helm install`. Find both with `helm list --all-namespaces`.

### The Pre-Install Check Fails

The `helm install` command returns an error before any workload pods are created. The chart runs a diagnostic job named `<release>-solace-agent-mesh-sam-doctor` as a pre-install hook, before it creates any workload pods, and that job failed a check such as insufficient cluster resources or a missing referenced Secret, ConfigMap, or StorageClass.

To resolve this issue, view the diagnostic job logs to see which check failed. The job pod is retained on failure:

```bash
kubectl logs -n <sam-namespace> job/<release>-solace-agent-mesh-sam-doctor
```

Resolve the reported problem, then run `helm install` again.

### Pods Stay in Pending or ImagePullBackOff

One or more pods remain in `Pending` or `ImagePullBackOff` status after the install completes. An `ImagePullBackOff` status indicates that the cluster cannot pull the container images, usually because the image pull credentials are missing or incorrect. A `Pending` status indicates that the node does not have enough allocatable CPU or memory to schedule the pod.

To resolve this issue, check pod status and the events that explain the failure:

```bash
kubectl get pods -n <sam-namespace>
kubectl describe pod <pod-name> -n <sam-namespace>
```

The `Events` section at the end of the `kubectl describe pod` output names the specific cause.

- For an image pull error, confirm that you passed `--set-file global.imagePullKey=sam-pull-credentials.json` and that the file is valid `dockerconfigjson`. In `kubectl describe pod`, this error appears as `ErrImagePull` or a `CreateContainerConfigError` that names a missing Secret.
- For a scheduling error such as `Insufficient cpu` or `Insufficient memory`, increase the resources allocated to your cluster. For example, with Colima:

  ```bash
  colima stop && colima start --cpu 10 --memory 16 --disk 100
  ```

  For sizing guidance, see [Compute Resources](./kubernetes/compute-resources.md).

### The Port-Forward Command Fails

The `kubectl port-forward` command exits with an error, or the Agent Mesh UI does not respond on `http://localhost:8080`. The Entrypoint Executor pod is not yet `Running`, the service name is incorrect, or the local port is already in use.

To resolve this issue:

- Confirm that every pod is `Running`: `kubectl get pods -n <sam-namespace>`.
- Confirm that the service exists and note its exact name: `kubectl get svc -n <sam-namespace>`. The Web UI entrypoint service follows the pattern `<release>-solace-agent-mesh-gwe`.
- Confirm that no other process is using port 8080 on your machine, or forward a different local port, such as `8081:80`.

### The Agent Mesh UI Loads as a Blank Page

The Agent Mesh UI loads as a blank page, and the browser developer tools Network tab shows 404 errors for `.js` or `.css` files. The browser is serving cached assets from an earlier installation, which is common after a reinstall.

To resolve this issue, open the Agent Mesh UI in a private or incognito window, or perform a hard refresh to bypass the cache.

### Local Kubernetes Clusters

The following issues affect local Kubernetes clusters on Apple Silicon with rootless Podman, or on minikube. Cloud-managed Kubernetes services are not affected.

#### The Open-File Limit Is Too Low (Rootless Podman)

Rootless Podman caps the `nofile` limit at 524,288, which is below the 1,048,576 minimum the event broker requires to start. For more information about this requirement, see [Solace event broker open-file requirements](https://docs.solace.com/Software-Broker/System-Resource-Requirements.htm#concurrent-open-files-considerations).

:::warning[Silent Event Broker Failure]
With the `nofile` limit too low, the event broker pod can start and then fail silently, so the deployment appears healthy while the event broker is not usable. Raise the limit before you install.
:::

Raise the limit in both `containers.conf` and a systemd override inside the Podman virtual machine:

1. Edit `~/.config/containers/containers.conf`:

   ```ini
   [containers]
   default_ulimits = ["nofile=1048576:1048576"]
   ```

2. Open a shell in the Podman machine with `podman machine ssh`, then create a systemd drop-in:

   ```bash
   sudo mkdir -p /etc/systemd/system/user@.service.d
   sudo tee /etc/systemd/system/user@.service.d/nofile.conf <<EOF
   [Service]
   LimitNOFILE=1048576
   EOF
   sudo systemctl daemon-reload
   ```

3. Restart the Podman machine:

   ```bash
   podman machine stop && podman machine start
   ```

#### DNS Resolution Fails Between Pods (Minikube Default CNI)

The default minikube container network interface (CNI) breaks pod-to-pod DNS resolution on this stack. Start minikube with the Calico CNI instead:

```bash
minikube start --cni=calico <other-flags>
```

For more information, see [minikube issue #18978](https://github.com/kubernetes/minikube/issues/18978).

## Monitoring and Observability Issues

The following issues cover monitoring and observability. For more information about verifying health endpoints and logs, see [Monitoring Your Deployment](./monitor.md). For more information about enabling metrics and OpenTelemetry Protocol (OTLP) export, see [Monitoring Your Agent Mesh](../administering/observability.md).

### A Prometheus Scrape Returns No Data

The scrape returns no data, and a direct request to `/metrics` returns `404 Not Found` or an empty body. Metrics are off by default until you enable them. A scrape job pointed at the request-path port rather than the management port is the other common cause.

To resolve this issue:

- Confirm the component has `management_server.observability.enabled: true` set. Metrics stay off until you enable them.
- Point the scrape job at the workload's management port, the same listener as the `/health` and `/ready` probes, not the request-path port. For the Entrypoint Executor, that is port 9090.

### The OTLP Exporter Ships No Data

You configured an exporter, but the aggregator receives no metrics or logs. Agent Mesh reads OTLP destinations only from `management_server.exporters` in YAML, so setting `OTEL_EXPORTER_OTLP_ENDPOINT` alone creates no exporter. A per-entry validation failure also drops a destination: the runtime logs the failure at error level and skips that entry.

To resolve this issue:

- Configure each destination as an entry under `management_server.exporters`, not through the `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable. The standard `OTEL_SERVICE_NAME` and `OTEL_RESOURCE_ATTRIBUTES` variables still set resource attributes, but they do not configure the endpoint.
- Check the startup log for an exporter validation error, which names the field that failed. Correct the entry, then restart the component.

### A Health Probe Fails or Masks an Unhealthy Component

A liveness or readiness probe fails. In other cases a probe passes even though the component cannot serve traffic. This happens when the probe targets the wrong port or points at the entrypoint proxy `/health` rather than the dedicated workload health server.

To resolve this issue:

- Point Kubernetes probes at the dedicated workload health server, not the entrypoint proxy. The proxy `/health` on the request-path port (8800 by default) returns `ok` whenever the HTTP listener is up, so it cannot report an unhealthy component.
- Confirm the probe port matches the workload: the Entrypoint Executor on 9090, the Agent-Workflow Executor on 8090, the Platform service on 9091, and the Secure Tool Runtime on 8090.
- Read the `/ready` response. Its `checks` object reports `phase` and `broker`, which name the dependency that keeps the component from becoming ready.

### The Aggregator Does Not Parse Log Fields

Logs reach the aggregator, but fields such as `traceID` are not searchable as structured data. The log format is set to text rather than JSON.

To resolve this issue, set `LOG_FORMAT=json` (or `log.format: json`) on every component. Then confirm the aggregator's parser extracts the JSON fields.

### A Log File Grows Unbounded

A component writes to a log file that is never rotated and grows without limit. The `log.log_file` path is set without a rotation size.

To resolve this issue, set `log.max_size_mb` to a positive value. When file logging is enabled without rotation, the startup log emits a warning.

## Next Steps

The deployment is up and the immediate failure is resolved. Day-two operational failures, such as event broker drops after a successful boot, persistence outages mid-task, tool execution failures, and upgrade migrations that fail halfway, are covered in [Troubleshooting a Running Deployment](../administering/scenario-troubleshooting.md).

If you can't resolve the issue with this guide, see [Get Support](https://docs.solace.com/get-support.htm).
