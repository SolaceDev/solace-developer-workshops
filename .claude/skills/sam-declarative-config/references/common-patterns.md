## Common Patterns

**Variable substitution.** Any string field in a YAML resource (or the
manifest itself) can reference a variable with `${VAR}` or
`${VAR, default}`. Resolution order: `variables:` block in the
manifest, then the process environment. The `default` form is used
when neither is set; without a default, an unresolved variable is a
plan-time error.

**`!include`.** A YAML scalar value tagged `!include path/to/file` is
replaced by the parsed content of that file. Useful for sharing system
prompts or large config blocks across agents.

**Source URLs.** The manifest's `sources:` block accepts pip-style URLs:
`git+https://...@<ref>` (with optional `#subdirectory=<path>`),
`https://...` for archive downloads, and `file:///abs/path` for a local
checkout. A pinned ref (tag, full SHA) is cached forever; a floating
ref (branch, short SHA, HEAD) requires `--allow-floating-refs` and
re-fetches every run.

**Resource imports.** A resource entry in the manifest can be a bare
local name (`my-agent`), a `name@source` import
(`research-agent@ai-team-agents`), or an aliased import
(`{from: research-agent@ai-team-agents, as: team-research}`). Imported
resources are fetched from the source repo's matching `<plural>/`
directory.

**Naming.** Most resources require `safename` characters: lowercase
letters, digits, and `-`. Agent names are 3-40 chars; gateway names 3-
255; model aliases 1-100. The schema for each kind documents the live
constraints.

**Secret placeholders.** Pull-side serialisation rewrites
known-credential fields into `${RESOURCE_NAME_FIELD}` placeholders so
the YAML is safe to commit. Apply-side substitutes them back from env
vars; an unresolved placeholder is an apply-time error rather than a
silent leak.
