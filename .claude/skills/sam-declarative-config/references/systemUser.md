# Kind: `systemUser`

Manifest path: `resources.systemUsers`

A system user is a non-human principal: the identity a gateway entrypoint
runs as, or a service account driving the platform API. The platform derives
its subject as `system:<name>`. Files live under `rbac/system-users/`.

`spec.name` is the system user's name and defaults to the resource header's
`name` when omitted. `spec.displayName` is the friendly label shown in the
Access Control UI. `spec.roleNames` is required and lists the roles granted,
by name — each resolves to a role id at plan time, or at apply time for a role
created earlier in the same apply. A named role may be config-defined or
managed/in-DB.

```yaml
kind: systemUser
name: ci-deployer
spec:
  displayName: CI Deployer
  roleNames:
    - sam_builder
```

**The file is the source of truth.** `apply` makes the platform match it, so
editing `roleNames` changes what the system user holds in both directions:

- **Adding a role grants it.** Applied on an ordinary `apply`.
- **Removing a role revokes it.** Also applied on an ordinary `apply` — no flag.
  The plan names the roles it will take away, so read that line before applying:
  it is the one place an apply reduces what an entrypoint can reach. Anything the
  principal picked up outside config is revoked too, since the file is the whole
  role set rather than an addition to it.
- **Removing the resource deletes the principal**, gated behind `--prune` like
  every other kind. Dropping the file without `--prune` leaves it in place and
  plans the deletion for the next pruning apply.

`spec.name` cannot be changed in place: the subject `system:<name>` *is* the
principal's identity, so a new name is a new principal. Renaming plans as a
delete plus a create, and the delete needs `--prune`. Point the entrypoint's
`run_as` at the new name in the same change.

**Emitted by `sam config pull`,** so an existing deployment round-trips: pull
writes a file for every system user config owns, and re-applying it changes
nothing. The built-in principals are never written, because they cannot be
authored.

**The built-in system users cannot be authored.** `default`, `channel`, and
`eval` are baked into Agent Mesh, and `plan` rejects a file naming any of them
(in the bare or the `system:`-prefixed spelling). Provisioning one would not do what it
looks like it does: the built-in roles resolve from the embedded defaults and
are unioned with anything you grant, so the file could only widen the
principal's reach, never narrow it. To give an entrypoint less than the default
system user holds, declare a distinct system user with only the scopes it needs
and point that entrypoint's `run_as` at it. The same applies to `eval`, which
evaluation experiments run as when their `runAs` is unset: scope an experiment
down by declaring your own system user and naming it in `runAs`, never by
trying to author `eval`.


## Schema

Provisions a non-human principal (subject system:<name>) holding a set of roles. The file is the whole role set: adding a role to roleNames grants it and removing one revokes it, both on an ordinary apply. Removing the resource deletes the principal, gated behind --prune. spec.name cannot change in place — the subject is the identity, so a rename plans as a delete plus a create.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `name` | `string` |  |  | System user name; the platform derives the subject system:<name>. Defaults to the resource name (the file's metadata name) when omitted. |
| `displayName` | `string` |  |  | Friendly name shown in the Access Control UI. Optional. |
| `roleNames` | `list<string>` | yes | min 1 | Roles granted to the system user, by name. Each is resolved to a role id at plan time (or at apply time for a role created earlier in the same apply). May name a config-defined role or a managed/in-DB role. |

## Example

```yaml
kind: systemUser
# optional: name: example_systemUser
spec:
  # optional: displayName: ""
  roleNames: []
```
