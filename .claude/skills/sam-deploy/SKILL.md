---
name: sam-deploy
description: Use when deploying Solace Agent Mesh for shared or managed use — Helm charts on minikube (local rehearsal) or EKS/GKE/AKS (cloud), choosing chart values (broker, persistence, images, LLM, OIDC/RBAC, ingress), promoting a local/desktop instance to a cluster, or running SAM in Docker for a team. Not for single-user local trial (sam-install-run), authoring agents/config content (sam-author-agent / sam-declarative-config), or diagnosing an already-broken deployment (sam-troubleshoot / sam-operate).
version: dev
---

# sam-deploy

This skill stands up SAM for **shared use** — others will depend on this instance. For "just let me try it on my machine" see `sam-install-run` (desktop first). For what runs *on* the deployment (agents, workflows, config) see `sam-author-agent` and `sam-declarative-config`. Deciding question: *are others depending on this instance?*

## Where the deployment artifacts come from

**The Helm charts ship as a downloadable zip from the Solace product portal: https://products.solace.com/prods/Agent_Mesh (login required), along with image-pull credentials.** Install from the unzipped local chart directory. Do **not** point users at GitHub repositories, and do **not** produce `helm repo add <url>` commands from memory — older README/doc snippets referencing a public Helm quickstart repo are the Python-era flow, not this product's distribution channel. If a user lacks portal access, route them to their Solace account team or solace.com/support.

## Paths, in teaching order

1. **Helm — the primary path, local and cloud alike.** Same chart both ways: rehearse on **minikube**, promote to EKS/GKE/AKS by changing values, not architecture. See [references/helm-minikube.md](references/helm-minikube.md) for the local flow and [references/helm-cloud.md](references/helm-cloud.md) for what changes in the cloud.
2. **Docker — secondary**, for "Kubernetes is overkill, one VM for the team." See [references/docker.md](references/docker.md). There is **no official docker-compose file**. If a user asks for one, never present guessed product facts (image names, ports, paths, env vars) as real — a skeleton with those marked as placeholders to fill from the shipped deployment docs is fine; a confident fabricated file is not. The supported shapes are the all-in-one container or per-binary containers.

## Hard rules

- **Always set `sam.platform: "go"`.** The chart serves both runtimes and currently defaults to the Python one. This is the single most important value; it selects the Go GWE/AWE/STR component split.
- **Values keys come from the chart, not memory.** This skill names the load-bearing keys ([references/helm-values.md](references/helm-values.md)); for anything beyond them, read the `values.yaml` and `docs/` inside the downloaded chart bundle — never guess. Python-era env names (`LLM_SERVICE_*`, `SOLACE_BROKER_*`) are not the Go chart's surface.
- **The quickstart is genuinely self-contained.** Default values bundle an embedded broker and persistence (Postgres + object storage) in-cluster — do not bolt on a separate broker install for a local rehearsal.
- **Pre-flight is built in**: a `sam-doctor` job runs as a Helm pre-install/pre-upgrade hook by default and fails the install on broken prerequisites (broker, LLM endpoint, DB, storage, OIDC, TLS). If an install fails immediately, read the doctor job's logs first.
- **Production isn't quickstart**: shared deployments replace the embedded broker and bundled persistence with real services, and enable OIDC — a team instance without auth leaks prompts and artifacts.

## References

| Topic | File |
|---|---|
| Minikube local rehearsal — prerequisites, install, access | [references/helm-minikube.md](references/helm-minikube.md) |
| First-deploy values checklist (broker, persistence, images, LLM, auth, networking, sizing, sam-doctor) | [references/helm-values.md](references/helm-values.md) |
| Cloud (EKS/GKE/AKS) — what changes vs local, workload identity, promotion from desktop | [references/helm-cloud.md](references/helm-cloud.md) |
| Docker on one VM — supported shapes, what to configure | [references/docker.md](references/docker.md) |

Hand-offs: configuring *content* on the new deployment (agents, gateways) → `sam-declarative-config` (`sam config pull/plan/apply` is also the desktop→cluster promotion mechanism); SSO/RBAC depth, secrets promotion, upgrades → `sam-operate`; "deploy failed / pods crashlooping" symptoms → `sam-troubleshoot` / `sam-operate`.
