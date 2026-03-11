# Add external agents: Lang Agent

## Understanding the Proxy Layer

Solace Agent Mesh is a framework agnostic agent orchestration layer that can connect to external A2A agents through the proxy layer. The proxy layer acts as a protocol bridge, translating between A2A over Solace event mesh and A2A over HTTPS protocols. This enables agents within the mesh to delegate tasks to external agents and include them in collaborative workflows without requiring the external agents to be modified or redeployed.

Any agent that adheres to the A2A protocol can communicate with all the other components of Solace Agent Mesh. The proxy handles essential functions including authentication management, agent discovery, artifact flow between systems, and task lifecycle management. This architecture allows you to integrate third-party agents, build hybrid cloud solutions, or gradually migrate existing systems while maintaining full interoperability across your agent ecosystem.

## Connecting to Remote Lang Agents

In this tutorial, we will be connecting to remote Lang agents hosted somewhere else and exposed as A2A servers. These external agents run on separate infrastructure but will appear and behave like native agents within your mesh once connected through the proxy. The proxy will automatically fetch their capabilities, handle authentication, and ensure seamless communication with all other agents in your Solace Agent Mesh deployment.

## Configure your remote Agent

1. Kill the Solace Agent Mesh instance if its already running
    ```
    CTR + C
    ```

1. Execute the following from your `sam` dir
    ```
    cp ../solution/configs/agents/lang_agents_proxy.yaml configs/agents/lang_agents_proxy.yaml
    sam run
    ```
1. [Optional] Open the [lang_agents_proxy.yaml](../sam/configs/agents/lang_agents_proxy.yaml) config file and explore the different sections

## Explore the agent
Navigate to your Solace Agent Mesh instance and click on the "Agent Mesh" Tab. Observe the newly created agent

1. Now back to your `Chat` tab, run the following slash command to insert one of the pre-saved prompts
    ```
    /300
    ```
    This will insert the following prompt into your chat window
    ```
    TBD
    ```

1. Click on the "View Activity" icon to view the flow of commands in your Agentic system

    ![view_activity.png](../img/view_activity.png)

1. Observe the flow of events in your system that leverages the newly added remote agent

## Next Steps
- [Add an Event Mesh Gateway](./500-EventTriggered.md)