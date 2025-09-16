#!/bin/bash

# GitHub Codespaces Docker Setup Script
# This script is designed specifically for GitHub Codespaces environments

echo "Setting up Docker for GitHub Codespaces..."

# Ensure the Docker socket is accessible
if [ ! -w "/var/run/docker.sock" ]; then
  echo "Adjusting Docker socket permissions..."
  sudo chmod 666 /var/run/docker.sock
fi

# Verify Docker is working
echo "Checking if Docker is accessible..."
if docker info > /dev/null 2>&1; then
  echo "Docker is running and accessible!"
else
  echo "Error: Cannot connect to Docker. Trying with sudo..."
  if sudo docker info > /dev/null 2>&1; then
    echo "Docker is accessible with sudo. Will use sudo for Docker commands."
    USE_SUDO=true
  else
    echo "Error: Cannot connect to Docker even with sudo. Please check your Codespaces setup."
    exit 1
  fi
fi

# Function to run Docker commands with or without sudo as needed
docker_cmd() {
  if [ "$USE_SUDO" = true ]; then
    sudo docker "$@"
  else
    docker "$@"
  fi
}

# Install the Solace broker
echo "Installing Solace broker..."
docker_cmd run -d -p 8080:8080 -p 55555:55555 -p 1443:1443 -p 8008:8008 -p 1883:1883 \
  -p 8000:8000 -p 5672:5672 -p 9000:9000 -p 2223:2222 --shm-size=2g \
  --env username_admin_globalaccesslevel=admin --env username_admin_password=admin \
  --name=solace solace/solace-pubsub-standard

# Check if Solace container is running
echo "Checking if Solace broker is running..."
if docker_cmd ps | grep -q solace; then
  echo "Solace broker is running!"
else
  echo "Error: Solace broker failed to start"
  exit 1
fi

echo "Setup complete! Solace broker is ready to use."