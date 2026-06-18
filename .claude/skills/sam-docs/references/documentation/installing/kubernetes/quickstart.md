---
title: Kubernetes Quick Start
description: Deploy Solace Agent Mesh on Kubernetes in minutes using the Helm chart with embedded broker, Postgres, and storage. Evaluation and POC use only.
sidebar_position: 351
---

# Kubernetes Quick Start

<!-- WRITER NOTE: Source: enterprise/quickstart-kubernetes.md in the Python repo. Review and update every step against the current Go Helm chart before publishing. Do NOT copy/paste. -->

This guide walks you through a minimal Kubernetes deployment of Agent Mesh using the Helm chart. The quick start embeds a development event broker and ephemeral storage so you can get running without external dependencies. It is intended for evaluation and proof of concept only—it is not suitable for production use.

:::warning
The embedded event broker and storage in this deployment are not persistent. Restarting the deployment loses all session history and artifacts. For a production-grade deployment, see [Installing Kubernetes for Production](./production.md).
:::

## Prerequisites

- A running Kubernetes cluster (local or cloud-hosted).
- `kubectl` installed and configured to talk to your cluster.
- Helm 3 installed.
- An LLM API key.

<!-- WRITER NOTE: Add any minimum cluster resource requirements (CPU, memory, node count). Add any version requirements for Kubernetes or Helm. -->

## Deploy Agent Mesh

<!-- WRITER NOTE: Numbered steps with verifiable results. Cover: add the Helm repo, update Helm repos, install the chart with your LLM API key set as a value or secret. State what appears in the terminal when the install command completes. -->

*Content forthcoming.*

## Post-Installation Steps

Complete the following steps after the Helm chart install command returns. Do not skip or reorder them.

<!-- WRITER NOTE: These four steps mirror the GETTING STARTED block in the Helm chart terminal output. They must appear in this exact order. Each step must state its completion signal clearly—especially step 1, which is a blocking gate.

1. Wait for all pods to reach Running status. This is a blocking step—do not proceed until every pod shows Running. Include the exact kubectl command to check pod status and describe what "all Running" looks like in the output.

2. Port-forward the Console UI service to a local port. Include the exact kubectl port-forward command and state what the terminal shows when the tunnel is open.

3. Open the Console in a browser at the forwarded address. State the URL format and what the user should see on the login screen.

4. Configure your LLM API key on first login. Walk through the first-login configuration flow and state what the user sees when configuration is complete and the assistant is ready. -->

*Content forthcoming.*

## Next Steps

- To start building agents, see [Building Your First Project](../../getting-started/build-your-first-project.md).
- To move to a production deployment, see [Installing Kubernetes for Production](./production.md).
