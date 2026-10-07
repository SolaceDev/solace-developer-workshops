---
published: true
title: Installing the Desktop Bundle
description: Download and install the Agent Mesh desktop bundle for a five-minute laptop evaluation.
sidebar_position: 320
---

# Installing the Desktop Bundle

The desktop bundle runs Agent Mesh as a single application on your laptop. It packages the runtime, an in-memory event broker, and the Agent Mesh UI into one process, so there is no separate event broker to provision and no configuration required beyond connecting a large language model (LLM) provider. For what the in-memory event broker does and does not provide versus a production Solace event broker, see [The Event Broker in Production and on the Desktop](../concepts/event-driven-mesh.md#the-event-broker-in-production-and-on-the-desktop). To connect the desktop bundle to a separate Solace event broker instead of the in-memory one, see [Advanced Configuration with Environment Variables](#advanced-configuration-with-environment-variables).

For the prerequisites that apply before any installation, see [Before You Begin](./before-you-begin.md). When you are ready to carry production traffic, you move to a supported deployment using the same declarative configuration you build here. See [Moving to Production](#moving-to-production).

## Supported Environments

The desktop bundle runs on these platforms:

| Platform | Supported versions | Supported architectures |
|---|---|---|
| macOS | macOS 11 (Big Sur) and later | Apple Silicon (`arm64`), Intel (`amd64`) |
| Windows | Windows 10 and later | x86_64 (`amd64`) |
| Linux (Experimental) | Depends on the distribution | x86_64 (`amd64`), aarch64 (`arm64`) |

No fixed CPU, memory, or disk minimum applies beyond a supported operating system. The footprint depends on the models and tools you run.

## Prerequisites

You require access to an LLM provider before you install the desktop bundle. Have the following ready before you launch the application; you enter these values in the model configuration UI the first time you open it:

- An API key for a supported LLM provider. Keep it where you can copy it during first-run setup.
- The endpoint URL (the API base URL), if you use an OpenAI-compatible endpoint (the Custom provider), Azure OpenAI, or Ollama. Other providers do not require one.

For the full list of supported providers, the fields each one requires, and how to confirm your key is live before you install, see [LLM Provider](./before-you-begin.md#llm-provider) in Before You Begin.

## Install the Desktop Bundle

You can download the installer for your computer using these steps:

1. Sign in to the [Solace Product Portal](https://products.solace.com/) on a machine with internet access.
2. Open Products, select Agent_Mesh, then Enterprise, then select the release you want to install.
3. Open the `Desktop/` folder, then its `macOS/`, `Windows/`, or `Linux (Experimental)/` subfolder. The steps for your platform name the exact file to download.

To verify a download against the release checksums, and for the rest of the delivery package, see [Obtain the Delivery Package](./before-you-begin.md#obtain-the-delivery-package).

The installer lists the application in your platform's launcher as **Solace Agent Mesh** (the Applications folder on macOS, the Start menu on Windows, or the applications menu on Linux). Look for that name when you open it.

**On macOS:**

1. Download the `.dmg` installer that matches your Mac: `solace-agent-mesh-<version>-desktop-macos-apple-silicon.dmg` for Apple Silicon or `solace-agent-mesh-<version>-desktop-macos-intel.dmg` for Intel.
2. Open the `.dmg`, then drag the Agent Mesh application to your Applications folder. The application appears in Applications.

3. Open Agent Mesh from Applications. The application opens; if no model is configured yet, it prompts you to set one up.

:::note
Dragging to the system `/Applications` folder can prompt for an administrator password because that folder is shared across all accounts. To install without administrator privileges, drag the application to a folder your account owns instead, such as your own Desktop (`~/Desktop`). Agent Mesh runs the same from either location.
:::

**On Windows:**

1. Download the `.exe` installer (`solace-agent-mesh-<version>-desktop-windows-x64.exe`).
2. Run the installer. It installs Agent Mesh for the current user under `%LOCALAPPDATA%\Programs\Solace Agent Mesh` without requiring administrator privileges, then adds it to your Start menu. The installation is per-account, so each user on a shared machine installs Agent Mesh separately.

3. Open Agent Mesh from the Start menu. The application opens; if no model is configured yet, it prompts you to set one up.

:::note
The installer is code-signed, but because each release is newly published, Microsoft Defender SmartScreen may flag it until it accumulates download reputation. These warnings are expected, and you can continue past them:

- Your browser may warn that the file is uncommon or could be unsafe when you download it. Select the option to keep the file: in Microsoft Edge, open the "More actions" (...) menu on the download and select "Keep"; in Chrome, select "Keep" on the warning.
- Windows may show a "Windows protected your PC" dialog when you run the installer or first open the application. Select "More info", then "Run anyway".
:::

**On Linux (Experimental):**

:::warning
Linux support for the desktop bundle is in the Experimental stage and under active development. Its packaging and behavior are subject to change.
:::

Agent Mesh ships a Debian package (`.deb`), an RPM package (`.rpm`), and a portable archive (`.tar.gz`). Each comes in two builds, one for each version of WebKitGTK that current distributions provide. The `Desktop/Linux (Experimental)/` folder holds one folder per build. Find your distribution in the following table, then open the folder it names:

| Your distribution | Folder | File to download |
|---|---|---|
| Ubuntu 24.04 and later, Debian 13 and later | `modern-distros` | `.deb` |
| Ubuntu 22.04, Debian 12 | `legacy-distros` | `.deb` |
| Fedora 44 and later | `modern-distros` | `.rpm` |
| Fedora 43 and earlier | `modern-distros` | `.tar.gz` |
| RHEL 9, Rocky Linux 9, AlmaLinux 9 | `legacy-distros` | `.rpm` |

`modern-distros` contains the WebKitGTK 4.1 build, and `legacy-distros` contains the WebKitGTK 4.0 build. Each folder holds an `amd64/` and an `arm64/` subfolder. Open the folder listed for your release, then download the file for your CPU architecture.

If your distribution is not listed, check which WebKitGTK version it provides before you download:

```bash
# Debian and Ubuntu
apt-cache policy libwebkit2gtk-4.1-0 libwebkit2gtk-4.0-37

# Fedora, RHEL, Rocky Linux, and AlmaLinux
dnf list webkit2gtk4.1 webkit2gtk3
```

If the WebKitGTK 4.1 library is available, use `modern-distros`. If only the 4.0 library is available, use `legacy-distros`. If neither library is available, your distribution does not package WebKitGTK. Install it before you run the application, then use the folder that matches the version you installed.

Installing a `.deb` or `.rpm` requires administrator (`sudo`) privileges. From your Downloads folder, install the package that matches your architecture and WebKitGTK build. The package manager also installs the WebKitGTK, GTK 3, and OpenSSL 3 libraries the application requires. In the following commands, `<arch>` is `amd64` or `arm64`, and `<abi>` is `4.0` or `4.1`:

```bash
# Debian and Ubuntu
sudo apt install ./solace-agent-mesh-<version>-desktop-linux-<arch>-webkit2gtk-<abi>.deb

# Fedora, RHEL, Rocky Linux, and AlmaLinux
sudo dnf install ./solace-agent-mesh-<version>-desktop-linux-<arch>-webkit2gtk-<abi>.rpm
```

Then open Agent Mesh from your applications menu. The application opens; if no model is configured yet, it prompts you to set one up.

To install without administrator privileges, use the portable archive instead of a package. It runs from a folder your account owns and does not require `sudo`. The archive does not install dependencies, so the matching runtime libraries must already be present on the system:

- Debian and Ubuntu, 4.0 build: `libwebkit2gtk-4.0-37`, `libgtk-3-0`, and `libssl3`
- Debian and Ubuntu, 4.1 build: `libwebkit2gtk-4.1-0`, `libgtk-3-0`, and `libssl3`
- RHEL 9, Rocky Linux 9, and AlmaLinux 9, 4.0 build: `webkit2gtk3`, `gtk3`, and `openssl-libs`
- Fedora, 4.1 build: `webkit2gtk4.1`, `gtk3`, and `openssl-libs`

Extract the archive and run the application:

```bash
tar -xzf solace-agent-mesh-<version>-desktop-linux-<arch>-webkit2gtk-<abi>.tar.gz
./solace-agent-mesh-desktop/solace-agent-mesh
```

To add an applications-menu entry for your account, also without `sudo`, run `./solace-agent-mesh-desktop/install.sh`.

## Configuration

The desktop bundle runs with bundled default settings. The only setup it requires is a model. On a first launch, a model setup dialog opens so you can connect an LLM provider; if you dismiss it or skip that step, a notification at the top of the window lets you set a model up later. The built-in agents use the model once it is configured. To add or change models later, see [Configuring Models](../building/models/index.md).

The desktop bundle does not expose the infrastructure configuration that a production deployment requires, such as a connection to a separate, production-grade Solace event broker, persistent artifact storage, and authentication. Those settings apply when you deploy Agent Mesh for production. See [Moving to Production](#moving-to-production).

### Advanced Configuration with Environment Variables

The desktop bundle runs with bundled defaults, but you can override its settings with environment variables to evaluate features that the defaults leave off, such as connecting to a separate Solace event broker or enabling role-based access control (RBAC). On startup, the desktop bundle reads a `.env` file from the home folder and applies every variable it defines:

- macOS: `~/Library/Application Support/sam/.env`
- Windows: `%AppData%\sam\.env`
- Linux: `~/.config/sam/.env`

Restart the application after you edit the file so the new values take effect.

As an example, the following `.env` connects the desktop bundle to a separate Solace event broker instead of the in-memory one, which is what enables event-broker-backed features such as the event mesh gateway and event mesh connector:

```bash
SOLACE_DEV_MODE=false
SOLACE_BROKER_URL=wss://your-broker.messaging.solace.cloud:443
SOLACE_BROKER_VPN=your-vpn
SOLACE_BROKER_USERNAME=your-username
SOLACE_BROKER_PASSWORD=your-password
```

You must set `SOLACE_DEV_MODE=false`: the desktop bundle uses its in-memory event broker by default, so setting `SOLACE_BROKER_URL` alone is not enough. To return to the in-memory event broker, remove these variables (or set `SOLACE_DEV_MODE=true`) and restart. Because a `.env` file can hold credentials, keep it readable only by your own account.

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

## Use the `sam` CLI From Your Desktop Installation

The desktop bundle includes the `sam` command line interface, so you don't need a separate download. If you're already using the desktop app, you can enable the CLI by adding it to your `PATH`.

**On Windows:**

The CLI is a separate executable, in the installation's `cli` subfolder. To add that folder to your user `PATH`, open PowerShell and run:

```powershell
$SamCli = "$env:LOCALAPPDATA\Programs\Solace Agent Mesh\cli"
$UserPath = [Environment]::GetEnvironmentVariable('Path', 'User')

if ($UserPath -notlike "*$SamCli*") {
    [Environment]::SetEnvironmentVariable('Path', "$UserPath;$SamCli", 'User')
}

$env:Path += ";$SamCli"
```

These commands change only your own user environment, so they require no administrator privileges. Running them a second time makes no further changes. To confirm the CLI is available, run `sam --help` in the same window. Terminal windows that were already open do not inherit the new `PATH` until you reopen them.

To set your user `PATH` manually instead:

1. Open the Start menu, search for "Edit environment variables for your account", and open it.
2. Under **User variables**, select **Path**, then click **Edit**.
3. Click **New**, and add:

   ```text
   %LOCALAPPDATA%\Programs\Solace Agent Mesh\cli
   ```

4. Click **OK** to close each dialog.
5. Open a new terminal window and run `sam --help` to confirm.

**On macOS:**

The application binary is also the CLI. Add an alias to your shell profile (no administrator privileges required):

```bash
echo "alias sam='/Applications/Solace\ Agent\ Mesh.app/Contents/MacOS/sam-desktop'" >> ~/.zshrc
source ~/.zshrc
```

If you have administrator privileges and prefer a real command on `PATH` instead of an alias:

```bash
sudo ln -s "/Applications/Solace Agent Mesh.app/Contents/MacOS/sam-desktop" /usr/local/bin/sam
```

:::tip
Both commands above assume the default location. If you dragged the application to a folder your account owns, replace `/Applications` with that folder, such as `$HOME/Desktop`. Use `$HOME` rather than `~`, because `~` is not expanded inside the double quotes of the symlink command and produces a broken link.
:::

**On Linux:**

The package already puts `solace-agent-mesh` on your `PATH`. To use the shorter name, add an alias: `alias sam='solace-agent-mesh'`.

:::note
On macOS and Linux, the CLI and the app are the same binary, so running `sam` with no arguments opens the desktop app instead of printing help. Run `sam --help` in a new terminal to confirm the CLI is working.
:::

For the full command set, see [CLI Reference](../reference/cli.md). To let an AI coding assistant build for Agent Mesh with this CLI, see [Building with an AI Coding Assistant (Early Access)](../building/ai-coding-assistant.md).

## Data and Logs

The desktop bundle keeps all of its state in a single home folder:

- macOS: `~/Library/Application Support/sam`
- Windows: `%AppData%\sam` (for example, `C:\Users\<user>\AppData\Roaming\sam`)
- Linux: `~/.config/sam`

This folder holds your configuration, the local database where the application stores the agents, models, and sessions you create, and a `diagnostics` folder with the application log and crash reports.

:::tip
In the desktop bundle, you can download the `diagnostics` folder as a single archive rather than locating it yourself. In the left navigation sidebar, select **User Account**, then select **Support** in the **User Account Settings** dialog. Select **Download Diagnostics Zip**, then select where to save the archive. The archive contains the application log, any crash reports, and a summary of the version and platform you are running. It never includes your sessions, artifacts, API keys, or other credentials.

To browse the same files in place, select **Open Diagnostics Folder**.
:::

To start fresh, quit the application and delete the home folder. The next launch recreates it with bundled defaults.

:::warning
Deleting the folder permanently removes all of your local data.
:::

## Moving to Production

The desktop bundle runs everything in one process with the in-memory event broker and does not use production-grade storage, so it is not supported for team or production workloads.

What you build while evaluating carries forward. Agent Mesh uses one declarative configuration model across every environment. The agents, models, entrypoints, and tools you define in the desktop bundle are expressed as the same configuration a production deployment applies, so the definitions you validate here carry forward rather than being rebuilt for production. For how Agent Mesh manages this configuration, see [Managing Configuration as Code (Early Access)](../building/declarative-config/index.md).

Pull that configuration out of the desktop app with the reserved `desktop` target, then apply it to a deployment:

```bash
sam config pull -o ./pulled --target desktop --manifest-name manifest.yaml
sam config apply -m ./pulled/manifests/manifest.yaml --target prod
```

You don't need to look up a URL or sign in: `--target desktop` resolves to the running desktop app's actual address, even if it's not on the default port. See [Targets and Authentication](../building/declarative-config/targets-and-authentication.md) for the full picture.

Agent Mesh offers these production paths:

- Agent Mesh Cloud is a managed service that Solace hosts and operates. See [Agent Mesh Cloud](https://docs.solace.com/Agent-Mesh/Cloud/agent-mesh-manager.htm).
- A Kubernetes deployment runs Agent Mesh in your own cluster with a separate, production-grade Solace event broker, persistent storage, and authentication. See [Deploying with Kubernetes](./kubernetes/index.md).

## Next Steps

Now that Agent Mesh is running, the most common next step is to build an agent of your own. See [Create Your First Agent](../getting-started/your-first-agent.md).
