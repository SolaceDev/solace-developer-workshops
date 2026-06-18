# Kind: `agent`

Manifest path: `resources.agents`

An agent is a long-lived LLM-driven entity bound to a model, a set of
toolsets, optional skills, and an optional system prompt. The `type`
field is immutable after creation — recreate the agent to change it.

The agent has two distinct skill surfaces — they are *not* aliases:

- `skills:` is the **AgentCard capability descriptor list** — the
  per-agent advertisement that other agents and gateways read off the
  broker to decide whether to delegate to this agent. Each entry mirrors
  the A2A `AgentSkill` wire shape and is published verbatim on the
  agent card. Maximum 20 entries.
- `skillRefs:` lists **bundled skill packages** by name — runtime
  resources (instructions, references, bundled tools) the agent loads
  on demand via `load_skill`. The reconciler resolves names to platform
  IDs at apply time, so a missing skill is a plan-time error rather
  than a silent ID typo.

## `skills[]` — AgentCard skill entry

Each `skills[]` element is a `SkillRequest` describing one capability
the agent advertises. Mirrors the A2A `AgentSkill` wire format
(`internal/a2a/protocol.go`).

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Stable identifier the orchestrator uses to route delegation. When omitted, the platform derives it via `nameToSnakeCase(name)` at YAML-emit time. Provide an explicit `id` if you rely on a specific routing key. |
| `name` | `string` | Human-readable skill name. Required. |
| `description` | `string` | One-sentence description of the capability. Required. |
| `tags` | `[]string` | Free-form labels surfaced in the agent card UI; useful for grouping or filtering. |
| `examples` | `[]string` | Short user prompts that exercise the skill. Surfaced as suggestions in some clients. |
| `inputModes` | `[]string` | MIME types the skill accepts (e.g. `text`, `application/json`). Defaults to the agent-level `inputModes` when omitted. |
| `outputModes` | `[]string` | MIME types the skill produces. Defaults to the agent-level `outputModes` when omitted. |
| `required` | `[]string` | SAM-specific (not part of the A2A spec). Stored on the platform but not round-tripped through runtime YAML. Retained for backwards compatibility — new authoring should leave it empty. |
| `optional` | `[]string` | SAM-specific (not part of the A2A spec). Same caveats as `required`. |

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
additionalConfigurations:
  agentCard:
    priority: 100
```

## `additionalConfigurations.agentCard.welcome` — chat welcome screen

Drives the welcome panel shown when a chat session first opens against
this agent. Carried on the agent card as the
`https://solace.com/a2a/extensions/sam/welcome` extension and rendered
by the SAM chat UI.

| Field | Type | Description |
|---|---|---|
| `message` | `string` | Heading shown on the welcome screen. |
| `suggestions[]` | `list` | Suggestion chips shown below the heading. Up to a handful of starter prompts. |
| `suggestions[].label` | `string` (required) | Button text. |
| `suggestions[].prompt` | `string` (required) | Text injected into the chat input when the chip is clicked. |
| `suggestions[].autoSend` | `boolean` (default `false`) | When `true`, the chip submits the prompt immediately on click. When `false`, the prompt is placed in the input box for the user to edit before sending. |

```yaml
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

## Volume tools — workspace volumes (feature-gated)

> **Availability:** the `builtin_volume_tools` toolset is gated by the
> `volumes` feature flag (`SAM_FEATURE_VOLUMES`). It **may not be available**
> in your deployment — if the feature is off, the toolset won't appear in the
> builder catalog and an agent that references it won't get the tools. Confirm
> with your operator before relying on it.

Volume tools (`volume_read`, `volume_write`, `volume_list`, `volume_grep`, …)
operate on a persistent, mounted **workspace volume** rather than artifacts.
For the tools to work, the agent needs two things beyond enabling the toolset:

1. A **volume slot** declared under `additionalConfigurations.volumes` — a named
   filesystem allocation with a provision strategy (`auto_create` provisions one
   per session and needs a `ttl`; `static` binds a pre-existing `volume_id`;
   `prompt_user` asks the user to pick one). Keys *inside* each `volumes[]` slot
   are **snake_case** (`volume_id`, `prompt_message`, `allow_exec`) — it's an
   opaque pass-through the platform doesn't re-case, unlike the camelCase
   `toolsetConfigs`/`volumeBindings` around it.
2. A **binding** of the tools' `workspace` param to that slot, via a
   `toolsetConfigs` entry's `volumeBindings`.

```yaml
kind: agent
name: workspace-agent
spec:
  toolsets:
    - builtin_volume_tools
  toolsetConfigs:
    - toolsetName: builtin_volume_tools
      volumeBindings:
        workspace: ws            # bind the tools' "workspace" param to the slot
  additionalConfigurations:
    volumes:
      - name: ws                 # the slot the binding references
        provision: auto_create
        ttl: "24h"
```

Without both the slot and the binding the tools register but have nothing to
mount, and calls fail at dispatch. (The builder UI for wiring this is a
fast-follow; in declarative YAML, author the two blocks as shown.)


## Schema

CreateAgentRequest is the request body for POST /agents.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `name` | `string` | yes | len 3–255 | (no description) |
| `description` | `string` | yes | len 10–1000 | (no description) |
| `systemPrompt` | `string` |  | len 100–10000 | (no description) |
| `type` | `string` |  | one of: standard | (no description) |
| `skills` | `[]SkillRequest` | yes | max 20 | (no description) |
| `skillRefs` | `[]string` | yes |  | (no description) |
| `skillIds` | `[]string` | yes |  | (no description) |
| `toolsets` | `[]string` | yes |  | (no description) |
| `toolsetExcludedTools` | `map[string][]string` |  |  | (no description) |
| `toolsetConfigs` | `[]ToolsetConfigBinding` |  |  | (no description) |
| `skillConfigs` | `[]SkillConfigBinding` |  |  | (no description) |
| `connectors` | `[]string` | yes | max 5 | (no description) |
| `inputModes` | `[]string` | yes |  | (no description) |
| `outputModes` | `[]string` | yes |  | (no description) |
| `modelProvider` | `[]string` |  |  | (no description) |
| `additionalConfigurations` | `json.RawMessage` |  |  | AdditionalConfigurations is a JSON-object catch-all for agent config keys the structured DTO does not yet model (e.g. supports_streaming, agent_card_publishing.interval_seconds). Tier-1 structural validation (size, depth, top-level key collisions) runs at create/update time; deeper schema-driven validation is a follow-up. Authored values are deep-merged into the deploy-time YAML. Blocked keys (owned by the platform's YAML emitter; rejected with HTTP 422 if set): `tools` — computed from spec.toolsets at deploy time. |
| `deploy` | `bool` | yes |  | (no description) |

## Example

```yaml
kind: agent
name: example_agent
description: "Example agent description (replace me)."
spec:
  # optional: systemPrompt: "Example system prompt. Replace with the agent's real instructions. Example system prompt. Replace with the agent's real instructions. "
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
  # optional: additionalConfigurations: null  # TODO: provide a value of type json.RawMessage
  deploy: false
```
