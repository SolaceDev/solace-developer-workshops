---
name: sam-skill-design
description: Design guidance for SAM skills — when to create skills, instruction content structure, reference design, agent integration, and common pitfalls.
tags:
  - builder
  - design
  - skill
  - sam
---

Design guidance for creating SAM skills. Skills are knowledge bundles that agents load on demand via `load_skill`.

For **schema details** see `sam-skill-schema`.

## What Are Skills?

Skills are reusable knowledge bundles that contain:
- **Instruction content** — Markdown text injected into the agent's context when loaded
- **References** — Optional supporting documents the agent can search and read

When an agent calls `load_skill`, the skill's instruction content is added to its context. The agent can then use `grep_skill_resources` and `read_skill_resource` to search and read reference documents without loading them all into context.

Skills are the primary mechanism for managing LLM context. They let you keep an agent's base instruction lean and focused, while making detailed reference material available on demand.

## When to Create a Skill

Create a skill when:
- An agent needs domain knowledge that would bloat its instruction if always loaded
- Reference material is reusable across multiple agents
- The knowledge is structured and searchable (API docs, style guides, compliance rules)
- The user mentions "reference documents", "knowledge base", "documentation bundle", or "reusable instructions"

Do **not** create a skill when:
- The knowledge is small enough to fit in the agent instruction (under ~500 tokens)
- The content is specific to one conversation or task
- The user just needs a tool, not knowledge (tools are separate from skills)

## Instruction Content Writing Guide

The instruction content is the core of a skill. It's injected into the agent's LLM context when loaded, so it should be focused and well-structured.

### Recommended Structure

1. **Purpose statement** — What this skill provides and when to use it (1-2 sentences)
2. **Key concepts** — Essential knowledge the agent needs immediately
3. **Reference guide** — When and how to use the reference documents
4. **Constraints** — What the skill does NOT cover, boundaries

### Example

```markdown
# REST API Reference

This skill provides documentation for the Acme REST API v2.
Use it when the user asks about API endpoints, authentication, or data formats.

## Authentication
All endpoints require Bearer token authentication.
Include the token in the Authorization header.

## Available References
- `endpoints.md` — Complete endpoint listing with parameters and examples
- `error_codes.md` — Error response codes and troubleshooting

When you need endpoint details:
1. Search with grep_skill_resources using the endpoint path or method name
2. Read the specific section with read_skill_resource
```

### Instruction Anti-Patterns

**Too long** — Instructions over ~2000 tokens where most content is reference material. Move the reference material to `references/` files instead.

**Too vague** — "This skill has information about our API." Tell the agent exactly what's available and when to use each reference.

**Duplicating agent instruction** — The skill instruction should complement the agent instruction, not repeat it. The agent instruction defines behavior; the skill instruction provides domain knowledge.

## Reference Design

References are optional supporting documents stored in the `references/` directory. They're accessed via `grep_skill_resources` (search) and `read_skill_resource` (read).

### Inline vs Artifact References

Each reference can be provided as:
- **Inline content** — The content is embedded directly in the skill config. Use for builder-generated content that the builder creates during the build.
- **Artifact reference** — Points to a user-uploaded artifact by name. Use for large documents the user has already uploaded.

### When to Use Each

**Inline content:**
- Builder is generating the reference content as part of the build
- Content is relatively short (under ~5000 tokens per file)
- Content is specific to this skill and doesn't exist elsewhere

**Artifact reference:**
- User uploaded a document (PDF extract, API spec, manual)
- Content is large and already exists as an artifact
- Multiple skills might reference the same document

### File Organization

Break references into logical, searchable files:
- `api_reference.md` — endpoint documentation
- `examples.md` — usage examples
- `error_codes.md` — error handling guide

Use descriptive filenames — agents see them via `list_skill_resources` and choose which to read based on the name.

Avoid putting everything in a single huge file. Agents search references with `grep_skill_resources` and read specific sections — smaller, focused files make this more effective.

## Asset Templates

A skill's `assets/` directory can ship report and document **templates**, not just static files. Pair an asset (for example `report.html`) with a `<name>.template.yaml` sidecar and it becomes a template the agent fills with `@@KEY@@` substitutions and instantiates with `instantiate_template` — the embeds and Liquid in the body render live each time the artifact is downloaded. An asset with no sidecar is copied verbatim.

Prefer a template over having the agent generate a structured document token by token: the model produces only the small data artifact, and the template engine renders the document. This is both cheaper and more reliable for any repeatable report or export.

When building a skill that should ship a template, emit two files under `assets/` — the asset body (with `@@KEY@@` tokens and `«…»`/Liquid embeds) and its `.template.yaml` sidecar declaring the `substitutions` and `data_inputs` contract. The sidecar shape, the closed-set `@@KEY@@` rules, the `data_inputs` schema/columns contract, and a worked example are documented once in the customer docs — follow that page rather than restating the rules:

- [Asset templates](https://solacedev.github.io/solace-agent-mesh-go/documentation/building/skills#asset-templates)

## Agent Integration

When creating an agent that uses a skill, configure it in the agent's YAML:

```yaml
skills:
  - name: my-api-reference
```

And include guidance in the agent instruction about when to load the skill:

```
You have access to an API reference skill. When the user asks about API endpoints
or data formats, load it with load_skill and search the references for relevant
documentation.
```

### Agent Card Skills vs Knowledge Skills

There are two different uses of the word "skills" in SAM:
- **Agent card skills** — Capabilities listed in `agent_card.skills[]`. These describe what the agent can do (A2A protocol).
- **Knowledge skills** — Skill bundles configured in `skills[]`. These provide reference material.

They are separate. An agent can have capabilities listed in its card without any knowledge skills, and vice versa. A knowledge skill often supports one or more agent card capabilities — for example, an "API Integration" capability might be supported by an "api-reference" knowledge skill.

## Naming Conventions

- Use lowercase alphanumeric characters and hyphens: `my-api-reference`, `compliance-rules`
- Be descriptive but concise
- Avoid prefixes like `skill-` (redundant) or version suffixes like `-v2` (use description for versioning)

## Size Guidelines

- **Instruction content**: 50-5000 tokens is the sweet spot. Under 50 is too sparse to be useful. Over 5000 means you should move content to references.
- **References**: Each file should be independently useful. 500-10000 tokens per file. Very large files (>10000 tokens) should be split.
- **Total references**: 1-10 files is typical. More than 10 usually means the skill's scope is too broad — consider splitting into multiple skills.

## Builder Workflow for Skills

### 1. Identify skill needs during Discovery phase

Listen for signals that suggest skills:
- "I have reference documentation for..."
- "The agent needs to know about our API..."
- "Can you include these docs for the agent to reference?"

### 2. Create skill artifacts BEFORE agent artifacts

Skills should be created before agents that reference them. The build manifest should list skills before agents that depend on them.

### 3. Generate instruction content and references

For each skill:
1. Write focused instruction content (purpose, key concepts, reference guide)
2. For builder-generated references, use inline `content` fields
3. For user-uploaded documents, use `artifact` fields referencing existing artifacts

### 4. Validate before saving

Always validate skill artifacts with `ValidateComponentConfig`:
```
ValidateComponentConfig(
  config_yaml: '<the YAML string>',
  mime_type: 'application/vnd.sam-skill-config+yaml'
)
```

### 5. Wire skills to agents

After creating the skill, ensure the agent config includes the skill reference and the agent instruction mentions when to load it.
