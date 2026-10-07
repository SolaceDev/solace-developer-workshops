# Kind: `entrypoint`

Manifest path: `resources.entrypoints`

An entrypoint exposes the platform to external clients (HTTP, Slack, MS
Teams, etc.). The `type` field is immutable after creation. The
`values` field is a free-form object whose shape is dictated by the
entrypoint type's schema — consult the per-type section below (or fetch a
running entrypoint with `sam config pull --only entrypoint --name X -o <dir>`) for
the per-type field set. `publicUrl` is optional and only meaningful
for HTTP-style entrypoints.

### Connection model: outbound (Socket Mode) vs inbound (webhook)

Entrypoint types differ in *which direction* the connection runs, and this
dictates what you must configure outside the platform:

- **Outbound / Socket Mode (e.g. `slack`)** — the entrypoint opens an
  outbound WebSocket to the provider using an app token. No inbound
  endpoint, no public URL, no DNS — it works behind NAT. Just supply the
  tokens in `values`.
- **Inbound webhook (e.g. `teams`, HTTP-style)** — the provider POSTs to
  a public URL the entrypoint exposes. You MUST register that URL on the
  provider side (see below), and the platform host must be publicly
  reachable.

### Inbound webhook URL (the `/gw/<slug>/...` named mount)

Non-root entrypoints are mounted under **`/gw/<slug>/`** on the platform's
public host when the entrypoint has a slug, and under **`/gw/<uuid>/`** when
it does not. The slug is **opt-in and set at creation** — it is never derived
from `name`, and it cannot be changed afterwards. It is 3–63 characters,
starts with a lowercase letter, contains only lowercase letters, digits and
dashes, does not end with a dash, and cannot be one of the reserved words
`oauth`, `api`, `well-known`, `gw` or `health`. The internal UUID changes
every time the entrypoint is deleted and recreated, so **set a slug before
registering a URL with an external provider**: a URL bound to the slug
survives delete/recreate as long as the recreated entrypoint reuses the same
slug, while a URL bound to the UUID breaks.

For a **Teams** entrypoint, the Bot Framework **messaging endpoint** to set
in the Azure Bot registration's Configuration blade is therefore:

```
https://<platform-host>/gw/<slug>/api/messages
```

e.g. `https://sam.example.com/gw/teams-bot/api/messages`. You can
sanity-check the path before wiring Azure: a `POST` to it should return
**401** (Bot Framework auth rejecting the unsigned request) — a **404**
means the slug/path is wrong. The mount only exists after the entrypoint is
created, so the order is: apply the entrypoint → read its URL from the
networking details → set the provider URL.

### Single-tenant vs multi-tenant (Teams)

`microsoft_app_tenant_id` is **required for single-tenant Azure Bots**
(Microsoft App Type = SingleTenant): the entrypoint must mint its outbound
Bot Connector token from the bot's *home* tenant. Leave it **empty for
multi-tenant** bots (the token comes from the shared `botframework.com`
authority). Getting this wrong is a classic silent half-failure:
**inbound works** (the task is submitted) but **every outbound reply
fails** with `send activity: HTTP 401: Authorization has been denied for
this request`, because the Connector rejects a token minted from the
wrong authority. If you see inbound-ok / outbound-401, check the tenant
setting and the bot's App Type first.

### `run_as`: the system user an entrypoint authorizes as

`values.run_as` is settable from config on the chat entrypoint types
(`slack`, `teams`). The machine entrypoints carry the same setting in
camelCase: `values.runAs` on `webhook` and `mcp`, and a per-rule
`event_rules[].runAs` on `event_mesh`. This section's examples use the chat
spelling. It is config-only, so `sam config pull` is the only place
you will see it on an existing entrypoint. It names a
`systemUser` resource by its bare name, which the platform resolves to the
subject `system:<name>`, so `run_as: ops` means `system:ops`.

```yaml
kind: entrypoint
name: slack-support
description: Slack support channel for Acme customers
spec:
  type: slack
  values:
    bot_token: ${SLACK_BOT_TOKEN}
    app_token: ${SLACK_APP_TOKEN}
    run_as: support-bot
```

Declare the system user in the same config so the two land together, and
remember `roleNames` is the whole role set rather than an addition to it:

```yaml
kind: systemUser
name: support-bot
spec:
  roleNames:
    - support_agent_invoke
```

**What it changes.** On `slack` and `teams` it applies only to multi-party
surfaces (a channel or group chat), and 1:1 messages keep the real user;
`use_user_identity_in_channels: true` opts even channels back to the real
user.

Naming a system user also takes the deployment's **default roles** out of the
picture, which is usually the point. Defaults apply only to a principal that
matched nothing *and* is not a system user, so a run-as entrypoint reaches
exactly what its system user was granted instead of falling back to whatever
the defaults happen to hold. The sender is not lost either way, it just stops
carrying authorization: it still keys the session, still routes the reply, and
is recorded for audit.

**Clearing it takes an explicit empty value.** An update preserves any stored
key the request omits, so dropping the `run_as:` line and re-applying plans an
Update, succeeds, and redeploys with the system user still in place. Write
`run_as: ""` to fall back to the built-in `system:default`; it does not hand
authorization back to the senders. Channel messages authorize as the real
sender only with `use_user_identity_in_channels: true`.

A blank `runAs` on the machine entrypoints resolves to `system:default` the
same way.

### Resource shape: `type` goes inside `spec`

`kind`, `name` and `description` are top-level; **everything else, `type`
included, lives under `spec`.** The loader unmarshals only those three plus
`spec`, so a `type:` written at the top level is dropped without a warning and
the apply fails at the API with `type is required` — a message naming a field
your YAML plainly sets, which is what makes this one hard to spot.
`description` is required and must be at least 10 characters.

### `systemPurpose` and `responseFormat`: per-entrypoint agent guidance

Every entrypoint type accepts these two, and they are the only per-entrypoint
way to tell agents what a surface is for and how replies should be shaped:

```yaml
kind: entrypoint
name: support-webhook
description: Inbound support tickets from the Acme status page
spec:
  type: webhook
  values:
    routePath: /support
    authMode: token
    authToken: ${SUPPORT_WEBHOOK_TOKEN}
    targetType: agent
    targetAgentName: SupportBot
    inputExpression: input.payload
    systemPurpose: |
      You handle inbound support tickets raised from the Acme status page.
      Reporters are customers, not internal staff.
    responseFormat: |
      Two or three short sentences, plain text. No markdown and no links:
      the ticket system renders neither.
```

The gateway stamps both onto every task the entrypoint submits, as the
`system_purpose` and `response_format` A2A metadata keys, so an agent picks them
up through `inject_system_purpose` and `inject_response_format` on its own
config. The built-in agents as seeded have both on (and `inject_user_profile`);
one you have edited or authored declaratively keeps its own setting. An agent
you author has both off unless its config sets them, and with them off it
ignores these values.

Keep each under 4000 bytes: both are injected into every prompt, so an
oversized value is a per-task cost rather than just a large row. Treat that as a
budget rather than a guardrail. It is *enforced* only on the three types whose
values are walked against the gateway registry (`webhook`, `mcp`, `event_mesh`),
and never on the `snake_case` spelling, which the walker does not know about. On
every other type nothing rejects an oversized value. The limit counts bytes
rather than characters, so non-ASCII text reaches it sooner than its length
suggests.

Neither field is on any create form, so the web UI cannot set them, and
`sam config pull` only ever echoes what a YAML author already wrote. That makes
this the one part of the entrypoint schema where neither of the usual oracles
(the UI form, or pulling a UI-created entrypoint) tells you anything: write them
here.

`snake_case` spellings (`system_purpose`, `response_format`) are accepted too,
for configs written before the camelCase keys existed. The first spelling
holding a **string** wins, empty or not, so `systemPurpose: ""` clears a value
even on a row that still stores `system_purpose` from before.

A bare `systemPurpose:` is not the same thing. YAML parses it as null, not as an
empty string, and a non-string falls through to the next spelling instead of
deciding, so it leaves any stored `system_purpose` in place. That is deliberate:
uncommenting a key from a generated example without filling it in should not
silently drop the value a row is running on. Write `""` to clear.

**Clearing takes an explicit empty value, not a deleted line.** An update
preserves any stored key the request omits, so dropping the line and re-applying
plans an Update, succeeds, and redeploys with the old guidance still in place.
Write `systemPurpose: ""` to clear it. This is the same trap `run_as` has, with
one difference worth keeping straight: a blank `run_as` is load-bearing and
reaches the adapter, whereas a blank `systemPurpose` emits no key at all, which
is what lets the layers underneath it apply again.

This is the right place to set them for Slack, Teams, webhook, event-mesh, and
MCP entrypoints. The web UI entrypoint (`httpsse`) is the one
exception worth knowing: it reads the same two keys, but the manifest's
`platform.webuiSettings` block overrides them instance-wide, so set them there
for the web UI and leave the entrypoint's own values for the other surfaces.

A per-task metadata value outranks both, but that is for internal publishers
only, and is not a way for a caller to steer an entrypoint: the web UI strips
both keys from client-supplied metadata precisely so a browser cannot outrank
the instance-wide value, and no other adapter populates them from the inbound
request. Treat them as administrator-owned.

#### Not to be confused with `event_rules[].responseFormat`

On an `event_mesh` entrypoint there is a second, per-rule `responseFormat`
nested inside `event_rules`. The two are different mechanisms:

| | `spec.values.responseFormat` | `event_rules[].responseFormat` |
|---|---|---|
| Scope | the whole entrypoint | that one rule |
| Delivery | stamped as task metadata | appended to the rule's prompt as literal text |
| Reaches | only agents with `inject_response_format` enabled | the agent either way |
| Target types | every rule | agent targets only, silently ignored on workflow targets |

Hoisting a value from the rule level up to `spec.values` therefore changes
behaviour silently: the text stops being appended to the rule's input, and any
agent that has not opted into `inject_response_format` stops seeing it at all.
Both are valid; pick the one whose delivery you want, and do not assume moving
it is a refactor.

### `default_agent_name` must be a real, deployed agent

The schema default for `default_agent_name` is the literal string
`Orchestrator` — the built-in orchestrator's name. That is a placeholder,
not a guarantee: it routes to an agent of that exact name, which only
exists if such an agent is actually deployed. Set `default_agent_name` to
the **exact `name:` of an agent in this same config** (and in the
manifest's `resources.agents`) or one already on the platform. `sam config
plan` rejects a name that matches neither; one that stops matching later (the
agent was removed) is not silently replaced — every unrouted message gets a
reply that the entrypoint is misconfigured.


## Wrapper schema

Authoring fields for the "entrypoint" resource.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `name` | `string` | yes | len 3–255 | (no description) |
| `slug` | `string` |  | len 3–63 | (no description) |
| `description` | `string` | yes | len 10–1000 | (no description) |
| `type` | `string` | yes | len 2–50 | (no description) |
| `publicUrl` | `string` |  |  | (no description) |
| `values` | `object` | yes |  | (no description) |
| `deploy` | `boolean` | yes |  | (no description) |

## Per-type detail

Each entrypoint type has its own `values:` shape. Find the section matching the `type:` your entrypoint uses.

## type: event_mesh

**Event Mesh**

Connect agents to your Solace event brokers to process real-time events

> ⚠ Configure the Solace event broker to source events from. In embedded or desktop mode you may leave the broker fields empty to use the local system broker.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `broker_url` | `string` | yes |  | matches regex | The host URI of the event broker (e.g., tcps://broker.example.com:55443) |
| `broker_vpn` | `string` | yes |  |  | (no description) |
| `broker_username` | `string` | yes |  |  | (no description) |
| `broker_password` | `password (secret)` | yes |  | secret | Required. Enter the broker password explicitly — it is never inherited from the Agent Mesh broker. |
| `tls_skip_verify` | `select` |  | `false` | one of: false, true | Controls whether the broker's TLS certificate is validated. Skip verification is insecure — development and testing only. |
| `event_rules` | `event_rules` | yes | `[]` |  | Define rules that process incoming events from the broker and route them to agents. |
| `systemPurpose` | `textarea` |  |  | max len 4000 | [advanced] Describes to agents what this entrypoint is for. Stamped onto every task this entrypoint submits and available to agent prompts as system_purpose. |
| `responseFormat` | `textarea` |  |  | max len 4000 | [advanced] Tells agents how to shape their replies for this entrypoint (length, tone, markdown support). Stamped onto every task this entrypoint submits and available to agent prompts as response_format. |

**Inner schema for `event_rules` (`event_rules`)**:

List of event-routing rules. Each rule subscribes to one or more topics and routes messages to a target agent or workflow.

Each entry is an object with:

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `name` | `string` | yes |  | matches regex | Unique rule identifier within this entrypoint. Case-insensitive uniqueness applies. |
| `subscriptions` | `array<object>` | yes |  |  | Topics this rule listens on. At least one subscription is required. |
| `messageFormat` | `select` |  | `json` | one of: json, text, xml, raw_bytes, protobuf, structured | Inbound payload encoding. Drives how the entrypoint decodes incoming broker messages before invoking the target. |
| `payloadEncoding` | `string` |  | `utf-8` |  | [advanced] Character encoding for text-shaped payloads. Defaults to utf-8. |
| `targetAgent` | `string` |  |  |  | Name of the agent that handles messages matching this rule. Mutually exclusive with targetWorkflowName. |
| `targetWorkflowName` | `string` |  |  |  | Name of the workflow that handles messages matching this rule. Mutually exclusive with targetAgent. |
| `promptTemplate` | `textarea` |  |  |  | Required for agent targets, including a rule with no target (it routes to the Orchestrator). Not used for workflow targets — they take inputExpression instead. Template rendered against the incoming message to build the agent input. {payload} and {topic} are expanded; other {payload.path.to.field} forms extract from the JSON payload. |
| `responseFormat` | `textarea` |  |  |  | [advanced] Appended to this rule's prompt as literal text, for agent targets in this rule only (workflow targets ignore it). Distinct from the entrypoint-level responseFormat, which is stamped as task metadata and reaches only agents with inject_response_format enabled. |
| `inputExpression` | `string` |  |  |  | [advanced] Raw sacexpr expression used to build the input to a workflow target. "input.payload:" delivers the payload as the workflow's text input (workflow.input.text): a payload that parses as JSON is re-serialized as JSON text, any other payload passes through as-is. Set it on every workflow target: without it the workflow receives empty input. Not used for agent targets. |
| `defaultUserIdentity` | `string` |  |  |  | Static identity to attribute incoming events to (e.g. "sfdc_event_user"). Used for RBAC and audit. Overridden by userIdentityExpression when both are set. |
| `userIdentityExpression` | `string` |  |  |  | sacexpr expression that resolves to the user identity per message (e.g. "input.user_properties.requester"). |
| `runAs` | `system_user_select` |  |  |  | [advanced] System user this rule's events run as when no per-message identity resolves. Leave empty for the built-in default system user; name a scoped system user to narrow what this rule can reach. |
| `forwardContext` | `object` |  |  |  | Map of context-key → sacexpr expression. Evaluated against the incoming message and forwarded to the output handler's expression context (accessible via user_data.forward_context). |
| `structuredInvocation` | `object` |  |  |  | Schema-validated invocation for agent targets. The agent validates its output against outputSchema, retrying on failure, and the result is published as structured_output; a failed validation goes to errorOutput. The validated result is carried only in structured_output, so it is published with responseType structured, the default for such a rule; text is empty and full holds only a reference to the result. A workflow target ignores these schemas and applies its own. |
| `acknowledgmentPolicy` | `object` |  |  |  | When to acknowledge the broker. Object form for full control; string shorthand ("on_receive" / "on_completion") expands to {mode: <string>}. |
| `successOutput` | `object` |  |  |  | How to publish the target's successful response. |
| `errorOutput` | `object` |  |  |  | How to publish errors from the target. |
| `artifactProcessing` | `object` |  |  |  | [advanced] Extract artifacts from the incoming message and attach them to the dispatched task. See sacexpr docs for expression syntax. |


### Example

```yaml
kind: entrypoint
name: example_event_mesh_entrypoint
description: "Example event_mesh entrypoint. Replace with a real description (10+ chars)."
spec:
  type: event_mesh
  deploy: true
  values:
    broker_url: "tcps://broker.example.com:55443"
    broker_vpn: "default"
    broker_username: "solace-client"
    broker_password: ${EXAMPLE_EVENT_MESH_ENTRYPOINT_BROKER_PASSWORD}  # secret — provide via env var
    # optional: tls_skip_verify: "false"
    event_rules:
      - name: route_orders
        subscriptions:
          - topic: "events/orders/>"
        targetAgent: Orchestrator
        promptTemplate: "Process this order event from {topic}: {payload}"
        acknowledgmentPolicy:
          mode: on_completion
          timeoutSeconds: 300
        messageFormat: json
        successOutput:
          enabled: true
          topic: "events/orders/responses"
          topicType: static
          # Advanced output knobs (UI doesn't render these — YAML authors only):
          # responseType: custom           # publish customExpression, a sacexpr expression
          # customExpression: "input.payload:data[0]"  # a workflow target's result
          # format: json
          # outputSchema: { ... }          # JSON Schema; payload validated before publish
          # onValidationError: log         # log | drop
        errorOutput:
          enabled: true
          topic: "events/orders/errors"
          topicType: static
      # Workflow target instead of an agent (separate rule; targetAgent and targetWorkflowName are mutually exclusive):
      # - name: route_payments
      #   subscriptions:
      #     - topic: "events/payments/>"
      #   targetWorkflowName: PaymentReview
      #   inputExpression: "input.payload:"   # set on every workflow target (omitted = empty input); no promptTemplate
    # optional: systemPurpose: "..."
    # optional: responseFormat: "..."
```

## type: mcp

**MCP**

Expose Agent Mesh agents as Model Context Protocol tools for Claude Code, MCP Inspector, IDEs, and other MCP-compatible clients

> ⚠ When enableAuth is on, your IdP client must allowlist the per-entrypoint redirect URI <external-base>/gw/<gateway_id>/oauth/callback before clients can sign in

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `enableAuth` | `select` | yes | `true` | one of: true, false | Controls authentication only: turning it off does NOT opt the entrypoint out of RBAC. When on, the entrypoint requires a Bearer token on every tool call and joins the cluster's OAuth flow (per-entrypoint signer, IdP from EXTERNAL_AUTH_PROVIDER, scopes from the cluster RBAC catalog). When off, no token is required and calls run as defaultUserIdentity, or as the entrypoint's system user when that field is empty — and are still authorized against that principal's scopes, which also narrows the tools/list response. No-auth / local-dev only. |
| `defaultUserIdentity` | `string` |  |  | max len 255 | User identity attributed to all tool calls when enableAuth is off. Optional — leave empty to run those calls as the entrypoint's system user, which is what carries RBAC scopes. Rejected at startup when enableAuth is on (HTTP transport carries identity via the Bearer token, not this field). |
| `runAs` | `system_user_select` |  |  |  | [advanced] System user unauthenticated tool calls run as when no default user identity is set. Only applies when OAuth is disabled; OAuth-authenticated calls keep the caller's identity. Leave empty for the built-in default system user, which can invoke any agent or workflow; name a scoped system user to narrow what this entrypoint can reach. |
| `allowedRedirectUris` | `array<object>` |  | `[]` |  | Allowlist of MCP-client redirect URIs the entrypoint accepts on /oauth/authorize. Loopback hosts (http://127.0.0.1, http://localhost) match any port per RFC 8252; everything else must match exactly. Empty list with enableAuth on is a known security gap — RFC 7591 DCR is unauthenticated, so any caller could register an attacker-controlled redirect URI. The entrypoint emits a startup WARN when empty. |
| `serverName` | `string` |  | `SAM MCP Entrypoint` | len 1–255 | Name reported to MCP clients in server metadata. Defaults to 'SAM MCP Entrypoint'. |
| `serverDescription` | `string` |  |  | max len 1024 | Description reported to MCP clients in server metadata. |
| `includeTools` | `array<object>` |  | `[]` |  | Allowlist of tool-name patterns to expose. Empty = expose all. Patterns are exact match (case-insensitive) or regex when they contain special chars. Filters check against agent name, skill name, AND final tool name. |
| `excludeTools` | `array<object>` |  | `[]` |  | Denylist of tool-name patterns. Takes precedence over includeTools when both match. |
| `corsAllowedOrigins` | `array<object>` |  | `[]` |  | Allowlist of browser Origin values accepted from browser-based MCP clients (MCPJam, MCP Inspector). Empty = allow all (server-to-server MCP clients never trigger CORS, so wide-open is harmless for them). Required for browser clients on a different origin than the entrypoint — without a matching origin the browser's preflight OPTIONS is blocked. Typical local-dev values: http://127.0.0.1:3010 (MCPJam), http://localhost:6274 (MCP Inspector). |
| `corsAllowedOriginRegex` | `string` |  |  | max len 1024 | [advanced] Optional regex matched in addition to corsAllowedOrigins, for clients on drifting ports (e.g. MCP Inspector picks a random localhost port each launch). Auto-anchored in ^(?:…)$. Example: ^http://localhost:\d+$ |
| `taskTimeoutSeconds` | `number` |  | `300` | range 1–3600 | [advanced] How long the entrypoint waits for an agent to complete a tool call before timing out the MCP response. Defaults to 300. |
| `userIdClaim` | `select` |  | `email` | one of: email, sub, upn, preferred_username | [advanced] OIDC claim canonicalized as the Agent Mesh user_id. All choices fall back to 'sub' when the primary claim is missing or carries a sentinel. Defaults to email. |
| `transport` | `select` |  | `sse` | one of: sse, http, stdio | [advanced] MCP transport. 'sse' (alias 'http') serves the modern MCP Streamable HTTP transport. 'stdio' disables the HTTP surface (advanced use only). |
| `stateRedirectionEnabled` | `select` |  | `true` | one of: true, false | When on, this entrypoint routes its OAuth callback through a single dispatcher entrypoint (the WebUI's /api/v1/auth/callback by default) instead of its own /gw/<slug>/oauth/callback, so the IdP only needs one redirect URI allowlisted for every MCP entrypoint. Leave the dispatcher URL below blank to auto-derive it from the cluster WebUI base. Turn off only for a self-managed IdP that allowlists each entrypoint's own callback. |
| `oauthDispatcherUrl` | `string` |  |  | max len 1024; matches regex | Absolute URL of the dispatcher entrypoint's OAuth callback the IdP redirects to (e.g. https://your-host/api/v1/auth/callback). Leave blank to auto-derive it from the cluster WebUI base — set it only to target a non-WebUI dispatcher. The dispatcher verifies the state JWS and forwards to this entrypoint's /oauth/finish. |
| `systemPurpose` | `textarea` |  |  | max len 4000 | [advanced] Describes to agents what this entrypoint is for. Stamped onto every task this entrypoint submits and available to agent prompts as system_purpose. |
| `responseFormat` | `textarea` |  |  | max len 4000 | [advanced] Tells agents how to shape their replies for this entrypoint (length, tone, markdown support). Stamped onto every task this entrypoint submits and available to agent prompts as response_format. |

### Example

```yaml
kind: entrypoint
name: example_mcp_entrypoint
description: "Example mcp entrypoint. Replace with a real description (10+ chars)."
spec:
  type: mcp
  deploy: true
  values:
    enableAuth: "true"
    # optional: allowedRedirectUris: null  # value of type array<object>
    # optional: serverName: "SAM MCP Entrypoint"
    # optional: serverDescription: "..."
    # optional: includeTools: null  # value of type array<object>
    # optional: excludeTools: null  # value of type array<object>
    # optional: corsAllowedOrigins: null  # value of type array<object>
    # optional: corsAllowedOriginRegex: "..."
    # optional: taskTimeoutSeconds: 300
    # optional: userIdClaim: "email"
    # optional: transport: "sse"
    # optional: stateRedirectionEnabled: "true"
    # optional: oauthDispatcherUrl: "..."
    # optional: systemPurpose: "..."
    # optional: responseFormat: "..."
```

## type: slack

**Slack**

Connect your AI agent to Slack workspace using Socket Mode

> ⚠ Requires a Slack app with Socket Mode enabled and appropriate OAuth scopes configured

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `default_agent_name` | `agent_select` |  | `Orchestrator` |  | The agent that handles messages when no specific agent is mentioned. |
| `use_user_identity_in_channels` | `boolean` |  |  |  | When enabled, multi-party channel messages keep the sending user's identity instead of the run-as system user. |
| `bot_token` | `password (secret)` | yes |  | len 1–500; secret | Required. Starts with xoxb-. Find this in your Slack app's OAuth & Permissions settings. |
| `app_token` | `password (secret)` | yes |  | len 1–500; secret | Required. Starts with xapp-. Generate in your Slack app's Basic Information settings. |

**Required environment variables**: SLACK_BOT_TOKEN, SLACK_APP_TOKEN

### Example

```yaml
kind: entrypoint
name: example_slack_entrypoint
description: "Example slack entrypoint. Replace with a real description (10+ chars)."
spec:
  type: slack
  deploy: true
  values:
    # optional: default_agent_name: "Orchestrator"
    # optional: use_user_identity_in_channels: false
    bot_token: ${EXAMPLE_SLACK_ENTRYPOINT_BOT_TOKEN}  # secret — provide via env var
    app_token: ${EXAMPLE_SLACK_ENTRYPOINT_APP_TOKEN}  # secret — provide via env var
```

## type: teams

**Microsoft Teams**

Connect your AI agent to Microsoft Teams using Bot Framework

> ⚠ Requires Azure Bot Service registration and a publicly accessible webhook endpoint

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `default_agent_name` | `agent_select` |  | `Orchestrator` |  | The agent that handles messages when no specific agent is mentioned. |
| `use_user_identity_in_channels` | `boolean` |  |  |  | When enabled, multi-party channel messages keep the sending user's identity instead of the run-as system user. |
| `microsoft_app_id` | `string` | yes |  | matches regex | Microsoft Bot ID found in Azure Bot Service, in GUID format. |
| `microsoft_app_password` | `password (secret)` | yes |  | min len 1; secret | Required. Client Secret from Azure AD App Registration. |
| `microsoft_app_tenant_id` | `string` |  |  | matches regex | Azure AD Tenant ID for single-tenant bots. Leave empty for multi-tenant. |
| `initial_status_message` | `string` |  | `Processing your request...` |  | Message shown while processing request. Leave empty to disable. |
| `enable_typing_indicator` | `select` |  | `true` |  | Show 'bot is typing...' indicator while processing. |
| `max_download_file_size_mb` | `number` |  | `100` |  | Maximum file size in MB that can be downloaded from Teams |

**Required environment variables**: TEAMS_APP_PASSWORD

### Example

```yaml
kind: entrypoint
name: example_teams_entrypoint
description: "Example teams entrypoint. Replace with a real description (10+ chars)."
spec:
  type: teams
  deploy: true
  values:
    # optional: default_agent_name: "Orchestrator"
    # optional: use_user_identity_in_channels: false
    microsoft_app_id: "..."
    microsoft_app_password: ${EXAMPLE_TEAMS_ENTRYPOINT_MICROSOFT_APP_PASSWORD}  # secret — provide via env var
    # optional: microsoft_app_tenant_id: "..."
    # optional: initial_status_message: "Processing your request..."
    # optional: enable_typing_indicator: "true"
    # optional: max_download_file_size_mb: 100
```

## type: webhook

**Webhook**

Accept inbound HTTP requests and dispatch each one to an agent or workflow

> ⚠ The route path becomes part of a publicly reachable URL under /gw/<id>/. Protect every route with a token or HMAC signature.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `routePath` | `string` | yes |  | len 1–512; matches regex | Path segment appended to /gw/<gateway_id>/. Must start with '/' and be URL-safe. |
| `method` | `select` |  | `POST` | one of: POST, PUT, PATCH | Method the entrypoint accepts on the route. |
| `authMode` | `select` | yes | `token` | one of: token, hmac | How the entrypoint validates inbound requests. 'token' compares a shared bearer token; 'hmac' verifies a per-payload signature. |
| `authToken` | `password (secret)` | yes, when `authMode`=`token` |  | len 8–1024; secret | Shared secret expected on every request. Token location selects where the caller carries it; the default is an Authorization: Bearer header. |
| `hmacSecret` | `password (secret)` | yes, when `authMode`=`hmac` |  | len 16–1024; secret | Shared secret the sender uses to sign the payload. |
| `hmacAlgorithm` | `select` |  | `sha256` | one of: sha256, sha512 | (no description) |
| `hmacHeader` | `string` |  | `X-Hub-Signature-256` | len 1–128 | HTTP header carrying the signature (e.g. X-Hub-Signature-256). |
| `hmacPrefix` | `string` |  | `sha256=` | max len 32 | Prefix stripped from the signature header value before hex/base64 decode. GitHub-style senders use "sha256="; leave empty if the header carries the raw signature. |
| `hmacEncoding` | `select` |  | `hex` | one of: hex, base64, base64url, base64raw, base64rawurl | Encoding of the signature value in the header (after any prefix is stripped). Use hex for GitHub/GitLab; base64 for standard HMAC-SHA256 signers; base64url for PayPal-style URL-safe signers. |
| `authTokenLocation` | `select` |  | `bearer` | one of: bearer, header, query | Where the caller carries the token. Use bearer for senders you control; header or query for senders that cannot set an Authorization header. A token in the query string is recorded by proxies and access logs — prefer a header where the sender allows one. |
| `authTokenName` | `string` | yes, when `authMode`=`token` and `authTokenLocation`=`header` or `query` |  | len 1–128 | Name of the header or query parameter carrying the token, for example X-Webhook-Token. |
| `targetType` | `select` | yes | `agent` | one of: agent, workflow | Whether inbound requests are handled by an agent or by a workflow. |
| `targetAgentName` | `agent_select` | yes, when `targetType`=`agent` |  |  | Agent that handles inbound requests. |
| `targetWorkflowName` | `workflow_select` | yes, when `targetType`=`workflow` |  |  | Workflow that handles inbound requests. |
| `inputExpression` | `textarea` | yes |  | min len 1 | sacexpr expression that builds the agent's input from the request. e.g. "template:Order {{user_data.path:id}}: {{json://input.payload:}}". |
| `runAs` | `system_user_select` |  |  |  | [advanced] System user this entrypoint's requests run as. Leave empty for the built-in default system user, which can invoke any agent or workflow; name a scoped system user to narrow what this entrypoint can reach. |
| `maxBodyBytes` | `number` |  | `1048576` | range 1024–52428800 | Reject requests with a body larger than this. Defaults to 1 MiB. |
| `systemPurpose` | `textarea` |  |  | max len 4000 | [advanced] Describes to agents what this entrypoint is for. Stamped onto every task this entrypoint submits and available to agent prompts as system_purpose. |
| `responseFormat` | `textarea` |  |  | max len 4000 | [advanced] Tells agents how to shape their replies for this entrypoint (length, tone, markdown support). Stamped onto every task this entrypoint submits and available to agent prompts as response_format. |

### Example

```yaml
kind: entrypoint
name: example_webhook_entrypoint
description: "Example webhook entrypoint. Replace with a real description (10+ chars)."
spec:
  type: webhook
  deploy: true
  values:
    routePath: "/orders"
    # optional: method: "POST"
    authMode: "token"
    authToken: ${EXAMPLE_WEBHOOK_ENTRYPOINT_AUTHTOKEN}  # secret — provide via env var
    # optional: authTokenLocation: "bearer"
    targetType: "agent"
    targetAgentName: "..."
    inputExpression: "x"
    # optional: runAs: null  # value of type system_user_select
    # optional: maxBodyBytes: 1048576
    # optional: systemPurpose: "..."
    # optional: responseFormat: "..."
```

## type: whatsapp

**WhatsApp**

Connect your AI agent to WhatsApp via the WhatsApp Business Cloud API.

> ⚠ Requires a WhatsApp Business Account and Cloud API phone number.

| Field | Type | Required | Default | Validation | Description |
|---|---|---|---|---|---|
| `phone_number_id` | `string` | yes |  | matches regex | The ID Meta assigns to a WhatsApp number. Find it in WhatsApp Manager after verifying the number. |
| `access_token` | `password (secret)` | yes |  | len 1–1000; secret | Authenticates outbound messages sent on the business's behalf. Generate a permanent token in Meta Business Settings under System Users. |
| `app_secret` | `password (secret)` | yes |  | len 1–500; secret | Verifies that incoming WhatsApp messages are genuine. Find it in the Meta app under Settings > Basic > App Secret. |
| `verify_token` | `password (secret)` | yes |  | len 1–500; secret | A string created and entered in both this form and Meta's webhook settings to confirm the connection. |
| `default_agent_name` | `agent_select` |  |  |  | Inbound WhatsApp messages route to the selected agent. If left empty, messages route to the first discovered agent. |
| `disable_file_uploads` | `boolean` |  | `false` |  | When selected, inbound images, documents, videos, and voice messages are declined, and the sender is prompted to send text instead. The agent can still send outbound files. |
| `sender_identity_mode` | `select` |  | `idp_lookup` |  | How an inbound message is authorized. Identity provider lookup matches each sender against a claim the identity provider issues; system user authorizes every sender as a single Solace Agent Mesh system user. |
| `run_as` | `system_user_select` | yes, when `sender_identity_mode`=`system_user` |  |  | The Solace Agent Mesh system user that every inbound message authorizes as. Scope its roles to what this gateway number should be able to do. |
| `identity_lookup_key` | `select` |  | `phone` |  | What to read from an inbound message to identify the sender and match against the claim below. Phone number is recommended, as a WhatsApp username can be released and re-registered by a different user. |
| `identity_claim_key` | `string` |  |  |  | The identity provider claim the sender's value is matched against. The claim is recorded at sign-in, so affected users must sign in again for the match to take effect. |
| `contact_request_template` | `string` |  |  |  | The name of an approved WhatsApp template with a Share Contact Info button, offered to senders whose phone number WhatsApp hides. The template body must have no variables. Leave empty to turn those senders away instead. |
| `contact_request_template_language` | `string` |  |  |  | The language code of the approved translation to send, matched exactly. Defaults to en_US. |

### Example

```yaml
kind: entrypoint
name: example_whatsapp_entrypoint
description: "Example whatsapp entrypoint. Replace with a real description (10+ chars)."
spec:
  type: whatsapp
  deploy: true
  values:
    phone_number_id: "..."
    access_token: ${EXAMPLE_WHATSAPP_ENTRYPOINT_ACCESS_TOKEN}  # secret — provide via env var
    app_secret: ${EXAMPLE_WHATSAPP_ENTRYPOINT_APP_SECRET}  # secret — provide via env var
    verify_token: ${EXAMPLE_WHATSAPP_ENTRYPOINT_VERIFY_TOKEN}  # secret — provide via env var
    # optional: default_agent_name: "..."
    # optional: disable_file_uploads: false
    # optional: sender_identity_mode: "idp_lookup"
    # optional: identity_lookup_key: "phone"
    # optional: identity_claim_key: "phone_number"
    # optional: contact_request_template: "share_contact_request"
    # optional: contact_request_template_language: "en_US"
```

