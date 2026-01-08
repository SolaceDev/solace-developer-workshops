# 100 Adding Built-in Agents to Solace Agent Mesh

## 1. Explore Agents

Now, let's interact with Solace Agent Mesh.

Enter in the chat area:
```
What agents do you have access to and what are their capabilities?
```
<img src="../images/sam/sam-info-agents.png" alt="Solace Agent Mesh Info Agents" style="display: block; margin: 20px auto; max-width: 70%; box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 4px;">

You can visualize agent interactions (e.g., **Orchestrator ↔ LLM**) by clicking the **network** icon below any chat response.

> 💬 As you install more agents, you can always ask Solace Agent Mesh for a list of available agents and capabilities.

---

## 2. Install Built-in Tools (Agents)

While Solace Agent Mesh is running in the current terminal, open a **new terminal** and launch the plugin catalog to add new agents.

<img src="../images/sam/sam-new-terminal.png" alt="Solace Agent Mesh New Terminal" style="display: block; margin: 20px auto; max-width: 70%; box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 4px;">

Solace Agent Mesh comes with a set of built-in tools. Built-in tools are pre-packaged functionalities that can be granted to agents without requiring custom Python code. These tools address common operations such as file management, data analysis, web requests, and multi-modal generation.

### Steps

1. In the terminal, navigate to your Solace Agent Mesh workspace and activate the environment:
   ```bash
   cd sam-bootcamp
   source venv/bin/activate
   ```

2. Run the following command to add a new agent:
   ```bash
   sam add agent --gui
   ```
> **NOTE**: The opened page might show the Solace Agent Mesh installation GUI - just add the URI element `?config_mode=addAgent` to the end of the URL.
For example: The opened page URL `https://glorious-bassoon-j79qgqjxgrh996-5002.app.github.dev/`, change it to `https://glorious-bassoon-j79qgqjxgrh996-5002.app.github.dev/?config_mode=addAgent`

- Name the agent as `Builtin Tools` and click on `Next`
<img src="../images/sam/sam-builtin-1.png" alt="Solace Agent Mesh Built-in Tools" style="display: block; margin: 20px auto; max-width: 70%; box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 4px;">

- Use the default setting and click on `Next`
<img src="../images/sam/sam-builtin-2.png" alt="Solace Agent Mesh Built-in Tools" style="display: block; margin: 20px auto; max-width: 70%; box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 4px;">

- Use the default setting and click on `Next`
<img src="../images/sam/sam-builtin-3.png" alt="Solace Agent Mesh Built-in Tools" style="display: block; margin: 20px auto; max-width: 70%; box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 4px;">

- Click on `+ Add Tool` button

<img src="../images/sam/sam-builtin-4.png" alt="Solace Agent Mesh Built-in Tools" style="display: block; margin: 20px auto; max-width: 70%; box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 4px;">

- Review the list of built-in tools available for use
![alt text](image.png)
<img src="../images/sam/sam-builtin-5.png" alt="Solace Agent Mesh Built-in Tools" style="display: block; margin: 20px auto; max-width: 70%; box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 4px;">

- Select the following tools and add
  + Data Analysis
  + General
  + Internal
  + Web
Click on `Next`
<img src="../images/sam/sam-builtin-6.png" alt="Solace Agent Mesh Built-in Tools" style="display: block; margin: 20px auto; max-width: 70%; box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 4px;">

- Leave default settings and click on `Next`
<img src="../images/sam/sam-builtin-7.png" alt="Solace Agent Mesh Built-in Tools" style="display: block; margin: 20px auto; max-width: 70%; box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 4px;">

- Review the agent summary configuration and click on `Save Agent & Finish`
<img src="../images/sam/sam-builtin-8.png" alt="Solace Agent Mesh Built-in Tools" style="display: block; margin: 20px auto; max-width: 70%; box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 4px;">

- Let us review the Agents. In the Solace Agent Mesh browser tab, click on `Agents` to see the newly added agent.
<img src="../images/sam/sam-builtin-10.png" alt="Solace Agent Mesh Built-in Tools" style="display: block; margin: 20px auto; max-width: 70%; box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 4px;">

>**NOTE:** The newly added agent needs to be started. Either you can stop the `sam run` process with `Ctrl+C` and launch `sam run`, which will start all the agents.
Alternatively, you can launch the agents independently - open a new terminal and pass the agent configuration YAML files as arguments to the `sam run` command.
> - Open a new terminal
> - Activate the environment 
      `cd sam-bootcamp`
      `source venv/bin/activate`
> - Launch the agents
      `sam run config/agents/sam_geo_information.yaml config/agents/sam_mermaid.yaml config/agents/find_my_ip.yaml`

2. Let us test the use of these agents. In the Chat, enter a simple query
   ```bash
   What agents do you have access to and what are their capabilities?
   ```
<img src="../images/sam/sam-builtin-11.png" alt="Solace Agent Mesh Built-in Tools" style="display: block; margin: 20px auto; max-width: 70%; box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 4px;">

> **HINT:** If the workflow panel is not visible, just click on the network image !at the bottom of the chat panel (left)
<img src="../images/sam/sam-builtin-12.png" alt="Solace Agent Mesh Built-in Tools" style="display: block; margin: 20px auto; max-width: 70%; box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 4px;">

3. Let us issue a query that makes use of the built-in tools.
   ```bash
   Summarize the capabilities of the agent with sample queries as a HTML report
   ```
You will see an HTML report listing agentic capabilities available.
<img src="../images/sam/sam-builtin-13.png" alt="Solace Agent Mesh Built-in Tools" style="display: block; margin: 20px auto; max-width: 70%; box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 4px;">

---

[Next Section: 200-adding-prebuilt-agents.md](./200-adding-prebuilt-agents.md)