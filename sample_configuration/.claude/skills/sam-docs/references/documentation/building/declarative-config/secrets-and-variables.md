---
title: Secrets and Variables
description: Keep credentials out of your repo with ${VAR} substitution, Vault references, and !include, and understand how pull rewrites secrets into placeholders.
sidebar_position: 6
---

# Secrets and Variables

:::warning
This feature is in the Early Access stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

Declarative-config files are meant to be committed, so no file should ever contain a literal secret. This page covers variable substitution, where values come from, Vault references, and how `pull` keeps exported secrets safe. For the manifest `variables` block these features draw on, see [The Manifest](./the-manifest.md).

## Variable Substitution

Any string field in the manifest or a resource file can reference a variable with `${VAR}`, or `${VAR, default}` to supply a fallback:

```yaml
# models/general.yaml
kind: model
name: general
description: General-purpose model alias.
spec:
  provider: anthropic
  modelName: claude-sonnet-4-5
  apiBase: ${ANTHROPIC_API_BASE, https://api.anthropic.com}
  authConfig:
    type: apikey
    api_key: ${ANTHROPIC_API_KEY}
```

Substitution runs on your machine when you run `sam config plan` or `sam config apply`, before the YAML is parsed or sent to the Platform service. The Platform service stores the resolved value; variables are not re-evaluated at runtime when an agent executes. Resolution checks the manifest's `variables` block first, then the process environment. A variable with no value and no default is a plan-time error, so a missing credential is caught before anything is applied rather than appearing as a confusing failure later.

## Where Values Come From

You never put the value in the committed file. Provide it through one of these, in the order substitution consults them:

- The manifest's `variables` block, for non-secret values such as hostnames that vary per environment.
- The process environment.
- A `.env` file, auto-loaded from the nearest ancestor directory (add more with `--env-file`, opt out with `--no-dotenv`).
- `.env` files under your Agent Mesh home `secrets/` directory, for credentials you keep out of any repo.
- A Vault server, referenced inline (covered in the following section).

Keep non-secret, environment-specific values such as a database hostname in the manifest's `variables` block, and keep secrets in the environment, a `.env` file, the secrets directory, or Vault.

## Vault References

A field can pull its value directly from a Vault server with a `vault://` reference:

```yaml
# models/general.yaml
...
  authConfig:
    type: apikey
    api_key: vault://secret/data/anthropic#api_key
...
```

The path before `#` is the Vault secret path; the part after `#` is the field within it. The reference resolves against the Vault server at `VAULT_ADDR`, using the token in your `~/.vault-token` file, at plan and apply time.

## Sharing Large Blocks Across Files

To keep a large scalar such as a system prompt out of the resource file, and to share it across files, tag the field with `!include` and point at a file:

```yaml
# agents/support.yaml
kind: agent
name: support
description: Front-line support assistant.
spec:
  systemPrompt: !include prompts/support-prompt.md
```

`sam config` reads the referenced file and substitutes its contents in place. The included file can itself contain `${VAR}` references, which resolve the same way.

## Secrets on Export

When `sam config pull` serializes a Platform service, it cannot write real credentials, because the Platform service redacts stored secrets on read. Instead it rewrites known credential fields into `${KIND_NAME_FIELD}` placeholder variables and lists them at the end of the run:

```text
Pulled 3 resources into ./pulled.
Set these variables before re-applying:
  MODEL_GENERAL_API_KEY
  CONNECTOR_EMPLOYEE_DB_PASSWORD
```

Export those variables before you re-apply, and the pulled repo is safe to commit. This is what makes a `pull` then `apply` round-trip work without ever putting a secret on disk. For the pull workflow, see [Exporting and Migrating](./exporting-and-migrating.md).

:::warning
Never commit a literal secret, and never use a plausible-looking fake in place of one. Reference every credential with `${VAR}` or a `vault://` reference, and provide the value through the environment, a `.env` file, the secrets directory, or Vault.
:::

## Related Topics

- [The Manifest](./the-manifest.md) covers the `variables` block that substitution consults first.
- [Exporting and Migrating](./exporting-and-migrating.md) covers the `${KIND_NAME_FIELD}` placeholders that pull produces.
- [Targets and Authentication](./targets-and-authentication.md) covers `.env` loading and the `SAM_PLATFORM_TOKEN` credential.
