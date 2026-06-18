## Common Mistakes

- **Forgetting `--manifest`.** Apply / plan / migrate all require
  `--manifest path/to/manifest.yaml`. Pull is the exception (it builds
  a manifest from platform state).
- **Casing mismatch.** YAML field names are camelCase
  (e.g. `modelName`, `systemPrompt`, `apiBase`) — the same names the
  platform's REST API uses. snake_case fields are silently ignored.
- **Hard-coding secrets.** Don't commit auth tokens or API keys.
  Reference an env var via `${VAR}` (manifest auth) or rely on the
  pull-side `${RESOURCE_NAME_FIELD}` placeholder pattern.
- **Floating refs in production.** Sources without a pinned ref
  (branch, short SHA, HEAD) require `--allow-floating-refs` and make
  apply non-reproducible. Pin to a tag or full SHA.
- **Panicking at `plan` deletes on a partial manifest.** `plan` always
  diffs the *whole* platform against the manifest, so a focused manifest
  that lists only one resource shows every other resource as `- delete`.
  That is display-only: `apply` performs creates/updates but **skips
  deletes unless you pass `--prune`** (you'll see `skipped (use --prune
  to delete)`). This is exactly what makes selective single-resource
  manifests safe — apply without `--prune` and the rest of the platform
  is untouched. Only reach for `--prune` with a full manifest that is
  genuinely the complete desired state.
- **Skill files vs directories.** A `skills:` resource entry points
  at a directory under `skills/<name>/`, not a YAML file. The
  directory must contain a SKILL.md.
- **Mixing `kind` values.** Each per-resource YAML file declares its
  own `kind:` (e.g. `kind: agent`); the manifest's `kind: manifest`
  is unrelated. Setting `kind: agent` inside a manifest is a parse
  error.
- **Trying to mutate immutable fields.** Agent and gateway `type`
  fields are immutable after creation; apply silently ignores
  attempts to change them. Recreate the resource (delete + apply) to
  switch type.
- **Tool param missing both optional signals.** A Go toolset param
  field is optional if it is a pointer type (`*string`, `*int`) OR
  carries `json:",omitempty"`; otherwise it is required. Authors
  who omit both end up with every field in the JSON schema's
  `required` list — the STR rejects any call that omits one with
  "mandatory input parameters are not present". When in doubt,
  pick one signal per field. See `references/tool-build.md`
  "Authoring pitfalls".
- **Re-uploading an in-use toolset.** The platform rejects toolset
  uploads with HTTP 409 PackageInUse when any deployed agent
  references the package. Use `sam config apply --force-toolset`
  during iteration; it appends `?force=true` and the platform
  auto-redeploys affected agents.
- **Stale build-cache poison.** `[BUILD: cache-hit <os>/<arch>]`
  short-circuits the build and re-uploads whatever zip is cached for
  that target. Cross-target poisoning is now prevented by segmenting
  the cache by `<os>-<arch>/` and mixing the target into the hash, so
  a darwin/arm64 zip can no longer satisfy a linux/arm64 apply. A
  once-bad zip from a stale SDK or missing tool registrations still
  stays bad until you `rm -rf toolsets/<name>/.sam-cache/build/` and
  re-apply. Confirm by inspecting the cached binary:
  `unzip -p toolsets/<name>/.sam-cache/build/<os>-<arch>/*.zip <name> | file -`.
