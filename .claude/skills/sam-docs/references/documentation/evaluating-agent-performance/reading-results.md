---
published: true
title: Reading Results
description: Interpret evaluation scores and use them as an upgrade gate.
sidebar_position: 4
---

# Reading Results

After a run terminates, you can retrieve per-run and per-result artifacts:

| Endpoint | What it returns |
|---|---|
| `GET /api/v1/platform/evaluations/runs/{id}/results` | A `PaginatedResponse` envelope (`{data: [...], meta: {pagination: {pageNumber, count, pageSize, nextPage, totalPages}}}`). The `data` array carries one row per example × trial, including per-evaluator scores and pass flags. A row also carries `failureKind`, which classifies why a trial produced no answer: it is `auth_required` when the trial reached a tool that the run's system user held no credential for, and `null` when the trial did not hit a classified failure of this kind. |
| `GET /api/v1/platform/evaluations/runs/{id}/export?format=csv` | The same rows as CSV. Header columns: `example_id`, `trial_index`, `input_prompt`, `expected_response`, `agent_response`, `duration_seconds`, `error_message`, plus one `score_<evaluator>` and one `passed_<evaluator>` column per evaluator (all `score_*` columns first, then all `passed_*` columns). The `input_artifact` and `expected_artifact` columns follow `error_message`; each holds the file recorded for the trial as `filename@version`, or is empty for an example without that file. The export carries no column for `failureKind`; read that field from the JSON endpoint. |
| `GET /api/v1/platform/evaluations/runResults/{id}/taskEvents` | The per-task STIM event log wrapped in the same `PaginatedResponse` envelope. The `data` array is the event sequence in the order the agent loop emitted it for live tasks. Use it when you need to see which tool calls and which LLM turns produced a failing score. |
| `GET /api/v1/platform/evaluations/runResults/{id}/inputArtifact/{filename}` | The input file the Platform service delivered for this trial, when the example carried one. Add `?version=N` to pin a version; without it the Platform service resolves the version recorded on the result. The endpoint returns a not-found error after you remove or replace the example's file. |
| `GET /api/v1/platform/evaluations/runResults/{id}/expectedArtifact/{filename}` | The expected file recorded for this trial, when the example carried one. Version resolution and not-found behavior match `inputArtifact`. The Platform service never sends this file to the agent; the file is the reference that evaluators grade against. |

All list endpoints in the evaluations API use the `PaginatedResponse` envelope, even when the dataset isn't actually paged, so a client never has to branch on whether a response is a bare array.

The Platform service computes pass rates across every score that carries a `passed: true|false` verdict. Scores without a verdict (typically intermediate LLM-as-a-Judge scores that don't map to the choice set) do not influence the rate.

The version recorded in `input_artifact` and `expected_artifact` is the one captured when the run started, so an old run stays auditable after the example changes. For more information about attaching files, see [Datasets](./datasets.md).

For visual inspection of an individual result, the per-example detail page in the Agent Mesh UI renders the `taskEvents` trace as an activity diagram. The diagram shows the message flow between the orchestrator, the target agent, and any peer agents that participated. Open an example from the experiment report grid and select the **Show Activity** icon in the per-model header within the trial card to reveal the side panel.

## Examples Blocked on Tool Authorization

An agent under evaluation can reach a tool that requires a user login. Because a run carries no signed-in person, the trial stops there: it produces no answer, it is recorded with `failureKind` set to `auth_required`, and it is left unscored rather than graded as a wrong answer. Its `errorMessage` begins `Authentication required:` and names the tool and the credential involved. When the agent under test reached the tool by delegating to another agent, the message instead names that peer agent and does not carry the `Authentication required:` prefix, so do not filter on the prefix alone.

A blocked trial counts as an error when the Platform service derives the run status, so a run with some blocked examples finishes as `completed_with_warnings` and a run with nothing but blocked examples finishes as `failed`. The experiment report in the Agent Mesh UI heads the affected run with a banner counting the blocked examples and linking to the panel that resolves them.

:::warning
A blocked example does not mean the agent regressed, and its absent scores are not zeroes. They are missing measurements. Exclude blocked examples before you compare pass rates across runs, or the comparison reports a regression that did not happen.
:::

To give the run's system user the credentials it needs, see [Connecting Tools for an Experiment](./experiments.md#connecting-tools-for-an-experiment). To diagnose the failure, see [Troubleshooting Authorization Failures](./experiments.md#troubleshooting-authorization-failures).

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
