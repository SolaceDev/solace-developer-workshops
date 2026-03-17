# Environment Setup

## Table of Contents

- [1. Installing Solace Agent Mesh](#1-installing-solace-agent-mesh)
- [2. Configuring Solace Agent Mesh](#2-configuring-solace-agent-mesh)
- [3. Adding prompts to SAM](#3-adding-prompts-to-sam)
- [4. Next Step](#4-next-step)

To get started with the Solace Agent Mesh, follow the following steps

## 1. Installing Solace Agent Mesh

1. Navigate to the sam directory and create a virtual environment
   ```
   cd faa-workshop/sam
   python3 -m venv .venv
   ```
1. Activate the virtual environment
   ```
   source .venv/bin/activate
   ```
1. Install the requirements
   ```
   pip install -r requirements.txt
   ```
   > Make sure you have activated your virtual environment before proceeding with the workshop. Run `source .venv/bin/activate` if you haven't already done so. Anytime you open a new terminal, you will have to navigate to the `sam` dir and activate the python virtual environment

1. Initialize the solace agent mesh
   ```
   sam init --skip
   ```
After initializing sam, you should now see a 
   ```
   .
   ├── configs
   │   ├── agents
   │   │   └── main_orchestrator.yaml
   │   ├── gateways
   │   │   └── webui.yaml
   │   ├── logging_config.yaml
   │   ├── services
   │   │   └── platform.yaml
   │   └── shared_config.yaml
   ├── requirements.txt
   ├── sop
   │   ├── SFDPS_Flight_Operational_Context_Document_v1.0_20180828_Final.md
   │   └── STDDS_SMES_Operational_Context_Document_v1.1_2019_04_25_RevA.md
   ├── src
   │   └── __init__.py
   └── util
       ├── faa_prompts.json
       └── populate_prompts.py
   ```

## 2. Configuring Solace Agent Mesh

1. Populate your .env file with the necessary environment variables into your local directory
   ```
    cp ../solution/.env_example .env
   ```
1. Configure the following variables in your [.env](../sam/.env)
    ```
    LLM_SERVICE_API_KEY="<Insert_LLM_SERVICE_API_KEY_here>"
    ```

    -  Navigate to the [.env](../sam/.env) file
    -  Paste your LLM key in place of `<Insert_LLM_SERVICE_API_KEY_here>`
    -  If you are using another openAI compatible endpoint with your own LLM key you can update the `LLM_SERVICE_ENDPOINT` variable as well

    > Note: You will get values to these variables from your instructor in the session
1. Save the `.env` file
1. From terminal, run solace agent mesh
   ```
   sam run
   ```
1. Navigate to the Solace Agent Mesh Web Gateway
1. Run the following prompt
    ```
    What are your capabilities?
    ```

   > Note: If you get an issue with your LLM response as follows `{"message":"The model returned the following errors: tool_choice.type: Field required"}` please navigate to the [.env](../sam/.env) file and change the `LLM_SERVICE_PLANNING_MODEL_NAME` and `LLM_SERVICE_GENERAL_MODEL_NAME` to the following
   ```
   openai/vertex-claude-4-5-sonnet
   ```
## 3. Adding prompts to SAM

Now lets pre-populate the solace agent mesh instance with prompts:

1. open a new terminal

   <div align="center">
      <img src="../img/new-terminal.png" alt="new terminal" width="70%" style="box-shadow: 0 4px 8px rgb(0,200,130); border-radius: 8px;">
   </div>

1. Navigate to the workshop dir
   ```
   cd faa-workshop/sam/
   ```
1. Run the following script
   ```
   python3 util/populate_prompts.py --file util/faa_prompts.json
   ```

   > Note: You can delete all the prompts by executing `python3 util/populate_prompts.py --delete-all`
   
1. Navigate to the `Prompts` tab from your Solace Agent Mesh and observe the new prompts that got added

   <div align="center">
      <img src="../img/prompts_list.png" alt="Prompts List" width="70%" style="box-shadow: 0 4px 8px rgb(0,200,130); border-radius: 8px;">
   </div>

## 4. Next Step
Now that you have the solace agent mesh installed, configured, and running, you can go any of the following steps 
1. [Get to know the data](./101-FaaData.md)
1. [Understanding Solace Agent Mesh](./102-SAMOverview.md)
1. [Adding your first agent](./200-DatabaseAgent.md)