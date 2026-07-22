---
title: The Manifest
description: The manifest.yaml that names the target Platform service and lists which resources to reconcile, plus importing resources from other repositories.
sidebar_position: 2
---

# The Manifest

:::warning
This feature is in the Early Access stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

The manifest is the entry point for `plan` and `apply`. It names the target Platform service and lists which resources to reconcile. This page covers its structure and how to import resources from other repositories. For the resource files the manifest points at, see [The Configuration Repo](./the-config-repo.md).

## Structure

A manifest is a single `kind: manifest` document, `manifest.yaml` at the repo root by default:

```yaml
# manifest.yaml
kind: manifest
name: dev
description: Development environment.
target:
  url: http://127.0.0.1:8800
variables:
  EMPLOYEE_DB_HOST: pg-dev.internal
resources:
  models:
    - general
  agents:
    - release-notes-assistant
  entrypoints:
    - web
```

| Block | Purpose |
|---|---|
| `name`, `description` | Identify this manifest. Useful when a repo has several, such as one per environment. |
| `target` | The Platform service to reconcile against, and how to authenticate. See [Targets and Authentication](./targets-and-authentication.md). |
| `variables` | Values for `${VAR}` substitution in resource files. See [Secrets and Variables](./secrets-and-variables.md). |
| `resources` | The resources to reconcile, keyed by plural kind name. |
| `sources` | Other repositories to import resources from. Covered in the following sections. |
| `platform` | Platform-level settings that are not a standalone resource, such as the profile provider. Covered in the following sections. |

## The Resources Block

`resources` is keyed by plural kind name, and each key lists resources by `name`:

```yaml
resources:
  models:
    - general
    - planning
  agents:
    - release-notes-assistant
    - orchestrator
```

Two properties matter:

- **Only declared kinds are reconciled.** A kind you do not list under `resources` is never diffed, listed, or deleted. This is what makes a focused manifest, one that manages only a subset of resources, safe: a manifest that lists only two agents leaves your entrypoints, models, and every other kind untouched.
- **Resources are enumerated by name.** There is no glob or wildcard. To manage a resource, add its name to the list. This keeps the manifest an explicit statement of what the repo owns.

## Multiple Environments

A common pattern is one manifest per environment, kept under a `manifests/` directory, with the resource files shared across all of them:

```text
my-mesh/
├─ manifests/
│  ├─ dev.yaml
│  └─ prod.yaml
├─ agents/
│  └─ release-notes-assistant.yaml
└─ models/
   └─ general.yaml
```

Each manifest sets its own `target` and its own `variables` (to vary endpoints, credentials, and names), while pointing at the same resource files. Select one with `-m`:

```bash
sam config apply -m manifests/prod.yaml
```

The resolver looks for `agents/`, `models/`, and the other kind directories relative to the repository root, not relative to the manifest file. When the manifest lives under `manifests/`, the repo root is the parent directory, so those directories are still found alongside it.

## Importing Resources From Other Repositories

The `sources` block lets a manifest pull resources from other Git repositories, so a shared team of agents or a common set of models can live in one place and be reused. Sources use pip-style URLs:

```yaml
# manifest.yaml
sources:
  ai-team: git+https://github.com/example/ai-team-agents.git@v1.4.2
resources:
  agents:
    - orchestrator                                   # local file
    - research-agent@ai-team                          # imported from the ai-team source
    - {from: research-agent@ai-team, as: team-research}  # imported and renamed locally
```

A resource entry references an import by `name@source`. Use the `{from: name@source, as: local-name}` form to give the imported resource a different name in your deployment.

Two rules keep imports predictable:

- **Pin every source to a tag or a full commit SHA.** A floating reference such as a branch makes the apply non-reproducible. Pinning is required by default; to opt in to a floating reference anyway, pass `--allow-floating-refs`, and expect the resolved content to change as the branch moves.
- **Imports are read-only and non-transitive.** You cannot patch an imported file in place, and a source's own `sources` are not followed. To customize an imported resource, copy its file into your repo and manage it locally.

`sam config` caches cloned sources between runs. To force a fresh clone, run `sam config refresh` to clear the cache, or pass `--no-cache` on a single `plan` or `apply`.

## The Platform Block

The `platform` block carries settings that belong to the Platform service as a whole rather than to a single resource. The profile provider, which wires a toolset into the post-sign-in user-enrichment step, is one example:

```yaml
# manifest.yaml
platform:
  profileProvider:
    toolset: identity-tools    # references a toolset by name
    claim: email
```

The `toolset` value references a toolset resource by name. Removing the `platform` block on a later apply removes the wiring. Run `sam config schema manifest` to print the full manifest reference, including every `platform` field the running version supports.

## Related Topics

- [Targets and Authentication](./targets-and-authentication.md) covers the `target` block and signing in.
- [Secrets and Variables](./secrets-and-variables.md) covers the `variables` block and `${VAR}` substitution.
- [Planning and Applying Changes](./planning-and-applying.md) covers running `plan` and `apply` against the manifest.
