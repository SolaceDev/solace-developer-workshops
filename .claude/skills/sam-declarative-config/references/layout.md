## Directory Layout

A canonical SAM declarative-config repo looks like:

```
repo-root/
├─ manifests/
│  ├─ dev.yaml
│  └─ prod.yaml
├─ models/
│  └─ <model-name>.yaml      # one file per model resource
├─ agents/
│  └─ <agent-name>.yaml
├─ gateways/
│  └─ <gateway-name>.yaml
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
└─ skills/
   └─ <skill-name>/          # skills are *directories*, not files
      ├─ SKILL.md
      └─ assets/...
```

The resolver walks `<repo-root>/<plural-kind>/` for each kind declared
in the manifest's `resources:` block. The `<plural-kind>` is the
directory name shown above (e.g. `models`, `agents`, `connectors`).

Manifests can live anywhere on disk; the convention is
`manifests/<env>.yaml` so `--manifest manifests/dev.yaml` discovers
the repo root one level up. When the manifest's parent dir is not
named `manifests`, that parent dir itself is treated as the repo root.
