#!/bin/bash

# Update github submodules recursively
git submodule update --init --recursive

# Install STM
echo "Installing STM"
echo "deb [arch=amd64 trusted=yes] https://raw.githubusercontent.com/SolaceLabs/apt-stm/master stm main" | sudo tee  /etc/apt/sources.list.d/solace-stm-test.list
sudo apt-get update
sudo apt-get install stm

# Install Java 17
sudo apt install -y openjdk-17-jdk
echo "export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64" >> ~/.bashrc
echo "export PATH=\$JAVA_HOME/bin:\$PATH" >> ~/.bashrc
source ~/.bashrc

# Install Maven
sudo apt install maven -y

# Download and extract Python 3.12
sudo apt update
sudo apt install --reinstall -y software-properties-common python3-apt
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install -y python3.12 python3.12-venv

# Install latest Go version
echo "Installing latest Go version..."
# Get the latest version
LATEST_GO_VERSION=$(curl -s https://go.dev/VERSION?m=text | head -n 1)
echo "Latest Go version: $LATEST_GO_VERSION"
wget "https://go.dev/dl/${LATEST_GO_VERSION}.linux-amd64.tar.gz"
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf "${LATEST_GO_VERSION}.linux-amd64.tar.gz"
rm "${LATEST_GO_VERSION}.linux-amd64.tar.gz"
echo "export PATH=\$PATH:/usr/local/go/bin" >> ~/.bashrc
echo "export GOPATH=\$HOME/go" >> ~/.bashrc
echo "export PATH=\$PATH:\$GOPATH/bin" >> ~/.bashrc
source ~/.bashrc
echo "Go installation complete"
go version

# Install Node.js LTS
echo "Installing Node.js LTS..."
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
NODE_MAJOR=20  # Current LTS version as of 2025
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt-get update
sudo apt-get install -y nodejs
echo "Node.js LTS installation complete"
node --version
npm --version

# Wait for Docker to start
# while (! docker info > /dev/null 2>&1); do
#   echo "Waiting for Docker to start..."
#   sleep 2
# done

# # Install the Solace image
# docker run -d -p 8080:8080 -p 55555:55555  -p 1443:1443 -p 8008:8008 -p 1883:1883 -p 8003:8000 -p 5672:5672 -p 9000:9000 -p 2223:2222 --shm-size=2g --env username_admin_globalaccesslevel=admin --env username_admin_password=admin --name=solace solace/solace-pubsub-standard
# echo "Solace Docker image installation complete"