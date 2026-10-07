---
published: true
title: Secrets and Variables
description: Keep credentials out of your repo with ${VAR} substitution, Vault references, and !include, and understand how pull rewrites secrets into placeholders.
sidebar_position: 6
---

# Secrets and Variables

:::warning
This feature is in the Early Access stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

Declarative-config files are meant to be committed, so a literal secret in one is a secret in your Git history. This page covers variable substitution, where values come from, Vault references, and how `pull` keeps exported secrets safe. For the manifest `variables` block these features draw on, see [The Manifest](./the-manifest.md).

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

Substitution runs on your machine when you run `sam config plan` or `sam config apply`, before the YAML is parsed or sent to the Platform service. The Platform service stores the resolved value; variables are not re-evaluated at runtime when an agent executes. The one exception is the `tools:` block of a skill delivered by the filesystem or ZIP routes, which resolves in the agent process at skill-load time — see [References Inside a Skill](#references-inside-a-skill). Resolution checks the manifest's `variables` block first, then the process environment. A variable with no value and no default is a plan-time error, so a missing credential is caught before anything is applied rather than appearing as a confusing failure later.

## Where Values Come From

You never put the value in the committed file. Provide it through one of these, in the order substitution consults them:

- The manifest's `variables` block, for non-secret values such as hostnames that vary per environment.
- The process environment.
- A `.env` file, auto-loaded from the nearest ancestor directory. It never overrides a variable already set in the environment.
- `.env` files under your Agent Mesh home `secrets/` directory, for credentials you keep out of any repo.
- A Vault server, referenced inline (covered in the following section).

Files you pass with `--env-file` load after the `.env` file and override both it and the process environment. To skip the automatic `.env` load, pass `--no-dotenv`.

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

The path before `#` is the Vault secret path; the part after `#` is the field within it. The reference resolves against the Vault server at `VAULT_ADDR`, using `VAULT_TOKEN` or, if that is unset, the token in your `~/.vault-token` file, at plan and apply time.

A reference runs to the next whitespace, quote, comma, `}` or `]`, so a prefix composes but a suffix does not: `https://vault://secret/data/api#host` works, while `vault://secret/data/api#host/v1` reads `host/v1` as the field name. Put the whole value in the secret instead.

An empty secret is an error, not a value. If the field exists but holds `""`, the reference is reported unresolved rather than substituted — an empty credential is worse than a missing one, because it can turn an authenticated request into an anonymous one that quietly succeeds with reduced-scope data.

## References Inside a Skill

A skill is the one resource whose references are not all resolved on your machine. The `tools:` block of a `SKILL.md` configures tools that run inside the agent process, so its configuration fields resolve there, at the moment the skill is loaded, against that process's environment and Vault credentials. The fields this applies to are the ones that carry configuration rather than identity: `tool_config`, `connection_params`, `environment_variables`, `manifest_file`, `auth`, `headers`, `specification_url`, `specification_file`, and `base_url`.

```yaml
# SKILL.md frontmatter
tools:
  - tool_type: openapi
    specification_url: https://api.example.com/openapi.json
    auth:
      type: apikey
      api_key: vault://secret/data/skills/weather#api_key
    headers:
      X-Tenant: "${DEPLOY_ENV}"
```

In the agent process only the process environment is consulted — the manifest's `variables` block and the secrets directory are `sam config` features and do not apply. `specification_file`, unlike the other two openapi fields, is a path on the agent's own filesystem rather than a URL.

:::warning
A `.env` file can hide a missing deployment variable. The desktop application loads the `.env` file from the Agent Mesh home directory into the process before the agent starts, so a reference resolves on your machine and then fails in a container where no `.env` file is loaded. Set the variable in the deployment's environment.
:::

A skill may not declare an MCP tool with `connection_params.type: stdio`. That transport launches a process inside the agent container and hands it the agent's whole environment, so it is refused regardless of what the entry's own fields resolve to. Set `SAM_FEATURE_SKILL_MCP_STDIO=true` to allow it where skill authorship is as trusted as agent configuration. Agent YAML is unaffected.

The inline `manifest` and `specification` documents are not resolved at all. Both carry per-operation descriptions that end up in the tool catalogue sent to the model, so a reference in either is left literal, for the same reason the top-level `name` and `description` are. A reference written in one is reported at WARN — `reference in an inline document is not resolved` — and the entry still registers, so watch for that line if a tool starts calling a host named after a variable.

Moving the document out of line does **not** make its contents resolve: only the `manifest_file` or `specification_url` string itself does, never the body it points at. The fields to reach for instead are the ones that resolve and then override what the document says — `base_url` replaces every `servers[].url` in an OpenAPI spec, and a credential belongs in `auth`, `headers`, or `environment_variables`.

Agent YAML is unaffected by all of these.

:::warning
A skill's `tools:` block is privileged configuration, the same as agent YAML. Whoever can publish a skill to an agent chooses both the credentials it resolves and the endpoints it contacts. There is no field-level restriction that changes this, and none is attempted: a credential has to reach the endpoint that needs it, so any reference the block can resolve is a reference its author can direct — including reading a variable such as `VAULT_TOKEN` from the agent's environment, which `${VAR}` expansion has always allowed.

The boundary is therefore who may publish a skill to an agent, and what the agent's Vault token is scoped to read. Grant a Vault policy covering only the secrets that agent's skills need.

Be deliberate about the RBAC side too: replacing an attached skill's bundle is gated on `skill:*:update`, while editing the agent's own configuration needs `agent_builder:*:update`. The shipped `sam_manager` role grants both, but a custom role that grants only `skill:*:update` — reading as "can edit skill instructions" — carries more authority than that name suggests.

One narrower note: on the filesystem and ZIP routes a reference in `name`, `description`, `tags`, or `tool_name` is left as literal text, since those are persisted, re-served over the API, and composed into the tool description given to the model. `sam config apply` does *not* hold that line — it resolves the whole `SKILL.md`, including those fields and the instruction body, before upload. Do not put a reference in them.
:::

This matters in a split deployment, where the agent process may hold credentials the machine running `sam config` does not, and the reverse. For a `vault://` reference in those fields to resolve, the agent process needs `VAULT_ADDR` and a token of its own. With a `~/.vault-token` file the token is re-read on every distinct lookup, so a Vault Agent sidecar renewing it in place is picked up without a restart. `VAULT_TOKEN` takes precedence over the file and comes from the process environment, so it cannot rotate without a restart.

If a reference cannot be resolved — an unset variable, no Vault configured, an unreachable server, a missing field, or an empty one — that one tool entry is skipped and the skill's other tools still load. The agent process logs `skipping skill tool entry: unresolved vault references` (or `: unset environment variables`) at WARN, naming the reference and the reason. Nothing surfaces to the end user: the tool is absent from the model's tool list, and the model reports that it cannot do the thing.

Tool registration runs only on a skill's *first* load, so a skipped entry is not re-attempted while any session still holds that skill. After fixing the reference, restart the agent process — that is the reliable remedy. Unloading the skill in every session that holds it also works, but a session that ends without an explicit `unload_skill` keeps its reference.

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

## Comparing Secrets at Plan Time

The Platform service never returns a stored secret, so `sam config plan` cannot compare one locally. When a resource file sets a secret, including a blank one, on a resource whose other fields match the Platform service, `plan` asks the Platform service whether the value changed. That comparison requires the kind's update scope:

| Kind | Required Scope |
|---|---|
| Agent (toolset and skill configuration values) | `agent_builder:*:update` |
| Connector | `connector:*:update` |
| Entrypoint | `entrypoint:*:update` |
| Model | `model_config:*:update` |
| Toolset | `toolset:*:update` |

If the comparison fails, the plan fails. For a token without the scope, the error names the resource, the field, and the missing scope. Leave a secret key out of the resource file to keep the stored value without a comparison. For more information about scopes, see [Common Scopes](../../reference/rbac-reference.md#common-scopes).

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
