---
title: Exporting and Migrating
description: Export a running Platform service into editable YAML with sam config pull, and convert older configuration into clean YAML with sam config migrate.
sidebar_position: 5
---

# Exporting and Migrating

:::warning
This feature is in the Early Access stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

Two commands produce a declarative-config repo from something that already exists: `sam config pull` exports a running Platform service, and `sam config migrate` converts older configuration files. This page covers both. For the workflow that applies a repo once you have one, see [Planning and Applying Changes](./planning-and-applying.md).

## Export Running State with Pull

`sam config pull` serializes a Platform service's running state into resource YAML and writes a manifest alongside it. Use it to bootstrap a repo from an existing deployment, to confirm what is running, or to move configuration from one deployment to another:

```bash
sam config pull -o ./pulled --url https://platform.example.com
```

The `-o` (`--output`) directory is required. Pull writes one file per resource under the usual kind directories, plus a generated manifest that lists everything it exported.

### Authenticating a Pull

Pull often runs without a manifest, so it accepts credentials on the command line. Against a protected Platform service in a pipeline, the most direct option is the `SAM_PLATFORM_TOKEN` environment variable, which pull honors the same way `plan` and `apply` do:

```bash
SAM_PLATFORM_TOKEN="${SAM_PLATFORM_TOKEN}" \
  sam config pull -o ./pulled --url https://platform.example.com
```

To name the variable yourself instead of using `SAM_PLATFORM_TOKEN`, set the auth type and the environment variable that holds the token:

```bash
sam config pull -o ./pulled --url https://platform.example.com \
  --auth-type bearer --auth-env PLATFORM_TOKEN
```

You can also pull from a target you signed in to with `sam auth login` by passing `--target <name>` in place of `--url`. For the full credential model and precedence, see [Targets and Authentication](./targets-and-authentication.md).

### Restricting What You Pull

Restrict the export to one kind with `--only`, and to a single resource with `--name`:

```bash
sam config pull -o ./pulled --url https://platform.example.com --only agent
sam config pull -o ./pulled --url https://platform.example.com --only model --name general
```

### Writing Into an Existing Directory

By default, pull refuses to write into a non-empty directory so it never clobbers work in progress. Two flags override that:

- `--force` wipes the output directory before writing.
- `--merge` rewrites only the files for resources that exist on the Platform service, leaving your other files in place.

Use `--manifest-name` to control the generated manifest's filename instead of the default timestamped name.

### The Round-Trip Property

Re-applying a pulled repo produces no further changes to non-secret fields. A `pull` followed by an `apply` against the same Platform service is a no-op: it is the reliable way to confirm that what you applied is what is running. After a pull, run `sam config plan` to see that the diff is empty, then commit.

### Secrets Come Back as Placeholders

The Platform service never returns stored secrets in the clear, so pull cannot write real credentials into your files. Instead it rewrites known credential fields into `${KIND_NAME_FIELD}` placeholder variables and lists them at the end of the run. Export those variables before you re-apply, and the pulled repo stays safe to commit. See [Secrets and Variables](./secrets-and-variables.md) for the substitution model.

### Rounding Imports Back to Imports

If the repo you applied imported resources from other repositories, point pull at that manifest with `--reference` so it carries the `sources` block forward and writes imported resources back as `name@source` entries rather than expanding them into local files:

```bash
sam config pull -o ./pulled --url https://platform.example.com --reference manifest.yaml
```

For access-control kinds, `--include-yaml-preview` additionally emits any operator-owned, file-defined roles as commented-out preview blocks, so you can see them without adopting them into the repo.

## Migrate Older Configuration

If you have configuration in the older format that earlier releases shipped, `sam config migrate` converts it into clean resource YAML in a new directory. It runs entirely offline and never contacts a Platform service:

```bash
sam config migrate ./legacy-config ./migrated
```

Migrate writes a report grouped into four buckets: what it migrated, what it migrated with warnings, what it skipped, and what errored. Anything it cannot map cleanly is preserved for manual review rather than dropped. Write the report to a file with `--report`:

```bash
sam config migrate ./legacy-config ./migrated --report migration-report.json
```

Treat the output as a starting point, not a finished repo. Review the report, re-home anything that belongs to the environment rather than the resource (authentication, identity, broker connection), then run `sam config plan` against a Platform service before you trust it.

## Related Topics

- [Planning and Applying Changes](./planning-and-applying.md) covers applying the repo you export or migrate.
- [Secrets and Variables](./secrets-and-variables.md) covers the `${KIND_NAME_FIELD}` placeholders pull produces.
- [The Manifest](./the-manifest.md) covers the manifest that pull generates and the `sources` block that `--reference` preserves.
