# Adding Built-in Agents to Solace Agent Mesh

## Table of Contents
- [1. Explore Agents](#1-explore-agents)
- [2. Install Built-in Tools (Agents)](#2-install-built-in-tools-agents)

---

## 1. Explore Agents

Now, let's interact with Solace Agent Mesh.

Enter in the chat area:
```
What agents do you have access to and what are their capabilities?
```

> Note: For the rest of the workshop, you can pull up all the saved prompts by typing forward slash `/` in the chat bar and prefixing the prompt with the step number e.g. `100-`

You can visualize agent interactions (e.g., **Orchestrator ↔ LLM**) by clicking the **network** icon below any chat response.

> 💬 As you install more agents, you can always ask Solace Agent Mesh for a list of available agents and capabilities.

<div align="center">
    <img src="../images/sam/sam-info-agents.png" alt="Solace Agent Mesh Info Agents" width="80%" style="box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 8px;">
</div>

---

## 2. Install Agent with Built-in Tools

There are 2 ways to run Solace Agent Mesh Agents:
1. `sam run` This will start all of the Solace Agent Mesh agents that are present in the `configs/agents/` directory. During this workshop you will likely have to kill the existing process with `Ctrl+C` and enter `sam run`, to pickup your new changes as we add and modify agents.
2. Launch the agents independently. This is useful in production scenarios, the Orchestrator and each agent will be run as a seperate task which can be brought online and offiline independently.  To use this approach you must have Solace Agent Mesh already running with `sam run` then open a new terminal and pass the agent configuration YAML files as arguments to a new `sam run` command.
The process would be as follows:
> - Open a new terminal
> - Activate the environment 
``` bash
      cd sam-bootcamp
      source venv/bin/activate
```
> - Launch the agents

  ```sam run config/agents/name_of_agent.yaml```

**In this workshop we will be using the first approach in this workshop.  We will kill the existing sam instance with `Ctrl+C` and start it again as we add new agents.**

Solace Agent Mesh comes with a set of built-in tools. Built-in tools are pre-packaged functionalities that can be granted to agents without requiring custom Python code. These tools address common operations such as file management, data analysis, web requests, and multi-modal generation.

### Adding an agent the uses built-in tools

You have two ways to add agents
1. Add an agent using the [Solace Agent Mesh add agent GUI interface](./101-adding-builtin-agents-gui.md)
1. Author the yaml configuration for the agent definition

Let's go ahead and do the agent creation from the cli

1. Create an agent scaffold
    ```
    sam add agent built-in-tools --skip
    ```
    This creates a new file under [sam-bootcamp/configs/agents/built_in_tools_agent.yaml](../../sam-bootcamp/configs/agents/built_in_tools_agent.yaml)

1. Copy the modified built-in-tools agent yaml configuration into the new file that was created. From terminal, run the following

    ```
    cp ../solace-agent-mesh/artifacts/100-built_in_tools_agent.yaml configs/agents/built_in_tools_agent.yaml
    ```

    Note that the following changes were made:

    - The `tools` section was updated to 
        ```yaml
        tools: 
            - tool_type: builtin-group
            group_name: artifact_management
            - tool_type: builtin-group
            group_name: general
            - tool_type: builtin-group
            group_name: internal
            - tool_type: builtin-group
            group_name: web
        ```
    - The AgentCard Description was updated to
        ```
        A helpful AI Assistant. You have access to internal tools such as data analytics, web, and other general tools
        ```

1. Start Solace Agent Mesh with the new Agent
    - Back in the codespace Terminal, kill the add agent instance by running `Ctrl + C`
    - Issue `sam run`
    - Return to the Solace Agent Mesh UI at port 8000 forwarded from your codespace.
    - Review the Agents. In the Solace Agent Mesh browser tab, click on `Agents` to see the newly added agent.

    <div align="center">
        <img src="../images/sam/sam-builtin-10.png" alt="Solace Agent Mesh Built-in Tools" width="80%" style="box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 8px;">
    </div>

1. Let us test the use of these agents. In the Chat, enter a simple query

    ```bash
    What agents do you have access to and what are their capabilities?
    ```

    <div align="center">
        <img src="../images/sam/sam-builtin-11.png" alt="Solace Agent Mesh Built-in Tools" width="80%" style="box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 8px;">
    </div>

    > **HINT:** If the workflow panel is not visible, just click on the network image !at the bottom of the chat panel (left)


    <div align="center">
        <img src="../images/sam/sam-builtin-12.png" alt="Solace Agent Mesh Built-in Tools" width="30%" style="box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 8px;">
    </div>

1. Let us issue a query that makes use of the built-in tools.

    ```bash
    Summarize the capabilities of the agent with sample queries as a HTML report
    ```
    You will see an HTML report listing agentic capabilities available.

    <div align="center">
        <img src="../images/sam/sam-builtin-13.png" alt="Solace Agent Mesh Built-in Tools" width="80%" style="box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 8px;">
    </div>
---

[Next Section: Adding pre build agents](./200-adding-prebuilt-agents.md)