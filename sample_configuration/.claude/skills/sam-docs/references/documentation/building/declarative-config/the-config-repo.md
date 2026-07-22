---
title: The Configuration Repo
description: The directory layout of a declarative-config repo, the shape of a resource file, how resources reference each other, and how to discover the fields a kind accepts.
sidebar_position: 1
---

# The Configuration Repo

:::warning
This feature is in the Early Access stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

This page covers the layout of a declarative-config repo and the shape of the files inside it. For the workflow that reconciles a repo against a Platform service, start at [Managing Configuration as Code (Early Access)](./index.md).

A declarative-config repo is an ordinary directory you keep under version control. It holds a top-level manifest, described in [The Manifest](./the-manifest.md), and one file per resource, grouped into directories named for each resource kind.

## Directory Layout

`sam config` indexes fixed, well-known directories under the repo root. Each kind has its own directory, named for the plural kind:

```text
my-mesh/
├─ manifest.yaml
├─ models/
│  └─ general.yaml
├─ agents/
│  └─ release-notes-assistant.yaml
├─ entrypoints/
│  └─ web.yaml
├─ workflows/
│  └─ triage.yaml
├─ connectors/
│  └─ employee-db.yaml
├─ toolsets/
│  └─ weather.yaml
└─ skills/
   └─ manim/
      └─ SKILL.md
```

You only create the directories for the kinds you use. Most kinds are one file per resource. Toolsets and skills are directory-shaped because they carry tool source or bundle assets alongside their metadata. For the directory each kind expects, see [Configuration Kinds](./configuration-kinds.md), or run `sam config schema layout` to print the reference.

## The Shape of a Resource File

Every resource file has the same header. The top-level keys identify the resource; everything kind-specific goes under `spec`, using the platform's field names:

```yaml
# agents/release-notes-assistant.yaml
kind: agent
name: release-notes-assistant
description: Turns a list of merged changes into a grouped release-notes summary.
spec:
  systemPrompt: |
    You are a release-notes assistant for a software team.
  modelProvider:
    - general
  toolsets:
    - builtin_time_tools
```

| Field | Purpose |
|---|---|
| `kind` | The resource kind, such as `agent`, `model`, or `entrypoint`. Determines which directory the file belongs in and which `spec` fields apply. |
| `name` | The resource name. This is the identity `sam config` diffs on, and the name the manifest and other resources reference. |
| `description` | A human-readable description. Required for some kinds, such as agents. |
| `spec` | The kind-specific configuration. The fields here are the platform's field names in camelCase. |

### The Name Is the Diff Key

`sam config` matches your YAML to the running platform by `name`, not by any hidden identifier. The first time you apply a file, the resource is created with that name. On later applies, a file with the same `name` updates the existing resource in place. Rename the file's `name`, and the next apply treats it as a different resource: it creates the new name and reports the old one as a delete.

Because the match is by name, `plan` and `apply` are safe to run repeatedly. Applying an unchanged repo is a no-op.

## How Resources Reference Each Other

Resources refer to each other by `name`, never by a platform-assigned identifier. An agent names the model alias and toolsets it uses; an experiment names its dataset and evaluators. Because references are by name, you can create a resource and the resource that references it in the same apply:

```yaml
# agents/release-notes-assistant.yaml
kind: agent
name: release-notes-assistant
description: Turns merged changes into a grouped release-notes summary.
spec:
  modelProvider:
    - general          # references models/general.yaml by name
  toolsets:
    - builtin_time_tools
```

A reference to a resource that is neither in the repo nor already on the Platform service is a plan-time error, so a typo in a model alias or toolset name is reported before anything is applied.

## Discover the Fields for a Kind

The schema for every kind is generated from the same types the Platform service uses, so the CLI is the authoritative field reference for the version you are running. It works offline and never contacts a Platform service:

```bash
sam config schema list
sam config schema show agent
sam config schema example agent
```

- `sam config schema list` prints every kind with a one-line description.
- `sam config schema show <kind>` prints the field table for one kind.
- `sam config schema example <kind>` prints a templated starter file you can save and edit. Pass `--name` to set the resource `name` in the generated file.

Entrypoints, connectors, and workflow nodes have per-type fields. Pass `--type` (and `--subtype` for connectors) to drill in:

```bash
sam config schema show entrypoint --type slack
sam config schema example connector --type sql --subtype postgres
```

Add `--format json` to `show` or `list` when you want to process the schema with another tool.

:::tip
For AI-assisted authoring, run `sam ai-assistance skill install` at your repo root. Your AI coding assistant then knows the declarative-config kinds and their fields, generated from the same schema, and can draft or review resource files for you.
:::

## Related Topics

- [The Manifest](./the-manifest.md) is the file that lists which resources in this repo to reconcile, and against which Platform service.
- [Configuration Kinds](./configuration-kinds.md) is the catalog of every kind, with a link to each kind's authoring page.
- [Secrets and Variables](./secrets-and-variables.md) covers keeping credentials out of the files you commit.
