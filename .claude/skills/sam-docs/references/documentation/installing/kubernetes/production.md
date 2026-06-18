---
title: Installing Kubernetes for Production
description: Full production Kubernetes deployment with external broker, managed databases, object storage, OIDC authentication, TLS, and RBAC.
sidebar_position: 352
---

# Installing Kubernetes for Production

<!-- WRITER NOTE: Source: enterprise/production-kubernetes.md in the Python repo. Review and update every detail against the current Go Helm chart before publishing. Do NOT copy/paste. -->

This guide covers a full production deployment of Agent Mesh on Kubernetes. Unlike the Quick Start, this deployment uses an external Solace event broker, external persistent storage, TLS, and authentication. Complete [Before You Begin](../before-you-begin.md) and the [Kubernetes Quick Start](./quickstart.md) before following this guide.

## Prerequisites

- A running Kubernetes cluster with sufficient resources for a multi-component deployment.
- `kubectl` installed and configured to talk to your cluster.
- Helm 3 installed.
- A Solace event broker (Solace Cloud or self-hosted PubSub+). Connection details required: host, port, credentials, Message VPN name.
- A Postgres database for session storage.
- An S3-compatible object store (AWS S3, GCS, or Azure Blob) for artifact storage.
- An LLM API key.
- TLS certificates for your domain.
- An OIDC identity provider if you are enabling authentication.

<!-- WRITER NOTE: Add minimum Kubernetes version, minimum node resource requirements (CPU, RAM per node, node count). Specify whether the Helm chart requires any specific Kubernetes features or admission controllers. -->

## Configure Your Helm Values

<!-- WRITER NOTE: Numbered steps. Cover: create a values.yaml file; configure the event broker connection block; configure the LLM provider; configure Postgres for session storage; configure S3-compatible artifact storage; configure TLS; configure OIDC authentication if applicable. For each block, show the relevant values.yaml shape and explain each required field. State the result of completing the values file. -->

*Content forthcoming.*

## Deploy Agent Mesh

<!-- WRITER NOTE: Numbered steps with verifiable results. Cover: add the Helm repo (if not already done), install the chart passing your values file, and verify the rollout. Include the commands to check that all pods reach Running status and that the health endpoints respond correctly. -->

*Content forthcoming.*

## Verify the Deployment

<!-- WRITER NOTE: Numbered steps. Cover: health endpoint check for each component, Web UI load, LLM connectivity test, event broker connectivity test. State what a healthy response looks like at each check. -->

*Content forthcoming.*

## Next Steps

- To configure logging and metrics, see [Monitoring Your Deployment](../monitor.md).
- For RBAC setup, see [RBAC Reference](../../reference/rbac-reference.md).
- For the production readiness checklist, see [Production Readiness Checklist](../../administering/production-readiness-checklist.md).
