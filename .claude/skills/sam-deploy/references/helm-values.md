# First-deploy values checklist

The load-bearing keys, capability level. Full schema and defaults: the `values.yaml` and `docs/` inside the chart bundle — read them rather than guessing anything not named here.

| Concern | Keys | Notes |
|---|---|---|
| **Runtime** | `sam.platform: "go"` | Mandatory. Selects the Go GWE/AWE/STR split; default is the Python runtime. |
| **Broker** | `global.broker.embedded` (quickstart true); external: `broker.url`, `broker.clientUsername`, `broker.password`, `broker.vpn` | Production uses a real Solace broker (Solace Cloud or self-hosted PubSub+). |
| **Persistence** | `global.persistence.enabled` (quickstart true → bundled Postgres + object storage); `global.persistence.namespaceId` (unique per install); external: `dataStores.database.*`, `dataStores.objectStorage.type` (`s3`/`azure`/`gcs`) + `dataStores.s3.*` etc. | Workload identity supported via `dataStores.objectStorage.workloadIdentity.enabled` + service-account annotations. |
| **Images** | `global.imageRegistry`, `global.imagePullKey` (`--set-file`, creates the pull secret) or `global.imagePullSecrets`; per-component `samDeployment.gwe.image.*`, `samDeployment.str.image.*` | Registry credentials come from the product portal with the chart. Air-gapped: mirror images, override `global.imageRegistry` (see the airgap doc in the bundle). |
| **LLM** | `llmService.llmServiceEndpoint`, `llmService.llmServiceApiKey`; alias seeding: `llmService.planningModel`, `generalModel`, `reportModel`, `imageModel`, `transcriptionModel`; extra tool keys under `toolApiKeys.*` | Empty aliases are fine — operators add models in the UI later. |
| **Auth** | `sam.authorization.enabled` (default **false** = everyone is admin); `sam.oauthProvider.oidc.issuer` / `clientId` / `clientSecret`; roles: `sam.authenticationRbac.users[]`, `.idpClaims.*`, `.customRoles` (built-ins: `sam_admin`, `sam_user`) | Enable for any shared instance. SSO/RBAC depth → `sam-operate`. |
| **Networking** | `service.type` (ClusterIP default; LoadBalancer/NodePort options), `ingress.enabled` + `ingress.className` + `ingress.tls`, `ingress.autoConfigurePaths` (leave true), `sam.dnsName` (set when behind a real hostname/ALB), `sam.cors.allowedOriginRegex` (localhost-only default — set `""` or your origins in production) | The gateway is the single HTTP entry point (UI, REST, SSE); ensure LB idle timeouts tolerate long-lived SSE streams. |
| **Sizing** | `samDeployment.resources.sam` (and `.agentDeployer`) | Defaults are quickstart-sized; raise for real load. |
| **Pre-flight** | `samDoctor.enabled` (default true), `samDoctor.failOnError`, `samDoctor.timeoutSeconds` | Pre-install/pre-upgrade Job validating broker, LLM, DB, storage, OIDC, TLS. Failed runs are retained — read their logs. |

Also in the bundle's `docs/`: network configuration, persistence, air-gap, and troubleshooting guides — cite those for depth instead of reconstructing them.
