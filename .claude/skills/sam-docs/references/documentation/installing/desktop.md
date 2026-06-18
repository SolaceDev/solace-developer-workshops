---
title: Installing the Desktop Bundle
description: Download and install the Solace Agent Mesh desktop bundle for a five-minute laptop evaluation.
sidebar_position: 320
---

# Installing the Desktop Bundle

<!-- WRITER NOTE: Source: Desktop Bundle section of archive/installing/install.md. Rewrite to Solace style. Do NOT copy/paste. -->

The desktop bundle is the fastest way to try Agent Mesh. It includes everything you need to run on your laptop—no external event broker, no additional configuration required. The bundle is intended for evaluation only and is not suitable for team or production use.

## Prerequisites

<!-- WRITER NOTE: List the minimum requirements: OS and version (macOS/Windows/Linux), architecture (x86_64/arm64), RAM. Note that an LLM API key is required and must be set before or on first launch—cover where to set it. No event broker required. -->

*Content forthcoming.*

## Install the Desktop Bundle

<!-- WRITER NOTE: Numbered steps with verifiable results. Cover: where to download the bundle, how to install per platform (macOS: drag to Applications or run installer; Windows: run installer; Linux: extract and run). Each step should state the action and what the user sees when it completes. -->

1. [Download the desktop bundle for your platform from [location].] The installer file appears in your Downloads folder.

2. [Run the installer — for example, on macOS, open the .dmg and drag Agent Mesh to Applications.] The application appears in your Applications folder / Start menu / application launcher.

3. [Launch Agent Mesh from your Applications folder / Start menu.] The Agent Mesh desktop application opens and displays a prompt to enter your LLM API key.

## Configuration

The desktop bundle runs with bundled default settings. The only required configuration is your LLM API key, which you set on first launch. Other configuration options are not available in the desktop bundle.

To use custom configuration—including connecting to your own event broker, configuring artifact storage, or enabling authentication—use the CLI binary or Docker instead. For more information, see [Configuring Agent Mesh](./configure.md).

## Verify the Installation

<!-- WRITER NOTE: Describe what a successful first launch looks like: what opens, what the user should see, how to confirm the bundled assistant is responding. -->

1. [Send a test message to the bundled assistant — for example, type "Hello" in the chat field and press Enter.] The assistant responds in the chat window, confirming the LLM connection is working.

## Next Steps

- To start building agents, see [Building Your First Project](../getting-started/build-your-first-project.md).
- To move to a configurable installation, see [Installing the CLI Binary](./binary.md) or [Deploying with Docker](./docker.md).
