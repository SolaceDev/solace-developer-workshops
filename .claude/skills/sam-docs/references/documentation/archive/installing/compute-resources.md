---
title: Compute Resources
description: Advisory CPU and memory requests/limits for the GWE, AWE, and STR workloads, node-sizing guidance, the bundled-broker cost, and how heavy agents drive infrastructure cost.
sidebar_position: 4
---

<!-- ARCHIVE NOTE: This file has been incorporated into the new structure at installing/kubernetes/compute-resources.md (2026-06-12). Em dashes fixed, "What Next?" renamed to "Next Steps", cross-references updated to new page paths. Bold usage left for a later style cleanup pass. -->

# Compute Resources

This page recommends CPU and memory **requests** and **limits** for a Solace Agent Mesh Kubernetes deployment, and explains how those numbers — together with your broker topology and agent workload — drive the size and number of nodes you pay for.

The numbers here are **advisory starting points**, not hard requirements. A 2 vCPU / 8 GB node does not expose 2000m / 8000Mi of *allocatable* capacity — Kubernetes system components and your cloud provider's DaemonSets reserve a slice that varies by provider and by what else you run on the node. Treat the recommendations as a baseline to adjust against your own observed usage and your cluster's real allocatable capacity. For the deployment layouts these workloads run in, see Deploy options.

## Workloads to Size

A distributed Kubernetes deployment runs three long-lived workloads, each as its own pod:

| Workload | What it does | Primary resource driver |
|---|---|---|
| **GWE** | Hosts the gateways — HTTP and SSE, sessions, auth, web UI | Concurrent user connections and SSE fan-out |
| **AWE** | Runs configured agents and workflows | Number of bound agents and their context size |
| **STR** | Executes tools in a sandbox (Python and Go tool binaries) | Memory of tool subprocesses (LibreOffice, ffmpeg, Chromium) |

The Solace PubSub+ broker and the persistence layer (database and object storage) are sized separately — see Broker and Persistence Topology.

## Recommended Requests and Limits

These values keep **requests modest** so the three workloads schedule on a constrained cluster, and **limits generous** so each workload has room to absorb load spikes.

| Workload | CPU request | CPU limit | Memory request | Memory limit |
|---|---|---|---|---|
| **GWE** | 500m | 4 | 1Gi | 2Gi |
| **AWE** | 500m | 4 | 1Gi | 2Gi |
| **STR** | 500m | 4 | 2Gi | 4Gi |

Set these in your Helm values:

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
        cpu: 500m
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

A **request** is what the scheduler reserves for a pod and the floor Kubernetes protects under pressure; a **limit** is the ceiling it may use. Exceeding a CPU limit only slows a container, but exceeding a memory limit terminates it (an out-of-memory kill). That asymmetry shapes the defaults — generous CPU limits are cheap insurance, while memory limits set the real safety margin.

| Setting | What it controls | When to raise it |
|---|---|---|
| CPU request | Capacity reserved for scheduling; total **1.5 vCPU** across the three workloads keeps them schedulable on a modest node | The workload is consistently CPU-bound at steady state |
| CPU limit | Burst ceiling under load | Sustained high latency under peak traffic |
| Memory request | Protected floor — pods over their request are reclaimed first under node memory pressure | A workload is being evicted on a busy node |
| Memory limit | The out-of-memory threshold | The workload restarts with an out-of-memory error |

STR carries the most memory (2Gi / 4Gi) because its tool subprocesses — LibreOffice, ffmpeg, Chromium — are the largest consumers. AWE memory scales with how many agents it hosts; see Sizing for Heavy Agents.

## Performance Profile

The gap between requests and limits is a deliberate trade-off between *consistency* and *headroom*. Decide which trade-off fits your deployment:

- **`requests == limits` (Guaranteed quality of service)** gives a consistent, neighbor-independent throughput baseline. Each workload gets exactly what it reserves — no more under load, but also never evicted for another pod and never starved on a busy node. Choose this when predictable performance matters more than density.
- **`limits > requests` (Burstable quality of service)**, as recommended above, lets a workload burst toward its limit during peaks. That extra headroom is best-effort: it is available only when the node has free capacity, and is not guaranteed when other workloads on the same node compete for it. Burstable pods are also evicted before Guaranteed ones under memory pressure.

The recommended table is Burstable — it favors a low barrier to entry and room to grow. If your cluster is shared with other latency-sensitive workloads, or you require a guaranteed performance baseline, raise the requests to equal the limits.

## Node Sizing

Size a node by its **allocatable** capacity, not its nominal instance size. Confirm what a node actually offers before you rely on it:

```bash
kubectl describe node <node-name> | grep -A6 Allocatable
```

For a distributed deployment with an **external** broker and persistence (the production layout), the three workloads reserve **~1.5 vCPU / ~4 GiB** in total — the node needs at least that much allocatable free after system overhead. To give them room to burst under load, use a node with **4 vCPU / 16 GiB** allocatable. If you run GWE, AWE, and STR on separate nodes, each needs only its own slice plus headroom.

If you also run the **bundled** broker and persistence on the same cluster (a proof-of-concept or development layout — see below), the broker alone needs roughly **2 vCPU / 3.5 GiB** more. Size that cluster for **6 vCPU / 16 GiB allocatable** or more so the broker, database, and object store leave enough room for the Agent Mesh workloads to burst.

:::note Sandbox runtimes add overhead
If you run a workload under a Kubernetes sandbox runtime — gVisor or Kata, opted in per workload via `global.podRuntimes` and `samDeployment.<component>.podRuntime` — the runtime consumes CPU and memory *on top of* the container's own requests and limits. The tax varies — gVisor is modest; VM-based Kata is heavier, depending on how it is provisioned. Record that overhead on the RuntimeClass (its `overhead` field) so the scheduler reserves for it, and add it to the node's allocatable budget when sizing.
:::

## Broker and Persistence Topology

The single largest cost decision is **whether the broker and datastores run inside your cluster or as external services.** It changes both your node bill and where the cost lands.

| | Bundled (`global.broker.embedded: true`, `global.persistence.enabled: true`) | External (production) |
|---|---|---|
| Broker | A Solace PubSub+ broker pod — **2 vCPU / 2480Mi memory** (request = limit, Guaranteed), plus ~1Gi of RAM for its shared-memory buffer and a 7Gi persistent disk | A managed or self-hosted Solace PubSub+ broker that you size and bill on its own terms |
| Persistence | Bundled database and object-storage pods on the node | Managed database and S3-compatible object storage |
| Where cost lands | All inside your cluster's node-hours | Broker and storage are separate line items; the cluster carries only GWE, AWE, and STR |
| Use it for | Proof-of-concept and development | Production |

The bundled broker is resource-heavy, and its reservation is fixed — it holds **2 vCPU and about 3.5 GiB of RAM** for itself whether idle or busy. On a 2-vCPU node, the broker alone claims nearly all the CPU, leaving little room for GWE, AWE, and STR to run alongside it. **Use the bundled broker for proof-of-concept and development only**; production deployments should point at an external broker (below).

For production, run an **external** broker, database, and object store:

```yaml
# my-values.yaml
global:
  broker:
    embedded: false
  persistence:
    enabled: false
```

This removes ~2 vCPU / ~3.5 GiB and the datastore pods from your cluster. Your node cost then scales purely with the GWE, AWE, and STR footprint plus agent density — the model in the next section. See Configure for wiring an external broker and persistence.

## Sizing for Heavy Agents

The recommended limits assume **typical agents** — modest prompts, a few tools, normal context windows. AWE hosts configured agents in-process, so one AWE pod's footprint is roughly its own overhead plus the sum of its agents. A *heavy* agent consumes more, and that changes your infrastructure cost.

What makes an agent heavy:

| Driver | Effect |
|---|---|
| Large or retrieval-augmented context windows | Higher peak memory per in-flight task on AWE |
| Many concurrent tasks against one agent | More parallel work — more AWE CPU and memory |
| Large artifacts (documents, images, video) | Memory spikes during artifact handling |
| Tool-heavy workflows | Pushes **STR** memory, not AWE — size STR accordingly |

### How Density Drives Cost

Your infrastructure cost for the agent tier is a function of how many agents fit on a node before the most-constrained resource — almost always memory — runs out:

```text
agents per node ≈ ⌊ (node allocatable memory − fixed Agent Mesh overhead) ÷ per-agent memory ⌋
monthly node cost ≈ ⌈ total agents ÷ agents per node ⌉ × node hourly rate × 730
```

Per-agent memory is in the denominator, so doubling it (light to heavy) roughly **halves** agent density and **doubles** the node count for the same fleet. It is the single biggest cost lever in the deployment.

| Agent profile | AWE memory | Agents per 16 GiB node (illustrative) | Nodes for 24 agents | Relative cost |
|---|---|---|---|---|
| Light | 1 GiB | ~12 | 2 | 1.0× |
| Standard | 2 GiB | ~6 | 4 | ~2× |
| Heavy | 4 GiB | ~3 | 8 | ~4× |

The figures are illustrative ratios after fixed overhead and system pods — validate the absolute counts against your own workload. The point is the *ratio*: heavy agents cost proportionally more because they pack proportionally less densely.

### Containing the Cost

- **Isolate heavy agents.** Raising the shared AWE memory limit to satisfy one heavy agent inflates the limit for every agent and collapses density across the whole fleet. Run heavy agents on a separate AWE deployment with its own higher limits to keep the rest of the fleet dense. Prefer this.
- **Scale the node, not just the limit.** A heavy agent that needs 4 GiB packs poorly on a small node where fixed overhead leaves little room. Move heavy-agent AWE pods onto larger nodes so the higher limit still packs two or three agents per node instead of one.

:::tip Right-size from observed usage
Set the memory limit from an agent's real peak (watch the `container_memory_working_set_bytes` metric), not its theoretical maximum. Over-provisioning the limit does not cause out-of-memory kills, but it silently lowers density and raises cost for no benefit.
:::

## What Next?

You have sized the Agent Mesh workloads for your cluster. Most readers next wire up the external broker, persistence, and LLM provider those resources will run against — covered in Configure. Before carrying production traffic, walk the Production readiness checklist.
