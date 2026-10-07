---
published: true
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
  name: desktop
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
| `target` | The Platform service to reconcile against, and how to authenticate. The reserved `name: desktop` points at a running desktop app with no URL or login required. See [Targets and Authentication](./targets-and-authentication.md). |
| `variables` | Values for `${VAR}` substitution in resource files. See [Secrets and Variables](./secrets-and-variables.md). |
| `resources` | The resources to reconcile, keyed by plural kind name. |
| `sources` | Other repositories to import resources from. Covered in the following sections. |
| `platform` | Platform-level settings that are not a standalone resource, such as the profile provider and the default roles. Covered in the following sections. |

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

The `toolset` value references a toolset resource by name. Removing the `profileProvider` key marks the wiring for removal, which `apply --prune` clears. The `platform` block must still declare at least one other setting, or be written as `platform: {}`: a bare `platform:` key with nothing under it manages none of these settings, so it removes nothing.

The block also carries `defaultRoles`, the roles that apply when no grant or claim mapping matches the user:

```yaml
# manifest.yaml
platform:
  defaultRoles:
    roles:
      - analyst
```

Each entry names a role the Platform service stores: a role from your declarative-config repo, a role Solace Agent Mesh ships, or one created through the Agent Mesh UI. You can name a shipped role, but you cannot define one. Roles that an operator loads from YAML files when the Platform service starts are not eligible, so naming one causes the apply to fail.

Omitting `defaultRoles` from the manifest leaves the default-role set unmanaged, so `plan` proposes no change to it. Setting `roles` to an empty list clears the override and restores the default roles from the deployment YAML configuration. For the roles themselves and how Agent Mesh resolves them, see [RBAC Reference](../../reference/rbac-reference.md).

### Web UI Settings

The block also carries `webuiSettings`, the instance-wide branding and assistant defaults for the Agent Mesh UI. These settings layer over the same values set through Helm or environment variables: a value set here overrides the deployment default, and a setting with no stored override falls back to it.

```yaml
# manifest.yaml
platform:
  webuiSettings:
    appName: "Acme Assistant"
    welcomeMessage: "How can I assist you today?"
    disclaimerText: ""
    logoUrl: "https://cdn.acme.com/logo.svg"
    smallLogoUrl: "https://cdn.acme.com/logo-sm.svg"
    collectFeedback: true
    publishFeedback: false
    systemPurpose: "You are a support assistant for Acme."
    responseFormat: "Answer in Markdown. Cite sources."
```

The `systemPurpose` and `responseFormat` fields apply only to the Agent Mesh UI. You set the system purpose and response format for other entrypoints, such as Slack, Microsoft Teams, and email, in their own entrypoint YAML. This block does not affect those entrypoints.

Setting `publishFeedback` to `true` publishes each submitted rating to the event broker. It defaults to `false`. The event includes the user's comment and their user ID, so review who can subscribe within your namespace first. For the topic and payload, see [Collecting and Publishing User Feedback](../../administering/user-feedback.md).

A field can be in one of three states, and the state determines whether an apply changes it:

| In the Manifest | Result |
|---|---|
| `logoUrl: "https://cdn.acme.com/logo.svg"` | Sets the override. |
| `logoUrl: null` | Clears the override on any apply. |
| `logoUrl` left out | Keeps the value the Platform service stores. Only `apply --prune` clears it. |

Leaving a field out declares nothing about it, so a plain apply preserves the current value. A manifest that names only some settings therefore does not clear the ones it leaves out, including any that an administrator set in the Agent Mesh UI. To clear a field without `--prune`, write it as `null` rather than removing the line.

:::warning
An empty string is not the same as `null`. Setting `disclaimerText` to `""` is an explicit override, and the Agent Mesh UI shows no disclaimer. Setting it to `null` removes the override, so the value falls back to the deployment YAML or environment variable. If you want no disclaimer, set it to `""`.
:::

Removing the `webuiSettings` block marks every stored override for removal, the same as removing a resource from `resources`. As with `profileProvider`, the `platform` block must still declare at least one other setting, or be written as `platform: {}`. A bare `platform:` key manages nothing. An absent `defaultRoles` block leaves that setting unmanaged, which makes it the exception among the three.

The plan marks each pending removal, so you can review them before they happen:

```bash
sam config plan -m manifest.yaml
```

If the manifest sets `appName` and leaves out `logoUrl` while the Platform service stores both, the plan shows an update and marks the field you left out:

```text
platform/
  ~ webuiSettings        put (appName, logoUrl (cleared with --prune))
1 platform: 0 create, 1 update, 0 delete, 0 unchanged
```

If you remove the block, the plan shows a delete instead and names every override that `apply --prune` clears:

```text
platform/
  - webuiSettings        delete (appName, logoUrl)
1 platform: 0 create, 0 update, 1 delete, 0 unchanged
```

In both cases the plan reports the removal and a plain `apply` leaves the values in place; `apply --prune` clears them. For more information about `--prune`, see [Planning and Applying Changes](./planning-and-applying.md).

An empty block declares no fields, so clearing the overrides also requires `--prune`:

```yaml
# manifest.yaml
platform:
  webuiSettings: {}
```

To clear every override without `--prune`, write each field as `null`.

Run `sam config schema manifest` to print the full manifest reference, including every `platform` field the running version supports.

## Related Topics

- [Targets and Authentication](./targets-and-authentication.md) covers the `target` block and signing in.
- [Secrets and Variables](./secrets-and-variables.md) covers the `variables` block and `${VAR}` substitution.
- [Planning and Applying Changes](./planning-and-applying.md) covers running `plan` and `apply` against the manifest.
