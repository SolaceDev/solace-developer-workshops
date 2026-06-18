---
title: Install
description: Install the Agent Mesh runtime via desktop bundle, the sam CLI, Docker, or the Helm chart, with honest coverage of the binary artifacts that ship today.
sidebar_position: 1
---

# Install

This page covers four install paths: a desktop bundle for a five-minute preview, the `sam` CLI for local development on macOS or Linux, Docker for self-hosted containers, and Helm for a Kubernetes deployment. Each path ends with a verification step you can paste back to confirm the install worked.

For prerequisites that apply across paths (broker, LLM provider, network reachability), see Before you begin.

## What Ships Today

Agent Mesh's binaries ship in two flavors today, distinguished by an `-enterprise` suffix on the artifact name. The `-enterprise` variants are the recommended downloads — they are the complete surface, including the Platform service, RBAC, and audit logging. The base variants are a smaller surface that omits those. The two flavors will converge in a future release; this page refers to the unified runtime as Agent Mesh and shows `-enterprise` filenames in commands.

| Logical role | Base filename | `-enterprise` variant |
|---|---|---|
| The `sam` CLI | `sam` | `sam-enterprise` |
| AWE (Agent-Workflow Executor) | `sam-awe` | `sam-awe-enterprise` |
| GWE (Gateway Executor) | `sam-gateway` | `sam-gateway-enterprise` (binary download) / `sam-gwe-enterprise` (Docker image) |
| Platform service | `sam-platform` | `sam-platform-enterprise` |
| STR (Secure Tool Runtime) | `sam-str` | `sam-str-enterprise` |
| Pre-flight checker | — | `sam-doctor-enterprise` |
| Desktop app | `sam-desktop` | `sam-desktop-enterprise` |

:::note
GWE ships under two `-enterprise` filenames: `sam-gateway-enterprise` in the binary download and `sam-gwe-enterprise` inside the Docker image (at `/usr/local/bin/`). They are the same binary; the subcommand surface is identical.
:::

In customer-facing prose, this site refers to "the `sam` CLI" or just `sam`. Substitute the actual filename you installed (`sam`, `sam-enterprise`, `sam-darwin-arm64`, etc.) when you copy a command into a terminal.

## Install Path Picker

| Path | When to use | Approx. time |
|---|---|---|
| Desktop bundle | Try Agent Mesh on your laptop with no extra setup | 5 min |
| CLI (`sam` binary) | Build agents and gateways locally on macOS or Linux | 10 min |
| Docker | Self-host on a server or run a single-container demo | 15 min |
| Kubernetes (Helm) | Run a production deployment with broker, persistence, and ingress | 30+ min |

If you are evaluating, start with the desktop bundle. If you are building, the CLI is the shortest path to a project on disk you can edit. Docker and Helm are for hosted deployments.

## Desktop Bundle

The desktop bundle is a single native application that embeds GWE, AWE, STR, and an in-memory broker into one process with a React UI. There is no broker to provision, no LLM proxy to stand up, and no shell session to keep alive. Closing the window stops everything.

### Download

The desktop installers are at the GitHub releases page:

| Platform | Asset format |
|---|---|
| macOS | `.dmg` containing `Solace Agent Mesh.app` |
| Windows (x86_64) | `.msi` installer |
| Linux (x86_64, ARM) | `sam-desktop-linux-<arch>` binary (no packaged installer) |

:::note
Desktop installers ship in an upcoming release. If you do not see them on the releases page yet, check back shortly, or use the CLI install path in the meantime.
:::

### Install

On macOS, mount the DMG and drag the app to your Applications folder:

```bash
# macOS release binaries are unsigned, so clear the Gatekeeper quarantine
# attribute before first launch.
xattr -d com.apple.quarantine "/Applications/Solace Agent Mesh.app"
```

On Windows, double-click the MSI and follow the installer.

On Linux, mark the downloaded binary executable and run it:

```bash
chmod +x ./sam-desktop-linux-amd64
./sam-desktop-linux-amd64
```

### First Launch

The window opens to a chat UI with two agents already running: a Concierge agent (the conversational entry point) and a Builder agent (an assistant for authoring new agents and gateways). Type a prompt and the LLM responds. Configuration lives at the user-config path the desktop app prints in the log on first launch (`~/.config/sam` on Linux, `~/Library/Application Support/sam` on macOS, `%APPDATA%\sam\` on Windows).

To stop, close the window. The embedded broker and the agents stop with it.

For prerequisites and the full first-run walkthrough, see Before you begin.

## CLI (`sam` Binary)

The CLI is the path for developers who want a project directory on disk they can author, version-control, and rebuild. The same binary scaffolds declarative-config projects (`sam config init`), runs the embedded stack (`sam run`), sends tasks (`sam task`), and applies declarative configuration (`sam config apply`). See CLI reference for every subcommand.

### Download

The release binaries are at the GitHub releases page:

| Platform | `-enterprise` asset (recommended) | Base asset |
|---|---|---|
| macOS (Apple Silicon) | `sam-enterprise-darwin-arm64` | `sam-darwin-arm64` |
| macOS (Intel) | `sam-enterprise-darwin-amd64` | `sam-darwin-amd64` |
| Linux (ARM) | `sam-enterprise-linux-arm64` | `sam-linux-arm64` |
| Linux (x86_64) | `sam-enterprise-linux-amd64` | `sam-linux-amd64` |
| Windows (x86_64) | `sam-enterprise-windows-amd64.exe` | `sam-windows-amd64.exe` |

### Install

Download the asset that matches your platform, then put it on `$PATH` as `sam-enterprise` (or `sam`, if you prefer to alias):

```bash
# Adjust os and arch for your platform.
chmod +x ./sam-enterprise-darwin-arm64
sudo mv ./sam-enterprise-darwin-arm64 /usr/local/bin/sam-enterprise

# macOS — release binaries are cross-compiled and unsigned.
xattr -d com.apple.quarantine /usr/local/bin/sam-enterprise
```

On Windows, move the `.exe` to a directory on `PATH` and rename to `sam-enterprise.exe` if desired.

### Verify the Install

```bash
sam-enterprise --version
```

You should see a version string and the git commit hash of the build.

### Scaffold a Project

```bash
mkdir my-project && cd my-project
sam-enterprise config init
```

`sam config init` scaffolds a declarative-config repo (`manifest.yaml`, `models/`, `agents/`, …) ready for `sam config plan` / `sam config apply`. See CLI reference → `sam config` for every flag.

### Run the Embedded Stack

```bash
sam-enterprise run --embedded
```

`--embedded` runs GWE, AWE, STR, and an in-memory broker as goroutines in a single process. The web UI and the Platform API are both served at `http://localhost:8800`. The platform handler mounts onto the gateway proxy under `/api/v1/platform/...` rather than binding a second port. Press `Ctrl+C` to stop.

For the alternative multi-process layout (separate GWE, AWE, and STR processes connected through a TCP dev broker), see Deploy options → Local development and CLI reference → `sam run`.

## Docker

The Docker image packages the `-enterprise` binary set (`sam-enterprise`, `sam-platform-enterprise`, `sam-awe-enterprise`, `sam-gwe-enterprise`, `sam-str-enterprise`, `sam-doctor-enterprise`) plus the React UI, built-in Go tools, and the bundled skill library into one image. The default entry point is `sam-enterprise run --embedded`.

### Pull the Image

The official image is published by the Agent Mesh release pipeline. Pull it from the registry path documented in your release notes:

```bash
docker pull <registry>/solace-agent-mesh:<version>
```

The image is built on a `debian:bookworm-slim` base with `ca-certificates`, `python3`, and `chromium` (needed for the screenshot and rendering tools).

### Run

```bash
docker run --rm -it \
  -p 8800:8800 \
  -p 8090:8090 \
  -e ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}" \
  -e SOLACE_BROKER_URL="${SOLACE_BROKER_URL}" \
  -e SOLACE_BROKER_USERNAME="${SOLACE_BROKER_USERNAME}" \
  -e SOLACE_BROKER_PASSWORD="${SOLACE_BROKER_PASSWORD}" \
  -v sam-data:/tmp/sam-data \
  solace-agent-mesh:dev
```

| Port | Served by | Purpose |
|---|---|---|
| `8800` | `sam-gwe-enterprise` (via `GatewayProxy`) | Web UI plus the gateway HTTP and SSE endpoints. The Platform API mounts here too at `/api/v1/platform/...` in embedded mode. |
| `8090` | Health server | Kubernetes-friendly `/health` and `/ready` endpoints. |

The Platform service only binds its own port (`8001` by default, settable via `PLATFORM_API_PORT`) in split-process layouts where the platform runs as a separate workload. In the single-container embedded mode shown above, the platform handler mounts onto the gateway proxy at `8800` and `8001` is unbound.

The `/tmp/sam-data` volume holds artifacts and the SQLite session database. Mount it on a host path or named volume to persist state across container restarts.

For multi-container layouts (separate GWE, AWE, STR pods) instead of the embedded single-container default, see Deploy options → Docker.

## Kubernetes (Helm)

The Helm chart for production deployments — `solace-agent-mesh` — ships as part of the Agent Mesh release; contact Solace for access pending public publication. The chart deploys GWE, AWE, STR, and the Platform service as separate workloads behind one ingress, with persistent volumes for artifacts and the session store.

### Install the Chart

The chart is delivered through your Solace release channel — today typically as a tarball, with a public Helm registry planned for a future release. Follow the delivery path documented in your release notes to obtain the chart, then install it against your cluster:

```bash
helm install agent-mesh ./solace-agent-mesh \
  --namespace agent-mesh \
  --create-namespace \
  --values /path/to/my-values.yaml
```

The chart name (`solace-agent-mesh`) and the values shape below stay the same regardless of how the chart is delivered.

### Minimum `my-values.yaml`

The chart uses three top-level value blocks: `sam:` (deployment options and auth), `broker:` (Solace broker connection), and `llmService:` (LLM provider endpoint and model selection).

```yaml
# my-values.yaml
sam:
  communityMode: false              # use the -enterprise binaries
  dnsName: "agent-mesh.example.com" # the DNS name the ingress serves
  sessionSecretKey: "${SESSION_SECRET}"

  authorization:
    enabled: true                   # require auth on the gateway
  oauthProvider:
    oidc:
      issuer: "${OIDC_ISSUER_URL}"
      clientId: "${OIDC_CLIENT_ID}"
      clientSecret: "${OIDC_CLIENT_SECRET}"

broker:
  url: "${SOLACE_BROKER_URL}"
  clientUsername: "${SOLACE_BROKER_USERNAME}"
  password: "${SOLACE_BROKER_PASSWORD}"
  vpn: "${SOLACE_BROKER_VPN}"

llmService:
  llmServiceEndpoint: "${LLM_SERVICE_ENDPOINT}"
  llmServiceApiKey: "${LLM_SERVICE_API_KEY}"
  planningModel: "${LLM_SERVICE_PLANNING_MODEL_NAME}"
  generalModel: "${LLM_SERVICE_GENERAL_MODEL_NAME}"
```

For the full values reference, see the chart's bundled `README.md` and `values.yaml` inside the release artifacts. That reference covers TLS, persistence, RBAC, scheduled tasks, the AI assistant feature flag, and observability. Topology choices (single-pod vs split, sticky sessions for SSE) are covered in Deploy options → Kubernetes.

### Pre-Flight Check

The chart's pre-install hook runs `sam-doctor-enterprise` against the cluster's environment before the chart applies. The doctor checks broker reachability, LLM endpoint connectivity, object-storage credentials, and TLS certificate validity. To run it yourself before the install:

```bash
kubectl run sam-doctor --rm -it --restart=Never \
  --image=<registry>/solace-agent-mesh:<version> \
  --env="SAM_DOCTOR_CONTEXT=helm" \
  --env="ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}" \
  --env="SOLACE_BROKER_URL=${SOLACE_BROKER_URL}" \
  --command -- sam-doctor-enterprise -v
```

`SAM_DOCTOR_CONTEXT` selects the rule set: `helm` for the Helm pre-install context, `wheel` for the Python-distribution context, `local` for a developer laptop. Pass `-v` (or `--verbose`) for debug output, or `--no-fail-on-error` to always exit 0 even when checks fail (useful when you want the report but cannot block the install on it).

Non-zero exit means at least one check failed. Resolve the reported issue and re-run before installing the chart.

## Verify the Install

Three checks confirm Agent Mesh is running correctly. Run them in order.

### Version

```bash
sam-enterprise --version
```

Reports the build version, the embedded STR version, and the git commit hash.

### Doctor

```bash
sam-enterprise doctor
```

Same checks as the standalone `sam-doctor-enterprise` binary. The `doctor` subcommand ships with the `-enterprise` build only; running against the base `sam` build will not find it. Run it with broker credentials and an LLM API key in the environment so the broker and LLM checks have something to talk to.

### GWE Health

Two health endpoints are served. The gateway proxy at `:8800/health` returns a plain `ok` body for cheap liveness checks. The dedicated health server at `:8090/health` returns the component-aware JSON envelope used by Kubernetes probes:

```bash
curl -fsS http://localhost:8090/health
```

A `200 OK` with `{"status":"healthy"}` means every component reported healthy. A failed check returns `{"status":"unhealthy","error":"..."}` with a non-2xx status code. In embedded-mode containers a single `:8090` health server speaks for every component in the process. Multi-pod Kubernetes deployments give each workload its own probe port: the GWE pod's health server is typically `:9090`, the platform pod's is `:9091`, AWE is `:8090`, and STR is `:8092`. Point cluster probes at the per-workload port from the Helm chart values rather than the request-path listener.

## What Next?

You have Agent Mesh installed and responding to health checks. The next step is to configure the broker, LLM provider, artifact storage, and authentication for your environment. See Configure.
