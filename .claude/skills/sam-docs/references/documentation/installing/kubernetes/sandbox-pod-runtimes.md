---
title: Sandbox Pod Runtimes
description: Run Agent Mesh workloads under a sandboxed container runtime (gVisor, Kata Containers) using Kubernetes RuntimeClasses, configured through named pod runtime profiles in the Helm chart.
sidebar_position: 355
---

# Sandbox Pod Runtimes

Run Agent Mesh workloads under a sandboxed container runtime (gVisor, Kata Containers, and similar) using Kubernetes [RuntimeClasses](https://kubernetes.io/docs/concepts/containers/runtime-class/). This page builds on the [Installing Kubernetes for Production](./production.md) deployment.

## Overview

By default, Agent Mesh pods use your cluster's default container runtime (`samDeployment.<workload>.podRuntime` is empty). A sandboxed runtime such as gVisor or Kata Containers adds a boundary between the container and the host kernel, so a process that escapes the container is contained by the runtime instead of reaching the node.

The Secure Tool Runtime is the workload most worth isolating, because it executes tool code; the Entrypoint Executor and Agent-Workflow Executor expose the same setting for consistency. For how it runs and isolates tools, see [How Agent Mesh Manages Workloads](../../concepts/managing-workloads.md).

The `podRuntime` setting is a pod-level control: it selects the RuntimeClass a workload's pod runs under, along with the node scheduling that goes with it. It does not change how the Secure Tool Runtime executes individual tools inside the pod, which it governs separately.

A sandboxed runtime needs three things that travel together, so the chart groups them into a named **profile**:

- A **RuntimeClass** that selects the sandbox runtime.
- A **node selector** so the pod lands on nodes where that runtime is installed.
- **Tolerations** for any taints those nodes carry.

You define profiles once under `global.podRuntimes`, then reference one by name from each workload. No profiles ship by default, because RuntimeClass names, node labels, and taints depend on your cluster.

## How It Works

### 1. Define Profiles Under `global.podRuntimes`

Each profile requires a `runtimeClassName`. A `nodeSelector` and `tolerations` are optional:

```yaml
global:
  podRuntimes:
    gvisor:
      runtimeClassName: gvisor
      nodeSelector:
        runtime: gvisor
      tolerations:
        - key: sandbox
          operator: Equal
          value: gvisor
          effect: NoSchedule
```

### 2. Reference a Profile From a Workload

Each workload has its own `podRuntime` key holding the name of a profile. An empty value (the default) means the workload uses the cluster default runtime:

```yaml
samDeployment:
  str:
    podRuntime: gvisor   # Secure Tool Runtime runs under the gvisor profile
  awe:
    podRuntime: ""        # default runtime
  gwe:
    podRuntime: ""        # default runtime
```

When a profile is assigned, the chart sets `runtimeClassName`, `nodeSelector`, and `tolerations` on that workload's pod spec.

### Merge Behavior

The top-level `samDeployment.nodeSelector` and `samDeployment.tolerations` apply to every workload. When a workload also references a profile, the chart combines them:

- **runtimeClassName** comes from the profile only.
- **nodeSelector** is the top-level selector combined with the profile's selector. If the same key is set in both, the profile's value takes precedence.
- **tolerations** are the profile's tolerations together with the top-level tolerations.

### Validation

The chart rejects the install rather than silently fall back to the default runtime. Installation fails when:

- A profile has a missing or empty `runtimeClassName` (rejected by the values schema).
- A workload references a profile name that is not defined in `global.podRuntimes` (rejected during templating).

## Prerequisites

1. **Install the sandbox runtime and its RuntimeClass.** The `runtimeClassName` in your profile must match a RuntimeClass that already exists in the cluster:
   ```bash
   kubectl get runtimeclass
   ```
2. **Label and taint the nodes** that carry the runtime so your `nodeSelector` and `tolerations` match them. Omit those fields in the profile if the runtime is installed cluster-wide and the nodes are not tainted.

:::note
The chart validates that a profile is well formed, but it does not check that the RuntimeClass exists in your cluster. If the named RuntimeClass is missing, Kubernetes rejects the pods and the workload does not start. See [Troubleshooting](#troubleshooting).
:::

## Examples

### Cluster-Wide Runtime, Untainted Nodes

When the runtime (here, gVisor) is on every node and the nodes are not tainted, the profile only needs a RuntimeClass:

```yaml
global:
  podRuntimes:
    gvisor:
      runtimeClassName: gvisor

samDeployment:
  str:
    podRuntime: gvisor
```

### Dedicated, Tainted Node Pool

When the sandbox runtime (here, Kata Containers) lives on a tainted, labeled node pool:

```yaml
global:
  podRuntimes:
    kata:
      runtimeClassName: kata-qemu
      nodeSelector:
        sandbox-pool: "true"
      tolerations:
        - key: sandbox
          operator: Equal
          value: kata
          effect: NoSchedule

samDeployment:
  str:
    podRuntime: kata
```

## Verification

After install or upgrade, confirm the runtime class landed on the workload pod:

```bash
# Replace 'str' with gwe or awe to check the other workloads
kubectl get pod -n <namespace> -l app.kubernetes.io/component=str \
  -o jsonpath='{.items[0].spec.runtimeClassName}'
```

The output is the `runtimeClassName` from your profile (for example, `gvisor`). An empty result means no profile is assigned to that workload.

## Troubleshooting

### Install Fails: Profile Not Defined

```
podRuntime "gvisor" referenced by component "str" is not defined in global.podRuntimes
```

A workload references a profile name that does not exist. Add the profile under `global.podRuntimes`, or correct the name in `samDeployment.<workload>.podRuntime`.

### Install Fails: Invalid Profile

```
global.podRuntimes.gvisor: runtimeClassName is required
```

The profile is missing `runtimeClassName`. An empty value reports `runtimeClassName: String length must be greater than or equal to 1`. Set a valid RuntimeClass name on the profile.

### Workload Does Not Start: RuntimeClass Not Found

The chart installed, but no pods appear for the workload. Kubernetes rejects pods that reference a RuntimeClass that does not exist, and the error surfaces on the workload's ReplicaSet:

```bash
kubectl describe replicaset -n <namespace> -l app.kubernetes.io/component=str
# FailedCreate event: runtimeclasses.node.k8s.io "gvisor" not found
```

Install the sandbox runtime and its RuntimeClass, then confirm with `kubectl get runtimeclass`.

### Pods Stay Pending: No Matching Nodes

The profile's `nodeSelector` or `tolerations` do not match any nodes. Confirm the target nodes carry the expected labels and that your tolerations cover their taints.

## Reference

| Value | Type | Default | Description |
|-------|------|---------|-------------|
| `global.podRuntimes` | object | `{}` | Named pod runtime profiles. Each profile sets `runtimeClassName` (required), `nodeSelector` (optional), and `tolerations` (optional). |
| `samDeployment.gwe.podRuntime` | string | `""` | Profile name for the Entrypoint Executor. Empty uses the default runtime. |
| `samDeployment.awe.podRuntime` | string | `""` | Profile name for the Agent-Workflow Executor. Empty uses the default runtime. |
| `samDeployment.str.podRuntime` | string | `""` | Profile name for the Secure Tool Runtime. Empty uses the default runtime. |
| `samDeployment.nodeSelector` | object | `{}` | Node selector applied to all workloads. Combined with the profile selector when a profile is assigned. |
| `samDeployment.tolerations` | array | `[]` | Tolerations applied to all workloads. Combined with the profile tolerations when a profile is assigned. |

## Next Steps

- For how the Entrypoint Executor, Agent-Workflow Executor, and Secure Tool Runtime divide responsibility and trust, see [How Agent Mesh Manages Workloads](../../concepts/managing-workloads.md).
- For every Helm chart value, see [Helm Values Reference](../../reference/helm-values.md).
- For CPU and memory sizing of the workloads you are isolating, see [Compute Resources](./compute-resources.md).
