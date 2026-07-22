---
title: Kubernetes Quick Start
description: Deploy Agent Mesh on Kubernetes in minutes using the Helm chart with an embedded event broker, bundled PostgreSQL, and bundled storage. Evaluation and proof of concept use only.
sidebar_position: 351
---

# Kubernetes Quick Start

This guide walks you through a minimal Kubernetes deployment of Agent Mesh using the Helm chart. For the prerequisites common to every install path, see [Before You Begin](../before-you-begin.md).

:::warning Evaluation and Proof of Concept Only
The quick start deploys an embedded event broker and bundled PostgreSQL and object storage. These components are for evaluation only. They do not provide high availability or backup and restore, and they are not sized for production traffic. For a production-grade deployment, see [Installing Kubernetes for Production](./production.md).
:::

## Prerequisites

Before you begin, make sure you have the following:

- A running Kubernetes cluster running version 1.33 or later.
- A node with at least 6 vCPU and 16 GiB of allocatable memory. The embedded event broker and datastore require both the specified minimum vCPU and memory to operate correctly. For sizing guidance, see [Compute Resources](./compute-resources.md).
- `kubectl` installed and configured to talk to your cluster.
- The Helm command-line interface (CLI) version 3.0 or later.
- The Agent Mesh Helm chart archive (`solace-agent-mesh-<version>.tar.gz`) and the image pull credentials file (`sam-pull-credentials.json`). Solace provides both. For how to download the chart, see [Obtain the Delivery Package](../before-you-begin.md#obtain-the-delivery-package). The credentials file is provided separately.
- An API key for a supported large language model (LLM) provider. You enter this key on first login, so you do not need it at install time.

The image pull credentials file must be in `dockerconfigjson` format:

```json
{
  ".dockerconfigjson": "<base64-encoded-auth>"
}
```

:::note Running a Local Cluster?
We recommend that you use a cloud-managed Kubernetes cluster. There are known issues using local Kubernetes clusters on macOS (M-series), Podman, and minikube. If you are evaluating Agent Mesh on a local cluster, address these issues before you install. For more information, see [Local Kubernetes Clusters](../troubleshoot.md#local-kubernetes-clusters).
:::

## Deploy Agent Mesh

The chart defaults are tuned for quick start evaluation, so you do not need a custom values file. You only pass the image pull credentials, shown in the following step.

1. Install the chart, passing the credentials file with `--set-file`:

   ```bash
   helm install sam /path/to/solace-agent-mesh-<version>.tar.gz \
     --namespace sam \
     --create-namespace \
     --set-file global.imagePullKey=sam-pull-credentials.json
   ```

   This command creates the `sam` namespace and installs the release named `sam`. The chart runs a pre-install check before it creates any workload pods. If the check fails, the install command returns an error. For how to read the check logs, see [Kubernetes Installation Issues](../troubleshoot.md#kubernetes-installation-issues).

   The chart defaults deploy the following:

   - An embedded Solace event broker (`global.broker.embedded: true`).
   - Bundled PostgreSQL for session storage and bundled object storage for artifacts (`global.persistence.enabled: true`).
   - The Agent Mesh UI exposed as a `ClusterIP` service, with no external ingress or load balancer.
   - Authorization disabled (`sam.authorization.enabled: false`), so no login is required.

2. Confirm the command completes and prints the post-install output.

   When the install finishes, the terminal prints a `GETTING STARTED` block that lists the commands for your release, including the exact pod-status command, the port-forward command, and the Agent Mesh UI URL. The next section walks through those steps.

:::note Commands Use the Default Release Name
The steps that follow assume the release name `sam` in the `sam` namespace, matching the install command in this guide. The chart prints the same commands with your own release name and namespace substituted. If you used a different release name, use the values from the `GETTING STARTED` output.
:::

## Post-Installation Steps

Complete the following four steps in order after the install command returns. They mirror the `GETTING STARTED` block printed by the chart. Do not skip or reorder them.

### Step 1: Wait for All Pods to Reach Running Status

Watch the pods until every one reaches `Running` status:

```bash
kubectl get pods -n sam -l app.kubernetes.io/instance=sam -w
```

The `-w` flag streams status updates as the pods start. The deployment is ready when every pod shows `Running` in the `STATUS` column and the `READY` column shows all containers ready (for example, `1/1`). This includes the event broker, PostgreSQL, object storage, and the Agent Mesh workloads. Press `Ctrl-C` to stop watching after all pods are `Running`.

:::warning Wait for Every Pod Before You Continue
The Agent Mesh UI is not reachable until the Entrypoint Executor pod is `Running` and ready, and the embedded event broker and datastores take longer to start than the application pods. Do not proceed to step 2 until every pod reports `Running`. Attempting to port-forward or open the UI early is the most common reason the quick start appears to fail.
:::

### Step 2: Port-Forward the Agent Mesh UI

Forward a port to the Web UI entrypoint service:

```bash
kubectl port-forward -n sam svc/sam-solace-agent-mesh-gwe 8080:80
```

The service name follows the pattern `<release>-solace-agent-mesh-gwe`; the chart prints the exact name in its `GETTING STARTED` output. The terminal shows a line similar to `Forwarding from 127.0.0.1:8080 -> 8080`, which confirms the tunnel is open. Leave this command running and open a second terminal for any further commands.

### Step 3: Open the Agent Mesh UI

Open the following address in a browser:

```text
http://localhost:8080
```

The Agent Mesh UI loads. Because authorization is disabled in the quick start configuration, the UI opens directly without a login prompt.

### Step 4: Configure Your LLM API Key

On first use, the Model Configuration prompt appears. Select your LLM provider and enter your API key, then save. After you save, the assistant is ready. Select **Chat** in the left sidebar to send your first message to the orchestrator.

## Troubleshooting

If the install command fails, a pod does not reach `Running` status, or the Agent Mesh UI does not load, see [Kubernetes Installation Issues](../troubleshoot.md#kubernetes-installation-issues). It covers the pre-install check, pods that fail to start, port-forward problems, a blank UI caused by a stale browser cache, and local-cluster issues.

To confirm Agent Mesh is healthy, run the following in a separate terminal while the port-forward from step 2 is still running:

```bash
curl -s http://localhost:8080/health
curl -s http://localhost:8080/api/v1/platform/health
```

Both endpoints return a successful response when Agent Mesh is running correctly.

## Next Steps

- To create, deploy, and chat with your own agent, see [Create Your First Agent](../../getting-started/your-first-agent.md).
- To size a cluster for your own workload, see [Compute Resources](./compute-resources.md).
- To move to a production deployment, see [Installing Kubernetes for Production](./production.md).
