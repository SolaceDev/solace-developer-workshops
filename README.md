# Solace Workshops

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://github.com/codespaces/new/SolaceDev/solace-developer-workshops?quickstart=1)

## To Start
Navigate to the `<> Code` button at the top of the repo --> Open the Codespaces tab --> Click `Create codespaces on main`

## Available tools and configurations in this workshop

1. Local Solace Software Broker 
1. VSCode Solace extension
1. Solace TryMe CLI tool `stm`
1. [Solace Samples](./samples/README.md)
1. [Solace Agent Mesh Workshop](./solace-agent-mesh/README.md)

## Solace Broker

### 1. Local Solace Broker
1. Run the `setup_broker.sh` script as follows
   ```
   ./setup_broker.sh
   ```
1. Navigate to the `PORTS` tab and click on the `Solace` link that exposes the `8080` port
1. Enter `admin` `admin` as the username password credentials for the solace broker manager

### 2. Solace Cloud
To spin up a solace cloud broker, please follow the [Solace Cloud Signup guide](./solace-agent-mesh/solace-cloud-signup-workshop.md)