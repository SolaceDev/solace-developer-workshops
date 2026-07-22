---
title: Deploying with Kubernetes
description: Deploy Agent Mesh on Kubernetes using the Helm chart — quick start evaluation, production deployment, and air-gapped environments.
sidebar_position: 0
---

# Deploying with Kubernetes

Agent Mesh is deployed on Kubernetes using a Helm chart. Three deployment paths are available depending on your use case.

| Path | Use case | External dependencies |
|---|---|---|
| [Kubernetes Quick Start](./quickstart.md) | Evaluation and proof of concept | None—event broker and storage are embedded |
| [Installing Kubernetes for Production](./production.md) | Team and production deployments | External event broker, Postgres, and artifact storage required |
| [Installing in an Air-Gapped Environment](./airgap.md) | Disconnected or restricted network environments | Same as production, but all dependencies must be accessible within the air-gapped network; private image registry also required |

The Quick Start is not suitable for production use. It embeds a development event broker and ephemeral storage that are not supported for workloads serving real traffic.

For CPU and memory sizing guidance for production Kubernetes deployments, see [Compute Resources](./compute-resources.md).

To run workloads under a sandboxed container runtime such as gVisor or Kata Containers, see [Sandbox Pod Runtimes](./sandbox-pod-runtimes.md).

For prerequisites that apply to all Kubernetes deployments, see [Before You Begin](../before-you-begin.md).
