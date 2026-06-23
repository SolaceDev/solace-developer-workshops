---
title: Installing the CLI Binary
description: Download and install the sam CLI binary for local development on macOS, Linux, or Windows.
sidebar_position: 330
---

# Installing the CLI Binary

<!-- WRITER NOTE: Source: CLI section of archive/installing/install.md. Rewrite to Solace style. Do NOT copy/paste. -->

The CLI binary lets you build and run Agent Mesh projects locally. It includes a development event broker so you can get started without an external Solace event broker, and supports connecting to your own event broker when you're ready.

## Prerequisites

<!-- WRITER NOTE: List requirements: OS and version, architecture, RAM, disk. LLM API key (required—cover which environment variable to set per provider). For connecting to an external event broker: refer to Before You Begin. -->

*Content forthcoming.*

## Install the CLI Binary

<!-- WRITER NOTE: Numbered steps with verifiable results. Cover: where to download the binary for each platform, how to install it on PATH, how to verify the installation (sam-enterprise --version or equivalent produces version output). -->

1. [Download the CLI binary for your platform from [location].] The binary file appears in your Downloads folder.

2. [Move the binary to a directory on your PATH — for example, `/usr/local/bin` on macOS and Linux.]

   ```bash
   [mv or install command here]
   ```

   The binary is now available system-wide.

3. Verify the installation:

   ```bash
   sam-enterprise --version
   ```

   The version number prints in the terminal — for example, `sam-enterprise version 1.x.x`.

## Run Your First Project

<!-- WRITER NOTE: Numbered steps. Cover: scaffold a project directory, set your LLM API key, run the binary in embedded mode (sam-enterprise run --embedded or equivalent). State the result of each step—what appears in the terminal when Agent Mesh is running and ready. -->

1. Create a project directory and add your configuration files. See [Building Your First Project](../getting-started/build-your-first-project.md) for a complete walkthrough. The directory contains a `configs/` folder with your YAML files.

2. [Export your LLM API key as an environment variable.]

   ```bash
   export [PROVIDER_API_KEY_VAR]=[your-api-key]
   ```

3. [Start Agent Mesh in embedded mode, pointing at your configs directory.]

   ```bash
   sam-enterprise run --embedded configs/
   ```

   The terminal prints startup output and settles on a line indicating the gateway is ready — for example, `INFO SAM is running in embedded mode gateway=:8800`.

## Next Steps

- To build your first configured agent, see [Building Your First Project](../getting-started/build-your-first-project.md).
- To configure your event broker connection, LLM provider, and storage, see [Configuring Agent Mesh](./configure.md).
