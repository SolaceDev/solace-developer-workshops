---
title: Installing in an Air-Gapped Environment
description: Deploy Agent Mesh on Kubernetes in disconnected environments by obtaining the delivery package, loading images into a private registry, and installing without internet access.
sidebar_position: 353
---

# Installing in an Air-Gapped Environment

This guide covers deploying Agent Mesh in a Kubernetes environment that has no outbound internet access. You obtain the container images and Helm chart on a machine with internet access, transfer them to your private registry, and install from there.

## Prerequisites

Before you begin, make sure you have the following:

- A running Kubernetes cluster on version 1.33 or later.
- Cluster nodes sized for your chosen deployment type. For sizing guidance, see [Compute Resources](./compute-resources.md).
- `kubectl` installed and configured to talk to your cluster.
- The Helm command-line interface (CLI) version 3.0 or later.
- A machine with outbound internet access to `products.solace.com` to download the Helm chart and image archives. To mirror images by pulling them directly instead, the machine also needs access to `gcr.io/gcp-maas-prod` (the Solace container registry).
- A private container image registry that the Kubernetes cluster can reach, with credentials that can push and pull images.

Air-gapped installation follows the same steps as a connected install, except that your private registry serves the container images. For the deployment-type prerequisites, see [Kubernetes Quick Start](./quickstart.md) for an evaluation install or [Installing Kubernetes for Production](./production.md) for a production install.

Every service that Agent Mesh depends on must be reachable from within the air-gapped network. An evaluation install requires only the large language model (LLM) provider to be reachable. A production install also requires the external event broker, database, and object store.

## Plan Network Connectivity

An air-gapped install does not require outbound internet access, but the cluster must still reach the in-network services that Agent Mesh depends on, and users must be able to reach the Console. Open the following ports across your network and firewalls before you install. The port numbers are the defaults; substitute the ports your own endpoints use.

### Egress (Outbound From the Cluster)

These are the outbound connections the cluster makes on behalf of Agent Mesh. Each destination is a host inside your network, not on the public internet.

| Destination | Default port | When required |
|---|---|---|
| Private container registry | 443 (HTTPS) | Always. The cluster pulls every image from your registry during install and upgrade. |
| LLM provider endpoint | 443 (HTTPS) | Always. Agent Mesh has no built-in model; agents call the endpoint you configure under `llmService`. |
| External event broker | 55443 (SMF over TLS) | Production only. A `tcps://` connection uses 55443; a plaintext `tcp://` connection uses 55555. |
| External database (PostgreSQL) | 5432 | Production only. |
| External object store (S3-compatible) | 443 (HTTPS) | Production only. Use the port your endpoint exposes. |
| OIDC or OAuth identity provider | 443 (HTTPS) | When you enable authentication. |

An evaluation install opens only the private registry and the LLM endpoint, because it runs the embedded event broker and bundled persistence inside the cluster. A production install adds the external event broker, database, and object store, plus the identity provider when authentication is enabled.

If your environment routes outbound traffic through a forward proxy, set the proxy variables under `environmentVariables` instead of opening these destinations directly:

```yaml
environmentVariables:
  HTTPS_PROXY: "http://proxy.internal.corp:8080"
  HTTP_PROXY: "http://proxy.internal.corp:8080"
```

The chart's default `NO_PROXY` excludes only in-cluster traffic—the embedded event broker, database, and object store, which an evaluation install reaches over cluster-internal addresses. A production install that puts an external event broker, database, or object store behind the same forward proxy must extend `NO_PROXY` with those services' hostnames, so the cluster reaches them directly instead of through the proxy.

### Ingress (Inbound to the Cluster)

These are the connections that users and clients make to reach the Console and its APIs.

| Source | Default port | Routes to container port |
|---|---|---|
| Users (HTTP) | 80 | 8080 |
| Users (HTTPS) | 443 | 8443 |

The HTTPS port is added when you enable TLS on the service. You open the port on the ingress controller or load balancer that fronts the deployment, not on the cluster itself: the Console containers listen on 8080 and 8443 internally, and your edge forwards to them. The externally reachable port is therefore whichever one your ingress or load balancer terminates—commonly 443. NodePort exposure instead assigns ports in the 30000–32767 range. For the access methods and ingress values, see [Installing Kubernetes for Production](./production.md). An evaluation install reaches the Console through a port-forward and needs no inbound port opened.

Agent Mesh does not phone home: it makes no connection to Solace or to any model vendor for licensing, telemetry, or update checks.

## Stage the Container Images

On a machine with internet access, download the artifacts, verify them, then transfer them into the air-gapped network.

1. Download the Helm chart from `Charts/` and the container image archives. A connected install pulls the images from the Solace registry, but an air-gapped cluster cannot reach it, so you download the image archives from `Images/` instead. For the portal navigation and the image set each deployment type requires, see [Obtain the Delivery Package](../before-you-begin.md#obtain-the-delivery-package).
2. Verify each download against `bom.yaml`. For example, using your host CLI, such as bash, run the following command:

   ```bash
   sha256sum <file>
   ```

   The output matches the `file_checksum` value for that file, without the `sha256:` prefix.
3. Transfer the Helm chart, the image archives, and `bom.yaml` into the air-gapped network.
4. Load the image archives into a private registry that your cluster can reach, using the registry tooling your environment already uses. The next section points the chart at this registry.

## Third-Party Images

Not every image the chart deploys is a Solace component. The bundled persistence layer pulls two third-party images:

| Image | Component | Used for |
|---|---|---|
| `postgres` | PostgreSQL | The bundled database, and a database init container that creates the application users and schemas (pulled even with an external database). |
| `chrislusf/seaweedfs` | SeaweedFS | The bundled S3-compatible object store for artifacts. |

These are **unmodified upstream images**, included only for convenience so that evaluation and air-gapped installs run without standing up external datastores first. Solace does not repackage or relicense them; each retains its own upstream license, held by its respective project (see [Obtain the Delivery Package](../before-you-begin.md#obtain-the-delivery-package)).

Because they are stock upstream images, you can verify them independently rather than trusting the delivery package alone. Use any of the following methods:

- Match each loaded image against the `image_id` recorded in `bom.yaml`, alongside the `file_checksum` download check in [Stage the Container Images](#stage-the-container-images).
- Pull the same tag directly from the upstream registry and compare digests, or build the image from the project's own source.
- Supply your own vetted equivalent by pointing `persistence-layer.postgresql.image` and `persistence-layer.seaweedfs.image` (or the `samDeployment.dbInit.image` and `samDeployment.s3Init.image` init containers) at an image you have mirrored. For every value, see [Helm Values Reference](../../reference/helm-values.md).

For production, you typically replace the bundled datastores entirely with your own managed database and object store, so the chart deploys neither image. See [Installing Kubernetes for Production](./production.md).

## Configure and Deploy

An air-gapped install adds one change to a standard install: it points the chart at your private registry instead of the Solace registry. Create an `airgap-values.yaml` file with that override, then install the chart with it.

1. Redirect all images to your private registry:

   ```yaml
   global:
     imageRegistry: registry.internal.example.com
   ```

   The chart builds every image reference as `<registry>/<repository>:<tag>`, so set `global.imageRegistry` to your private registry, including any project or namespace path your registry uses. To mirror only some images, set `image.registry` on the individual component instead. For every value, see [Helm Values Reference](../../reference/helm-values.md).

2. Add authentication for your private registry by referencing a pre-created pull secret:

   ```yaml
   global:
     imagePullSecrets:
       - your-registry-secret
   ```

   As an alternative, supply a Docker config JSON file at install time with `--set-file global.imagePullKey=...`. The two options are mutually exclusive.

3. For a production install, add the external event broker, database, object store, ingress, and authentication values to the same file. These values are the same as a connected install. For them, see [Installing Kubernetes for Production](./production.md). An evaluation install needs no further values, because it uses the embedded event broker and bundled persistence.

4. Install the chart archive you transferred in [Stage the Container Images](#stage-the-container-images), passing your values file. Replace the path with the location of that `.tar.gz` file:

   ```bash
   helm install sam /path/to/solace-agent-mesh-<version>.tar.gz \
     --namespace sam \
     --create-namespace \
     -f airgap-values.yaml
   ```

   The chart pulls every image from your private registry. Watch the pods until each one reaches `Running` status:

   ```bash
   kubectl get pods -n sam -l app.kubernetes.io/instance=sam -w
   ```

## Verify the Deployment

Verify an air-gapped deployment the same way as a connected install. Check the entrypoint and platform health endpoints, substituting the address for your deployment:

```bash
curl -s https://<your-dns-name>/health
curl -s https://<your-dns-name>/api/v1/platform/health
```

Both endpoints return a successful response when Agent Mesh is running correctly. A production install reaches these endpoints through its ingress hostname. An evaluation install reaches them through a port-forward to the Console service.

Confirm the Console loads, the event broker connection succeeds in the logs, and a test message in Chat returns a response. These checks are the same as a connected install. For an evaluation install, see [Kubernetes Quick Start](./quickstart.md). For a production install, see [Installing Kubernetes for Production](./production.md).

## Next Steps

- For every Helm chart value, see [Helm Values Reference](../../reference/helm-values.md).
- For monitoring setup, see [Monitoring Your Deployment](../monitor.md).
