# Solution directory

## Getting started 
To run this project, follow the steps:

1. Rename `.env_example` to `.env`
1. Populate `.env` wih the following required env vars
    - `LLM_SERVICE_API_KEY`
    - `QDRANT_URL`
    - `QDRANT_API_KEY`
1. Setup and activate Python virtual env
    ```
    python3 -m venv .venv
    source .venv/bin/activate
    ```
1. Install requirements
    ```
    pip install -r requirements.txt
    ```
1. Run Solace Agent Mesh
    ```
    sam run
    ```