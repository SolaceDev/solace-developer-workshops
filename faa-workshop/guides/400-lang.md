# Add a external agents

1. Kill the Solace Agent Mesh instance if its already running
    ```
    CTR + C # On PC
    CMD + C # on Mac
    ```

1. Execute the following from your `sam` dir
    ```
    cp ../solution/configs/agents/lang_agents_proxy.yaml configs/agents/lang_agents_proxy.yaml
    sam run
    ```
