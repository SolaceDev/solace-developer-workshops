# 200 Adding Pre-Built Agents to Solace Agent Mesh

## 1. Install Agents (Contributed)

While Solace Agent Mesh is running in the current terminal, open a **new terminal** and launch the plugin catalog to add new agents.

<img src="../sam/sam-new-terminal.png" alt="SAM New Terminal" style="display: block; margin: 20px auto; max-width: 70%; box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 4px;">

Solace provides a set of reusable, open-source agents. SAM makes it easy to install agents from these repositories with just a few clicks.

- **SolaceLabs Core Plugins:**  
  https://github.com/SolaceLabs/solace-agent-mesh-core-plugins  
- **SolaceCommunity Plugins:**  
  https://github.com/solacecommunity/solace-agent-mesh-plugins  

> **Note:** The SolaceCommunity repository is open source and contains community-contributed agents — we encourage contributions!

### Steps

1. In the terminal, navigate to your SAM workspace and activate the environment:
   ```bash
   cd sam-bootcamp
   source venv/bin/activate
   ```

2. Launch the plugin catalog:
   ```bash
   sam plugin catalog
   ```

   This opens the catalog portal in your browser (typically `http://127.0.0.1:5003/?config_mode=pluginCatalog`).
   <img src="../sam/sam-plugin-catalog.png" alt="SAM Plugin Catalog" style="display: block; margin: 20px auto; max-width: 70%; box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 4px;">

> **NOTE**: The opened page might show the SAM installation GUI - just add the URI element `?config_mode=pluginCatalog` to the end of the URL. 
For example: The opened page URL `https://glorious-bassoon-j79qgqjxgrh996-5002.app.github.dev/`, change it to `https://glorious-bassoon-j79qgqjxgrh996-5002.app.github.dev/?config_mode=pluginCatalog`


3. Review available agents and their capabilities by clicking **More** on each tile.

4. Add the following registries:  
   - **SolaceLabs Repository:**  
     - URL: `https://github.com/SolaceLabs/solace-agent-mesh-core-plugins`  
     - Name: `SolaceLabs`
   - **SolaceCommunity Repository:**  
     - URL: `https://github.com/solacecommunity/solace-agent-mesh-plugins`  
     - Name: `SolaceCommunity`

5. Click **Refresh** to load all available agents.

6. Install these example agents:  
   - `sam_geo_information`  
   - `sam_mermaid`  
   - `find_my_ip`  

> **HINT:** Use the same name as the plugin for the agent name.

>**NOTE:** When done, you can close the SAM catalog tab and stop the process with `Ctrl+C` and launch `sam run`, which will start all the agents.
Alternatively, you can launch the agents independently - open a new terminal and pass the agent configuration YAML files as arguments to the `sam run` command.
> - Open a new terminal
> - Activate the environment 
      `cd sam-bootcamp`
      `source venv/bin/activate`
> - Launch the agents
      `sam run config/agents/sam_geo_information.yaml config/agents/sam_mermaid.yaml config/agents/find_my_ip.yaml`


---

## 2. Review the Registered Agents

In the SAM Chat console, click the **Agents** tool on the left sidebar. You should now see the newly registered agents alongside the **Orchestrator** agent.

<img src="../sam/sam-new-agents.png" alt="SAM New Agents" style="display: block; margin: 20px auto; max-width: 70%; box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 4px;">

Click **Click for details** on any agent card to learn more about its configuration and skills.

Now, let's interact again with SAM:

```
What agents do you have access to and what are their capabilities?
```

<img src="../sam/sam-info-agents-new.png" alt="SAM Info Agents" style="display: block; margin: 20px auto; max-width: 70%; box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 4px;">

You can visualize agent interactions (e.g., **Orchestrator ↔ LLM**) by clicking the **network** icon below any chat response.

---

### [Next Section: 300-a2a-proxy-agents.md](./300-a2a-proxy-agents.md)