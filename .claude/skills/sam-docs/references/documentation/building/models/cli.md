---
title: Configuring Models with the CLI
description: Define a model configuration as declarative-config YAML and apply it into Agent Mesh with sam config.
sidebar_position: 2
---

# Configuring Models with the CLI

To create and manage model configurations from the Agent Mesh UI, and to understand what a model configuration is and how agents use it, see [Configuring Models](./index.md). This page covers authoring a model as version-controllable YAML, called *declarative config*: the YAML specific to the `model` kind. For the `sam config plan`, `apply`, and `pull` workflow that applies to every kind, see [Managing Configuration as Code (Early Access)](../declarative-config/index.md).

The example on this page is an Anthropic model, the same kind of configuration the Agent Mesh UI page builds, so you can compare the two paths directly.

## Before You Start

You need a running Agent Mesh instance to apply config to. For how to install or deploy one, see [Install and Deploy](../../installing/index.md).

The `general` and `planning` model aliases already exist in every deployment; this page adds another alongside them.

## Write the Model

A model is one file under the `models/` directory of a declarative-config repo, listed by name in the manifest:

```yaml
# manifest.yaml
kind: manifest
name: models
description: Model configurations.
target:
  url: http://127.0.0.1:8800
resources:
  models:
    - analysis
```

The following file defines an Anthropic model. The alias is the top-level `name`; the provider, model, endpoint, and credentials live under `spec`:

```yaml
# models/analysis.yaml
kind: model
name: analysis
description: General-purpose model for analysis tasks.
spec:
  provider: anthropic
  modelName: claude-sonnet-4-6
  apiBase: https://api.anthropic.com
  authConfig:
    type: apikey
    api_key: ${ANTHROPIC_API_KEY}
  maxInputTokens: 200000
```

The top-level `name` is the model's *alias*, the identity agents reference; use kebab-case for portability. The optional top-level `description` is the **Description** field in the Agent Mesh UI. The fields under `spec` map to the sections of the UI editor:

| Field | Description |
|---|---|
| `provider` | The model provider: `anthropic`, `openai`, `azure_openai`, `bedrock`, `google_ai_studio`, `vertex_ai`, `ollama`, or `custom` (any OpenAI-compatible endpoint). This is the **Model Provider** picker in the UI. |
| `modelName` | The provider's model identifier, such as `claude-sonnet-4-6`. This is the **Model Name** field. |
| `apiBase` | The provider endpoint. This is the **API Base URL** field. |
| `authConfig` | The credentials, keyed by a `type` discriminator: `apikey` takes an `api_key`; `none` takes no credentials; `oauth2` takes `client_id`, `client_secret`, and `token_url`. This is the **Authentication Type** field and its credential inputs. |
| `modelParams` | Optional model parameters such as `temperature`, `max_tokens`, and a prompt-caching strategy. These are the **Advanced Settings** in the UI. |
| `maxInputTokens` | Optional context-window limit, the **Max Input Tokens** field. |

Never commit a real key. Reference it with `${ANTHROPIC_API_KEY}`, and `sam config apply` substitutes the value from the environment. For the full secret-handling rules, see [Managing Configuration as Code (Early Access)](../declarative-config/index.md).

To discover every field the `model` kind accepts, run `sam config schema show model`. To print a templated starting file, run `sam config schema example model`.

:::note
For a local or self-hosted, OpenAI-compatible endpoint such as Ollama, set `authConfig` to `{type: none}`; no key is required. Set `provider` to `ollama`, or to `custom` for any other OpenAI-compatible endpoint. This is the **Authentication Type** set to **None** in the UI.
:::

## Apply and Verify

Preview the change with `sam config plan -m manifest.yaml`, then apply the manifest to create the model:

```bash
sam config apply -m manifest.yaml
```

```text
Applied models:
  + analysis             created
```

To confirm the result, export the model back into YAML with `sam config pull --only model --name analysis --url http://127.0.0.1:8800 -o ./pulled`, or open the Agent Mesh UI and find `analysis` on the **Models** page. A model has no deploy phase; after it is applied, it is immediately available for agents to reference.

A manifest that lists only `analysis` shows the seeded `general` and `planning` as deletes in the plan, but `apply` leaves them in place. For how the plan and apply diff works, including the display-only delete entries and `--prune`, see [Managing Configuration as Code (Early Access)](../declarative-config/index.md).

## What Next?

You have a model defined as version-controllable YAML. Most readers next:

- To manage model configurations from the Agent Mesh UI, see [Configuring Models](./index.md).
- To point an agent at this model by its alias, see [Creating Agents with the CLI](../agents/cli.md).
- For the plan, apply, and pull workflow that applies to every kind, see [Managing Configuration as Code (Early Access)](../declarative-config/index.md).
