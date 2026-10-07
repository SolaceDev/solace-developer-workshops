---
published: true
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
# datasets/customer_support.yaml - with examples in version control
kind: dataset
name: customer_support
description: Production traffic samples covering refunds, returns, and order lookups.
spec:
  examples_file: customer_support.csv
```

When a dataset sets `examples_file:`, `sam config plan` reports an edit to the CSV file as an update to the dataset, and `sam config apply` makes the stored examples match the file.

:::warning
`sam config apply` deletes every stored example that the `examples_file:` CSV file does not list, even without `--prune`. The next apply deletes examples that you add to the dataset through the Agent Mesh UI or bulk import. For more information about `--prune`, see [Deleting Resources](../building/declarative-config/planning-and-applying.md#deleting-resources).
:::

The Platform service can also generate examples for you through the orchestrator agent. `POST /api/v1/platform/evaluations/datasets/generate` accepts a target agent and a desired example count, and the orchestrator drafts examples derived from the target agent's metadata. The `EVAL_DATASET_GEN_AGENT` environment variable (default `Orchestrator`) selects which agent receives the generation request, and `EVAL_DATASET_GEN_TIMEOUT` (default 180 seconds) caps how long the Platform service waits for a response.

:::tip
The Agent Mesh UI exposes the same generation surface without requiring you to call the API directly. On **Evaluations** > **Experiment Lab** > **Datasets**, the **Create New Dataset** menu includes a **Generate with AI** option that drafts a whole dataset for a target agent. On an existing dataset, the example list has an inline **Generate with AI** action that adds more examples without duplicating the ones already there.
:::

## Attaching Files to an Example

Each example can carry up to two optional files alongside its prompt, one per role:

- The `input` file is the material the agent works on: a configuration to review, a PDF to summarize, or an image to interpret. During the run, the Platform service delivers it to the target agent as a file part, the same way a chat attachment reaches an agent, so the agent can load it with its artifact tools.
- The `expected` file is the reference that evaluators grade against, such as the document that a correct answer must match. The Platform service never sends it to the agent under evaluation; delivering the grading reference to the agent would invalidate every score in the run.

An example that carries files still requires a prompt telling the agent what to do.

:::warning
Input files require a namespace-scoped artifact service on the Platform service. Under any other `artifact_scope` value the stored file reference does not resolve for the agent, and every example that carries an input file fails its trial with an error naming the cause. Text-only examples in the same dataset still run, and the run finishes with warnings. For more information about artifact scope, see [Artifacts](../concepts/artifacts.md).
:::

Attaching a file is a separate request from creating the example. Upload it to an example that already exists. Each role has its own endpoint: `inputArtifact` for the input file and `expectedArtifact` for the expected file.

```bash
curl -fsS -X POST \
  -H "Authorization: Bearer ${SAM_PLATFORM_TOKEN}" \
  -F "file=@values.yaml" \
  -F "description=Helm values under review" \
  "${PLATFORM_URL}/api/v1/platform/evaluations/examples/${EXAMPLE_ID}/inputArtifact"
```

A `DELETE` on the same path removes that role's file. A `GET` on `/api/v1/platform/evaluations/examples/{id}/inputArtifact/{filename}` or `/api/v1/platform/evaluations/examples/{id}/expectedArtifact/{filename}` downloads it. In the Agent Mesh UI, the example list on a dataset includes **Input File** and **Expected File** columns; each offers attach, replace, remove, and download actions.

The expected file must be text, such as Markdown, JSON, YAML, CSV, or source code, because evaluators read the reference as text. The Platform service rejects a binary expected file with the error code `EXPECTED_ARTIFACT_NOT_TEXT`. An input file can be any media type that the allowlist permits.

:::danger
Removing or replacing an example's file destroys the stored bytes. A run that already used the old file keeps its record of the filename and version it received, and the run drill-down reports the file as no longer available instead of serving the replacement. Keep your own copy of any file you need to reproduce a historical run.
:::

Three environment variables on the Platform service cap what an example can carry:

| Variable | Default | What it does |
|---|---|---|
| `EVAL_EXAMPLE_ARTIFACT_MAX_BYTES` | `10000000` | Rejects an upload larger than this many bytes. The default is 10 MB. |
| `EVAL_DATASET_ARTIFACT_MAX_TOTAL_BYTES` | `5000000000` | Rejects an upload that pushes one dataset past this total; the total is the combined size of both roles' files. The default is 5 GB. Replacing a file credits the bytes it frees. |
| `EVAL_EXAMPLE_ARTIFACT_ALLOWED_MIME` | empty | Comma-separated allowlist of media types that applies to both roles. An empty value accepts any type, matching what chat accepts. The Platform service trusts the media type an upload declares unless that type is generic, so the allowlist guides cooperating authors rather than enforcing what a file actually contains. |

## CSV Import / Export Format

The dataset bulk-import and export endpoints use CSV with this header row:

```text
sequence_number,prompt,expected_response
```

The `expected_response` column is optional. Rows with a blank `expected_response` are scored by LLM-as-a-Judge evaluators; heuristic evaluators that require an expected response skip those rows.

:::note
CSV and JSON bulk import cannot carry example files, and export omits them. Attach files per example after importing. The same applies to `sam config pull`, which writes prompts and expected responses to the examples CSV and warns for each dataset whose examples carry files that the command cannot export.
:::

Export a dataset from the Platform service:

```bash
curl -fsS \
  -H "Authorization: Bearer ${SAM_PLATFORM_TOKEN}" \
  "${PLATFORM_URL}/api/v1/platform/evaluations/datasets/${DATASET_ID}/examples/export?format=csv" \
  > customer_support.csv
```

Import is the symmetric `POST .../examples/import` against the same parent path.
