# Manifest reference

## Manifest Reference

The manifest is the entry point for `sam config plan` and `sam config
apply`. It declares the platform target, any imported sources, and the
list of resources to reconcile.

### Minimal example

```yaml
kind: manifest
name: dev
description: Local development environment
target:
  url: https://platform.example.com
  auth:
    type: bearer_token
    envVar: PLATFORM_TOKEN
resources:
  models:
    - default-model
  agents:
    - orchestrator
    - researcher
```

### With imports and variables

```yaml
kind: manifest
name: prod
target:
  url: ${PLATFORM_URL}
  auth: { type: bearer_token, envVar: PLATFORM_TOKEN }
variables:
  region: us-east-1
defaults:
  namespace: prod
sources:
  shared: git+https://github.com/example/sam-shared.git@v1.2.0
resources:
  models:
    - default-model@shared
  agents:
    - { from: orchestrator@shared, as: prod-orchestrator }
    - local-helper
```

### Interactive OAuth (`auth.type: oauth`)

```yaml
target:
  name: dev                                  # cache key for `sam auth login`
  url:  https://platform.dev.example.com
  auth:
    type: oauth
```

`sam auth login --manifest <path>` opens a browser, completes the
loopback PKCE flow, and writes the SAM token to
`$XDG_CONFIG_HOME/sam/auth/<target.name>.json`. Subsequent `sam config apply` /
`sam config plan` / `sam config pull` runs read it transparently.
Setting `SAM_PLATFORM_TOKEN` still wins over the cache (CI flows are
unaffected). See `references/cli-auth.md` for the full surface.

### RBAC resources

Access control is declared through `rbacRoles` and `rbacClaimMappings`.
Role grants live on the role file itself via `spec.users` — there is no
separate `rbacAssignments` key (it was removed; a manifest still
declaring it fails with a migration message). See `references/rbacRole.md`
and `references/rbacClaimMapping.md`.

`sam config schema manifest` renders the live field schema; this
section is a quick orientation, not the canonical reference.


## Schema

Top-level document that lists which resources to apply, where to fetch any imported resources from, and how to authenticate to the platform.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `kind` | `string` | yes | one of: manifest | Discriminator. Always "manifest". |
| `name` | `string` | yes |  | Human-readable manifest name (used in plan/apply output). |
| `description` | `string` |  |  | Free-form description of what this manifest deploys. |
| `target` | `object` | yes |  | Platform endpoint and auth: { name: "dev", url: "...", auth: { type: "bearer_token" \| "oauth", envVar: "SAM_PLATFORM_TOKEN" } }. `name` is the per-target cache key for `sam auth login` (defaults to URL host). For oauth, run `sam auth login` first to populate the token cache. SAM_PLATFORM_TOKEN env var overrides cached oauth credentials at apply time. |
| `defaults` | `object` |  |  | Cross-cutting defaults applied to every resource. Currently supports namespace. |
| `variables` | `object` |  |  | Manifest-scoped variables substituted into per-resource YAML via ${VAR} expansion. Env vars override these at apply time. |
| `sources` | `object` |  |  | Pip-style source URLs keyed by source name. Resource entries can reference imports from a source via name@source. |
| `resources` | `object` | yes |  | Per-kind list of resources to apply, keyed by plural kind name (models, agents, entrypoints, workflows, toolsets, connectors, skills, datasets, evaluators, experiments, rbacRoles, rbacClaimMappings). Each entry is either a bare local name, a name@source import, or {from: name@source, as: aliased}. |
