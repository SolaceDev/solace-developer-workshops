# Add external agents: Lang Agent

1. Kill the Solace Agent Mesh instance if its already running
    ```
    CTR + C
    ```

1. Execute the following from your `sam` dir
    ```
    cp ../solution/configs/agents/lang_agents_proxy.yaml configs/agents/lang_agents_proxy.yaml
    sam run
    ```
