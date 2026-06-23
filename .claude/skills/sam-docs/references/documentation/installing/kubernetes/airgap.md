---
title: Installing in an Air-Gapped Environment
description: Deploy Solace Agent Mesh on Kubernetes in disconnected environments — obtaining the delivery package, loading images into a private registry, and deploying without internet access.
sidebar_position: 353
---

# Installing in an Air-Gapped Environment

<!-- WRITER NOTE: Source: enterprise/airgap-kubernetes.md in the Python repo. Review and update against the current Go chart before publishing. Do NOT copy/paste. -->

This guide covers deploying Agent Mesh in a Kubernetes environment that has no outbound internet access. You obtain the container images and Helm chart on a machine with internet access, transfer them to your private registry, and install from there.

## Prerequisites

- A machine with internet access to download the delivery package.
- A private container image registry accessible from your Kubernetes cluster.
- A running Kubernetes cluster with sufficient resources for a production deployment.
- `kubectl` and Helm 3 installed.
- A Solace event broker accessible from within the air-gapped network.
- A Postgres database accessible from within the air-gapped network.
- An S3-compatible object store accessible from within the air-gapped network.
- An LLM provider accessible from within the air-gapped network (self-hosted model or private network path to a provider endpoint).
- TLS certificates for your domain.

<!-- WRITER NOTE: Add any version requirements. Clarify what "delivery package" consists of — which images are included, where to download them, and how to verify integrity. Note that all dependencies must be reachable without outbound internet access. -->

## Obtain the Delivery Package

<!-- WRITER NOTE: Numbered steps with verifiable results. Cover: where to download the images and Helm chart, how to verify the package integrity (checksums), and what the package contains. -->

*Content forthcoming.*

## Load Images Into Your Private Registry

<!-- WRITER NOTE: Numbered steps with verifiable results. Cover: how to tag and push each image to the private registry, how to verify the images are available in the registry. -->

*Content forthcoming.*

## Configure and Deploy

<!-- WRITER NOTE: Numbered steps. Cover: configure values.yaml to point to the private registry (image.repository overrides), disable any chart dependencies that require internet access, install the chart. State the result of each step. -->

*Content forthcoming.*

## Verify the Deployment

<!-- WRITER NOTE: Same as production verification: health endpoints, Web UI load, connectivity checks. State what a healthy response looks like. -->

*Content forthcoming.*

## Next Steps

- For full production configuration, see [Installing Kubernetes for Production](./production.md).
- For monitoring setup, see [Monitoring Your Deployment](../monitor.md).
