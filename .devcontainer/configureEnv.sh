#!/bin/bash

# Install STM
echo "deb [arch=amd64 trusted=yes] https://raw.githubusercontent.com/SolaceLabs/apt-stm/master stm main" | sudo tee  /etc/apt/sources.list.d/solace-stm-test.list
sudo apt-get update
sudo apt-get install stm

# Update github submodules recursively
git submodule update --init --recursive

# Install Java 17
sudo apt install -y openjdk-17-jdk
echo "export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64" >> ~/.bashrc
echo "export PATH=\$JAVA_HOME/bin:\$PATH" >> ~/.bashrc
source ~/.bashrc

# Wait for Docker to start
while (! docker info > /dev/null 2>&1); do
  echo "Waiting for Docker to start..."
  sleep 2
done

# Install the Solace image
docker run -d -p 8080:8080 -p 55555:55555  -p 1443:1443 -p 8008:8008 -p 1883:1883 -p 8000:8000 -p 5672:5672 -p 9000:9000 -p 2223:2222 --shm-size=2g --env username_admin_globalaccesslevel=admin --env username_admin_password=admin --name=solace solace/solace-pubsub-standard
