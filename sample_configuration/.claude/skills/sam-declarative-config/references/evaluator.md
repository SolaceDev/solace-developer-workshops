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

Authors only write `kind: evaluator` for `llm_judge` evaluators. `type`
defaults to `llm_judge` and may be omitted; it is the only value the API
accepts.

`promptTemplate` supports these variables (case-insensitive, normalized
on save):
- `{{ Response }}` — the agent's response being graded. **Required** — a
  template without it is rejected at create time.
- `{{ Prompt }}` — the example's prompt.
- `{{ Expected Response }}` — the example's expected response, if set.

Example — `evaluators/answer-grounded.yaml`:

```yaml
kind: evaluator
name: answer-grounded
description: Scores whether the answer is grounded in the prompt.
spec:
  type: llm_judge
  model: gpt-4o
  promptTemplate: |
    Prompt: {{ Prompt }}
    Response: {{ Response }}
    Is the response grounded in the prompt and free of invented facts?
    Reply with exactly one label: grounded, partial, or hallucinated.
  choiceScores:
    grounded: 1.0
    partial: 0.5
    hallucinated: 0.0
```

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

Authoring fields for the "evaluator" resource.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `name` | `string` | yes | max 255 | Name is the evaluator's display name (unique per platform). |
| `description` | `string` | yes | len 1–1000 | Description explains what the evaluator scores. |
| `type` | `string` |  | one of: llm_judge | Type selects the evaluator kind. Defaults to "llm_judge" when omitted; only "llm_judge" is creatable via the API. "heuristic" evaluators (valid_json, json_diff, …) are system-seeded and read-only here. |
| `model` | `string` |  | tri-state pointer | Model is the LLM model alias used to grade responses. Required for llm_judge evaluators. |
| `promptTemplate` | `string` |  | tri-state pointer | PromptTemplate is the grading prompt. Required for llm_judge evaluators and must contain the {{ Response }} placeholder. Also supports {{ Prompt }} and {{ Expected Response }} (case-insensitive, canonicalized on save). The agent's execution transcript and produced artifacts are injected automatically — do not template those in. |
| `choiceScores` | `object` |  | len 2–26 | ChoiceScores maps each choice label the judge may return to its numeric score. Required for llm_judge evaluators; 2–26 entries. |

## Example

```yaml
kind: evaluator
name: example_evaluator
description: "Example evaluator description (replace me)."
spec:
  # optional: type: "llm_judge"
  # optional: model: ""
  # optional: promptTemplate: ""
  # optional: choiceScores: {}
```
