# Peer delegation (multi-agent hand-off)

One agent delegates work to another over the mesh — no routing code. Each running agent publishes an agent card; an agent allowed to delegate sees each permitted peer as a tool named `peer_<cardName>` (a workflow appears as a `workflow_…` tool instead), and its LLM decides when to call it. A platform-deployed agent's card name is UUID-derived, so its tool reads `peer_agent_<uuid>`, not its display name.

## There is NO builder-UI control for this (verified 2026-06)

Say so plainly. The mesh visualization *displays* delegation, but the builder cannot *configure* it. Do not invent a toggle. The path is declarative config (or the platform API): the agent's **`additionalConfigurations.interAgentCommunication`** — `allowList`, `denyList`, `requestTimeoutSeconds`, `workflowRequestTimeoutSeconds`, `subTaskTimeoutSeconds`. In runtime YAML the same surface is `inter_agent_communication` (`allow_list`, `deny_list`, `request_timeout_seconds`, `workflow_request_timeout_seconds`, `sub_task_timeout_seconds`). Exact syntax: `sam-declarative-config`.

## Three timeouts, not one

`requestTimeoutSeconds` (default 120s) bounds one peer exchange. Delegating to a **workflow** runs a whole DAG, and a **sub-task** runs a nested agent loop — both default to 600s under their own keys. Setting `requestTimeoutSeconds` alone also replaces the other two defaults: each becomes that value or 300s (one workflow node's default budget), whichever is larger. So `requestTimeoutSeconds: 60` leaves workflow and sub-task delegations at 300s, not 60s and not their 600s defaults, and `requestTimeoutSeconds: 900` stretches all three to 900s. To keep the 600s defaults, or pick any other value, set `workflowRequestTimeoutSeconds` and `subTaskTimeoutSeconds` explicitly.

## What actually makes delegation work well

1. **Allow it**: put the peer on the delegating agent's allow list. Entries are glob patterns (`*`, `billing-*`) matched against both the peer's card name and its display name; a deny-list match wins. An explicit empty list (`[]`) denies every peer, and that is what an agent created on the platform gets until you set one.
2. **Describe the peer well**: the peer's card description becomes the `peer_<cardName>` tool description — it IS the routing rule. Write it as "when to hand off to me."
3. **Nudge the delegator**: one line in its instructions ("for billing questions, delegate to the billing agent") makes hand-off reliable rather than occasional.
4. **Same namespace**: agents discover each other only within a namespace/broker.

## Verify

Ask the delegating agent a question in the peer's domain and watch the task flow visualization — you should see the hop. No `peer_…` tool appearing → check the allow-list patterns and that both agents are running and discoverable. RBAC can also gate delegation — `agent:<dashed-uuid>:invoke` for a platform-deployed agent, `workflow:<dashed-uuid>:invoke` for a deployed workflow, and `agent:<name>:invoke` only for a YAML-authored or built-in agent. If configured, that's `sam-operate` territory.
