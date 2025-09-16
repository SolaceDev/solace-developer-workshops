#!/bin/bash

# Install Docker on Ubuntu
echo "Installing Docker..."
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

# Add Docker repository
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"

# Install Docker CE
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Start Docker service
# Use service command instead of systemctl for container environments
sudo service docker start

# Add current user to docker group to avoid using sudo with docker commands
sudo usermod -aG docker $USER
echo "Docker installation complete"

# Wait for Docker to start
echo "Checking if Docker is running..."
while (! docker info > /dev/null 2>&1); do
  echo "Waiting for Docker to start..."
  sleep 2
done
echo "Docker is running!"

# Install the Solace broker
echo "Installing Solace PubSub+ broker..."
docker run -d -p 8080:8080 -p 55555:55555 -p 1443:1443 -p 8008:8008 -p 1883:1883 -p 8000:8000 -p 5672:5672 -p 9000:9000 -p 2223:2222 --shm-size=2g --env username_admin_globalaccesslevel=admin --env username_admin_password=admin --name=solace solace/solace-pubsub-standard

# Check if Solace container is running
echo "Checking if Solace broker is running..."
if docker ps | grep -q solace; then
  echo "Solace PubSub+ broker is running!"
  echo "Management access:"
  echo "  - Web UI: http://localhost:8080"
  echo "  - Username: admin"
  echo "  - Password: admin"
else
  echo "Error: Solace broker failed to start"
  exit 1
fi