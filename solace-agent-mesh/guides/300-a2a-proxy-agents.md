# Connect External Agents with A2A Proxy

## Table of Contents
- [What is an A2A Proxy?](#what-is-an-a2a-proxy)
- [Ways to add an A2A Agent](#ways-to-add-an-a2a-agent)
- [Add Your First A2A Agent - GUI](#add-your-first-a2a-agent---gui)
- [Add Your First A2A Agent Via File Configuration](#add-your-first-a2a-agent-via-file-configuration)
- [Try It Out](#try-it-out)
- [2. Add More A2A Agents](#2-add-more-a2a-agents)
  - [Adding another a2a agent](#adding-another-a2a-agent)
- [Fun Agent Ideas to Build](#fun-agent-ideas-to-build)

---

Solace Agent Mesh supports [Agent-to-Agent (A2A)](https://a2a-protocol.org/latest/) proxies to integrate external agentic frameworks that supports A2A like AWS Bedrock Agents, Azure AI Agent Service, or custom REST-based agents into your mesh.

### What is an A2A Proxy?

An A2A proxy acts as a bridge between Solace Agent Mesh and external agent frameworks that supports A2A. If you would like to use existing agents together you can add them to Solace Agent Mesh using the A2A proxy and enjoy all the benefits of event driven agent communication without having to re-write or re-platform your agents.

**Use cases:**
- Connect enterprise agents built on AWS, Azure, or Google platforms
- Integrate legacy AI services without code rewrites
- Enable cross-platform agent collaboration

### Ways to add an A2A Agent
1. Solace Agent Mesh agent via Configuration File
2. **Coming Soon** you can add an existing A2A agent proxy via the Solace Agent Mesh GUI. 

### Add Your First A2A Agent Via Configuration File
> Note: If you completed steps 100 and 200 please kill your existing terminal sessions and start with a fresh terminal.  All your previously configured agents will start when you run `sam run`

1. In a new terminal, navigate to your Solace Agent Mesh workspace:


   ```bash
   cd sam-bootcamp
   source venv/bin/activate
   ```

1. Create a proxy configuration:
   ```bash
   sam add proxy a2a --skip
   ```

1. A configuration file will be created for your new agent, the agent in this case is an a2a proxy. Open your [a2a_proxy.yaml](../../sam-bootcamp/configs/agents/a2a_proxy.yaml) in your vscode editor.

1. Copy the modified a2a_proxy yaml configuration into the new file that was created. From terminal, run the following

    ```
    cp ../solace-agent-mesh/artifacts/300-a2a_proxy.yaml configs/agents/a2a_proxy.yaml
    ```

    Note that the following changes were made:

    - Remove the Example 1 and Example 2 agents under `proxied_agents:`
    - Add our first A2A agent, the Strands Calculator Agent
      ```yaml
          proxied_agents:
            # Example 1: A simple agent without authentication
            - name: "Calculator" # The name this agent will have on the Solace mesh
              url: "http://ec2-18-223-124-73.us-east-2.compute.amazonaws.com:9000" # The real HTTP endpoint of the agent
              task_headers:
              - name: "Authorization"
                value: "Bearer january_workshop"
      ```
    > Note: Here we are using a password as a bearer token passed in on a custom header.  
    > When using your agents on platforms like AWS Agent Core you will likely need to supply [OAUTH credentials to authenticate](https://solacelabs.github.io/solace-agent-mesh/docs/documentation/components/proxies#oauth-20-client-credentials)
      ```yaml
    authentication:
        type: "oauth2_client_credentials"
        token_url: "https://auth.example.com/oauth/token"
        client_id: "${OAUTH_CLIENT_ID}"
        client_secret: "${OAUTH_CLIENT_SECRET}"
        scope: "agent.read agent.write"  # Optional
        token_cache_duration_seconds: 3300  # Optional, default: 3300 (55 minutes)
      # use_auth_for_agent_card: true  # Optional: Apply auth to agent card fetching
      ```

1. Save and restart agents:
   ```bash
   sam run
   ```

> Note: If you can also host the A2A Strands Agents locally and point to it via localhost. 

### Try It Out

In the Solace Agent Mesh chat, ask:
```
What is 10 * 22? Give me the answer and Shakespearean style. The answer should be one short sentence. Use the calculator agent.
```

The orchestrator will route the request to your AWS Travel Assistant via the A2A proxy!

> 📖 **Learn more:** [Solace Agent Mesh Proxy Documentation](https://solacelabs.github.io/solace-agent-mesh/docs/documentation/components/proxies)

---

## 2. Add More A2A Agents

Now that you've connected one external agent, let's add more so allow Solace Agent Mesh to string agent calls together

### Adding another a2a agent
We can re-use the same a2a proxy for multiple a2a agents. 

Note the newly created [a2a_proxy.yaml](../../sam-bootcamp/configs/agents/a2a_proxy.yaml) file also has another A2A agent configured:
  ```yaml
      proxied_agents:
        # Example 1: A simple agent without authentication
        - name: "Calculator" # The name this agent will have on the Solace mesh
          url: "http://ec2-18-223-124-73.us-east-2.compute.amazonaws.com:9000" # The real HTTP endpoint of the agent
          task_headers:
          - name: "Authorization"
            value: "Bearer january_workshop"  
        - name: "Factor" # The name this agent will have on the Solace mesh
          url: "http://ec2-18-223-124-73.us-east-2.compute.amazonaws.com:9001" # The real HTTP endpoint of the agent
          task_headers:
            - name: "Authorization"
              value: "Bearer january_workshop"   
  ```

Now you can add your existing A2A agents to Solace Agent Mesh using the following configuration. You can also build new agents on whatever platform you would like and use them in your existing AI workflows, seamlessly with Solace Agent Mesh.


> 💡 **Tip:** You can deploy your custom a2a agents on any platform you would like and use them with Solace Agent Mesh

--- 
[Next Section: MCP Server](./400-mcp-server-agents.md)