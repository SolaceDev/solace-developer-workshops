# Kind: `rbacRole`

Manifest path: `resources.rbacRoles`

A role is a named bundle of RBAC scopes. The resource header carries
`name` (the role's identity, used wherever the role is referenced) and an
optional `description`. Files live under `rbac/roles/`.

`spec.scopes` lists the scope strings the role grants. Each scope is
`<category>:<resource>:<verb>` — for example `agent_builder:*:update`,
`agent:hr-bot:invoke`, or `rbac:_:read`. `spec.inherits` names other
roles whose scopes this role also grants; inheritance cycles are rejected
at plan time.

`spec.users` is the single place a role grant is declared. Each entry is
an identity string (typically an email or subject claim). At plan time
every entry fans out into one platform role assignment, so declaring a
user under a role IS the grant — there is no separate assignment file or
kind. Which environments a user has the role in is expressed by which
manifests declare that role.

```yaml
kind: rbacRole
name: sam_builder
description: Author agents, workflows, skills, and toolsets.
spec:
  scopes:
    - agent_builder:*:*
    - workflow_builder:*:*
  users:
    - hugo.pare@solace.com
    - linda.hillis@solace.com
```

Grants are managed only when the manifest declares `rbacRoles`. A role
whose `users:` list drops an identity proposes a delete of that grant,
gated behind `--prune` like every other delete. Removing the whole role
from the manifest stops managing its grants (nothing is revoked without
`--prune`).

`spec.groups` is reserved for a future claim-mapping feature and is
rejected today. To map an OIDC claim to a role, author a `kind:
rbacClaimMapping` instead. The standalone `rbacAssignment` kind was
removed: a manifest that still declares `resources.rbacAssignments` fails
with a message pointing here.


## Schema

A named set of RBAC scopes, optionally inheriting from other roles, plus the identities granted the role. Grants are declared inline via spec.users — there is no separate assignment file.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `scopes` | `list<string>` | yes |  | Scope strings this role grants, each formatted <category>:<resource>:<verb> (e.g. agent_builder:*:update, agent:hr-bot:invoke). |
| `inherits` | `list<string>` |  |  | Names of other rbacRoles whose scopes this role also grants. Cycles are rejected at plan time. |
| `users` | `list<string>` |  |  | Identities granted this role. Each entry fans out into one platform role assignment at apply time. This is the single place a grant is declared; the standalone rbacAssignment kind was removed. |

## Example

```yaml
kind: rbacRole
spec:
  scopes: []
  # optional: inherits: []
  # optional: users: []
```
