# Kind: `evaluator`

Manifest path: `resources.evaluators`

An evaluator scores agent responses against per-example criteria.

Two evaluator types exist:
- `llm_judge` (user-creatable): scores a response by prompting an LLM
  with `promptTemplate`. Required: `model` (LLM model alias), the
  template (must contain `{{ Response }}`), and `choiceScores` (a map
  of choice → score, 2–26 entries).
- `heuristic` (system-seeded only): rule-based scorers like
  `valid_json`. These appear in the platform's evaluator list with
  `isDefault: true`; `sam config apply` does not manage them and they
  are filtered out of the desired/actual diff so the reconciler never
  attempts to update or delete them.

Authors only write `kind: evaluator` for `llm_judge` evaluators.

Beyond the `promptTemplate` variables, every `llm_judge` call is
automatically handed the agent's full execution context for the example
— you do not template these in:
- the **execution transcript**: the agent's assistant text interleaved,
  in execution order, with every tool it called (tool name **and** the
  parameter values it passed) and that tool's result (size-capped; very
  large results are truncated). Tools the agent merely had available but
  never invoked are excluded, so a tool counts as "used" only when it
  actually appears as a call.
- any **produced artifacts** (text inlined, binaries as filename-only
  references).

This lets a `promptTemplate` criterion *verify* behaviour from the trace
rather than infer it from the wording of the final answer — e.g. "must
call `date_math` rather than compute the date in-head" or "must route to
the `documents` skill" become checkable against the transcript.


## Schema

CreateEvaluatorRequest is the body for POST /eval/evaluators.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `name` | `string` | yes |  | (no description) |
| `description` | `string` | yes |  | (no description) |
| `type` | `string` |  |  | (no description) |
| `model` | `*string` |  | tri-state pointer | (no description) |
| `promptTemplate` | `*string` |  | tri-state pointer | (no description) |
| `choiceScores` | `map[string]any` |  |  | (no description) |

## Example

```yaml
kind: evaluator
name: example_evaluator
description: "Example evaluator description (replace me)."
spec:
  # optional: type: "standard"
  # optional: model: ""
  # optional: promptTemplate: ""
  # optional: choiceScores: {}
```
