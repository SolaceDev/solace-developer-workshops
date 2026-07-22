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

The optional `models` field pins which model configs the agent runs
under: a list (max 3) of maps, each keyed by `modelConfigId` naming a
model config. Omit it to evaluate the agent's configured model.

Experiments depend on their referenced datasets and evaluators, so
list them in the manifest's `resources:` block under
`datasets:` and `evaluators:` (or import the relevant sources). The
reconciler applies datasets and evaluators before experiments so a
fresh apply lands cleanly.


## Schema

Authoring fields for the "experiment" resource.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `name` | `string` | yes | max 255 | Name is the experiment's display name (unique per platform). |
| `description` | `string` |  | tri-state pointer | Description summarises the experiment's purpose. |
| `datasetId` | `string` | yes | max 255 | DatasetID references the dataset to evaluate against. In config-apply manifests this is the dataset's name, resolved to an ID at apply time. |
| `targetAgent` | `string` | yes | max 255 | TargetAgent is the name of the agent under evaluation. |
| `models` | `list<object>` |  | max 3 | Models optionally pins which model configs the agent runs under; each entry is a map keyed by "modelConfigId" (the model-config to use). At most 3 entries; omit to use the agent's configured model. |
| `runsPerExample` | `integer` |  | tri-state pointer | RunsPerExample repeats each example this many times (1–10; default 1). |
| `maxWorkers` | `integer` |  | tri-state pointer | MaxWorkers caps concurrent example evaluations (1–20). |
| `evaluatorIds` | `list<string>` | yes | len 1–3 | EvaluatorIDs lists the evaluators to score with (their names in config-apply manifests). At least one is required; at most 3. |
| `primaryEvaluatorId` | `string` |  | tri-state pointer | PrimaryEvaluatorID names the evaluator whose score is the headline metric; it must be one of EvaluatorIDs. |

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
  evaluatorIds: []
  # optional: primaryEvaluatorId: ""
```
