---
title: Deploying with Docker
description: Pull the Solace Agent Mesh container image and run a single-container or multi-container deployment.
sidebar_position: 340
---

# Deploying with Docker

<!-- WRITER NOTE: Source: Docker section of archive/installing/install.md. Rewrite to Solace style. Do NOT copy/paste. -->

The Docker deployment runs Agent Mesh as a container on a single host. Use this option for team deployments, CI/CD environments, or when you want a portable, reproducible setup without Kubernetes.

## Prerequisites

- Docker installed and running on the host machine.
- A running Solace event broker. For setup options, see [Before You Begin](./before-you-begin.md).
- An LLM API key set as an environment variable.

<!-- WRITER NOTE: Add any version requirements for Docker, minimum host resource requirements, and any additional prerequisites specific to multi-container setups. -->

## Deploy Agent Mesh

<!-- WRITER NOTE: Numbered steps with verifiable results. Cover: pull the image, set required environment variables (event broker connection, LLM key), run the container (single-container and/or Docker Compose). State what the user sees at each step—container output, health endpoint response. Include the health check command and expected response. -->

1. Pull the Agent Mesh container image:

   ```bash
   docker pull [image:tag]
   ```

   The image downloads and the terminal reports its progress and final digest.

2. [Set your environment variables — event broker connection details, LLM API key, and any other required values. Describe whether to use a `.env` file, inline flags, or Docker Compose.]

3. [Start the container, passing your configuration file and environment variables.]

   ```bash
   [docker run command here]
   ```

   Agent Mesh starts and the terminal shows log output as each component initializes.

## Verify the Deployment

<!-- WRITER NOTE: How to confirm Agent Mesh is running: health endpoint URL and expected response, Web UI URL and what the user should see on first load. -->

1. Check the health endpoint:

   ```bash
   curl -fsS http://localhost:[port]/health
   ```

   A `200 OK` response with the body `{"status":"healthy"}` confirms all components are running correctly.

2. Open `http://localhost:[port]` in a browser. The Agent Mesh Web UI loads and the agent picker is visible.

## Next Steps

- To configure your event broker connection, LLM provider, storage, and authentication, see [Configuring Agent Mesh](./configure.md).
- To set up logging and metrics, see [Monitoring Your Deployment](./monitor.md).
