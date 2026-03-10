# Get started with the first agent

Your workshop environment includes a pre-configured MongoDB instance that serves as the data layer for this exercise. This instance contains the primary collections that store real-time flight data on an 8-hour flush configuration

1. Kill the Solace Agent Mesh instance if its already running
    ```
    CTR + C # On PC
    CMD + C # on Mac
    ```
1. Update `.env` file with the necessary environment variables
1. Execute the following from your `sam` dir
    ```
    cp ../solution/configs/agents/flight-data.yaml configs/agents/flight-data.yaml
    sam run
    ```

## Next Steps
- [Add your CNOPS RAG agent](./300-RAG.md)