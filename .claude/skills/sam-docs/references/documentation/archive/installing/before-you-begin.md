---
title: Before You Begin
description: Procure a broker, choose an LLM provider, and confirm network reachability before installing Solace Agent Mesh — the universal prerequisites for every install path.
sidebar_position: 1
---

# Before You Begin

Universal prerequisites for every install path. Working through them before you install prevents the most common mid-journey blocker — discovering you need a broker, an LLM key, or a network rule change halfway through setup.

You will leave this page with:

- A broker decision (in-memory, dev broker, or Solace PubSub+) and, where applicable, the four broker credentials in hand.
- An LLM provider chosen and an API key that you have verified is live.
- A confirmed network path from the install target to the LLM provider, the broker, and any object storage you plan to use.
- A plan for where the environment variables that wire those credentials in will live.

The desktop bundle and the embedded mode of `sam run` ship an in-memory broker and only need an LLM key. Every other layout — multi-process local development, Docker multi-container, Kubernetes — needs the broker section below.

## Supported Operating Systems and Shells

Solace Agent Mesh ships as native, statically linked binaries. There is no language runtime to install on the host.

| OS | Architectures | Shells the commands in these docs assume |
|---|---|---|
| macOS | Apple Silicon (`darwin-arm64`), Intel (`darwin-amd64`) | bash, zsh |
| Linux | x86_64 (`linux-amd64`), ARM (`linux-arm64`) | bash, zsh |
| Windows | x86_64 (`windows-amd64`) | PowerShell, cmd, or bash via WSL |

Examples in these docs are written for bash and zsh. On Windows, run them under WSL for a one-to-one match, or translate the shell syntax — most often `${VAR}` becomes `$env:VAR` and single-quoted strings become double-quoted.

Docker is only required if you choose a container-based install path. The CLI itself does not need it.

## Pick a Broker

A broker carries every agent-to-agent and agent-to-gateway message. There are three options:

| Option | When to use | What you procure |
|---|---|---|
| In-memory broker | Desktop bundle, embedded mode, single-container Docker | Nothing — it is built into every Agent Mesh binary. |
| Dev broker | Local multi-process development (`sam run` without `--embedded`) | Nothing — the `sam` CLI starts a TCP `devbroker` on `:55554` for you. |
| Solace PubSub+ | Docker multi-container, Kubernetes, anything distributed or in production | A managed broker (Solace Cloud) or a self-hosted Solace PubSub+ deployment. |

The in-memory and dev broker options have no procurement step. Skip ahead to Pick an LLM provider if either fits your case.

### What You Need From a Solace PubSub+ Broker

Four credentials wire a Solace PubSub+ broker to Agent Mesh:

| Setting | Form | Example |
|---|---|---|
| URL | `tcps://<host>:<port>` for TLS-encrypted SMF; `wss://<host>:<port>` for WebSocket SMF | `tcps://mr-broker.messaging.solace.cloud:55443` |
| Username | The broker client username | `agent-mesh-prod` |
| Password | The password for that username | (from your password manager) |
| Message VPN | The Message VPN allocated for Agent Mesh | `agent-mesh` |

The URL scheme encodes the transport. `tcps://` is TLS-encrypted SMF (typically port 55443). `tcp://` is plain SMF (typically 55555). `wss://` and `ws://` are WebSocket SMF (typically 443 and 8008). Solace Cloud exposes both `tcps://` and `wss://`; the configurable port lives in the service-details panel. Use `tcps://` when the network between you and the broker permits long-lived TCP.

Verify there is a TCP path to the broker from the machine you will install on:

```bash
nc -zv mr-broker.messaging.solace.cloud 55443
```

A successful connect proves the network path. TLS handshake and the four credentials together are verified later by `sam doctor`.

## Pick an LLM Provider

Every agent that talks to an LLM declares a `<provider>/<model-name>` string. Agent Mesh wraps Bifrost under the hood, so any provider Bifrost supports works. The common ones:

| Provider | Model-string prefix | What to procure |
|---|---|---|
| Anthropic | `anthropic/` | An API key from console.anthropic.com (env var `ANTHROPIC_API_KEY`). |
| OpenAI | `openai/` | An API key from platform.openai.com (env var `OPENAI_API_KEY`). |
| Google Vertex AI | `vertex/` | A service-account JSON file with the `aiplatform.user` role, plus project ID and region. |
| AWS Bedrock | `bedrock/` | An IAM principal with `bedrock:InvokeModel`, plus access key, secret key, and region. |
| Azure OpenAI | `azure/` | Endpoint URL, API version, deployment name, and key. |
| Google Gemini | `google/` | An API key from aistudio.google.com. |
| Ollama (self-hosted) | `ollama/` | A reachable Ollama endpoint, typically `http://localhost:11434`. |
| Any OpenAI-compatible gateway | `openai/` with `api_base` set | An endpoint URL and a key. |

For the full provider list and every field each one accepts, see Configure → LLM provider.

### What You Need From the Provider

- **The API key in your shell as an environment variable.** Agent Mesh reads the provider-specific name automatically (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`, and so on), so you do not have to thread the key into YAML unless you want to.
- **Region awareness.** Public providers expose region-specific endpoints with different model availability. Confirm the model you plan to use is available in the region your key has access to.
- **A rate-limit budget.** Tool-using agents make several LLM round-trips per user turn. A starter tier on a public provider is fine for evaluation; sustained workloads need a paid tier.

Verify the key is live before installing. The exact verification URL varies by provider; Anthropic, for example, accepts a list-models request:

```bash
curl -sf https://api.anthropic.com/v1/models \
  -H "x-api-key: ${ANTHROPIC_API_KEY}" \
  -H "anthropic-version: 2023-06-01" \
  | head -5
```

A 200 with a `data` array means the key is valid. A 401 means rotate or recheck.

## Confirm Network Reachability

The machine running Agent Mesh needs **outbound** HTTPS to:

| Destination | Reason | Typical port |
|---|---|---|
| LLM provider endpoint | Every LLM call | 443 |
| Broker URL | All A2A and gateway-agent traffic | 55443 (`tcps://`), 443 (`wss://`), 8008 (`ws://` dev broker) |
| Object storage (S3, GCS, Azure Blob) | Artifact reads and writes, when configured | 443 |
| IdP issuer URL | OIDC discovery, when SSO is on | 443 |

**Inbound**, the gateway listens on two ports by default in embedded and single-container modes:

| Port | Served by | Purpose |
|---|---|---|
| 8800 | Gateway proxy | Web UI, gateway HTTP/SSE, Platform API at `/api/v1/platform/...` (embedded mode) |
| 8090 | Health server | Container and Kubernetes probes — `/health`, `/ready` |

Multi-pod Kubernetes deployments give each workload its own probe port (GWE `:9090`, Platform `:9091`, AWE `:8090`, STR `:8092`); see Install → Kubernetes for the per-workload picture.

In a corporate network the most common surprise is an egress proxy that blocks the LLM provider. Confirm now, not after install. If you must traverse a proxy, the standard `HTTPS_PROXY`, `HTTP_PROXY`, and `NO_PROXY` environment variables apply to every outbound request Agent Mesh makes.

## Decide Where Credentials Will Live

Agent Mesh reads runtime configuration from environment variables, with project-level defaults loaded from a `.env` file when one exists. The same variable names appear across every install path:

| Variable | Purpose |
|---|---|
| `SOLACE_BROKER_URL` | Broker URL. Omit when running in embedded or desktop mode. |
| `SOLACE_BROKER_USERNAME` | Broker client username. Default `default`. |
| `SOLACE_BROKER_PASSWORD` | Broker client password. |
| `SOLACE_BROKER_VPN` | Message VPN. Default `default`. |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GROQ_API_KEY` / etc. | Provider-specific LLM key, read directly by Bifrost. |
| `SESSION_SECRET_KEY` | Cookie-signing key for the Web UI gateway. Generate with `openssl rand -hex 32`. Required outside local development. |

Decide now where these will come from on the target machine:

- **Local development** — a `.env` file in the project directory. Add it to `.gitignore`; never check it into version control.
- **Docker** — `-e` flags on `docker run`, or an `--env-file` referenced from Compose.
- **Kubernetes** — Kubernetes `Secret` objects mounted as environment variables by the Helm chart. The chart's `sam.*`, `broker.*`, and `llmService.*` values map to these names internally.

Per-component YAML never embeds the values literally; it references them via `${VAR}` or `${VAR, default}` substitution. A typical broker block looks like this:

```yaml
# configs/agent.yaml
...
broker:
  broker_url: ${SOLACE_BROKER_URL}
  broker_username: ${SOLACE_BROKER_USERNAME, default}
  broker_password: ${SOLACE_BROKER_PASSWORD}
  broker_vpn: ${SOLACE_BROKER_VPN, default}
...
```

## Air-Gapped Considerations

Agent Mesh runs in air-gapped environments with three substitutions:

| Hosted dependency | Air-gapped equivalent |
|---|---|
| Public LLM provider | A self-hosted Ollama (`ollama/`) or any OpenAI-compatible gateway with `api_base` pointing at your internal endpoint. |
| Solace Cloud broker | Your own Solace PubSub+ deployment. |
| GitHub releases page | Stage the binaries or the container image on an internal registry from a network-connected host. |

For internal TLS endpoints signed by a private CA, point each client at the trusted CA bundle. The LLM-side spelling is `api_ca_cert`:

```yaml
# configs/agent.yaml
...
model:
  model: openai/internal-model
  api_base: https://llm.internal.example.com
  api_ca_cert: /etc/ssl/internal-ca.pem
  api_key: ${LLM_SERVICE_API_KEY}
...
```

The same CA-bundle field is available on OIDC providers (`ca_cert_path`) and the S3 client. See Configure for the per-section spelling, and Airgap for the end-to-end disconnected-install procedure.

## Pre-Install Verification

The `sam` CLI ships a `doctor` subcommand that exercises every external dependency before you install:

- Broker reachability and credentials.
- LLM endpoint reachability.
- Object-storage TCP and authentication, when configured.
- TLS certificate validity, when configured.
- OIDC issuer discovery, when configured.
- Database TCP and authentication, when a Postgres URL is configured.
- Local runtime version and port availability.

Run it from a shell that has the credentials above in scope:

```bash
SOLACE_BROKER_URL="${SOLACE_BROKER_URL}" \
SOLACE_BROKER_USERNAME="${SOLACE_BROKER_USERNAME}" \
SOLACE_BROKER_PASSWORD="${SOLACE_BROKER_PASSWORD}" \
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}" \
sam doctor
```

A non-zero exit means at least one check failed. The report names the failing check and a suggested fix. Re-run after resolving each finding until the report is clean.

## What Next?

You have a broker decided, an LLM key verified, network reachability confirmed, and a place for the environment variables to live. Head to Install and pick a path — desktop bundle for a five-minute preview, the `sam` CLI for local development, Docker for self-hosted, or Kubernetes for production.
