---
title: Evaluators
description: Define and configure the evaluators that score agent outputs.
sidebar_position: 1
---

# Evaluators

An evaluator scores an agent's response against the example's expected response. Two evaluator types exist: Heuristic and LLM-as-a-Judge.

## Heuristic Evaluators (System-Seeded)

Heuristic evaluators are rule-based scorers. The Platform service ships these evaluators pre-registered. You cannot add custom heuristic evaluators. They appear in the evaluator list alongside the seeded LLM-as-a-Judge ones. In a declarative-config experiment you reference them by name (resolved to an ID at apply time); when you build an experiment through the Agent Mesh UI or the evaluations API directly, you reference them by ID. The `sam config apply` command does not manage heuristic evaluators. You do not write `kind: evaluator` for them.

| `heuristicType` | What it scores | Needs `expected_response`? |
|---|---|---|
| `valid_json` | Whether the response parses as valid JSON. | No |
| `json_diff` | Structural diff between expected and actual JSON. | Yes |
| `levenshtein` | Edit-distance similarity between expected and actual strings. | Yes |
| `rouge` | Word-overlap F1 between expected and actual strings. | Yes |

Pick `valid_json` when the agent must return structured output. Pick `json_diff` for strict-structure agents. Pick `levenshtein` or `rouge` for natural-language responses where exact match is the wrong bar.

## LLM-as-a-Judge Evaluators

An LLM-as-a-Judge evaluator is a prompt template that asks an LLM to score the response on a labeled scale. The Platform service ships seven seeded LLM-as-a-Judge evaluators that you can use without authoring any YAML: `LLM Judge` (general-purpose), `Factuality`, `Closed QA`, `Summary`, `SQL`, `Translation`, and `Security`. The seeded set appears in the evaluator list alongside the heuristic ones and can be attached directly to an experiment. Operators can also author their own LLM-as-a-Judge evaluators as declarative config:

```yaml
# evaluators/helpfulness.yaml
kind: evaluator
name: helpfulness
description: Score response helpfulness on a 1-5 scale.
spec:
  type: llm_judge
  model: openai/gpt-4o-mini
  promptTemplate: |
    Score the response below on helpfulness.

    Prompt:    {{ Prompt }}
    Expected:  {{ Expected Response }}
    Response:  {{ Response }}

    Reply with exactly one of: excellent, good, adequate, poor, unacceptable.
  choiceScores:
    excellent: 1.0
    good: 0.75
    adequate: 0.5
    poor: 0.25
    unacceptable: 0.0
```

The template has constraints. `{{ Response }}` is required because the LLM must see the agent's output to score it. `{{ Prompt }}` and `{{ Expected Response }}` are optional. `choiceScores` must have 2 to 26 entries. Every label the judge can emit needs a numeric score for the pass-rate computation.

Scores in `choiceScores` are 0.0 to 1.0 floats in the YAML, but the Agent Mesh UI displays them as percentages (0 to 100). The two forms are equivalent: a YAML value of `0.5` shows in the UI as `50%`. Scores at or above 0.5 (50%) are marked passed; scores below are marked failed.

LLM-as-a-Judge evaluators need the judge model's credentials wired the same way as any other model. For more information, see [Managing Secrets](../administering/secrets-management.md).

### What the Judge Sees

Beyond the `{{ ... }}` template variables, every LLM-as-a-Judge call is automatically handed the agent's full execution context for the example. You do not template these in. The Platform service appends them for you:

- The execution transcript. The agent's assistant text is interleaved, in execution order, with every tool it called (the tool name and the parameter values it passed) and that tool's result. Very large or binary results are elided to a short placeholder. Tool definitions the agent merely had available are excluded. A tool counts as "used" only when it was actually invoked.
- Produced artifacts. Text artifacts (Markdown, JSON, CSV, source code) are inlined. Binary artifacts (images, PDFs, Office documents) appear as filename-only references.

This lets a `promptTemplate` criterion verify behavior from the trace rather than infer it from the wording of the final answer. Criteria like "the agent must call `date_math` rather than compute the date internally" or "the agent must route to the `documents` skill" become directly checkable. This resolves the long-standing ambiguity where an agent that called the right tool and then explained its result looked identical to one that hand-computed the answer. The same trace is available out-of-band via the `taskEvents` endpoint when you want to inspect it yourself.
