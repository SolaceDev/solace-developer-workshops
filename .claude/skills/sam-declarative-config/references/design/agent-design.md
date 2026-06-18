---
name: sam-agent-design
description: Agent design guide — instruction writing, tool selection, structured output, HIL, peer delegation, session and artifact design, agent card writing.
tags:
  - builder
  - design
  - agent
  - sam
---

# SAM Agent Design Guide

## Instruction Writing

The instruction (system prompt) is the single most important factor in agent quality. A well-written instruction produces focused, reliable behavior. A vague instruction produces unpredictable results.

### Recommended Structure

Follow this five-section pattern:

#### 1. Role and Identity

State who the agent is and what it does. One to three sentences that establish purpose and domain. This is the anchor that every subsequent decision references.

```
You are a security auditor agent. You analyze code repositories for security
vulnerabilities, generate compliance reports, and recommend remediation steps.
```

Keep it specific. "You are a helpful assistant" tells the LLM nothing useful. "You are a security auditor that specializes in OWASP Top 10 vulnerabilities in Python web applications" gives it a clear frame of reference.

#### 2. Core Expertise and Domain

Describe what the agent understands deeply. This calibrates the LLM's confidence and response style — an agent that knows it's a database expert reasons differently about SQL queries than a general-purpose agent.

```
You have deep expertise in:
- OWASP Top 10 vulnerability categories
- Python web frameworks (Django, Flask, FastAPI)
- Static analysis patterns and common vulnerability signatures
- Compliance frameworks (SOC2, PCI-DSS, HIPAA)
```

#### 3. Behavioral Guidelines

How the agent should approach its work:
- How to analyze requests before acting
- When to use which tools
- How to handle multi-step tasks
- Quality standards for output

For **interactive agents**, include tone and personality guidance:
```
Be direct and specific. When reporting vulnerabilities, always include the
file path, line number, severity, and a concrete remediation suggestion.
Ask the user for clarification when the scope of the audit is unclear.
```

For **autonomous agents**, keep this section purely functional:
```
Process each code change independently. For each file, check against the
full OWASP Top 10 category list. Report findings as structured JSON.
You operate autonomously — do not ask for clarification. Use your best
judgment and log uncertainty.
```

#### 4. Constraints and Boundaries

What the agent should NOT do:
- Tasks outside its domain (instruct to delegate instead)
- Actions that require human approval
- Assumptions it should not make
- Data it should not access or expose

```
Do not:
- Modify code directly — only recommend changes
- Access credentials or secrets in the repository
- Make assumptions about the deployment environment
- Attempt to fix vulnerabilities without user approval

If asked about topics outside security auditing, delegate to the
appropriate specialist agent.
```

#### 5. Skill References

List available skills and when to load each one:
```
You have access to these skills with reference material:

- **owasp-reference**: Detailed OWASP vulnerability descriptions and examples.
  Load when you need to reference specific vulnerability categories.
- **compliance-frameworks**: SOC2, PCI-DSS, and HIPAA requirements.
  Load when generating compliance reports.

When you need reference material:
1. Load the appropriate skill with load_skill
2. Search with grep_skill_resources using broad regex patterns
3. Read just the relevant section with read_skill_resource
```

### Instruction Anti-Patterns

**The wall of text**: Instructions longer than ~2000 tokens where most content is rarely relevant. The LLM struggles to find the important parts. Solution: move reference material into skills.

**The copy-paste manual**: Instructions that read like internal documentation, not guidance for an AI. The LLM doesn't need markdown-formatted user guides — it needs clear behavioral directives.

**The contradictory instruction**: "Be concise" followed by "always explain your reasoning in detail." "Never make assumptions" followed by "handle all ambiguity with defaults." Review for internal contradictions.

**Missing boundary definitions**: Instructions that say what to do but not what NOT to do. Without boundaries, the agent may attempt tasks outside its competence.

---

Note: System fields (`namespace`, `model`, `display_name`, `session_service`, `artifact_service`, `agent_card_publishing`, `agent_discovery`) are injected by the platform at deployment time and must not be included in generated configs.

## Interactive vs Autonomous Agent Design

This is the most fundamental design decision for an agent. Get it wrong and the agent either blocks waiting for input that never comes (autonomous context) or frustrates users by never asking clarifying questions (interactive context).

### Interactive Agents

Interactive agents have a user on the other end. They should:

- Include the `ask_user_question` tool in their tool set
- Be instructed to ask for clarification on high-stakes or ambiguous decisions
- Include tone and personality guidance (conversational, patient, professional)
- Explain their reasoning and provide options when uncertain
- Use artifacts to share files and data with the user

```yaml
tools:
  - tool_type: builtin-group
    group_name: general_agent_tools    # includes ask_user_question
```

Instruction guidance:
```
When the user's request is ambiguous or could be interpreted multiple ways,
ask for clarification using the ask_user_question tool. Present 2-4 clear
options and explain the implications of each choice.
```

### Autonomous Agents

Autonomous agents run behind an event mesh gateway, as workflow nodes, or as delegated peers. They have no user to ask. They must:

- **NOT** include `ask_user_question` in their tool set
- Be explicitly instructed to operate autonomously
- Handle all ambiguity through fallback logic, defaults, and logging
- Include robust error handling guidance
- Be purely functional in instruction style — no tone or personality

```
You operate autonomously. Do not ask for clarification — use your best
judgment based on available data. When uncertain, choose the most
conservative option and log your uncertainty in the response.
```

An agent designed for interactive use deployed autonomously will block indefinitely waiting for user input. An agent designed for autonomous use in an interactive context will frustrate users by never asking.

---

## Tool Selection and Composition

### Match Tools to Capabilities

Every capability on the agent card should have corresponding tools. If the card promises "file analysis," the agent needs artifact management tools. If it promises "web research," it needs the web_request tool.

Conversely, don't give an agent tools it doesn't need. Each tool definition adds to the context, and irrelevant tools confuse tool selection. An agent that only answers questions doesn't need artifact management tools.

### Tool Groups vs Individual Tools

Use **tool groups** when the agent needs most tools in the group — artifact management is a common example. Use **individual tools** when you only need one or two from a group, or when you need per-tool HIL configuration.

### Tool Description Quality

The LLM selects tools based on their names and descriptions. Invest in:
- **Clear names**: `search_and_replace_in_artifact` is better than `modify_artifact`
- **Specific parameter descriptions**: Not just the type, but what values are expected
- **Usage guidance**: When to use this tool vs alternatives

For custom Python tools, write thorough `tool_description` values. For built-in tools, the descriptions are pre-written — but if the agent misuses a built-in tool, add guidance in the instruction about when to use it.

### Skill-Associated Tools

When a set of tools is only useful while a specific skill is loaded, associate those tools with the skill. The tools only appear in the agent's context when the skill is loaded, keeping the default tool list small.

---

## Structured Output Mode

When an agent is invoked as a workflow node or through structured invocation, it can be constrained to produce output conforming to a JSON Schema.

### When to Use

- The agent is a workflow node and the next node expects specific fields
- The agent produces data consumed by an automated pipeline
- The output must be machine-parseable (not human-readable text)

### How to Configure

Set `input_schema` and `output_schema` on the agent config:

```yaml
input_schema:
  type: object
  properties:
    text:
      type: string
      description: "Text to analyze"
  required: ["text"]

output_schema:
  type: object
  properties:
    sentiment:
      type: string
      enum: ["positive", "negative", "neutral"]
    confidence:
      type: number
      minimum: 0
      maximum: 1
  required: ["sentiment", "confidence"]

validation_max_retries: 2
```

The agent will retry up to `validation_max_retries` times if its output doesn't validate.

### Design Tips

- Provide the schema in the instruction as well, so the LLM knows what it's aiming for
- Use `enum` fields for categorical outputs — the LLM is more reliable with constrained choices
- Keep schemas simple — deeply nested schemas with many required fields are harder for the LLM to satisfy
- Set `validation_max_retries: 2` as a safety net — but if the agent frequently fails validation, the schema may be too complex

---

## Human-in-the-Loop (HIL)

HIL pauses the agent at tool-call time and asks the user to approve, deny, or
let the prompt time out before the tool runs. Use it for:

- **Destructive operations** — delete, transition, archive, anything that
  changes external state.
- **Costly operations** — API calls with per-call charges, expensive model
  runs.
- **Sensitive operations** — accessing personal data, posting to chat,
  sending email, modifying production records.

HIL is a per-tool feature and works on **every tool type** the agent can call
— `builtin`, `sam_remote`, MCP tools, skill-bundled tools. The author surface
varies by where the tool is declared.

### Per-tool HIL (any single-tool entry)

For tool types where each YAML entry registers exactly one tool (`builtin`,
`sam_remote`, etc.), put the `hil:` block directly on the entry:

```yaml
tools:
  - tool_type: builtin
    tool_name: web_request
    hil:
      require_approval: true
      approval_message: "Fetch {{.url}}?"
      timeout: "5m"
      show_args: true
```

When the tool comes from a `kind: toolset` package deployed through the
platform (you don't hand-write the `tools:` entry), author the same block
under the toolset's reserved `hil` config key (keyed by tool name) instead —
see *Reserved key: `hil`* in `references/toolset.md`.

Fields:

| Field | Type | Default | Purpose |
|---|---|---|---|
| `require_approval` | bool | `false` | Master switch. When true, every call gates. |
| `require_approval_when` | list of rules | empty | Per-arg conditional gating. See *Conditional gating* below. OR-ed with `require_approval`. |
| `approval_message` | string (Go text/template) | empty | Prompt text shown to the user. See substitution below. |
| `show_args` | bool | `true` | Whether the args panel is rendered. Set false for noisy or sensitive args. |
| `timeout` | duration string (e.g. `"30m"`) | agent's `HILDefaultTimeout` (45m) | How long to wait before auto-denying. |

### MCP-connector HIL (multi-tool entry)

MCP connector entries expose many tools from one binding, so the shape adds a
`tools:` sub-map keyed by the tool name the MCP server advertises. Top-level
fields act as defaults; per-tool entries override them field by field:

```yaml
# In a `kind: connector`, `type: mcp` resource:
spec:
  type: mcp
  values:
    server_url: "https://mcp.atlassian.com/v1/mcp"
    hil:
      tools:
        deleteJiraIssue:
          require_approval: true
          approval_message: "About to delete {{.issueKey}}. Confirm?"
          timeout: "30m"
        transitionJiraIssue:
          require_approval: true
          approval_message: "Transition {{.issueIdOrKey}}?"
```

The keys must match the names the MCP server advertises in `tools/list` — not
the prefixed names you'd see after `tool_name_prefix:`. For OAuth-gated MCP
servers shipping a static `manifest:` (because `tools/list` can't run
pre-auth), match the `name:` field on each manifest entry.

### Conditional gating (`require_approval_when`)

Some tools — notably MCP "REST passthrough" tools like
`atlassian_rest_request` — expose multiple HTTP verbs under one tool name. The
all-or-nothing `require_approval: true` switch forces a choice between gating
every call (annoying for safe `GET`s) and gating none. `require_approval_when`
gates per-call based on the LLM-supplied argument values:

```yaml
hil:
  tools:
    atlassian_rest_request:
      require_approval_when:
        - arg: method
          in: [POST, PUT, PATCH, DELETE]
      approval_message: "{{.method}} {{.path}}"
```

Each list entry is a rule. A call is gated when **any** rule matches — the
list is OR-ed. `require_approval: true` is also OR-ed in: it short-circuits
all rules.

Each rule carries:
- `arg:` — the argument to read. Dotted paths walk nested maps
  (e.g. `body.priority`). A non-map intermediate or missing key counts as
  no-match (fail-open).
- exactly one operator clause, from the table below.

| Operator | Value shape | Meaning |
|---|---|---|
| `eq` | scalar | arg equals value (numeric coercion across int/float; strict on string/bool). |
| `in` | non-empty list of scalars | arg equals any list element. |
| `not_in` | non-empty list of scalars | arg does NOT equal any list element. Missing arg fails open (no match). |
| `exists` | (ignored, usually `true`) | the arg is present in the call. |
| `not_exists` | (ignored, usually `true`) | the arg is NOT present in the call. |
| `gt` / `lt` / `gte` / `lte` | numeric | numeric comparison. Non-numeric arg fails open. |

Examples:

```yaml
require_approval_when:
  - arg: method
    in: [POST, PUT, PATCH, DELETE]      # gate writes
  - arg: body.priority                   # dotted path into nested map
    eq: critical
  - arg: amount
    gt: 1000                             # gate large transfers
  - arg: confirmation_token
    not_exists: true                     # gate when caller didn't include a token
```

Semantics worth flagging:

- **Missing args fail open** — a rule that names an absent arg never matches.
  This keeps a too-broad rule from accidentally gating *every* call.
- **Type mismatches fail open** — `gt: 100` against `amount: "lots"` is a
  no-match, not an error.
- **One operator per rule.** Combining (e.g. `gt:` + `lt:` on the same rule)
  is a config error. To AND across two conditions today, restructure as a
  more specific operator or revisit when multi-clause rules land.
- **Per-tool overrides REPLACE the entry-default rules** (same shape as
  `approval_message` etc.) — a per-tool `require_approval_when` block is
  the full set of rules for that tool, not an append to the entry default.
- **Parse errors are startup errors.** Unknown operators, missing `arg`,
  malformed `in` lists, etc. fail the agent at config load with a message
  identifying the tool name and rule index — not at gate time.

### Approval-message templating (Go `text/template`)

`approval_message` is rendered with Go's `text/template` package, with the
LLM-supplied tool args as the data context. Use `{{.argName}}` to interpolate
values:

```yaml
approval_message: "Create a {{.issueTypeName}} in project {{.projectKey}}: '{{.summary}}'?"
```

If the LLM calls the tool with
`{issueTypeName: "Story", projectKey: "DATAGO", summary: "Add Gmail"}`, the
user sees `Create a Story in project DATAGO: 'Add Gmail'?`.

Semantics:

- **Missing keys render as empty.** `{{.missing}}` collapses to `""` instead
  of leaking template internals to the human.
- **Malformed templates fall back to the raw message.** An unterminated
  action like `{{.who` keeps the literal text visible so the author notices.
- **Static messages are fine.** A message with no `{{` tokens passes through
  unchanged.
- **`{argName}` single-brace is NOT supported.** Some early docs referenced
  that form; use the canonical `{{.argName}}` syntax.

### How the approval card renders

- The agent identifies itself by its **display name** (set
  `displayName:` on the agent — falls back to the slug `name` otherwise, which
  is the broker-safe UUID-derived identifier and reads poorly).
- When `show_args: true`, each LLM-supplied arg renders as a label + value
  pair. The JSON-Schema description for each arg (from the tool's parameter
  schema) appears as a **hover tooltip** on the label, not inline — keeps the
  card focused while leaving the long descriptions reachable.
- Deny, cancel, and timeout all return a tool error to the LLM, which then
  decides how to recover (usually abandoning the action or asking the user
  for guidance).

### Design considerations

- **Interactive only** — HIL is meaningless for autonomous agents with no
  user to approve. Use scope policies / RBAC for those.
- **Write the message for the human, not the LLM.** Spell out what's about
  to happen using the tool args, e.g. *"Send Slack message to #ops:
  '{{.text}}'?"* — not *"Confirm slack_post"*.
- **Set realistic timeouts.** Too short and the user misses the window. The
  45m default is a starting point; raise it for slow-cadence approvals
  (e.g. PR reviews) and lower it for high-frequency ones.
- **`show_args: false` is the escape hatch** for sensitive (PII, credentials)
  or noisy (large payloads, base64 blobs) args — but pair it with an
  explicit `approval_message` so the user still has context.
- **Gate writes, leave reads unattended.** Reads through the same MCP server
  (search, lookup, get) should typically run without approval; the friction
  cost adds up over a long conversation.

---

## Peer Delegation

### When to Split into Multiple Agents

Split when the agent's responsibilities become distinctly different — when the instruction reads like a manual for multiple unrelated jobs. Signs you should split:

- The instruction says "when the user asks about X, do A; when they ask about Y, do B" and X and Y have nothing in common
- Tools needed for one capability are completely irrelevant to another
- The agent frequently loads multiple unrelated skills
- Quality degrades on specialized tasks because the context is diluted

### How Peer Delegation Works

The original agent becomes a coordinator. It discovers specialist agents through their agent cards and routes tasks based on capability matching. No explicit wiring needed — the delegating agent finds the right peer by matching the task to capability descriptions.

Configure with:
```yaml
inter_agent_communication:
  allow_list: ["*"]              # or specific agent patterns
  request_timeout_seconds: 120
```

### Design Tips

- The coordinator agent's instruction should describe its routing role
- Specialist agents should have clear, non-overlapping capability descriptions
- Set appropriate `request_timeout_seconds` based on expected specialist work
- Use `max_call_depth` to prevent infinite delegation chains

---

## Session and Memory Design

### When to Persist Sessions

- **Interactive agents**: Almost always persist. Users expect conversation continuity.
- **Autonomous agents**: Usually ephemeral. Each event is independent.
- **Workflow nodes**: Ephemeral. Each invocation is stateless.

### Configuration

Session service is configured automatically by the platform. Interactive agents get persistent SQL sessions; workflow nodes and autonomous agents get ephemeral memory sessions.

### Context Accumulation

In multi-turn conversations, each turn adds to session history. An agent that works well for 3 turns may degrade at 30 turns because history fills the context window. Mitigate by:
- Using artifacts for persistent data instead of relying on the agent remembering everything
- Keeping individual turns focused and concise
- Considering session summarization for long interactions

---

## Artifact Usage Patterns

### When to Create Artifacts

- The output is a file (report, code, data export)
- The data needs to persist across turns
- The content is too large to include inline in a message
- The user might want to download or share the result

### Naming Conventions

Use descriptive, extension-appropriate filenames:
- `security-audit-report.md` not `output.txt`
- `analysis-results.json` not `data.json`
- Include context when useful: `orders-2024-q1-summary.csv`

### Tool Output Thresholds

Configure `tool_output_save_threshold_bytes` to automatically save large tool outputs as artifacts:
```yaml
tool_output_save_threshold_bytes: 2048
tool_output_llm_return_max_bytes: 4096
```

Tool outputs larger than 2KB are saved as artifacts; the LLM sees a truncated preview up to 4KB plus a reference to the full artifact.

---

## Agent Card Design

The agent card is how other agents and gateways discover this agent. The capability descriptions (the `skills` field in YAML) are the most important part.

### Writing Good Capability Descriptions

Each capability should:
- Describe a specific thing the agent can do (not a vague category)
- Use keywords that other agents would search for
- Be distinct from other capabilities on the same card

Good:
```yaml
skills:
  - id: code-review
    name: Code Review
    description: >-
      Review Python code for security vulnerabilities, performance issues,
      and coding standard violations. Produces detailed findings with
      file paths, line numbers, and remediation suggestions.
  - id: compliance-report
    name: Compliance Reporting
    description: >-
      Generate SOC2, PCI-DSS, and HIPAA compliance reports based on
      code repository analysis and infrastructure configuration review.
```

Bad:
```yaml
skills:
  - id: general
    name: General
    description: "Does stuff with code."
```

### Input/Output Modes

```yaml
agent_card:
  defaultInputModes: [text]          # what the agent accepts
  defaultOutputModes: [text, file]   # what the agent produces
```

Set these accurately. An agent that produces reports should list `file` in output modes. An agent that processes uploaded files should list `file` in input modes.

---

## Model Selection

Different agents can use different models. Consider:

- **Fast, cheap models** for simple routing, classification, or formatting agents
- **Capable models** for complex reasoning, code analysis, or creative tasks
- **Same model** for agents that delegate to each other (reduces prompt format differences)

Model selection is configured per-agent by the platform at deployment time.

The model choice affects cost, latency, and quality. Start with a capable model and only switch to a cheaper one when you've verified the agent works well and the cheaper model maintains quality for the specific task.
