# Kind: `model`

Manifest path: `resources.models`

A model captures a provider-specific LLM endpoint plus credentials.
`alias` is the platform-side identity used by agents and is treated as
the resource name; use kebab-case for portability. `authConfig` is a
free-form map whose required keys depend on `provider`; secret-shaped
keys (`apiKey`, `token`, `password`) are redacted in plan output and
rewritten as `${VAR}` placeholders by `sam config pull`.


## Schema

CreateModelConfigRequest is the request body for POST /models.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `alias` | `string` | yes |  | (no description) |
| `provider` | `string` | yes |  | (no description) |
| `modelName` | `string` | yes |  | (no description) |
| `apiBase` | `string` |  |  | (no description) |
| `authConfig` | `map[string]any` | yes |  | (no description) |
| `modelParams` | `map[string]any` |  |  | (no description) |
| `description` | `string` |  |  | (no description) |
| `maxInputTokens` | `*int` |  | tri-state pointer | (no description) |

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
