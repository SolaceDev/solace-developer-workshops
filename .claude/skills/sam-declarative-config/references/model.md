# Kind: `model`

Manifest path: `resources.models`

A model captures a provider-specific LLM endpoint plus credentials.
`alias` is the platform-side identity used by agents and is treated as
the resource name; use kebab-case for portability. `authConfig` is a
free-form map whose required keys depend on `provider`; secret-shaped
keys (`apiKey`, `token`, `password`) are redacted in plan output and
rewritten as `${VAR}` placeholders by `sam config pull`.

`sam config apply --prune` deletes models after it applies agents and
workflows (and, unless `--no-deploy`, after it redeploys them), so
re-pointing an agent at a new model and dropping the old one converges in
one apply. The apply fails before any change when an agent's
`modelProvider` in the manifest still names a model it would delete;
`sam config plan` shows this as a warning.


## Schema

Authoring fields for the "model" resource.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `alias` | `string` | yes |  | (no description) |
| `provider` | `string` | yes |  | (no description) |
| `modelName` | `string` | yes |  | (no description) |
| `apiBase` | `string` |  |  | (no description) |
| `authConfig` | `object` | yes |  | (no description) |
| `modelParams` | `object` |  |  | (no description) |
| `description` | `string` |  |  | (no description) |
| `maxInputTokens` | `integer` |  | tri-state pointer | (no description) |

## Example

```yaml
kind: model
# optional: description: "Example model description (replace me)."
spec:
  alias: example_model
  provider: "openai"
  modelName: "gpt-4o"
  # optional: apiBase: ""
  authConfig: {}
  # optional: modelParams: {}
  # optional: maxInputTokens: 1
```
