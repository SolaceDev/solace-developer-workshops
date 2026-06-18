---
title: Build Your First Project
description: Scaffold a project directory, wire an LLM provider, run Solace Agent Mesh locally in embedded mode, and send a task end-to-end against your own configured agent.
sidebar_position: 3
---

# Build Your First Project

This page walks you through a project on disk that is *yours* — one agent, one gateway, one LLM key — running in a single process on your laptop. By the end the agent answers a prompt you typed against the model you wired up, and you have a directory you can version-control and rebuild.

This is the **configured** path: you author YAML, the runtime reads it, and your agent comes online. If you would rather chat with the bundled assistant first and skip the configuration, see Try Agent Mesh Desktop. For when the YAML surface isn't enough — and you reach for a built tool in Go — see Configured vs built.

## Prerequisites

You have:

- The `sam` CLI installed and on `$PATH` as `sam-enterprise`. See Install → CLI if you have not done this yet.
- An LLM API key exported in your shell. See Before you begin for the per-provider variable names and verification commands.
- An outbound HTTPS path from your laptop to the LLM provider you chose.

The walkthrough below uses `${ANTHROPIC_API_KEY}` and the `anthropic/claude-sonnet-4-5` model as the running example. Substitute the model string and environment variable for the provider you picked.

## What This Project Will Contain

A new directory with two YAML files and one log directory:

```text
my-first-project/
├── configs/
│   ├── my-agent.yaml      # one configured agent
│   └── my-gateway.yaml    # the Web UI gateway your task hits
└── sam-data/              # created at runtime — session DB, artifacts
```

That is the entire surface. You can version-control the `configs/` directory, send teammates a copy, and rebuild the project on another machine by re-exporting the API key and running the same CLI command. The runtime materialises `sam-data/` on first launch.

## Scaffold the Project Directory

The Go CLI does not currently ship a `sam config init` subcommand. You author the two files directly:

```bash
mkdir -p my-first-project/configs
cd my-first-project
```

You will fill in `configs/my-agent.yaml` and `configs/my-gateway.yaml` in the next two sections.

## Author the Agent

The agent declares its name, the LLM it calls, and the toolset it has access to. Paste this into `configs/my-agent.yaml`:

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

A few things worth pointing out:

- `model.model` follows the `<provider>/<model-name>` convention. For other providers, see Configure → LLM provider — replace `anthropic/claude-sonnet-4-5` and `${ANTHROPIC_API_KEY}` with the equivalents for OpenAI, Vertex AI, Bedrock, Azure OpenAI, or Ollama.
- `tools:` is a list — add more entries here to give the agent more capability. The `get_current_time` tool is a built-in, so no other configuration is needed. See Building → Agents for the deeper tool-selection story.
- `session_service: type: memory` keeps conversation history in RAM. It is lost on every restart — that is the right choice for a first run. For a persistent SQLite store, swap the block for the SQLite shape in Configure → Session storage.

## Author the Gateway

The gateway terminates HTTP and SSE for the Web UI and any `sam task send` invocations. Paste this into `configs/my-gateway.yaml`:

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

Notes:

- `gateway_id` is what classifies the file as a gateway in the runtime — without it the YAML would be loaded as an agent. Pick any string that is unique inside this deployment.
- `fastapi_port: 8800` is the Web UI port. The runtime also listens at `:8090` for `/health` and `/ready` probes — those are the two ports embedded mode binds on startup.
- `session_secret_key` signs the Web UI's session cookies. The development-only default in the placeholder is fine for a laptop run; generate a real secret (`openssl rand -hex 32`) the moment you put the project anywhere other people can reach.

## Pick the Broker

You do not need to pick one. The embedded mode you use below collapses every component into a single process and connects them through an in-memory broker. There is no broker to provision, no TCP port to open, and no credentials to manage.

When you eventually move this project off your laptop, the broker is the first thing you wire up. The same YAML grows a `broker:` block — see Configure → Broker for the per-app shape and Deploy options for the topology choices.

## Run the Project

Confirm the API key for the model you chose is exported in this shell — the prerequisites step above covered this — then run the embedded stack against your `configs/` directory:

```bash
sam-enterprise run --embedded configs/
```

`--embedded` runs the **Agent-Workflow Executor (AWE)**, the **Gateway Executor (GWE)**, and the **Secure Tool Runtime (STR)** as goroutines in a single process, connected by an in-memory broker. No subprocess, no TCP. Two extra agents the bundle always loads ride along — a default assistant and a builder agent — but the agent you wrote is the one the rest of this page exercises. See the `sam run` reference for the full flag surface.

The first lines of output name the components and the address the gateway is listening on:

```text
INFO loading additional configs count=2
INFO SAM is running in embedded mode (press Ctrl+C to stop) gateway=:8800
```

A second confirmation lives at the gateway's health endpoints. From a separate terminal:

```bash
curl -fsS http://localhost:8090/health
```

A `200 OK` with `{"status":"healthy"}` body means every component reported healthy. The Web UI itself answers at `http://localhost:8800` — open it in a browser to see your agent listed in the agent picker by its display name.

If you do not see `MyFirstAgent` in the list within a few seconds, the most common causes are:

- The agent's `model.api_key` references an unset variable — re-export `ANTHROPIC_API_KEY` (or the provider variable you picked) and restart.
- The YAML failed to parse — the runtime log line that includes `error` names the file and the YAML line number.
- The LLM provider key is invalid — `sam-enterprise doctor` reports this directly. See Configure → Validate the configuration.

## Send the First Task

With the runtime still up, open a second terminal and send a task directly to your agent:

```bash
sam-enterprise task send "What time is it?" --agent MyFirstAgent
```

`sam task send` posts to the gateway's streaming endpoint and renders the reply token by token. With no `--url` or `--target` flag it falls back to `http://localhost:8800`, which is where `--embedded` binds by default. See the `sam task send` reference for the full flag surface — `--file` to attach an input file, `--session-id` to resume a prior conversation, `--target` to point at a remote gateway you have logged into.

The reply will name today's date and time, because the agent's instruction told it to call `get_current_time` when the question involves the time. Two things in the output prove the task ran end-to-end:

- A tool-call status line appears before the final reply — that is the agent calling the built-in `get_current_time` tool before it answers.
- The final reply itself contains a value that could only have come from the tool (the actual current time), not just a plausible LLM hallucination.

You can also send the same prompt from the Web UI at `http://localhost:8800` — pick `MyFirstAgent` from the agent selector and type into the chat field. The tool-call status updates render inline in the UI exactly as they do in the CLI stream.

Press `Ctrl+C` in the terminal where `sam-enterprise run --embedded` is running to stop the project. The in-memory broker, the agent, the GWE, and the STR all stop with it. The `sam-data/` directory persists between runs, so a future launch resumes the same session store.

## What Next?

You have one agent of your own answering prompts through a gateway you configured. Most readers next want to teach the agent more — add a second tool, swap the model, give it an instruction tuned to a real task. See Building → Agents for the deeper configured-agent authoring guide, including peer delegation, structured output, human-in-the-loop approvals, and the operator knobs that matter once the project leaves your laptop.
