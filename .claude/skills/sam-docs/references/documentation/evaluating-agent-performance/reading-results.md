---
title: Reading Results
description: Interpret evaluation scores and use them as an upgrade gate.
sidebar_position: 4
---

# Reading Results

After a run terminates, you can retrieve per-run and per-result artifacts:

| Endpoint | What it returns |
|---|---|
| `GET /api/v1/platform/evaluations/runs/{id}/results` | A `PaginatedResponse` envelope (`{data: [...], meta: {pagination: {pageNumber, count, pageSize, nextPage, totalPages}}}`). The `data` array carries one row per example × trial, including per-evaluator scores and pass flags. |
| `GET /api/v1/platform/evaluations/runs/{id}/export?format=csv` | The same rows as CSV. Header columns: `example_id`, `trial_index`, `input_prompt`, `expected_response`, `agent_response`, `duration_seconds`, `error_message`, plus one `score_<evaluator>` and one `passed_<evaluator>` column per evaluator (all `score_*` columns first, then all `passed_*` columns). |
| `GET /api/v1/platform/evaluations/runResults/{id}/taskEvents` | The per-task STIM event log wrapped in the same `PaginatedResponse` envelope. The `data` array is the event sequence in the order the agent loop emitted it for live tasks. Use it when you need to see which tool calls and which LLM turns produced a failing score. |

All list endpoints in the evaluations API use the `PaginatedResponse` envelope, even when the dataset isn't actually paged, so a client never has to branch on whether a response is a bare array.

The Platform service computes pass rates across every score that carries a `passed: true|false` verdict. Scores without a verdict (typically intermediate LLM-as-a-Judge scores that don't map to the choice set) do not influence the rate.

For visual inspection of an individual result, the per-example detail page in the Agent Mesh UI renders the `taskEvents` trace as an activity diagram. The diagram shows the message flow between the orchestrator, the target agent, and any peer agents that participated. Open an example from the experiment report grid and select the **Show Activity** icon in the per-model header within the trial card to reveal the side panel.

## Comparing Experiments

Two operator workflows answer "did this change regress the agent?":

- Same experiment, two runs. Trigger the nightly experiment before and after the change. The Platform service run-comparison view (under the experiment detail page in the Agent Mesh UI) lines the runs up side-by-side. The CSV export from the CLI feeds the same comparison into a spreadsheet.
- Two experiments, same dataset. Author a second experiment that targets the same dataset and the same evaluators but a different agent configuration (a different model alias or a different system prompt). Trigger both and compare the resulting runs. Useful when the change you are evaluating is a YAML-level change to the agent itself, not a binary upgrade.

The Platform service groups runs by their owning experiment. The Agent Mesh UI exposes per-run drill-down and per-example comparison. Authoring a separate dashboard against the export endpoints (CSV piped into your aggregator of choice) is a valid alternative when your team already lives in Grafana, Datadog, or Looker.

## Tying Evaluation Results Into an Upgrade Gate

The most operationally useful place to put evaluation is as a pre-upgrade dry-run. The shape:

1. Restore production session-store and entrypoint-store backups in staging. For more information, see [Managing Backups and Data Retention](../administering/backups-and-data-retention.md).
2. Roll the staging deployment to the new binary version.
3. Trigger the production-traffic-derived experiment against the staging deployment.
4. Compare pass rates against the previous run from the same experiment on the old binary.
5. Only start the production roll if the comparison meets your gating criterion (for example, per-evaluator pass rate within two percentage points).

Running this as a pre-upgrade check is the procedural counterpart. The non-zero exit from the CLI on `--threshold` failure makes this straightforward to script in a CI job. The upgrade job only proceeds when `sam eval run` exits 0.
