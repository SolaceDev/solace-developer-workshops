---
title: Compute Resources
description: Advisory CPU and memory requests/limits for the Entrypoint Executor, Agent-Workflow Executor, and Secure Tool Runtime workloads, node-sizing guidance, the bundled event broker cost, and how to size and scale for your own load.
sidebar_position: 354
---

# Compute Resources

This page recommends CPU and memory requests and limits for an Agent Mesh Kubernetes deployment and explains how the event broker topology and agent workload combine with those numbers to determine the size and number of nodes the deployment requires.

The numbers here are advisory starting points, not hard requirements. A 2 vCPU / 8 GB node does not expose 2000m / 8000Mi of allocatable capacity. Kubernetes system components and the cloud provider's DaemonSets reserve a share that varies by provider and by what else runs on the node. Treat the recommendations as a baseline to adjust against observed usage and the cluster's real allocatable capacity. For the deployment layouts these workloads run in, see [Install and Deploy](../index.md).

## Workloads to Size

A distributed Kubernetes deployment runs three long-lived workloads, each as its own pod — the Entrypoint Executor, the Agent-Workflow Executor, and the Secure Tool Runtime:

| Workload | What it does | Primary resource driver |
|---|---|---|
| **Entrypoint Executor** | Hosts the entrypoints (HTTP and SSE, sessions, auth, serving the Agent Mesh UI) | Concurrent user connections and SSE fan-out |
| **Agent-Workflow Executor** | Runs agents and workflows | Number of bound agents and their context size |
| **Secure Tool Runtime** | Executes tools in a sandbox (Python and Go tool binaries) | Memory of tool subprocesses (LibreOffice, ffmpeg, Chromium) |

The Solace event broker and the persistence layer (database and object storage) are sized separately. See [Event Broker and Persistence Topology](#event-broker-and-persistence-topology).

## Recommended Requests and Limits

These values are the chart defaults. Because the chart applies them unless overridden, a default install is already Burstable (see [Performance Profile](#performance-profile)) rather than BestEffort. They keep requests modest so the three workloads schedule on a constrained cluster, and limits generous so each workload has room to absorb load spikes.

| Workload | CPU request | CPU limit | Memory request | Memory limit |
|---|---|---|---|---|
| **Entrypoint Executor** | 500m | 4 | 1Gi | 2Gi |
| **Agent-Workflow Executor** | 1 | 4 | 1Gi | 2Gi |
| **Secure Tool Runtime** | 500m | 4 | 2Gi | 4Gi |

The Agent-Workflow Executor takes the highest CPU request because it runs the agents and workflows and is the heaviest of the three at steady state. The chart applies these defaults automatically. Override them per workload when observed usage warrants it:

```yaml
# my-values.yaml
samDeployment:
  gwe:
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: "4"
        memory: 2Gi
  awe:
    resources:
      requests:
        cpu: "1"
        memory: 1Gi
      limits:
        cpu: "4"
        memory: 2Gi
  str:
    resources:
      requests:
        cpu: 500m
        memory: 2Gi
      limits:
        cpu: "4"
        memory: 4Gi
```

### Understanding the Numbers

A request is the amount the scheduler reserves for a pod and the floor Kubernetes protects when a node is under memory pressure. A limit is the maximum the container may consume. CPU and memory limits are enforced differently:

- A container that reaches its CPU limit is throttled. It runs more slowly but continues to operate.
- A container that exceeds its memory limit is terminated and restarted by Kubernetes (an out-of-memory kill).

Because a CPU limit can be exceeded without affecting availability and a memory limit cannot, set CPU limits generously and treat the memory limit as the workload's stability boundary. Provision memory for the workload's peak with headroom, and allow CPU to run nearer its limit.

## Performance Profile

The ratio between a workload's request and its limit determines its Kubernetes quality-of-service class. Because the chart sets requests below limits, the workloads run as Burstable. Each is guaranteed its request and may consume spare node capacity up to its limit. That additional capacity is available only when the node is not contended, and Burstable pods are evicted before pods that reserve their full limit when a node runs short of memory.

The Burstable profile minimizes the default resource footprint while still allowing workloads to absorb load spikes. On a busy or shared cluster where more predictable performance is required, raise the requests closer to the limits to reserve more capacity in advance, in exchange for lower workload density per node.

## Node Sizing

Size a node by its allocatable capacity, not its nominal instance size. A node does not offer its full nominal CPU and memory. Kubernetes and the cloud provider's system components reserve a share that varies by provider. Confirm what a node actually offers before relying on it:

```bash
kubectl describe node <node-name> | grep -A6 Allocatable
```

For a distributed deployment with an external event broker and persistence (the production layout), the three workloads reserve ~2 vCPU / ~4 GiB in total, so the node needs at least that much allocatable free after system overhead. To give them room to burst under load, use a node with 4 vCPU / 16 GiB allocatable. If the Entrypoint Executor, Agent-Workflow Executor, and Secure Tool Runtime run on separate nodes, each needs only its own slice plus headroom.

If the bundled event broker and persistence also run on the same cluster (a proof-of-concept or development layout; see [Event Broker and Persistence Topology](#event-broker-and-persistence-topology)), the event broker alone requires roughly 2 vCPU / 3.5 GiB more. Size that cluster for 6 vCPU / 16 GiB allocatable or more so the event broker, database, and object store leave sufficient headroom for the Agent Mesh workloads.

:::note Sandbox runtimes add overhead
A Kubernetes sandbox runtime (gVisor or Kata, opted in per workload via `global.podRuntimes` and `samDeployment.<component>.podRuntime`) consumes CPU and memory on top of the container's own requests and limits. The tax varies. gVisor is modest, while VM-based Kata is heavier depending on how it is provisioned. Record that overhead on the RuntimeClass (its `overhead` field) so the scheduler reserves for it, and add it to the node's allocatable budget when sizing.
:::

## Event Broker and Persistence Topology

The single largest cost decision is whether the event broker and datastores run inside the cluster or as external services. It affects both node cost and where that cost lands.

| | Bundled (`global.broker.embedded: true`, `global.persistence.enabled: true`) | External (production) |
|---|---|---|
| Event Broker | A Solace event broker pod, 2 vCPU / 2480Mi memory (request equals limit), plus ~1Gi of RAM for its shared-memory buffer and a 7Gi persistent disk | A managed or self-hosted Solace event broker sized and billed on its own terms |
| Persistence | Bundled database and object-storage pods on the node | Managed database and S3-compatible object storage |
| Where cost lands | All inside the cluster's node-hours | Event broker and storage are separate line items, and the cluster carries only the Entrypoint Executor, Agent-Workflow Executor, and Secure Tool Runtime |
| Use it for | Proof-of-concept and development | Production |

The bundled event broker is resource-heavy, and its reservation is fixed: it holds 2 vCPU and about 3.5 GiB of RAM for itself whether idle or busy. On a 2-vCPU node, the event broker alone consumes nearly all available CPU, leaving little for the Entrypoint Executor, Agent-Workflow Executor, and Secure Tool Runtime. Use the bundled event broker for proof-of-concept and development only. Production deployments use an external event broker instead.

For production, run an external event broker, database, and object store:

```yaml
# my-values.yaml
global:
  broker:
    embedded: false
  persistence:
    enabled: false
```

This removes the event broker's ~2 vCPU / ~3.5 GiB, along with the bundled database and object-store pods, from the cluster. Node cost then scales with the Entrypoint Executor, Agent-Workflow Executor, and Secure Tool Runtime footprint and the workload. See [Sizing and Scaling](#sizing-and-scaling). For more about wiring an external event broker and persistence, see [Configuring Agent Mesh](../configure.md).

## Sizing and Scaling

Treat the recommended limits as a baseline and tune them against real traffic. The resources a deployment needs depend on how many users it serves concurrently and the type of work they perform, so deploy with the defaults, observe the workloads under realistic load, and adjust the limits from those measurements.

Each workload runs as a single pod, and the chart does not provision replicas. Scale a workload by raising its CPU and memory limits, and by moving it to a larger node when the current node lacks capacity.

### What Drives Each Workload

| Workload | Load grows with | Watch |
|---|---|---|
| Entrypoint Executor | Concurrent sessions and in-flight tasks, each held in memory until it finishes | Memory |
| Agent-Workflow Executor | Number of agents, their context size, concurrent tasks, and artifact size | Memory |
| Secure Tool Runtime | Concurrent tool runs, each an isolated subprocess (LibreOffice, ffmpeg, Chromium are the heaviest) | CPU and memory |

### Right-Size From the Workload

1. Run representative traffic at the expected peak.
2. Record each workload's peak memory with `kubectl top pod <pod>` or the `container_memory_working_set_bytes` metric.
3. Set the memory limit 25 to 50 percent above that peak.
4. Re-run at peak. If a pod still restarts with `OOMKilled`, raise the limit and repeat.

Increase CPU only when latency at peak is unacceptable and the affected workload is the one constrained on CPU. The default 4-core limit provides substantial headroom above typical steady-state CPU use.

### Find the Constraint Before Adding Resources

Adding capacity to the wrong workload does not relieve the constraint. Use the following symptoms to identify the constrained resource:

| Observed behavior | Cause | Action |
|---|---|---|
| `kubectl describe pod` shows `Last State: Terminated, Reason: OOMKilled`, and `kubectl get pods` shows a rising `RESTARTS` count or `CrashLoopBackOff` | Memory limit below peak demand | Raise that workload's memory limit, or move it to a larger node if the node is full |
| The pod stays `Running` while `kubectl top pod` shows CPU at the limit and responses slow under load | CPU saturation, where the container is throttled rather than terminated | Raise the CPU limit if peak latency is unacceptable |
| Task latency is high while `kubectl top pod` shows the Entrypoint Executor's CPU and memory below their limits | The constraint is downstream, in tool execution (the Secure Tool Runtime) or the large language model (LLM) | Additional entrypoint resources have no effect. Reduce per-task work, or improve tool and LLM response time |
| Document or image generation backs up while the Entrypoint Executor stays healthy | The Secure Tool Runtime pipeline is saturated | Raise Secure Tool Runtime memory and CPU |

After the Entrypoint Executor has sufficient memory for the level of concurrency, overall responsiveness is governed by tool execution and LLM latency rather than by the Entrypoint Executor.

## Next Steps

With the Agent Mesh workloads sized, most readers next configure the external event broker, persistence, and LLM provider that these resources run against. See [Configuring Agent Mesh](../configure.md). Before carrying production traffic, see [Production Readiness Checklist](../../administering/production-readiness-checklist.md).
