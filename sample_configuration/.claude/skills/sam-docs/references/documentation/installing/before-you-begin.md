---
title: Before You Begin
description: Procure an event broker, choose an LLM provider, and confirm network reachability before installing Agent Mesh. These steps are the universal prerequisites for every install path.
sidebar_position: 310
---

# Before You Begin

This page covers the prerequisites that apply before you install Agent Mesh. Read it before following any of the installation guides.

Working through them first prevents the most common mid-install blocker—discovering halfway through setup that you need an event broker, an LLM key, or a firewall change. The desktop bundle includes an event broker and needs only an LLM key. A production Kubernetes deployment also needs the event broker prerequisite below.

## Event Broker

An event broker carries every agent-to-agent and agent-to-entrypoint message in Agent Mesh. Which one you need depends on how you plan to run it.

| Option | When to use | What you procure |
|---|---|---|
| In-memory event broker | Desktop bundle | Nothing—it is built into the desktop bundle. |
| Solace event broker | Production or distributed Kubernetes deployments | A managed event broker (Solace Cloud) or a self-hosted Solace event broker. |

The in-memory option has no procurement step. If it fits your case, skip ahead to [LLM Provider](#llm-provider).

:::note
A Kubernetes Quick Start or evaluation install deploys an embedded event broker for you, so you do not procure one to evaluate. A production deployment disables the embedded event broker and requires an external Solace event broker. For the external-broker procedure, see [Installing Kubernetes for Production](./kubernetes/production.md).
:::

### What You Need From a Solace Event Broker

Four values connect a Solace event broker to Agent Mesh:

| Setting | Form | Example |
|---|---|---|
| URL | `tcps://<host>:<port>` for TLS-encrypted SMF, or `wss://<host>:<port>` for WebSocket SMF | `tcps://mr-broker.messaging.solace.cloud:55443` |
| Username | The event broker client username | `agent-mesh-prod` |
| Password | The password for that username | (from your password manager) |
| Message VPN | The Message VPN allocated for Agent Mesh | `agent-mesh` |

The URL scheme encodes the transport: `tcps://` is TLS-encrypted Solace Message Format (SMF), typically on port 55443; `tcp://` is plain SMF, typically 55555; and `wss://` and `ws://` are WebSocket SMF, typically 443 and 8008. Solace Cloud exposes both `tcps://` and `wss://`; find the port in the service-details panel. Prefer `tcps://` when the network between you and the event broker allows long-lived TCP connections.

Agent Mesh reads these values from the environment variables `SOLACE_BROKER_URL`, `SOLACE_BROKER_USERNAME`, `SOLACE_BROKER_PASSWORD`, and `SOLACE_BROKER_VPN`. Each component's YAML file references them through `${VAR}` substitution. Decide now where they will come from on the target machine: a `.env` file for local development (add it to `.gitignore`; never commit it), or Kubernetes `Secret` objects for a cluster. For the full wiring, see [Configuring Agent Mesh](./configure.md).

Confirm there is a network path to the event broker from the machine you will install on:

```bash
nc -zv mr-broker.messaging.solace.cloud 55443
```

A successful connection proves the network path. The `sam doctor` command later verifies the TLS handshake and the four values together; see [Validate the Configuration](./configure.md#validate-the-configuration).

## LLM Provider

Every agent that talks to a model declares a `<provider>/<model-name>` string, so you need credentials for at least one LLM provider before you install—this applies to every installation option, including the desktop bundle.

Agent Mesh supports Anthropic, OpenAI, Azure OpenAI, AWS Bedrock, Google Vertex AI, Google Gemini, Ollama, and any OpenAI-compatible endpoint, among others. Most providers require only an API key; a few require more (AWS Bedrock requires an IAM principal with `bedrock:InvokeModel`; Google Vertex AI requires a service account with the `aiplatform.user` role). For the full list and the exact fields each provider accepts, see [LLM Provider](./configure.md#llm-provider) in Configuring Agent Mesh.

Before you install, whichever provider you choose:

- Obtain its API key or credentials from the provider console.
- Confirm the model you plan to use is available in the region your key can access.
- Confirm a rate-limit budget that suits your workload—tool-using agents make several model round-trips per user turn, so a free tier is fine for evaluation but sustained use requires a paid tier.
- Have the provider-specific environment variable ready (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and so on); Agent Mesh reads it automatically, so you do not have to put the key in YAML.

Verify the key is live before installing. The exact request varies by provider; Anthropic, for example, accepts a list-models call:

```bash
curl -sf https://api.anthropic.com/v1/models \
  -H "x-api-key: ${ANTHROPIC_API_KEY}" \
  -H "anthropic-version: 2023-06-01" \
  | head -5
```

A `200` response with a `data` array means the key is valid; a `401` means you need to recheck or rotate it. `sam doctor` runs the same reachability check against your configured provider.

## System Requirements

Agent Mesh ships as native, statically linked binaries, so there is no language runtime to install on the host. Support depends on your operating system and CPU architecture:

| Installation path | macOS | Linux | Windows |
|---|---|---|---|
| Desktop bundle | Apple Silicon (`arm64`), Intel (`amd64`) | Not yet supported | x86_64 (`amd64`) |
| CLI binary | Apple Silicon (`arm64`), Intel (`amd64`) | x86_64 (`amd64`), ARM (`arm64`) | x86_64 (`amd64`) |

Linux support for the desktop bundle is planned for a future release. For Kubernetes, container images are published for `amd64` and `arm64` nodes.

The commands in these docs assume bash or zsh. On Windows, run them under Windows Subsystem for Linux (WSL) for a one-to-one match, or translate the shell syntax—most often `${VAR}` becomes `$env:VAR`.

No fixed CPU, memory, or disk minimum applies to the desktop bundle beyond a supported operating system; the footprint depends on the models and tools you run. For Kubernetes node sizing and per-workload CPU and memory requests and limits, see [Compute Resources](./kubernetes/compute-resources.md).

## Obtain the Delivery Package

Download Agent Mesh from the Solace Product Portal on a machine with internet access. The artifacts you need depend on your installation path.

1. Sign in to the [Solace Product Portal](https://products.solace.com/).
2. Open Products, then select Agent_Mesh, then Enterprise.
3. Select the release you want to install.

The release contains the following:

| Item | Description |
|---|---|
| `Charts/` | The Agent Mesh Helm chart archive (`solace-agent-mesh-<version>.tar.gz`), used for Kubernetes installs. |
| `Images/` | Container image archives, in `amd64/` and `arm64/` subfolders. Needed only for an air-gapped Kubernetes install. |
| `CLI/` | The `sam` command line interface archives (`solace-agent-mesh-<version>-cli-<os>-<arch>.tar.gz`, `.zip` on Windows) for each operating system and architecture. |
| `Desktop/` | The desktop application installers: `solace-agent-mesh-<version>-desktop-darwin-<arch>.dmg` for macOS and `solace-agent-mesh-<version>-desktop-windows-amd64.exe` for Windows. |
| `solace-agent-mesh-<version>-bom.yaml` | The bill of materials. It lists every file with a `file_checksum` for verifying downloads and an `image_id` for verifying loaded container images. |
| `solace-agent-mesh-<version>-release-notes.html` | The release notes for this version. |

To verify a download, compare its SHA256 hash against the matching `file_checksum` in `solace-agent-mesh-<version>-bom.yaml`:

```bash
sha256sum <file>
```

The output matches the `file_checksum` value for that file, without the `sha256:` prefix.

### Command Line Interface

Download the `sam` CLI archive for your operating system and architecture from `CLI/` (for example, `solace-agent-mesh-<version>-cli-darwin-arm64.tar.gz`), then extract the `sam` binary and add it to your `PATH`. The `sam` CLI is a command-line tool for configuring and managing a running Agent Mesh deployment—for example, validating connectivity and configuration with `sam doctor` and managing resources as code with `sam config`. For the full command set, see [CLI Reference](../reference/cli.md).

### Desktop Bundle

Download the installer for your platform from `Desktop/`: on macOS, `solace-agent-mesh-<version>-desktop-darwin-arm64.dmg` for Apple Silicon or `solace-agent-mesh-<version>-desktop-darwin-amd64.dmg` for Intel; on Windows, `solace-agent-mesh-<version>-desktop-windows-amd64.exe`. The desktop bundle embeds everything it needs—an in-memory event broker and the Agent Mesh UI—so it requires no other artifacts. For the install steps, see [Installing the Desktop Bundle](./desktop.md).

### Kubernetes

Download the Helm chart archive (`solace-agent-mesh-<version>.tar.gz`) from `Charts/`. What else you need depends on the deployment type.

#### Quick Start and Production

A connected Quick Start or production install pulls the container images from the Solace registry at install time, so you download only the chart. You also need the image pull credentials file, which Solace provides separately. For the install steps, see [Kubernetes Quick Start](./kubernetes/quickstart.md) or [Installing Kubernetes for Production](./kubernetes/production.md).

#### Air-Gapped

An air-gapped install has no access to the Solace registry, so you also download the container image archives from `Images/` and mirror them to a private registry. A production air-gapped install needs the `solace-agent-mesh`, `solace-agent-mesh-str`, and `postgres` images. The chart runs the `postgres` image as a database init container that creates the application users and schemas, so you need it even with an external database. A Quick Start air-gapped install also needs the `seaweedfs` and `solace-pubsub-enterprise` images for the bundled storage and embedded event broker. For the load and install steps, see [Installing in an Air-Gapped Environment](./kubernetes/airgap.md).

:::note Third-party images and licenses
The Helm chart deploys third-party images alongside the Solace components. The bundled persistence layer uses **PostgreSQL** (the `postgres` image) for the database and **SeaweedFS** (the `chrislusf/seaweedfs` image) for the S3-compatible object store; the `postgres` image also runs as a database init container even with an external database. These are unmodified upstream images that remain under their own open-source licenses—held by their respective projects, not under your Solace agreement (PostgreSQL under the PostgreSQL License, SeaweedFS under the Apache License 2.0). They are bundled only for convenience, so that evaluation and air-gapped installs run without standing up external datastores first; a production deployment points at your own managed database and object store, and the chart no longer deploys them. For how to verify and mirror these images, see [Third-Party Images](./kubernetes/airgap.md#third-party-images).
:::

## Network Requirements

Agent Mesh requires outbound network access and, for deployments that expose the Agent Mesh UI to users, inbound access. The exact requirements depend on which installation path you choose and which features you enable, so treat the following as the common cases rather than a complete list.

### All Installation Paths

Every installation needs outbound HTTPS from the host or cluster to your LLM provider. A deployment that connects to an external Solace event broker—a production or distributed Kubernetes deployment—also needs outbound access to it. Storage and identity endpoints are required only when you configure them.

| Destination | Reason | Typical port |
|---|---|---|
| LLM provider endpoint | Every model call | 443 |
| Solace event broker URL | Agent-to-agent and entrypoint-agent traffic, when using an external event broker | 55443 (`tcps://`), 443 (`wss://`) |
| Object storage (S3, GCS, Azure Blob) | Artifact reads and writes, when configured | 443 |
| Identity provider issuer URL | OIDC discovery, when SSO is enabled | 443 |

If your environment routes egress through a corporate proxy, the standard `HTTPS_PROXY`, `HTTP_PROXY`, and `NO_PROXY` environment variables apply to every outbound request Agent Mesh makes. Confirm the proxy allows the LLM provider endpoint before you install—a blocked provider is the most common surprise on a locked-down network.

### Kubernetes

In addition to the endpoints above, a Kubernetes deployment requires outbound access to pull images and reach the services Agent Mesh depends on, and inbound access when it exposes the Agent Mesh UI through an ingress controller. For example, if you mirror the container images to your own registry, you do not need outbound access to the Solace registry.

#### Outbound Access

| Destination | Purpose | Notes |
|---|---|---|
| `gcr.io/gcp-maas-prod` | Pull the Agent Mesh container images | Requires the image pull credentials that Solace provides. Not needed if you mirror the images to a private registry. |
| `*.messaging.solace.cloud` | Connect to a Solace Cloud event broker | Not needed with a self-managed event broker. Reach that event broker at its secured SMF port instead. |
| LLM provider endpoints | Model inference, for example `api.openai.com` | Required for every installation. Point at your provider or an internal LLM proxy. |
| Identity provider endpoints | Authentication and authorization through OIDC | Required only when you enable authentication. |

Custom agents and tools can require outbound access to the external systems they integrate with, such as databases or third-party APIs. Confirm that the cluster nodes can reach those systems. If your environment routes egress through a corporate proxy, set the `HTTP_PROXY` and `HTTPS_PROXY` environment variables for the deployment.

#### Inbound Access

A production Kubernetes deployment requires an ingress controller (NGINX or AWS ALB, for example) to route HTTP and HTTPS traffic, and a TLS certificate for your domain, managed through ingress annotations such as cert-manager or through a Kubernetes Secret. For the Kubernetes ingress and TLS values, see [Installing Kubernetes for Production](./kubernetes/production.md).
