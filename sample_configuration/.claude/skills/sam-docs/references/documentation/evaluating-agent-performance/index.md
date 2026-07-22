---
title: Evaluating Agent Performance
description: Run evaluations against deployed agents, score outputs against datasets, compare experiments across binary versions, and use eval results as an upgrade gate.
sidebar_position: 0
---

# Evaluating Agent Performance

Evaluation answers the question "is this agent still doing the right thing?" You run the agent against a fixed dataset of prompts, score the outputs with a configured evaluator, and compare scores across runs. The feature is available through two interfaces: the `sam eval` CLI for ad-hoc or scripted runs, and the Platform service's evaluations API (datasets, evaluators, experiments, and runs, visible through the Agent Mesh UI) for managed runs and historical comparison.

Evaluation is not:

- Real-time observability. Per-task latency and per-tool error rates live in [Monitoring Your Agent Mesh](../administering/observability.md). Evaluation is offline scoring against a fixed dataset. Observability is what happens to live traffic.
- A unit-test runner. Evaluators score outputs with tolerance (Levenshtein distance, word overlap, or a large language model (LLM) judge). They do not assert exact equality the way a Go test does, and they are not the right tool for verifying that a code path runs.
- A substitute for a backup. Eval datasets and run history are persisted state and need their own backups. For more information, see [Managing Backups and Data Retention](../administering/backups-and-data-retention.md).

## The Two Interfaces

Both interfaces share the same datasets, evaluators, experiments, and runs. The Platform service is the system of record. The CLI is a client. The Agent Mesh UI under the Platform service is the other client.

| Surface | When to use it |
|---|---|
| `sam eval run <experiment-name>...` | Trigger one or more Platform-managed experiments by name, poll each to completion, fail the CLI when the pass rate drops below a threshold. The shape of every operator-facing evaluation. |
| `sam eval list` | List experiments registered on the Platform. Useful for discovering experiment names before running. |
| Agent Mesh UI / Platform service evaluations API | Browse historical runs, view per-example results, compare experiments side-by-side, and author evaluators in the UI. |

## What This Section Covers

- [Evaluators](./evaluators.md): the rule-based and LLM-as-a-Judge scorers that grade agent responses.
- [Datasets](./datasets.md): the named collections of prompts and expected responses that runs score against.
- [Experiments](./experiments.md): binding a dataset to a target agent and a set of evaluators, and running an experiment from the CLI.
- [Reading Results](./reading-results.md): retrieving per-run artifacts, comparing experiments, and using eval results as an upgrade gate.

## Operational Notes

Eval responses use a dedicated event broker topic family (`<namespace>/eval/v1/response/{runId}/{taskId}`), and the Platform service publishes the trigger on `<namespace>/eval/v1/run/trigger`. Agent-side task delivery, though, reuses the standard Agent-to-Agent (A2A) agent-request topic, so request-side traffic is mixed with live traffic at the topic level. To separate the two on the request side, filter on the eval-runner system user identity or the per-task metadata, not the topic.

Because eval requests share the agent's task processing with live user traffic, a large concurrent eval run can throttle live user experience on the agent under test. Schedule heavy runs off-peak or against a staging deployment when possible.

Eval runs emit operational logs and metrics. The runs use the same Entrypoint Executor, Agent-Workflow Executor, and Secure Tool Runtime log stream as live traffic, with their own `traceID` per evaluated task. Use `traceID` correlation when an individual eval task fails for an unclear reason. For more information, see [Monitoring Your Agent Mesh](../administering/observability.md).

Datasets and run history are persisted state. Both live in the Platform store the same way agent and model records do. Back the Platform store up on the same cadence as the rest of your production databases. For more information, see [Managing Backups and Data Retention](../administering/backups-and-data-retention.md).

The Platform service persists per-task execution data and artifact snapshots separately, in object storage. Set `EVAL_DATA_BUCKET_NAME` to an S3, GCS, or Azure Blob bucket for production. The Platform service falls back to `OBJECT_STORAGE_FS_ROOT` (a local filesystem path) when no bucket is set.

:::warning
`OBJECT_STORAGE_FS_ROOT` is appropriate only for development. Data stored there does not survive a container restart without a persistent volume.
:::

With neither variable set, the `taskEvents` and `runResults/{id}/executionData` endpoints return 404. Scores and per-evaluator results are unaffected because they live in the Platform store.

Several environment variables tune the execution loop:

| Variable | Default | What it controls |
|---|---|---|
| `EVAL_EXAMPLE_BUDGET_SECONDS` | `600` | Total wall-clock budget per example, including the agent call and scoring. |
| `EVAL_WATCHDOG_INTERVAL_SECONDS` | `120` | Interval at which the watchdog checks for stuck or stale runs. |
| `EVAL_SCORING_THREADS` | `8` | Worker pool size for parallel LLM-as-a-Judge scoring calls. |

## Next Steps

- To configure backups for datasets and run history, see [Managing Backups and Data Retention](../administering/backups-and-data-retention.md).
- To correlate failing eval tasks with the underlying log stream, see [Monitoring Your Agent Mesh](../administering/observability.md).
