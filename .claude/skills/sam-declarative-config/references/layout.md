## Directory Layout

A canonical Agent Mesh declarative-config repo looks like:

```
repo-root/
├─ manifests/
│  ├─ dev.yaml
│  └─ prod.yaml
├─ models/
│  └─ <model-name>.yaml      # one file per model resource
├─ agents/
│  └─ <agent-name>.yaml
├─ entrypoints/
│  └─ <entrypoint-name>.yaml
├─ workflows/
│  └─ <workflow-name>.yaml
├─ toolsets/
│  ├─ <toolset-name>.yaml       # metadata header
│  └─ <toolset-name>/           # one dir per toolset
│     ├─ src/                   # author flow: build sources
│     │                         # OR
│     └─ <toolset-name>.zip     # mirror flow: pre-built bundle (from pull)
├─ connectors/
│  └─ <connector-name>.yaml
├─ datasets/
│  └─ <dataset-name>.yaml
├─ evaluators/
│  └─ <evaluator-name>.yaml
├─ experiments/
│  └─ <experiment-name>.yaml
├─ skills/
│  └─ <skill-name>/          # skills are *directories*, not files
│     ├─ SKILL.md
│     └─ assets/...
└─ rbac/                     # four kinds share one top-level dir
   ├─ roles/
   │  └─ <role-name>.yaml            # kind: rbacRole
   ├─ grants/
   │  └─ <local-name>.yaml           # kind: rbacGrant
   ├─ claim-mappings/
   │  └─ <local-name>.yaml           # kind: rbacClaimMapping
   └─ system-users/
      └─ <system-user-name>.yaml     # kind: systemUser
```

The resolver walks `<repo-root>/<plural-kind>/` for each kind declared
in the manifest's `resources:` block. The `<plural-kind>` is the
directory name shown above (e.g. `models`, `agents`, `connectors`).

The four RBAC kinds are the exception. Their manifest keys are
`rbacRoles`, `rbacGrants`, `rbacClaimMappings` and `systemUsers`, but
their files live under `rbac/roles/`, `rbac/grants/`,
`rbac/claim-mappings/` and `rbac/system-users/` — not under a directory
named after the key. Putting a role in `rbacRoles/` fails the plan with
`resources.rbacRoles: "<name>" not found under rbac/roles`.

Manifests can live anywhere on disk; the convention is
`manifests/<env>.yaml` so `--manifest manifests/dev.yaml` discovers
the repo root one level up. When the manifest's parent dir is not
named `manifests`, that parent dir itself is treated as the repo root.
