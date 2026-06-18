# Kind: `experiment`

Manifest path: `resources.experiments`

An experiment binds a dataset to a target agent and a list of
evaluators, parameterising the evaluation run. Trigger an experiment
from the CLI with `sam eval run <experiment-name>` (it polls the run
to completion and prints a results summary).

Cross-resource references — `datasetId`, `evaluatorIds`,
`primaryEvaluatorId` — accept *names*, not platform UUIDs. The
reconciler resolves names to IDs at apply time using the platform's
list of datasets and evaluators; a dangling reference hard-errors at
plan time with a clear message naming the missing resource.

Experiments depend on their referenced datasets and evaluators, so
list them in the manifest's `resources:` block under
`datasets:` and `evaluators:` (or import the relevant sources). The
reconciler applies datasets and evaluators before experiments so a
fresh apply lands cleanly.


## Schema

CreateExperimentRequest is the body for POST /eval/experiments.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `name` | `string` | yes |  | (no description) |
| `description` | `*string` |  | tri-state pointer | (no description) |
| `datasetId` | `string` | yes |  | (no description) |
| `targetAgent` | `string` | yes |  | (no description) |
| `models` | `[]map[string]any` |  |  | (no description) |
| `runsPerExample` | `*int` |  | tri-state pointer | (no description) |
| `maxWorkers` | `*int` |  | tri-state pointer | (no description) |
| `evaluatorIds` | `[]string` |  |  | (no description) |
| `primaryEvaluatorId` | `*string` |  | tri-state pointer | (no description) |

## Example

```yaml
kind: experiment
name: example_experiment
# optional: description: "Example experiment description (replace me)."
spec:
  datasetId: ""
  targetAgent: ""
  # optional: models: []  # see schema for element shape
  # optional: runsPerExample: 1
  # optional: maxWorkers: 1
  # optional: evaluatorIds: []
  # optional: primaryEvaluatorId: ""
```
