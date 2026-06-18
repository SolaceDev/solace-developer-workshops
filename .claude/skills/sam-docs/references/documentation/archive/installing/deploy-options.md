---
title: Deploy Options
description: Pick a process layout for Agent Mesh — embedded, multi-process local, Docker, Kubernetes, or desktop — and understand the broker, ports, and trade-offs of each.
sidebar_position: 3
---

# Deploy Options

Agent Mesh is built from three workload classes — **GWE** (the Gateway Executor that hosts gateways at the HTTP entry point), **AWE** (the Agent-Workflow Executor that runs agents), and **STR** (the Secure Tool Runtime that executes tools). A deploy option is how those three are laid out as processes, and which broker carries the messages between them.

This page is a navigator. For install commands, see Install. For wiring the runtime to your broker, LLM, storage, and identity provider, see Configure.

## Topology at a Glance

| Option | Processes | Broker | When to use |
|---|---|---|---|
| Embedded mode | One process, three goroutines | In-memory | Local development; default for the single-container Docker image |
| Local multi-process | One OS process per YAML config | TCP dev broker on `:55554` (started by the CLI) | Reproduce a production split locally without containers |
| Docker (single container) | One container running the embedded orchestrator | In-memory | Self-hosted demo or evaluation |
| Docker (multi-container) | One container per workload | Solace event broker | Self-hosted production-like deployment |
| Kubernetes (Helm) | One pod per workload | Solace event broker | Production |
| Desktop | One native binary with an embedded UI window | In-memory | Five-minute laptop evaluation |

The trade-off is always the same: more processes means stronger isolation and the ability to scale workloads independently, at the cost of a real broker and per-workload deployment plumbing. Pick the smallest layout that fits the requirement.

## Embedded Mode

Embedded mode runs GWE, AWE, STR, and an in-memory broker as goroutines inside a single process. It is the default for local development with the `sam` CLI, the default inside the published Docker image, and the runtime that the desktop app boots.

```bash
sam-enterprise run --embedded configs/       # -enterprise build (recommended)
sam run --embedded configs/                  # base build
```

The process binds the gateway proxy on `:8800` (all interfaces) and serves the Platform API at `/api/v1/platform/...` from the same port — the Platform service mounts as a handler on the proxy rather than binding a second port. The in-memory broker has no TCP listener; every component subscribes through Go channels. Closing the process stops everything.

Override the gateway port with `--listen :PORT`. The resolution order is `--listen` > the YAML `fastapi_port` (which itself may resolve from `${FASTAPI_PORT, 8800}` in the gateway YAML) > `8800`.

**Use it when** you want the fastest possible inner loop, you only need one process, and you do not need to swap individual components in or out. **Avoid it when** you need a real broker, multiple GWE replicas, or you want AWE on a bigger machine than GWE. Embedded mode is single-replica by design.

## Local Development

The multi-process variant of `sam run` skips `--embedded` and spawns one OS subprocess per YAML config (GWE, AWE, STR, optionally Platform). All subprocesses connect to a TCP dev broker that the CLI starts in-process on port `55554`.

```bash
sam run configs/
```

This layout matches what you get in Kubernetes — separate processes, broker between them — without requiring Docker, a Solace broker, or a Helm chart. The `sam` CLI watches the subprocesses and shuts them all down on `Ctrl+C`.

Health endpoints are split across non-overlapping ports so all four workloads can listen on the same machine: GWE `:9090`, Platform `:9091`, AWE `:8090`, STR `:8092`. The CLI injects `--health-addr` for each subprocess automatically; you do not configure these yourself.

For the full flag surface of `sam run`, see CLI reference → `sam run`.

**Use it when** you are debugging behavior that only surfaces in a multi-process layout — broker reconnect, queue-binding races, peer discovery timing. **Avoid it when** embedded mode is sufficient; the subprocess machinery adds startup time and you lose the in-process debugger story.

## Docker

The published image (`solace-agent-mesh`) is a single-container build that runs the embedded orchestrator by default. The image entry point is `sam-enterprise run --embedded --system-env -- /etc/sam/configs`.

```bash
docker run -p 8800:8800 -p 8090:8090 -v sam-data:/tmp/sam-data ${IMAGE}
```

The `--system-env` flag tells the CLI to read configuration from process environment variables instead of a `.env` file (the image has no shell or `.env` baked in). The `/tmp/sam-data` volume holds artifacts and the SQLite session database; mount it on a host path or named volume to persist state across container restarts.

The container listens on two ports in single-container mode:

| Port | Purpose |
|---|---|
| `8800` | Gateway proxy — Web UI plus the gateway HTTP and SSE endpoints. The Platform API mounts on the same port at `/api/v1/platform/...`. |
| `8090` | Health server — `/health` and `/ready` for orchestrator probes. |

The Platform service has its own default port (`8001`, settable via `PLATFORM_API_PORT`) that is only bound in split-process layouts where Platform runs as a separate workload. In the single-container embedded mode shown here, `8001` is unbound. See Install → Docker for the published-image pull command and the broker/LLM environment variables the image expects.

The single-container layout is the smallest production-like deployment that still ships through a real container registry — no Helm, no broker provisioning, one workload to roll. The trade-off is that the in-memory broker means you cannot scale GWE and AWE independently and you cannot survive a process restart with in-flight tasks.

For a **multi-container** layout — separate GWE, AWE, STR, and Platform containers backed by a real Solace broker — use the per-binary entry points the image already ships (`sam-awe-enterprise`, `sam-gwe-enterprise`, `sam-platform-enterprise`, `sam-str-enterprise`) and provide an external broker URL through `SOLACE_BROKER_URL`. This is the same topology Kubernetes uses. It is just expressed as Compose or hand-rolled `docker run` invocations. The Kubernetes chart below is the recommended production target.

## Kubernetes

The `solace-agent-mesh` Helm chart ships as part of the Agent Mesh release (contact Solace for access pending public publication). It deploys four workloads:

| Workload | Image entry point | Default health port | Chart `replicas` key |
|---|---|---|---|
| GWE | `sam-gwe-enterprise` | `:9090` | `gwe` |
| Platform | `sam-platform-enterprise` | `:9091` | `core` |
| AWE | `sam-awe-enterprise` | `:8090` | `awe` |
| STR | `sam-str-enterprise` | `:8090` | `str` |

All four connect to an external Solace event broker. GWE, AWE, STR, and Platform each run as their own pod with their own HTTP listener; the chart wires them up behind a single ingress with per-workload routing. Persistent volumes hold the SQLite session database and the artifact store.

### Single-Pod Versus Split Deployments

The chart defaults to one replica per workload. Workload replicas are tunable independently (the rc-sam-go reference values use `replicas: { core: 1, gwe: 1, awe: 1, str: 1 }`), so a deployment that does heavy tool execution can scale STR without resizing GWE, and a deployment with many concurrent agents can scale AWE.

GWE, however, is single-replica today. Running multiple GWE pods behind a load balancer requires:

- **Session affinity** at the load balancer. WebUI conversation state lives in the pod-local SQLite session store; without sticky sessions, every request can land on a different pod and lose history.
- **SSE reconnect awareness**. The persistent event log used for SSE streaming is per-pod; a `Last-Event-ID` reconnect to a different pod loses replay history.
- **Cross-pod gateway-deploy coordination**. Dynamic gateway registration uses an in-process atomic check that is not cross-pod-safe.

For Horizontal Pod Autoscaling or rolling updates with `maxUnavailable > 0`, configure session affinity at the ingress (for example, ALB target-group stickiness) and accept the stickiness cost. Multi-pod GWE HA without stickiness is on the roadmap, not in the current release.

For the full chart values surface (TLS, persistence, RBAC, scheduled tasks, observability, the AI assistant feature flag), see the chart's bundled `README.md` plus `values.yaml` inside the release artifacts. Configuration concerns that apply to every topology — broker URL, LLM provider, artifact storage, session storage, identity provider — are covered in Configure.

## Desktop

The desktop app (`sam-desktop`, or `sam-desktop-enterprise` for the `-enterprise` build) is a native binary that embeds GWE, AWE, STR, an in-memory broker, and the React UI into a single application. A native WebKit or WebView2 window serves the UI; closing the window stops everything.

There is no shell session to keep alive, no broker to provision, and no port to remember — the in-process API proxy routes the window's HTTP calls straight into the gateway. See Install → Desktop bundle for the per-platform installer assets and the install steps.

**Use it when** you want a five-minute laptop preview without touching Docker or a CLI. **Avoid it when** you need anything beyond the bundled intro agent — the desktop binary is intentionally not the deployment surface for production work.

## Picking a Topology

| You want to… | Start with |
|---|---|
| Click around for five minutes | Desktop |
| Build and debug an agent locally | Embedded mode |
| Reproduce a production split on your laptop | Local multi-process |
| Self-host a single-container demo | Docker (single container) |
| Run production traffic | Kubernetes (Helm) |

The two boundaries that matter when picking are **broker** (in-memory means single-process; Solace means real isolation and multi-host) and **process layout** (one process means simple ops; per-workload processes mean independent scaling). Everything else — TLS, RBAC, observability — is configuration on top of whatever layout you pick, and lives in Configure.

## What Next?

You have picked a topology. Next, wire it to your environment — broker URL, LLM provider, artifact and session storage, identity provider, and secrets — in Configure.
