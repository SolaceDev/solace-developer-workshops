# What a workflow step guarantees

Differences between node types that change how you design a DAG. For the node types themselves and the
authoring paths, see [workflows.md](workflows.md).

## Retry does not reach a tool node

**Do not rely on workflow retry reaching a `type: tool` node — it does not.** A `retry_strategy:` block on
a tool node parses and is then ignored, as is any key a node type does not use. Nothing warns you, so
**its presence in your YAML is not evidence that it applies.**

Agent nodes can retry, but only when a `retry_strategy` applies — set on the node, or as the workflow's
default. Nothing retries by default. The default policy, `OnFailure`, retries a failure the agent reports
and **not** a timeout or system error; `OnError` covers those and `Always` covers both. A DAG mixing both
node types therefore has uneven resilience: the model-driven steps can get another attempt and the
deterministic ones cannot. Either put the retry-worthy work in an agent node with a `retry_strategy`, or
make the tool idempotent so the whole workflow can simply be run again.

## Schemas advertise more than they enforce

A workflow's `input_schema` — the one describing what a caller passes in — is published to callers, to the
agent card and to the visualization, and is **not checked at run time**. `required:` there is
documentation. A missing key does not fail validation; it becomes an empty reference and fails later,
somewhere else, which is why the error you eventually see rarely names the input you forgot.

Two things this does **not** apply to:

- an **agent node's input** schema is validated by the agent receiving the call, which fails with an
  input-validation error;
- an **agent node's output** schema is checked, and the model is asked again when its answer does not
  conform — see [structured-output.md](structured-output.md). That is validate-and-retry against a model
  rather than a hard guarantee, so put a real check downstream if a later step depends on the shape: a
  `switch` node that routes bad values away, or a tool that rejects them outright.

## Failure propagation is asymmetric by depth

`fail_fast` defaults to **on**, where a node failure ends the workflow once that node's retries are
exhausted. (A node failing inside an exit handler never fails the workflow.) Turn fail-fast off and two
different rules apply:

- a **direct** dependent of the failed node is skipped, unconditionally — even if its other dependencies
  all succeeded;
- a node **further downstream** is skipped only if **every one** of its inputs was skipped.

So a node with one dead branch and one surviving branch **runs**, receiving nothing for the dead one. It
succeeds, and its result quietly omits whatever that branch was carrying. There is **no** way to mark an
output optional. The skip itself is logged only at debug level — though the run view does show the node as
**skipped**, which is the fastest way to spot it.

⇒ **Guard every cross-branch reference with `coalesce`** (it is a key on the value, not a function inside
the braces — see [data-flow.md](data-flow.md#helpers) for the shape, and note that guessing the
function-call form fails silently), and never assume a skipped upstream will stop the step that consumes
it.

## Mixing agent and tool nodes

Feed an agent's structured output into a tool node with `{{<agent-node>.output.<field>}}`. Keep that
agent's output schema tight — a tool has no judgment to fall back on, so it needs predictable types. The
field must be declared in that schema (the node's `output_schema_override` or the agent's `outputSchema` in
`additionalConfigurations`, the runtime `output_schema` — see [structured-output.md](structured-output.md))
and named in the agent's instruction; an agent node with no declared schema guarantees no fields, so pass
its whole `{{<agent-node>.output}}` instead (see [data-flow.md](data-flow.md)).

## Which steps actually need a model?

Fetching, transforming, writing and rendering do not. Reserve agent nodes for judgment: interpreting free
text, choosing between options, summarizing.

**The cost difference is in time, not just tokens.** Every agent-driven step is a model call, and most of
its wall-clock time goes to the model deciding what to do and describing what it did, not to doing the
work. Replacing agent nodes with tool nodes where no judgment is required can cut a multi-step workflow's
runtime by orders of magnitude — the tool-only path makes zero model calls. Reserve agent nodes for the
steps that need judgment and let tool nodes carry the rest.
