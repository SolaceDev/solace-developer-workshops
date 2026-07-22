# Kind: `dataset`

Manifest path: `resources.datasets`

A dataset captures a named collection of evaluation examples (a prompt
plus an optional expected response). The resource header carries `name`
and `description`.

Per-example content is authored through an `examples_file:` field under
`spec:` that points at a CSV sidecar (path relative to the dataset YAML).
The examples are reconciled separately during `sam config apply` — they
are applied via the examples API after the dataset itself, so they never
appear on the dataset create/update request.

The CSV uses a header row and RFC 4180 quoting (quote fields containing
commas, quotes, or newlines):

- `sequence_number` — positive integer, unique within the file. Reused
  across applies so a deleted row is restored at its original position.
- `prompt` — required.
- `expected_response` — optional; leave the cell empty for none.

`sam config pull` writes each dataset as `<name>.yaml` plus a
`<name>.examples.csv` sidecar (rows sorted by `sequence_number`) and sets
`examples_file` to point at it, so a pulled tree re-applies with no diff.

Example — `datasets/support-qa.yaml`:

```yaml
kind: dataset
name: support-qa
description: Support questions with reference answers.
spec:
  examples_file: support-qa.examples.csv
```

`datasets/support-qa.examples.csv`:

```csv
sequence_number,prompt,expected_response
1,What is the refund window?,30 days from purchase.
2,"Does it support commas, quotes?","Yes — use RFC 4180 quoting."
3,Where are logs stored?,
```

Datasets are leaf resources — they do not reference other manifest
resources. Experiments cross-reference a dataset by name to scope the
evaluation corpus.


## Schema

Authoring fields for the "dataset" resource.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `name` | `string` | yes | max 255 | Name is the dataset's display name (unique per platform). |
| `description` | `string` |  | max 1000 | Description summarises what the dataset's examples cover. |
| `examples_file` | `string` |  |  | ExamplesFile names a CSV sidecar (path relative to this YAML) holding the dataset's examples. Reconciled by `sam config apply` via separate example API calls — it is never sent on the dataset create/update request. Columns: sequence_number, prompt, expected_response (RFC 4180 quoting). `sam config pull` writes it back as <name>.examples.csv. |

## Example

```yaml
kind: dataset
name: example_dataset
# optional: description: "Example dataset description (replace me)."
spec:
  # optional: examples_file: ""
```
