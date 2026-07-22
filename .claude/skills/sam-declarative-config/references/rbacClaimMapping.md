# Kind: `rbacClaimMapping`

Manifest path: `resources.rbacClaimMappings`

A claim mapping grants a role to every identity whose OIDC token carries
a matching claim, so access follows the IdP's group membership instead of
a per-user grant. The resource header carries `name` (a local handle) and
files live under `rbac/claim-mappings/`.

`spec.oidcProvider` names the configured provider; `spec.claimKey` and
`spec.claimValue` select the claim to match (for example `groups` =
`sam-admins`); `spec.roleName` is the role to grant, referenced by name.
The referenced role must be a DB-managed `rbacRole` (declared in the
manifest or already on the platform), not an operator-owned YAML role.

```yaml
kind: rbacClaimMapping
name: azure-admins
spec:
  oidcProvider: azure
  claimKey: groups
  claimValue: sam-admins
  roleName: sam_admin
```

Claim mappings and per-user grants are independent: use `spec.users` on
the role for named individuals, and a claim mapping for group-driven
access. Both can grant the same role.


## Schema

Grants a role to every identity whose OIDC token carries a matching claim, so access follows the IdP's group membership instead of a per-user grant. Files live under rbac/claim-mappings/.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `oidcProvider` | `string` | yes |  | Names the configured OIDC provider; must match an entry in the platform's providers catalog. |
| `claimKey` | `string` | yes |  | The OIDC token claim to match (for example groups). |
| `claimValue` | `string` | yes |  | The claim value that grants the role (for example sam-admins). |
| `roleName` | `string` | yes |  | The role to grant, referenced by name; resolved to the platform role id at plan time. Must be a DB-managed rbacRole. |

## Example

```yaml
kind: rbacClaimMapping
spec:
  oidcProvider: ""
  claimKey: ""
  claimValue: ""
  roleName: ""
```
