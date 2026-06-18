# Kind: `dataset`

Manifest path: `resources.datasets`

A dataset captures a named collection of evaluation examples (prompt
plus optional expected response). The resource header carries `name`
and `description`; per-example content (the actual prompts) is managed
through the platform UI or the bulk-import endpoint and is not part of
the dataset YAML in v1.

Datasets are leaf resources — they do not reference other manifest
resources. Experiments cross-reference a dataset by name to scope the
evaluation corpus.


## Schema

CreateDatasetRequest is the body for POST /eval/datasets.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `name` | `string` | yes |  | (no description) |
| `description` | `string` | yes |  | (no description) |

## Example

```yaml
kind: dataset
name: example_dataset
description: "Example dataset description (replace me)."
```
