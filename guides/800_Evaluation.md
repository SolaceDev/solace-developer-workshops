# Would It Hold at 40x?

**This is a take-home lab.** It is written to be completed on your own, after the workshop, with no facilitator. Everything it needs is already in your repository.

Peak is three weeks out and Meridian's exception volume goes up 40x. Before anyone lets this run unsupervised on 3,000 orders a day, somebody has to answer a question that has nothing to do with whether the code works: **were the substitutions any good?**

---

## Table of Contents

- [Why testing is not enough](#why-testing-is-not-enough)
- [The three resources](#the-three-resources)
- [Hands-on: run the experiment](#hands-on-run-the-experiment)
- [Reading the results](#reading-the-results)
- [Extending this](#extending-this)

---

## Why testing is not enough

Your Go tests pass. They will keep passing. `score_substitutes` is deterministic, so twenty runs produce twenty identical outputs, and that is exactly what unit tests are for.

None of that tells you whether `order-triage` behaves. The agent is the non-deterministic part. It decides which candidates to gather, whether to call the tool at all, what to say about the result, and whether to invent a delivery date when the data is thin. Those are behaviors, not return values, and you cannot assert on them with an equality check.

Evaluation is the tool for that. You replay known cases, score the responses against criteria, and repeat each case enough times to see the variance.

Note the dependency: this only works because the scoring underneath is reproducible. If the ranking changed run to run, a low evaluation score would tell you nothing about whether the agent had regressed. The toolset in section 400 is a prerequisite for this lab, not a feature beside it.

---

## The three resources

Evaluation in Solace Agent Mesh is three declarative resources you already know how to apply.

**A dataset** is a set of examples: a prompt, and optionally the response you expected. Yours holds the twenty historical exceptions seeded in the Meridian database, each one an order that was resolved by a human whose answer you can score against.

```
sample_configuration/datasets/
  exception-replay.yaml
  exception-replay.examples.csv
```

**An evaluator** scores one response against one criterion by prompting a model to grade it. You have two, and they check the two things that would actually hurt Meridian:

| Evaluator | Question it asks |
|---|---|
| `grounded-in-tools` | Did every figure come from a tool, and was a restock date promised? |
| `respects-hard-fails` | Were merchandising constraints treated as exclusions or argued around? |

**An experiment** binds them: this dataset, against this agent, scored by these evaluators, this many times each.

```
kind: experiment
name: substitution-quality
spec:
  datasetId: exception-replay
  targetAgent: order-triage
  evaluatorIds:
    - grounded-in-tools
    - respects-hard-fails
  primaryEvaluatorId: grounded-in-tools
  runsPerExample: 3
  maxWorkers: 4
```

> Note: `runsPerExample: 3` is the important line. One run per example tells you what happened once. Three tells you whether it holds. For a non-deterministic system, a single passing run is not evidence.

---

## Hands-on: run the experiment

1. Open `sample_configuration/datasets/exception-replay.examples.csv` and read a couple of rows. Each `prompt` is one real seeded order, and each `expected_response` describes the properties a good answer must have rather than the exact words it must use.

1. Add all four resources to your manifest:

    ```
      datasets:
        - exception-replay
      evaluators:
        - grounded-in-tools
        - respects-hard-fails
      experiments:
        - substitution-quality
    ```

    > Note: If your manifest has no `datasets`, `evaluators`, or `experiments` keys yet, add them alongside the others under `resources:`.

1. Plan and apply:

    ```
    export RETAIL_DB_PASSWORD=postgres
    sam config plan --manifest sample_configuration/manifests/local.yaml
    sam config apply --manifest sample_configuration/manifests/local.yaml
    ```

1. In the Solace Agent Mesh client, open the **Experiments** tab, select `substitution-quality`, and run it.

    > Note: Sixty runs (twenty examples, three times each) takes a few minutes and consumes tokens. If your key is budget-limited, drop `runsPerExample` to 1 for a first pass.

---

## Reading the results

Do not start with the average. Start with the worst scores.

**Look for variance first.** An example that scores 1.0, 1.0, 0.0 across three runs is more alarming than one that scores 0.4 every time. Consistent mediocrity is a prompt you can fix. Inconsistency means the behavior is not actually pinned, and it will eventually happen in front of a customer.

**Then read the failures.** For anything the `grounded-in-tools` evaluator marked `invented`, open the response and find the figure that came from nowhere. It is usually a delivery date, a stock number stated with more confidence than the data supports, or a restock date the agent decided would be reassuring.

**Then check the rejections.** A `violated` score on `respects-hard-fails` is the serious one. It means the agent recommended something merchandising forbids, which is a policy breach rather than a quality problem.

A useful bar before running unsupervised: **`grounded-in-tools` at or near 1.0 on every example, with no variance.** That criterion is about trust rather than quality, and it is the one that does not get to be averaged away. A substitution that is merely mediocre costs Meridian margin. A confidently invented delivery date costs a customer.

---

## Extending this

Once the loop works, the obvious additions:

- **A third evaluator for brand voice**, scoring the drafted message against the rules in `meridian-customer-comms`. That closes the loop on the skill you built in section 400.
- **More cases, deliberately hard ones.** The seeded twenty are ordinary. Add the ones you would not want to get wrong: every candidate hard-failing, a Summit-tier customer with a large order, stock only at a store that cannot ship ecom.
- **Run it in CI.** An experiment is a declarative resource like everything else, so a prompt change can be gated on the score not regressing.

That last one is the point of the whole exercise. The reason to make evaluation a resource rather than a script is that it turns "does the agent still behave" into a question with an automatable answer.

---
Section complete! Close this file and return to the Workshop Tracker to continue.
