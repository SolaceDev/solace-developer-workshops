---
title: Building Your First Project
description: Scaffold a project directory, wire an LLM provider, run Solace Agent Mesh locally in embedded mode, and send a task end-to-end against your own configured agent.
sidebar_position: 150
---

# Building Your First Project

This walkthrough takes you from zero to a working agent on your laptop. By the end, you have one agent answering prompts through a gateway you configured, running in a single process against the model you wired up. The project lives in a directory you can version-control and rebuild on any machine.

This walkthrough uses the *configured* path: you author YAML, the runtime reads it, and your agent comes online. For information about when to write Go code instead of YAML, see [Extending Agent Mesh: Configuration or Code](../concepts/configured-vs-built.md).

## Prerequisites

Before you start, make sure you have the following:

- The CLI binary installed and available as `sam-enterprise` on your PATH. See [Installing the CLI Binary](../installing/binary.md) if you haven't done this yet.
- An LLM API key exported in your shell. See [Before You Begin](../installing/before-you-begin.md) for the environment variable name for each supported provider.
- Outbound HTTPS access from your laptop to the LLM provider you chose.

The examples in this walkthrough use `${ANTHROPIC_API_KEY}` and the model `anthropic/claude-sonnet-4-5`. Substitute the environment variable and model string for your provider.

## What You'll Build

Your project will contain two YAML files and one runtime data directory:

```text
my-first-project/
├── configs/
│   ├── my-agent.yaml      # one configured agent
│   └── my-gateway.yaml    # the Web UI gateway your task hits
└── sam-data/              # created at runtime — session database, artifacts
```

You can version-control the `configs/` directory and rebuild the project on another machine by re-exporting your API key and running the same command. Agent Mesh creates `sam-data/` on first launch.

## Set Up the Project

1. Create the project directory and navigate into it:

   ```bash
   mkdir -p my-first-project/configs
   cd my-first-project
   ```

The directory `my-first-project/configs/` exists and you are inside `my-first-project/`.

## Configure Your Agent

Create `configs/my-agent.yaml` with the following content. The agent declares its name, the LLM it calls, the tools it can use, and the prompts that guide its behavior.

```yaml
# configs/my-agent.yaml
log:
  level: info

apps:
  - name: my_agent_app
    app_config:
      agent_name: MyFirstAgent
      display_name: My First Agent
      namespace: solace-agent-mesh
      supports_streaming: true

      model:
        model: anthropic/claude-sonnet-4-5
        api_key: ${ANTHROPIC_API_KEY}

      instruction: |
        You are a friendly assistant. Greet the user warmly, answer
        their questions concisely, and call the get_current_time tool
        whenever a request involves the date or the time.

      tools:
        - tool_type: builtin
          tool_name: get_current_time

      session_service:
        type: memory
        default_behavior: PERSISTENT
      artifact_service:
        type: filesystem
        base_path: ./sam-data

      agent_card:
        description: "A first example agent that answers questions and tells the time."
        defaultInputModes: ["text"]
        defaultOutputModes: ["text"]
        skills:
          - id: greeting
            name: Greeting
            description: Greets the user and answers small questions.

      agent_card_publishing: { interval_seconds: 10 }
      agent_discovery: { enabled: true }
      inter_agent_communication:
        allow_list: ["*"]
        request_timeout_seconds: 60
```

A few things worth noting:

- `model.model` uses the format `<provider>/<model-name>`. To use a different provider, replace the model string and environment variable name. For supported values, see [Configuring Agent Mesh](../installing/configure.md).
- `tools:` is a list. `get_current_time` is a built-in tool requiring no additional configuration. To give the agent more capabilities, add more entries here. For more information, see [Creating Agents](../building/agents.md).
- `session_service: type: memory` keeps conversation history in RAM and discards it on restart. This is appropriate for a first run. To use a persistent store instead, see [Configuring Agent Mesh](../installing/configure.md).

## Configure Your Gateway

Create `configs/my-gateway.yaml` with the following content. The gateway terminates HTTP and Server-Sent Events for the Web UI and handles task submissions.

```yaml
# configs/my-gateway.yaml
log:
  level: info

apps:
  - name: my_gateway_app
    app_config:
      namespace: solace-agent-mesh
      session_secret_key: ${SAM_SESSION_SECRET, dev-session-secret-change-me}

      gateway_id: my-first-gateway
      fastapi_host: localhost
      fastapi_port: 8800

      model:
        model: anthropic/claude-sonnet-4-5
        api_key: ${ANTHROPIC_API_KEY}

      session_service:
        type: sql
        database_url: "sqlite:///./sam-data/sam.db"
        default_behavior: PERSISTENT
      artifact_service:
        type: filesystem
        base_path: ./sam-data

      frontend_welcome_message: "My first Agent Mesh project"
      frontend_bot_name: MyFirstAgent
```

A few things worth noting:

- `gateway_id` is what identifies this file as a gateway. Without it, the runtime loads the file as an agent instead.
- `fastapi_port: 8800` is the Web UI port. The runtime also listens at `:8090` for health and readiness probes.
- `session_secret_key` signs the Web UI's session cookies. The placeholder default is fine for a local run. Generate a real secret (`openssl rand -hex 32`) before sharing the project or running it anywhere others can reach.

## Run Agent Mesh

In embedded mode, the Agent-Workflow Executor (AWE), the Gateway Executor (GWE), and the Secure Tool Runtime (STR) all run as a single process connected by a development event broker. You don't need an external event broker for this walkthrough.

1. Confirm your LLM API key is exported in the current shell, then start Agent Mesh in embedded mode:

   ```bash
   sam-enterprise run --embedded configs/
   ```

The terminal prints startup output and settles on a line similar to the following, indicating the gateway is ready:

   ```text
   INFO loading additional configs count=2
   INFO SAM is running in embedded mode (press Ctrl+C to stop) gateway=:8800
   ```

2. In a separate terminal, verify that all components are healthy:

   ```bash
   curl -fsS http://localhost:8090/health
   ```

A `200 OK` response with the body `{"status":"healthy"}` confirms every component is running correctly.

3. Open `http://localhost:8800` in a browser.

The Agent Mesh Web UI loads and `My First Agent` appears in the agent picker.

If `My First Agent` doesn't appear within a few seconds, check the following common causes:

- The `model.api_key` variable may not be set in the shell where you ran `sam-enterprise run`. Re-export your API key and restart.
- The YAML may have a parse error. The startup log identifies the file and line number.
- The API key may be invalid. Run `sam-enterprise doctor` to check connectivity to your LLM provider.

## Send Your First Task

1. In a second terminal, send a task to your agent:

   ```bash
   sam-enterprise task send "What time is it?" --agent MyFirstAgent
   ```

The response streams token by token in the terminal. A tool-call status line appears as the agent calls `get_current_time`, followed by a reply containing the actual current time.

   You can also send the same prompt from the Web UI at `http://localhost:8800`. Select `My First Agent` from the agent picker and type into the chat field.

2. When you're done, press `Ctrl+C` in the terminal where Agent Mesh is running.

All components stop. The `sam-data/` directory persists, so your session history is available the next time you start the project.

## Next Steps

- To add more agents, tools, and gateways, see [Building Your Agent Mesh](../building/index.md).
- To understand the runtime model behind what you just ran, see [Understanding Agent Mesh](../concepts/index.md).
- To deploy this project beyond your laptop, see [Install and Deploy](../installing/index.md).
