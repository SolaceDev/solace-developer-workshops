---
title: AI Assistant
description: How the in-platform AI assistant drafts a configured-agent skeleton from a natural-language description, and how to set it up.
sidebar_position: 8
---

# AI Assistant

The AI assistant drafts a first-cut configured agent from a plain-English description. An operator types what they want — "a customer support agent that can look up orders and post status to Slack" — and the assistant returns a structured suggestion mapping into the Create-Agent form. The operator reviews and edits before saving.

This page covers the assistant from an operator's perspective: what it does, how to access it, what it produces, and how to wire it up. The configured-vs-built dimension is explained once in Concepts → Configured vs built; this page does not restate it. For the agents the assistant drafts, see Building → Agents. For the role-based access that grants assistant access, see Administering → RBAC reference.

## What the AI Assistant Is

The AI assistant is a feature of the **platform service** — the management plane that operators use to create, deploy, and govern agents. It lives behind the "Create agent from prompt" flow in the platform's Web UI. Under the hood, the assistant calls a configured language model with a prompt that captures the platform's idea of what an agent is, what toolsets exist, what connectors are wired in, and what input and output modes are supported. The model returns a JSON suggestion that the UI hydrates into the standard Create-Agent form.

What the assistant is **not**:

- It is not a multi-turn chat. Each call is one description in, one suggestion out. You iterate by editing the description and regenerating, or by tweaking the form fields directly.
- It is not a deployer. The suggestion lands in the form as a draft. You save it and deploy it through the same flow you would use to create an agent by hand.
- It is not a replacement for operator review. The suggestion is exactly that — a suggestion. Review the system prompt, the toolset list, the connector wiring, and the I/O modes before saving.

## When to Use It

The assistant earns its keep in three scenarios:

- **First-time agent authoring.** You know what you want the agent to do but not which knobs the YAML surface exposes. The assistant produces a configuration you can read and learn from.
- **Prototyping.** You want to spin up an agent quickly to test an idea, with sensible toolset and connector picks already made.
- **Learning the platform.** Reading what the assistant chose — which toolsets it pulled in, which connectors it referenced — is a fast way to map your problem onto the platform's capabilities.

Once you understand the YAML surface, you may find direct editing faster than going through the assistant. That is fine; the assistant is an accelerant, not a workflow.

## How to Access It

The assistant is available in the platform Web UI under **Agents → Create from prompt**. The dialog accepts a description between 10 and 1000 characters, then calls the assistant and pre-populates the standard Create-Agent form with the suggestion.

Access is gated by the **`sam:agent_builder:create`** RBAC scope. Identities without this scope receive HTTP 403 on the assistant endpoint and cannot open the "Create from prompt" dialog in the UI. The broader `sam:agent_builder:*` scope family also covers reading agent metadata and updating drafts; see Administering → RBAC reference for the full scope set.

## What It Produces

The assistant returns a JSON object the UI maps into the Create-Agent form. The fields:

| Field | Type | What it carries |
|---|---|---|
| `name` | `string` | A short, human-friendly agent name. The operator usually edits this. |
| `description` | `string` | One- to two-sentence summary of what the agent does. |
| `systemPrompt` | `string` | The system instruction the operator can refine before save. May be omitted. |
| `modelProvider` | `string[]` | Suggested model aliases for the agent to call. References aliases the operator has configured in the platform's Models view. |
| `toolsets` | `string[]` | Suggested built-in toolset group names (such as `builtin_artifact_tools`, `builtin_research_tools`). |
| `skills` | `[{name, description}]` | Suggested skill names with brief descriptions. Capped at 8 per response. |
| `connectors` | `string[]` | Names of existing connector instances the assistant suggests wiring the agent to. |
| `inputModes` | `string[]` | Suggested input modes for the agent to accept. |
| `outputModes` | `string[]` | Suggested output modes for the agent to produce. |

Every field is editable in the form. The operator can clear a field the assistant filled, add new toolsets the assistant did not pick, refine the system prompt, or replace the suggested connector wiring entirely.

The assistant cannot invent toolsets or connectors that do not exist in the platform — it only suggests from the catalog the platform has registered. This is deliberate: a suggestion the operator cannot actually save is useless.

## HTTP API Surface

Operators who want to drive the assistant from automation can call it directly:

```bash
# Generate an agent suggestion from a natural-language description.
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "description": "A customer support agent that can look up orders in our database and post status updates to a Slack channel."
  }' \
  https://platform.example.com/api/v1/platform/aiAssistant/generateAgent
```

The response is the JSON suggestion described in What it produces. Status codes:

- **`200`** — suggestion produced.
- **`400`** — the `description` is missing, shorter than 10 characters, longer than 1000 characters, or otherwise invalid. The response body carries `validationDetails` describing the offending field.
- **`403`** — the caller does not hold `sam:agent_builder:create`.
- **`502`** — the upstream language model returned an error or unparseable output. The error body carries an `errorId` you can grep for in the platform's logs.

The endpoint is stateless — there is no conversation history. Each call is independent.

## Operator Setup

To enable the assistant in a deployment, configure a model under the alias **`general`** in the platform's `model_configurations` table. The assistant resolves this alias at call time, so operators can change which model the assistant uses by updating the alias in the platform's Models view; no restart is required.

For first-time setup, the platform seeds the `general` alias from environment variables:

```bash
# .env — first-boot seed for the platform's model configurations.
export LLM_SERVICE_GENERAL_MODEL_NAME="anthropic/claude-sonnet-4-5"
export LLM_SERVICE_ENDPOINT="https://api.anthropic.com/v1"
export LLM_SERVICE_API_KEY="${ANTHROPIC_API_KEY}"
```

These env vars are read only on the platform's first boot. Subsequent changes happen through the Models UI — the env vars are not the durable source of truth.

The platform service itself is wired up in YAML the same way other apps are:

```yaml
# configs/platform.yaml — platform service fragment
apps:
  - name: platform_service_app
    app_exec: sam-platform
    app_config:
      namespace: ${NAMESPACE, solace-agent-mesh}
      database_url: ${PLATFORM_DB_URL}
      session_secret_key: ${SESSION_SECRET_KEY}
```

When the platform service starts, it boots the assistant alongside the other platform features (agent CRUD, deployment management). There is no separate enable flag for the assistant — when the platform service runs and the `general` model alias is configured, the assistant is available to anyone holding the scope.

## Available Toolsets and Connector Awareness

The assistant's prompt is seeded with the catalog of toolsets and connectors the platform knows about. The toolsets it can recommend match the built-in toolset groups documented in Building → Tools:

- `builtin_artifact_tools` — file CRUD inside the artifact store (default suggestion for most agents).
- `builtin_web_request_tools` — outbound HTTP fetches.
- `builtin_research_tools` — research-flavored search and summarization.
- `builtin_file_tools` — broader file-handling helpers.
- `builtin_image_tools` — image manipulation and generation.
- `builtin_time_tools` — current time, timezone math, scheduling helpers.
- `hil_tools` — the `ask_user_question` family for agents that need to clarify.
- `data_analysis` — chart generation, JSON/CSV transformation.

The assistant can also reference existing connector instances by name — for example, if you have a configured Slack connector named `support-slack`, the assistant may suggest wiring the new agent to it. It does not invent connector names; it picks from what the platform's connector registry currently holds.

## Limits and Error Modes

A few hard limits shape what the assistant accepts and returns:

- **Description length: 10–1000 characters.** Shorter descriptions get rejected before the model is called; longer descriptions also fail validation. Aim for two or three sentences of intent.
- **Skills per suggestion: 8.** The assistant returns at most eight `{name, description}` pairs. Operators can add more by editing the form.
- **Response cap: 8192 tokens.** The model is asked to fit its suggestion into roughly 8K tokens. Truncated responses are logged as warnings and may produce fewer fields than expected.
- **No `general` alias configured.** The assistant fails with a clear error: "AI assistant requires a configured model for alias 'general'". Configure the alias in the Models view or seed the env vars and restart.
- **Upstream model failure.** The assistant surfaces a 502 with the `errorId` field set. Inspect the platform's logs for the matching `errorId` to see the underlying provider error.

When in doubt, regenerate. The assistant is non-deterministic; the same description run twice produces slightly different suggestions, and one of the two is usually a better starting point than the other.

## What Next?

You have just learned how the AI assistant fits into the agent-authoring flow. Most readers next want to refine the assistant's draft by reading the configured-agent surface end-to-end — covered in Building → Agents. For the role-based access reference that gates the assistant, see Administering → RBAC reference. For the platform service that hosts the assistant, see Concepts → Platform service.
