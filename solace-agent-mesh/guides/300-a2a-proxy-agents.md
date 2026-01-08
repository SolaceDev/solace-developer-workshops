# 300 Connect External Agents with A2A Proxy

Solace Agent Mesh supports **Agent-to-Agent (A2A) proxies** to integrate external agentic frameworks like AWS Bedrock Agents, Azure AI Agent Service, or custom REST-based agents into your mesh.

### What is an A2A Proxy?

An A2A proxy acts as a bridge between SAM and external agent frameworks. Instead of rewriting agents in Python, you can expose existing agents through SAM's event-driven architecture.

**Use cases:**
- Connect enterprise agents built on AWS, Azure, or Google platforms
- Integrate legacy AI services without code rewrites
- Enable cross-platform agent collaboration

### Ways to add an A2A Agent
1. Solace Agent Mesh add agent GUI
2. Solace Agent Mesh agent via file configuration

### Add Your First A2A Agent - GUI

Proxy creation i s currently not supported in the GUI Yet

### Add Your First A2A Agent Via File Configuration

1. In a new terminal, navigate to your SAM workspace:
   ```bash
   cd sam-bootcamp
   source venv/bin/activate
   ```

2. Create a proxy configuration:
   ```bash
   sam add agent a2a-proxy --skip
   ```

3. A configuration file will be created for your new agent, the agent in this case is an a2a proxy:
   ```bash
   vi ./configs/agents/a2a_proxy_agent.yaml
   ```
   You can find a finished [a2a_proxy agent card](../artifacts/300-a2a_proxy_agent.yaml)
   We will need to modify a few values:
   **app_module**: solace_agent_mesh.agent.proxies.a2a.app
   We will clean up other values like the tools, prompt and other sections. 
   Leaving behind:
   ``` yaml
   app_config:
      namespace: ${NAMESPACE}

      # Configuration for the artifact service used by the proxy itself.
      # When the proxy receives an artifact from a downstream agent, it will
      # store it here before forwarding it on the Solace mesh.
      artifact_service:
        type: "filesystem"
        base_path: "/tmp/samv2"
        artifact_scope: namespace # Default scope, shares artifacts within the NAMESPACE

      # How the proxy should handle artifacts it sends over Solace.
      # 'reference': Sends an artifact:// URI.
      # 'embed': Sends the full content base64 encoded.
      artifact_handling_mode: "reference"

      # Interval in seconds for the proxy to re-fetch agent cards from
      # downstream agents. Set to 0 to disable periodic checks.
      discovery_interval_seconds: 5
   ```

   Finally we can add our proxied a2a agents
   ```yaml
   proxied_agents:
        # Example 1: A simple calculator agent hosted on AWS with basic authentication
        - name: "StrandsCalculator" # The name this agent will have on the Solace mesh
          url: "http://0.0.0.0:9001" # The real HTTP endpoint of the agent
   ```

4. Save and restart agents:
   ```bash
   sam run
   ```

### Try It Out

In the SAM chat, ask:
```
What is 10 * 22? Give me the answer and shaksperean style. The answer should be one short sentence
```

The orchestrator will route the request to your AWS Travel Assistant via the A2A proxy!

> 📖 **Learn more:** [SAM Proxy Documentation](https://solacelabs.github.io/solace-agent-mesh/docs/documentation/components/proxies)

---

## 2. Add More A2A Agents

Now that you've connected one external agent, let's add more so allow SAM to string agent calls together

### Adding another a2a agent
We can re-use the same a2a proxy for multiple a2a agents. 

Stop your SAM instance by issuing the following keystrokes in your terminal window
``` ctrl + c ```

Open your a2a proxy configuration file:
```~/sam/workshop/configs/agents/a2a_proxy_agent.yaml```
Add a new a2a agent to the proxy
   ```
   proxied_agents:
        # Example 1: A simple calculator agent hosted on AWS with basic authentication
        - name: "StrandsCalculator" # The name this agent will have on the Solace mesh
          url: "http://0.0.0.0:9000" # The real HTTP endpoint of the agent
        # Example 2: A simple factorization agent hosted on AWS with basic authentication
        - name: "StrandsCalculator" # The name this agent will have on the Solace mesh
          url: "http://0.0.0.0:9001" # The real HTTP endpoint of the agent
          task_headers:
            - name: "Authorization"
              value: "Bearer your_secure_password_here"  
   ```
Start SAM so it picks up the new configuration
   Save and restart agents:
    ```bash
    sam run
    ```

## Now you can add your existing A2A agents to SAM using the following configuration. You can also build new agents on whatever platform you would like and use them in your existing AI workflows, seamlessly with Solace Agent Mesh. 


### Fun Agent Ideas to Build

Want to host your own? Consider building:
- **Fitness Coach:** Workout plans and nutrition advice
- **Meeting Summarizer:** Digest meeting notes and action items
- **Bug Bounty Hunter:** Analyzes code for security vulnerabilities
- **Dad Joke Generator:** Because every mesh needs humor 

> 💡 **Tip:** You can deploy your custom a2a agents on any platform you would like and use them with Solace Agent Mesh

--- 
### [Next Section: 400-mcp-server-agents.md](./400-mcp-server-agents.md)