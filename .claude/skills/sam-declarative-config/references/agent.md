# Kind: `agent`

Manifest path: `resources.agents`

An agent is a long-lived LLM-driven entity bound to a model, a set of
toolsets, optional skills, and a system prompt. `type` accepts only
`standard`, so there is no agent type to choose or change.

All authoring fields below live under a top-level `spec:` block (only
`kind:`, `name:`, and `description:` sit at the document root) — see the
**Example** at the end of this reference for the canonical shape. The flat
form (agent fields beside `kind:`) is silently accepted at plan time but
drops the fields at apply time, surfacing as a misleading 422.

> **`systemPrompt` is required for standard agents.** The platform
> rejects any create/update of a `standard` agent (the only supported type)
> that omits it with HTTP 422 `system prompt is required for standard
> agents`. Always set `spec.systemPrompt`; its length is bounded by the platform's `agent_instruction_min_chars` and `agent_instruction_max_chars` (1 and 32000 by default).

## `additionalConfigurations` — catch-all (and its forbidden keys)

`additionalConfigurations` is a free-form object for agent config keys the
structured fields above don't model yet (e.g. `supportsStreaming`,
`agentCardPublishing.intervalSeconds`). Keys are camelCase. It is **not** where tools go.

- **`tools` is forbidden here** — the platform computes the deployed
  `tools:` block from `spec.toolsets` and rejects any
  `additionalConfigurations.tools` with HTTP 422 `additionalConfigurations
  may not set "tools"; that key is computed by the platform at deploy time`.
  To give an agent tools, list built-in toolset IDs (or your own toolset
  names) under `spec.toolsets` — see the built-in ID table in
  `references/toolset.md`.
- Keys that duplicate a structured field (e.g. `description`, `toolsets`)
  are likewise rejected — set the structured field instead.
- The runtime AWE agent YAML shape (`tools:` with `group_name`,
  `tool_type`, snake_case) does **not** belong here; that format is for
  hand-authored runtime configs, not the platform declarative API.

The agent has two distinct skill surfaces — they are *not* aliases:

- `skills:` is the **AgentCard capability descriptor list** — the
  per-agent advertisement that other agents and entrypoints read off the
  broker to decide whether to delegate to this agent. Each entry mirrors
  the A2A `AgentSkill` wire shape and is published verbatim on the
  agent card. Maximum 20 entries.
- `skillRefs:` lists **bundled skill packages** by name — runtime
  resources (instructions, references, bundled tools) the agent loads
  on demand via `load_skill`. The reconciler resolves names to platform
  IDs at apply time, so a missing skill is a plan-time error rather
  than a silent ID typo.

## `skills[]` — AgentCard skill entry

Each `skills[]` element describes one capability
the agent advertises. Mirrors the A2A `AgentSkill` wire format.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Stable identifier the orchestrator uses to route delegation. When omitted, the platform derives it from the skill name at YAML-emit time. Provide an explicit `id` if you rely on a specific routing key. |
| `name` | `string` | Human-readable skill name. Required. |
| `description` | `string` | One-sentence description of the capability. Required. |
| `tags` | `list<string>` | Free-form labels surfaced in the agent card UI; useful for grouping or filtering. |
| `examples` | `list<string>` | Short user prompts that exercise the skill. Surfaced as suggestions in some clients. |
| `inputModes` | `list<string>` | MIME types the skill accepts (e.g. `text`, `application/json`). Defaults to the agent-level `inputModes` when omitted. |
| `outputModes` | `list<string>` | MIME types the skill produces. Defaults to the agent-level `outputModes` when omitted. |
| `required` | `list<string>` | Agent Mesh-specific (not part of the A2A spec). Stored on the platform but not round-tripped through runtime YAML. Retained for backwards compatibility — new authoring should leave it empty. |
| `optional` | `list<string>` | Agent Mesh-specific (not part of the A2A spec). Same caveats as `required`. |

Round-trip property: `sam config apply` followed by `sam config pull`
preserves every A2A field above. `required` / `optional` are dropped
from the YAML round-trip by design and live only on the platform DB.

```yaml
skills:
  - id: research_topics
    name: Research
    description: Research topics in depth and produce a written summary.
    tags: [research, knowledge]
    examples:
      - Tell me about quantum computing
      - Find recent ML papers on diffusion models
    inputModes: [text]
    outputModes: [text, application/json]
```

## `additionalConfigurations.agentCard.priority` — chat picker order

Integer sort weight for the chat agent dropdown. Higher wins. The
highest-priority non-internal agent becomes the default chat target when
no project default is pinned. Absent or `0` means "no opinion" — the UI
falls back to alphabetical order. Carried on the agent card as the
`https://solace.com/a2a/extensions/sam/priority` extension.

```yaml
spec:
  additionalConfigurations:
    agentCard:
      priority: 100
```

## `additionalConfigurations.agentCard.welcome` — chat welcome screen

Drives the welcome panel shown when a chat session first opens against
this agent. Carried on the agent card as the
`https://solace.com/a2a/extensions/sam/welcome` extension and rendered
by the Agent Mesh chat UI.

| Field | Type | Description |
|---|---|---|
| `message` | `string` | Heading shown on the welcome screen. |
| `suggestions[]` | `list` | Suggestion chips shown below the heading. Up to a handful of starter prompts. |
| `suggestions[].label` | `string` (required) | Button text. |
| `suggestions[].prompt` | `string` (required) | Text injected into the chat input when the chip is clicked. |
| `suggestions[].autoSend` | `boolean` (default `false`) | When `true`, the chip submits the prompt immediately on click. When `false`, the prompt is placed in the input box for the user to edit before sending. |

```yaml
spec:
  additionalConfigurations:
    agentCard:
      welcome:
        message: "What would you like to explore today?"
        suggestions:
          - label: Summarise a document
            prompt: Summarise the attached document in 5 bullet points.
            autoSend: true
          - label: Draft a reply
            prompt: Draft a polite reply to the most recent email.
```


## Schema

Authoring fields for the "agent" resource.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `name` | `string` | yes | len 3–255 | (no description) |
| `description` | `string` | yes | len 10–1000 | (no description) |
| `systemPrompt` | `string` | yes |  | SystemPrompt is the agent's base instructions. Required for standard agents (the only supported type today): a create or update that omits it is rejected with HTTP 422 "system prompt is required for standard agents". Length is bounded by agent_instruction_min_chars and agent_instruction_max_chars in the platform config (1 and 32000 by default), counted in characters rather than bytes. |
| `type` | `string` |  | one of: standard | (no description) |
| `skills` | `list<object>` | yes | max 20 | (no description) |
| `skillRefs` | `list<string>` | yes |  | (no description) |
| `skillIds` | `list<string>` | yes |  | (no description) |
| `toolsets` | `list<string>` | yes |  | (no description) |
| `toolsetExcludedTools` | `object` |  |  | (no description) |
| `toolsetConfigs` | `list<object>` |  |  | (no description) |
| `skillConfigs` | `list<object>` |  |  | (no description) |
| `connectors` | `list<string>` | yes | max 5 | (no description) |
| `inputModes` | `list<string>` | yes |  | (no description) |
| `outputModes` | `list<string>` | yes |  | (no description) |
| `modelProvider` | `list<string>` |  |  | (no description) |
| `additionalConfigurations` | `object` |  |  | AdditionalConfigurations is a JSON-object catch-all for agent config keys that have no dedicated field, written in camelCase (e.g. supportsStreaming, agentCardPublishing.intervalSeconds). Size, depth and key collisions are checked at create/update time, and known keys are type-checked. Authored values are deep-merged into the deploy-time YAML. Forbidden keys, rejected with HTTP 422: `tools` (computed by the platform from spec.toolsets at deploy time. Declare built-in toolset IDs under spec.toolsets instead), plus any key that duplicates a structured field above. The runtime `tools:` / `group_name` shape from the AWE agent YAML does NOT belong here. |
| `deploy` | `boolean` | yes |  | (no description) |

## Example

```yaml
kind: agent
name: example_agent
description: "Example agent description (replace me)."
spec:
  systemPrompt: "Example system prompt. Replace with the agent's real instructions. Example system prompt. Replace with the agent's real instructions. "
  # optional: type: "standard"
  skills: []  # see schema for element shape
  skillRefs: []
  skillIds: []
  toolsets: []
  # optional: toolsetExcludedTools: {}
  # optional: toolsetConfigs: []  # see schema for element shape
  # optional: skillConfigs: []  # see schema for element shape
  connectors: []
  inputModes: []
  outputModes: []
  # optional: modelProvider: []
  # optional: additionalConfigurations: null  # value of type object
  deploy: false
```
