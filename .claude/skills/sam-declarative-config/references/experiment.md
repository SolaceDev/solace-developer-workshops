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

`runAs` names the system user the experiment's runs execute as. Give it a
bare name (`runAs: reporting-evals`) and the platform stores the subject
`system:reporting-evals`; an already-prefixed value is kept as-is, so both
spellings of the same principal read as unchanged. The manifest is the
desired state: omitting `runAs` reverts the experiment to the built-in
eval system user, so declare it explicitly on any experiment that needs a
scoped principal.

That built-in principal is `system:eval`, which holds `agent:*:invoke`,
`workflow:*:invoke`, and `tool:*:*`.

Runs carry exactly the scopes that principal holds. The platform resolves it
from one merged view — the baked-in system defaults, the operator's
authorization config, and system users and role grants provisioned as platform
records — so a `systemUser` you declare in the same manifest takes effect
without touching any mounted YAML.

The named system user does not have to exist when you apply: plan does not
cross-reference it. It does have to hold a role by the time a run starts. A
`runAs` that resolves to no scopes fails the run with a message naming the
principal, rather than executing it under a broader grant, so declare the
`systemUser` in the same manifest to avoid the gap. Check the platform log
line `execution service: run publishing as principal` for the `runAs` a run
actually used, and the signer's WARN for a refusal.

`runAs` cannot name a built-in principal an entrypoint runs as (`system:default`,
`system:channel`); `sam config plan` flags it and the platform rejects the write. Tool credentials
are keyed by principal, so an experiment naming one would share a credential
slot with live traffic — and the Connect Tools panel would then offer to
disconnect it out from under that traffic. Declare a system user of your own
instead. Note that this rejection covers only the built-ins: reusing one custom
system user across a live entrypoint's `run_as` and an experiment's `runAs`
collides on the same credential key.

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
| `primaryEvaluatorId` | `string` |  | tri-state pointer | PrimaryEvaluatorID names the evaluator whose score is the headline metric; it must be one of evaluatorIds. |
| `runAs` | `string` |  | tri-state pointer | RunAs names the Agent Mesh system user this experiment's runs execute as. A bare name is namespaced to system:<name>; an already-prefixed value is kept as-is. Omit (or send an empty string) to run as the built-in eval system user. Runs carry exactly the scopes that principal holds, resolved from the platform's merged RBAC state (baked-in system defaults, operator authorization YAML, and DB-provisioned system users and role grants). The named system user need not exist when the experiment is saved, but a principal that holds no scopes when the run starts fails the run rather than executing under a broader grant. The built-in system users an entrypoint runs as (system:default, system:channel) are rejected: tool credentials are keyed by principal, so an experiment naming one would share a credential slot with live traffic, which Connect Tools then offers to disconnect. Declare a system user of your own instead. |

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
  # optional: runAs: ""
```
