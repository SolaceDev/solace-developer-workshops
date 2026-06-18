# Helm on minikube (local rehearsal)

The point of minikube here: rehearse the **same chart** you'll run in the cloud. Values change at promotion time; the architecture doesn't.

## Prerequisites

- minikube, kubectl, helm 3. Start with room to breathe: ~4 CPUs / 12 GB (`minikube start --cpus 4 --memory 12288`).
- The chart bundle zip + image-pull credentials from the product portal (https://products.solace.com/prods/Agent_Mesh).
- An LLM endpoint + API key (any OpenAI-compatible endpoint).

No separate broker or database install — quickstart defaults bundle an embedded broker (`global.broker.embedded: true`) and in-cluster persistence (`global.persistence.enabled: true`: Postgres + object storage).

## Install (from the unzipped chart directory)

Capability-level shape — flag names from the chart's own README/values, not memory:

```
helm install sam ./solace-agent-mesh -n sam --create-namespace \
  --set sam.platform=go \
  --set-file global.imagePullKey=<credentials-from-portal>.json \
  --set llmService.llmServiceEndpoint=<endpoint> \
  --set llmService.llmServiceApiKey=<key>
```

- `sam.platform=go` is mandatory (chart default is the Python runtime).
- The `sam-doctor` pre-install hook validates prerequisites before anything deploys; if the install fails in seconds, read that job's logs.
- Optionally seed model aliases (`llmService.planningModel`, `generalModel`, …) — or add models in the UI afterwards.

## Access

Default service type is ClusterIP — access via port-forward (the chart docs give the exact service name/ports; WebUI lands on localhost). For *teammates* to reach a minikube on a shared dev server, port-forward with `--address 0.0.0.0` (or enable ingress + `minikube tunnel`) — minikube's network is host-local by design. If the instance is genuinely for the whole team long-term, that's the cue to do the cloud deployment instead ([helm-cloud.md](helm-cloud.md)).

## Two gotchas

- `global.persistence.namespaceId` must be unique per SAM installation sharing infrastructure — collisions corrupt topic/database separation.
- Resource ceilings: the bundled broker + Postgres + the three Go components want the 12 GB; an 8 GB minikube produces evictions that look like product bugs.
