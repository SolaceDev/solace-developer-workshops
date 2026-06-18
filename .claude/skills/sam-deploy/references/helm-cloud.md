# Helm on EKS / GKE / AKS

Same chart as minikube — promotion is a values change, not a re-architecture. There are no cloud-specific chart variants; the cloud differences are which values you set.

## What changes vs the local rehearsal

| Quickstart (minikube) | Shared cloud deployment |
|---|---|
| `global.broker.embedded: true` | Real broker: Solace Cloud service or self-hosted PubSub+ — `broker.url` (`tcps://…`), `clientUsername`, `password`, `vpn` |
| Bundled Postgres + object storage | `global.persistence.enabled: false`; managed Postgres (`dataStores.database.*`) + real object storage (`dataStores.objectStorage.type: s3|azure|gcs` + per-provider keys) |
| Static storage credentials | Prefer workload identity: `dataStores.objectStorage.workloadIdentity.enabled: true` + the provider's service-account annotation on `samDeployment.serviceAccount.annotations` (IRSA on EKS, GKE WI, AKS WI) |
| Port-forward access | `ingress.enabled: true` (`className`: alb/nginx/gce…), `ingress.tls`, and `sam.dnsName` set to the real hostname; tighten `sam.cors.allowedOriginRegex` |
| No auth (`sam.authorization.enabled: false`) | OIDC on: issuer/clientId/clientSecret + RBAC role mappings (static users or IdP claims). Non-negotiable for an org deployment. |
| Default sizing | Raise `samDeployment.resources.*`; keep `samDoctor` enabled so upgrades pre-validate |

## Promoting what you built locally

Content (agents, workflows, gateways, connectors) promotes via declarative config, not database copies:

1. `sam config pull` from the local/desktop instance into a git repo (→ `sam-declarative-config`).
2. Parameterize secrets (`${VAR}`), review.
3. `sam config plan` / `apply` against the new deployment.

Do not migrate the local SQLite/bundled database; the cluster starts fresh. Tool/MCP OAuth grants don't migrate either — users re-authorize on the new instance.

## Smoke test order

`sam-doctor` hook green → pods Running → SSO login works → agents visible in the UI → one end-to-end task that writes an artifact (proves broker + LLM + object storage together). Failures past this point → `sam-operate` / `sam-troubleshoot`.
