# Peer delegation (multi-agent hand-off)

One agent delegates work to another over the mesh — no routing code. Each running agent publishes an agent card; an agent allowed to delegate sees each permitted peer as a tool named `peer_<agentName>`, and its LLM decides when to call it.

## There is NO builder-UI control for this (verified 2026-06)

Say so plainly. The mesh visualization *displays* delegation, but the builder cannot *configure* it. Do not invent a toggle. The path is declarative config (or the platform API): the agent's **`additionalConfigurations.interAgentCommunication`** — `allowList`, `denyList`, `requestTimeoutSeconds`. In runtime YAML the same surface is `inter_agent_communication` (`allow_list`, `deny_list`, `request_timeout_seconds`). Exact syntax: `sam-declarative-config`.

## What actually makes delegation work well

1. **Allow it**: put the peer's agent name on the delegating agent's allow list (names must match the peer's `agent_name` exactly).
2. **Describe the peer well**: the peer's card description becomes the `peer_<agentName>` tool description — it IS the routing rule. Write it as "when to hand off to me."
3. **Nudge the delegator**: one line in its instructions ("for billing questions, delegate to the billing agent") makes hand-off reliable rather than occasional.
4. **Same namespace**: agents discover each other only within a namespace/broker.

## Verify

Ask the delegating agent a question in the peer's domain and watch the task flow visualization — you should see the hop. No `peer_<name>` tool appearing → check allow-list spelling and that both agents are running and discoverable. RBAC can also gate delegation (`agent:<name>:delegate` scopes) — if configured, that's `sam-operate` territory.
