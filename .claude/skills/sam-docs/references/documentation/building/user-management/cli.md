---
published: true
title: Managing Users and Roles with the CLI
description: Define roles, grants, claim mappings, system users, and default roles as declarative-config YAML and apply them into Agent Mesh with sam config.
sidebar_position: 2
---

# Managing Users and Roles with the CLI

To manage access from the Agent Mesh UI and to understand how roles, scopes, and claim mappings fit together, see [Managing Users and Roles](./index.md). This page covers authoring the same resources as version-controllable YAML, called *declarative config*: the YAML specific to the role-based access control (RBAC) kinds. For the `sam config plan`, `apply`, and `pull` workflow that applies to every kind, see [Managing Configuration as Code (Early Access)](../declarative-config/index.md).

Authoring access as code suits GitOps and automation, and it does two things the Agent Mesh UI cannot. It grants permissions beyond agent and workflow access, such as building agents or managing entrypoints, and it is the only way to create a system user.

## Before You Start

You need a running Agent Mesh deployment to apply configuration to. For more information, see [Install and Deploy](../../installing/index.md).

You need the super administrator grant for every access-control write. A caller without it receives HTTP 403 with the message `RBAC management requires a super administrator`.

:::warning
The `sam config plan` command validates the structure of your files and diffs them against the Platform service, but it does not check whether you hold the super administrator grant. A clean plan does not guarantee that the apply succeeds. This is true of every declarative kind, not only the access-control ones.
:::

## Declare the Kinds in the Manifest

Each kind is reconciled only when the manifest lists its key.

:::warning
Agent Mesh ignores every kind the manifest does not list, so the apply reports success without creating those resources. Verify that your manifest lists every kind you intend to reconcile.
:::

The following manifest declares one resource of each access-control kind. Each entry under a key names one resource, matching the `name` field in that resource's file:

```yaml
# manifest.yaml
kind: manifest
name: access
description: Roles, grants, claim mappings, and system users.
target:
  url: http://127.0.0.1:8800
resources:
  rbacRoles:
    - research-users
    - agent-authors
  rbacGrants:
    - platform-admins
  rbacClaimMappings:
    - research-group
  systemUsers:
    - orders-bot
```

:::warning
A key you declare must list the complete desired state for that kind. The role diff covers every role whose **Type** is **Custom**, which includes every role created in the Agent Mesh UI. It does not touch the roles Agent Mesh ships or those an operator loads from a file. Declaring `rbacRoles: []` and running `sam config apply --prune` therefore deletes all custom roles, and their grants go with them.
:::

## Write the Roles

A role is one file under the `rbac/roles/` directory. The following file defines the same `research-users` role that the Agent Mesh UI page builds, granting access to one agent:

```yaml
# rbac/roles/research-users.yaml
kind: rbacRole
name: research-users
description: Invoke the web research agent.
spec:
  scopes:
    - agent:019f8b35-6281-79df-9a28-9437b64cfbf8:invoke
```

The `spec.scopes` list holds the scope strings the role grants, each in the form `<category>:<resource>:<verb>`. For the grammar, the full catalog, and how to find the id of a specific agent or workflow, see [RBAC Reference](../../reference/rbac-reference.md).

The second role shows what this path adds. Building agents is not something the role editor in the Agent Mesh UI can grant, so you have to author a role like this one here:

```yaml
# rbac/roles/agent-authors.yaml
kind: rbacRole
name: agent-authors
description: Build and deploy agents, and invoke any of them.
spec:
  inherits:
    - research-users
  scopes:
    - agent_builder:*:*
    - agent:*:invoke
  users:
    - type: sub
      value: 8f21c0de-1f4a-4c58-9c0e-2b7d5a6e91f3
      issuer: https://idp.example.com
    - type: email
      value: bob@example.com
```

The role uses three fields:

- The `spec.scopes` field grants permissions directly.
- The `spec.inherits` field names other roles whose scopes this role also grants. Agent Mesh rejects inheritance cycles when you run `sam config plan`.
- The `spec.users` field grants the role to named identities. Each entry becomes one platform grant when you apply. Declaring a user under a role creates the grant. To grant a role your repo does not define, see [Grant a Role That Has No File](#grant-a-role-that-has-no-file). An entry of `type: sub` also requires `issuer`. The issuer forms part of the subject Agent Mesh diffs on, so adding an issuer to an existing `type: email` entry describes a different subject rather than editing the existing one. The plan then proposes a new grant plus a delete of the original, even though both resolve to the same person.

Agent Mesh reconciles grants only when the manifest declares `rbacRoles` or `rbacGrants`. If you remove an identity from `spec.users`, the plan proposes deleting that grant. The deletion happens only if you pass `--prune`.

:::note
A `spec.users` entry can also be a bare string, such as `bob@example.com`. That older shape still works, but it is not stable across user offboarding or email reuse, so every plan prints an advisory recommending the typed form shown above.
:::

### Grant a Role That Has No File

Use the `rbacGrant` kind when the role you want to grant has no configuration file of its own to carry a `spec.users` list, such as a role Agent Mesh ships, or one that someone created through the Agent Mesh UI:

```yaml
# rbac/grants/platform-admins.yaml
kind: rbacGrant
name: platform-admins
spec:
  roleName: sam_manager
  users:
    - type: email
      value: ops@example.com
```

For a role your repo does define, prefer `spec.users` on the role itself. A grant file that targets one still applies, but the plan prints an advisory suggesting you use `spec.users` on the role instead.

## Write the Claim Mappings

A claim mapping grants roles to everyone whose sign-in token carries a matching claim value, so access follows your identity provider's group membership instead of a per-user grant:

```yaml
# rbac/claim-mappings/research-group.yaml
kind: rbacClaimMapping
name: research-group
spec:
  oidcProvider: azure
  claimValue: engineering
  roleNames:
    - research-users
```

Every role in `spec.roleNames` must be a role the Platform service stores. You cannot reference a role that an operator loads from a file when the deployment starts. Which claim to read is a deployment-wide setting rather than part of the mapping, and Agent Mesh compares claim values exactly. For both rules and what happens when you get them wrong, see [Managing Users and Roles](./index.md).

Agent Mesh identifies a mapping by `spec.oidcProvider` and `spec.claimValue` together, not by its name. Editing `spec.roleNames` updates the mapping in place. Changing either identifying field instead causes the plan to propose creating a new mapping and deleting the old one. Because `--prune` is required for deletions, an ordinary apply leaves the old mapping in place, still granting its roles.

:::warning
Set `spec.oidcProvider` to the provider name that appears in your sign-in tokens, which is the key of the provider catalog entry your deployment authenticates against. The values `enterprise` and `generic` are usually internal placeholders rather than real provider names, and a mapping stored under one never matches a token. Agent Mesh rejects a placeholder with HTTP 422, and the error names the provider to use instead. On a deployment with no configured provider there is nothing to compare against, so Agent Mesh saves the mapping and it grants no roles.
:::

## Write the System Users

A system user is the only access-control resource the Agent Mesh UI cannot create, because that page shows system users without allowing you to add or change them.

```yaml
# rbac/system-users/orders-bot.yaml
kind: systemUser
name: orders-bot
spec:
  displayName: Orders webhook
  roleNames:
    - research-users
```

The `spec.roleNames` field is required and cannot be empty, so a system user always holds at least one role. Agent Mesh derives its subject as `system:<name>`.

The file is the whole role set rather than an addition to it. For the full model, including which entrypoints run as a system user (webhook, event mesh, and unauthenticated MCP entrypoints, plus Slack and Teams requests in shared channels) and how removing a role revokes it, see [Machine Entrypoints and System Users](../../administering/enabling-rbac.md#machine-entrypoints-and-system-users).

## Set the Default Roles

Default roles are not a resource kind. They live in the manifest's `platform` block, and they apply only to a user who matches no grant and no claim mapping:

```yaml
# manifest.yaml
platform:
  defaultRoles:
    roles:
      - research-users
```

Applying a manifest that declares `platform.defaultRoles` replaces the whole default-role set for the deployment. Defaults you previously configured on the **Roles** tab in the Agent Mesh UI are overwritten, and `sam config plan` shows that transition before you apply. To keep the roles you set in the Agent Mesh UI, either omit the `platform.defaultRoles` block or list those same roles in the manifest.

For which roles are eligible and what omitting the block does, see [The Platform Block](../declarative-config/the-manifest.md#the-platform-block).

## Apply and Verify

Run the plan first and read what it proposes:

```bash
sam config plan
```

```text
rbac/roles/
  + research-users       create
  + agent-authors        create
2 rbac/roles: 2 create, 0 update, 0 delete, 0 unchanged
```

Then apply:

```bash
sam config apply
```

Deletes are the exception. An ordinary apply skips them, so removing a role, a grant, a claim mapping, or a system user takes effect only under `--prune`. For the full diff and delete semantics, see [Planning and Applying Changes](../declarative-config/planning-and-applying.md).

To confirm the result, run `sam config plan` again. After the apply succeeds, the plan reports your creates and updates as unchanged. Any delete stays in the plan until you apply with `--prune`.

You can also check the Agent Mesh UI, where roles you applied appear on the **Roles** tab with a **Type** of **Custom**. A grant to someone who has never signed in appears against them on the **Users** tab only after their first sign-in.

:::note
The Agent Mesh UI does not update automatically when another tool changes a resource. After an apply, a browser that already had **User Management** open keeps showing the previous state until you refresh the page. A resource can appear to survive a deletion for this reason alone.
:::

## Choose One Authoring Surface per Role

The Agent Mesh UI and `sam config apply` write through the same REST API, so neither takes precedence: whichever writes last wins, and neither surface flags the change as a conflict or names what it replaced. Running an apply after someone uses the Agent Mesh UI to edit a role your repo declares restores what the file says, because the apply is the later write. Roles an operator loads from YAML files are read-only to both surfaces.

We recommend picking one surface per role and staying with it. Author roles that need permissions beyond agent and workflow access as code, because you cannot edit those in the Agent Mesh UI anyway, and leave the rest to whichever surface the team that owns them prefers. Running `sam config plan` before an apply shows what the apply changes, which is the reliable way to catch a role that has drifted.

## What Next?

You manage access as code. Most readers next want to put it to work:

- To set the system user a webhook or event-mesh entrypoint runs as, see [Configuring Entrypoints](../entrypoints/index.md).
- For every kind's directory and diff key, see [Configuration Kinds](../declarative-config/configuration-kinds.md).
- For the scope grammar and the full scope catalog, see [RBAC Reference](../../reference/rbac-reference.md).
