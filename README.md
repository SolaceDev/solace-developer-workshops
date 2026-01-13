# Solace Workshops

<p align="center">
  <a href="https://github.com/codespaces/new/SolaceDev/solace-developer-workshops?quickstart=1">
    <img src="https://github.com/codespaces/badge.svg" alt="Open in GitHub Codespaces" width="600">
  </a>
</p>

## To Start a codespace session
You can either click the "Open in Github Codespaces button above" or:

1. Navigate to the `<> Code` button at the top of the repo  
1. Open the Codespaces tab    
1. Click `Create codespaces on main`      

## Available tools and configurations in this workshop

1. Local Solace Software Broker 
1. VSCode Solace extension
1. Solace TryMe CLI tool `stm`
1. [Solace Samples](./samples/README.md)
1. [Solace Agent Mesh Workshop](./solace-agent-mesh/README.md)

## Solace Broker

You have two options for using a Solace Broker:

### 1. Local Solace Broker
A codespace is initialized by default with a broker.

Alternatively, you can:

1. Run the `setup_broker.sh` script as follows
   ```
   ./setup_broker.sh
   ```

To confirm that the Solace broker is running:

1. Navigate to the `PORTS` tab and click on the `Solace` link that exposes the `8080` port
1. Enter `admin` `admin` as the username password credentials for the solace broker manager

### 2. Solace Cloud
To spin up a solace cloud broker, please follow the [Solace Cloud Signup guide](./solace-agent-mesh/solace-cloud-signup-workshop.md)

## Questions? 
Reach out on the [Solace Community Forum](https://community.solace.com)
