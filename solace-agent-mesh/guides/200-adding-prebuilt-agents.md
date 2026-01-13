# Adding Pre-Built Agents to Solace Agent Mesh

## Table of Contents
- [1. Install Agents (Contributed)](#1-install-agents-contributed)
- [2. Review the Registered Agents](#2-review-the-registered-agents)

---

## 1. Install Agents (Contributed)
Solace provides a set of reusable, open-source agents. Solace Agent Mesh makes it easy to install agents from these repositories with just a few clicks.

- **SolaceLabs Core Plugins:**  
  https://github.com/SolaceLabs/solace-agent-mesh-core-plugins  
- **SolaceCommunity Plugins:**  
  https://github.com/solacecommunity/solace-agent-mesh-plugins  

> **Note:** The SolaceCommunity repository is open source and contains community-contributed agents — we encourage contributions!

### Steps

1. In the terminal, cancel the existing `sam run` execution. If you are picking up from where you left off on an earlier session also make sure you activate your virtual environment:
   `ctrl + c` to halt sam execution 
   or
   ```bash
   cd sam-bootcamp
   source venv/bin/activate
   ```

2. Launch the plugin catalog:
   ```bash
   sam plugin catalog
   ```

   This opens the catalog portal in your browser (typically `https://glorious-bassoon-j79qgqjxgrh996-5002.app.github.dev/?config_mode=pluginCatalog`).
   Reminder you may have to append `/?config_mode=pluginCatalog` to your codespaces url manually to access the catalog.

<div align="center">
    <img src="../images/sam/sam-plugin-catalog.png" alt="Solace Agent Mesh Plugin Catalog" width="80%" style="box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 8px;">
</div>

3. Review available agents and their capabilities by clicking **More** on each tile.

4. Add the Solace Community Repo with `+ Add Registry` button. The Core plugins are already present.
   - **SolaceCommunity Repository:**  
     - URL: `https://github.com/solacecommunity/solace-agent-mesh-plugins`  
     - Name: `SolaceCommunity`

5. Click **Refresh** to load all available agents.

6. Install these example agents:  
   - sam_geo_information
   - sam_mermaid
   - find_my_ip

> **HINT:** Use the same name as the plugin for the agent name.

7. Close the Solace Agent Mesh Plugin Tab
    In your terminal issue `ctrl + c` to stop execution of the Plugin Catalog

8. In your terminal, issue the `sam run` command to start Solace Agent Mesh with your new agents


---

## 2. Review the Registered Agents

In the Solace Agent Mesh Chat console, click the **Agents** tool on the left sidebar. You should now see the newly registered agents alongside the **Orchestrator** agent.

<div align="center">
    <img src="../images/sam/sam-new-agents.png" alt="Solace Agent Mesh New Agents" width="80%" style="box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 8px;">
</div>

Click **Click for details** on any agent card to learn more about its configuration and skills.

Now, let's interact again with Solace Agent Mesh:

```
I'm planning a business trip and need a complete travel briefing. First, detemine where I am. Then, get the weather forecast for both my current city and Paris, France. Calculate the time difference between my location and Paris.
```

<div align="center">
    <img src="../images/sam/sam-info-agents-new.png" alt="Solace Agent Mesh Info Agents" width="80%" style="box-shadow: 0 4px 8px rgba(0,0,0,0.2); border-radius: 8px;">
</div>

You can visualize agent interactions (e.g., **Orchestrator ↔ LLM**) by clicking the **network** icon below any chat response.

---

[Next Section: Configure A2A Proxy](./300-a2a-proxy-agents.md)