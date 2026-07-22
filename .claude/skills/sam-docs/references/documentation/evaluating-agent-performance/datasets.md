---
title: Datasets
description: Build and manage the datasets that drive evaluation runs.
sidebar_position: 2
---

# Datasets

A dataset is a named collection of evaluation examples. Each example carries a prompt and an optional expected response.

Author a dataset as a declarative-config resource:

```yaml
# datasets/customer_support.yaml
kind: dataset
name: customer_support
description: Production traffic samples covering refunds, returns, and order lookups.
spec: {}
```

The dataset YAML carries only the header. You add examples through one of three paths: the Agent Mesh UI, the bulk-import endpoint, or an `examples_file:` reference under `spec:` that points to a CSV sibling and is applied at `sam config apply` time. Splitting the header from the example rows lets you decide whether to keep example content in version control (with `examples_file:`) or curate it through the UI without round-tripping every change through Git.

```yaml
# datasets/customer_support.yaml — with examples in version control
kind: dataset
name: customer_support
description: Production traffic samples covering refunds, returns, and order lookups.
spec:
  examples_file: customer_support.csv
```

The Platform service can also generate examples for you through the orchestrator agent. `POST /api/v1/platform/evaluations/datasets/generate` accepts a target agent and a desired example count, and the orchestrator drafts examples derived from the target agent's metadata. The `EVAL_DATASET_GEN_AGENT` environment variable (default `Orchestrator`) selects which agent receives the generation request, and `EVAL_DATASET_GEN_TIMEOUT` (default 180 seconds) caps how long the Platform service waits for a response.

:::tip
The Agent Mesh UI exposes the same generation surface without requiring you to call the API directly. On **Evaluations** > **Experiment Lab** > **Datasets**, the **Create New Dataset** menu includes a **Generate with AI** option that drafts a whole dataset for a target agent. On an existing dataset, the example list has an inline **Generate with AI** action that adds more examples without duplicating the ones already there.
:::

## CSV Import / Export Format

The dataset bulk-import and export endpoints use CSV with this header row:

```text
sequence_number,prompt,expected_response
```

The `expected_response` column is optional. Rows with a blank `expected_response` are scored by LLM-as-a-Judge evaluators; heuristic evaluators that require an expected response skip those rows.

Export a dataset from the Platform service:

```bash
curl -fsS \
  -H "Authorization: Bearer ${SAM_PLATFORM_TOKEN}" \
  "${PLATFORM_URL}/api/v1/platform/evaluations/datasets/${DATASET_ID}/examples/export?format=csv" \
  > customer_support.csv
```

Import is the symmetric `POST .../examples/import` against the same parent path.
