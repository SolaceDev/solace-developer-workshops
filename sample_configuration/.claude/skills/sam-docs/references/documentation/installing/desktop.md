---
title: Installing the Desktop Bundle
description: Download and install the Agent Mesh desktop bundle for a five-minute laptop evaluation.
sidebar_position: 320
---

# Installing the Desktop Bundle

The desktop bundle runs Agent Mesh as a single native application on your laptop. It packages the runtime, an in-memory broker, and the Agent Mesh UI into one process, so there is no separate event broker to provision and no configuration required beyond connecting a large language model (LLM) provider. For what the in-memory broker does and does not provide versus a production Solace event broker, see [The Broker in Production and on the Desktop](../concepts/event-driven-mesh.md#the-broker-in-production-and-on-the-desktop).

For the prerequisites that apply before any installation, see [Before You Begin](./before-you-begin.md). When you are ready to carry production traffic, you move to a supported deployment using the same declarative configuration you build here. See [Moving to Production](#moving-to-production).

## Supported Environments

The desktop bundle runs on these platforms:

| Platform | Supported architectures |
|---|---|
| macOS | Apple Silicon (`arm64`), Intel (`amd64`) |
| Windows | x86_64 (`amd64`) |

The desktop bundle does not support Linux. To use Agent Mesh on Linux, we recommend installing with Kubernetes. See [Deploying with Kubernetes](./kubernetes/index.md).


No fixed CPU, memory, or disk minimum applies beyond a supported operating system. The footprint depends on the models and tools you run.

## Prerequisites

To install the desktop bundle, you require an API key for a supported LLM provider before you launch the application. The desktop bundle includes its own in-memory event broker, so you do not procure one. You connect your provider in the model configuration UI the first time you launch the application. To obtain a key and confirm your provider is reachable, see [LLM Provider](./before-you-begin.md#llm-provider) in Before You Begin.

## Install the Desktop Bundle

Download the installer for your platform from the `Desktop/` folder of the Agent Mesh release. For the download procedure, see [Before You Begin](./before-you-begin.md).

**On macOS:**

1. Download the `.dmg` installer that matches your Mac (Apple Silicon or Intel) from the `macos/` folder. The installer file appears in your Downloads folder.

2. Open the `.dmg`, then drag the Agent Mesh application to your Applications folder. The application appears in Applications.

3. Open Agent Mesh from Applications. The application window opens and prompts you to connect an LLM provider.

:::note Installing without administrator privileges
Dragging to the system `/Applications` folder can prompt for an administrator password because that folder is shared across all accounts. To install without administrator privileges, drag the application to a folder your account owns instead, such as your own Desktop (`~/Desktop`). Agent Mesh runs the same from either location.
:::

**On Windows:**

1. Download the `.exe` installer from the `windows/` folder. The installer file appears in your Downloads folder.

2. Run the installer. It installs Agent Mesh for the current user under `%LOCALAPPDATA%\Programs\Solace Agent Mesh` without requiring administrator privileges, then adds it to your Start menu. The installation is per-account, so each user on a shared machine installs Agent Mesh separately.

3. Open Agent Mesh from the Start menu. The application window opens and prompts you to connect an LLM provider.

:::note Windows SmartScreen warning
On first run, Windows SmartScreen may show a "Windows protected your PC" warning. This warning is expected: SmartScreen builds trust from how widely an installer has been downloaded, so newly published releases are flagged until they accumulate reputation, even though the installer is signed. To continue, select **More info**, then **Run anyway**.
:::

## Configuration

The desktop bundle runs with bundled default settings. The only setup it requires is your LLM provider, which you connect in the model configuration UI on first launch. The built-in agents then use it.

The desktop bundle does not expose the infrastructure configuration that a production deployment requires, such as a connection to a separate, production-grade Solace event broker, persistent artifact storage, and authentication. Those settings apply when you deploy Agent Mesh for production. See [Moving to Production](#moving-to-production).

### Advanced Configuration with Environment Variables

The desktop bundle runs with bundled defaults, but you can override its settings with environment variables to evaluate features that the defaults leave off, such as connecting to a separate Solace event broker or enabling role-based access control (RBAC). On startup, the desktop bundle reads a `.env` file from the home folder and applies every variable it defines:

- macOS: `~/Library/Application Support/sam/.env`
- Windows: `%AppData%\sam\.env`

Restart the application after you edit the file so the new values take effect.

As an example, the following `.env` connects the desktop bundle to a separate Solace event broker instead of the in-memory one, which is what enables broker-backed features such as the event mesh gateway and event mesh connector:

```bash
SOLACE_DEV_MODE=false
SOLACE_BROKER_URL=wss://your-broker.messaging.solace.cloud:443
SOLACE_BROKER_VPN=your-vpn
SOLACE_BROKER_USERNAME=your-username
SOLACE_BROKER_PASSWORD=your-password
```

You must set `SOLACE_DEV_MODE=false`: the desktop bundle uses its in-memory broker by default, so setting `SOLACE_BROKER_URL` alone is not enough. To return to the in-memory broker, remove these variables (or set `SOLACE_DEV_MODE=true`) and restart. Because a `.env` file can hold credentials, keep it readable only by your own account.

## Tool Availability

A few built-in agent tools rely on external engines that the desktop bundle does not include, so those specific tools do not work in the desktop bundle until you install the engine yourself:

| Tool | Engine it requires |
|---|---|
| `render_document_to_images` | LibreOffice, poppler, ImageMagick |
| `html_to_pdf` | Chromium |
| `mermaid_diagram_generator` | Chromium |
| `image_magick` | ImageMagick |
| `ffmpeg` | ffmpeg |
| `ffprobe` | ffmpeg |

The Agent Mesh UI still renders Mermaid diagrams inline in chat with no engine. Only the `mermaid_diagram_generator` tool, which saves a diagram as an artifact, requires Chromium. A tool whose required engine is missing fails with a clear message rather than affecting the rest of the application.

To enable one of these tools, install the engine it requires so it is on your `PATH`, then restart the application (for Chromium, you can instead point the bundle at an existing browser with the `SAM_CHROMIUM_PATH` environment variable). A full Kubernetes deployment includes these engines, so the tools work there with no per-machine setup. For what each tool does, see [Built-In Tools](../reference/built-in-tools.md).

## Verify the Installation

Confirm the LLM connection by sending a message to a built-in agent.

1. In the application window, start a new chat.

2. Ensure Orchestrator is selected in the agent picker. The Orchestrator is a built-in agent that coordinates work across Agent Mesh.

3. Send a message such as "What can you do?" The Orchestrator replies and its response streams back token by token, which confirms the LLM connection is working.

## Data and Logs

The desktop bundle keeps all of its state in a single home folder:

- macOS: `~/Library/Application Support/sam`
- Windows: `%AppData%\sam` (for example, `C:\Users\<user>\AppData\Roaming\sam`)

This folder holds your configuration, the local database where the application stores the agents, models, and sessions you create, and the application log at `data/desktop.log`.

To start fresh, quit the application and delete this folder. The next launch recreates it with bundled defaults.

:::warning
Deleting the folder permanently removes all of your local data.
:::

## Moving to Production

The desktop bundle runs everything in one process with the in-memory broker and does not use production-grade storage, so it is not supported for team or production workloads.

What you build while evaluating carries forward. Agent Mesh uses one declarative configuration model across every environment. The agents, models, entrypoints, and tools you define in the desktop bundle are expressed as the same configuration a production deployment applies, so the definitions you validate here carry forward rather than being rebuilt for production. For how Agent Mesh manages this configuration, see [Managing Configuration as Code (Early Access)](../building/declarative-config/index.md).

Agent Mesh offers these production paths:

- Agent Mesh Cloud is a managed service that Solace hosts and operates. See [Agent Mesh Cloud](https://docs.solace.com/Agent-Mesh/Cloud/agent-mesh-manager.htm).
- A Kubernetes deployment runs Agent Mesh in your own cluster with a separate, production-grade Solace event broker, persistent storage, and authentication. See [Deploying with Kubernetes](./kubernetes/index.md).

## Next Steps

Now that Agent Mesh is running, the most common next step is to build an agent of your own. See [Create Your First Agent](../getting-started/your-first-agent.md).
