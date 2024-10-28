# Solace Samples Python

This repo hosts sample code to showcase how the Solace Python API could be used. You can find:

1. `/patterns` --> runnable code showcasing different message exchange patters with the Python API
1. `/howtos` --> runnable code snippets showcasing how to use different features of the API. All howtos are named `how_to_*.py` with some sampler files under sub folders.

## Environment Setup

1. [Install Python3](https://www.python.org/downloads/) (See installed version using `python3 -V`)  
   1.1 Note: If you are installing python for the first time on your machine then you can just use `python` instead of `python3` for the commands
1. [Optional] Install virtualenv `python3 -m pip install --user virtualenv` 1.1 Note: on a Linux machine, depending on the distribution you might need to`apt-get install python3-venv`instead 1.2 Alternatively, you can use`pyenv` to manage multiple versions of python. Follow the instructions here for more information https://realpython.com/intro-to-pyenv/#virtual-environments-and-pyenv
1. Clone this repository
1. [Optional] Setup python virtual environment `python3 -m venv venv`
1. [Optional] Activate virtual environment:  
   1.1 MacOS/Linux: `source venv/bin/activate`  
   1.2 Windows: `venv/Scripts/activate`
1. After activating the virtual environment, make sure you have the latest pip installed `pip install --upgrade pip`

## Install the Solace Python API and other dependencies

1. Install the API `pip install -r requirements.txt`

## Run Samples

Execute the script of choice as follows:

- `python patterns/<name_of_file>.py`

Note: This assumes you have a [local docker](https://solace.com/products/event-broker/software/getting-started/) broker running on localhost

To pass non default parameters, do so via the environment variables

- `SOLACE_HOST=<host_name> SOLACE_VPN=<vpn_name> SOLACE_USERNAME=<username> SOLACE_PASSWORD=<password> python <name_of_file>.py`

## Run Howtos

To run any of the howtos samples, you will have to set the `PYTHONPATH` environment variable to the current directory since there are references to local modules. To do so you can run any of the howtos samples as follows

`PYTHONPATH=.. python <name_of_file>.py`

### Running all the samplers

`PYTHONPATH=.. python sampler_master.py`

### Connection configuration for samplers

All connection details are provided in the `solbroker_properties.json` file include the SEMPv2 connection details and client connection detail with default value for a localhost deployment of the PubSub+ software broker. Update the `solbroker_properties.json` file entries to point the connections to a different broker.

### Secure Transport connections

The fixtures folder contains the sample client certificate api-client.pem and its CA public_root_ca.crt. Note the howtoes automatically adds a client certificate authority on the remote broker via SEMPv2.

TLS downgrade requires some manual remote broker configuration as well as the message vpn on the remote broker does not enable the feature to tls downgrade to plain text by default and must be confirmed. In the future this might be automatically enabled via SEMPv2 for the duration of the sampler execution.

Note the trusted certificate for the remote broker must be added to the fixtures folder as that directory is the trustore to establish TLS connections for the `how_to*.py` samplers. For details on how to add a server certifcate to the broker see [Managing Server Certs](https://docs.solace.com/Configuring-and-Managing/Managing-Server-Certs.htm).
For example should the broker have a server certificate derived from the public_root_ca.crt then TLS connection can be established since the public_root_ca.crt is in the truststore located at fixtures.

## Notes:

1. [Python Virtual environment](https://docs.python.org/3/tutorial/venv.html) is recommended to keep your project dependencies within the project scope and avoid polluting global python packages
1. Solace hostname, username, message vpn, and password are obtained from your Solace cloud account
1. Make sure you have the latest pip version installed prior installation

## Resources

- Solace Developer Portal is at [solace.dev](https://solace.dev)
- Ask the [Solace Community](https://solace.community/categories/python-api) for further discussions and questions.
- Official python documentation on [https://docs.solace.com/Solace-PubSub-Messaging-APIs/Python-API/python-home.htm](https://docs.solace.com/Solace-PubSub-Messaging-APIs/Python-API/python-home.htm)
