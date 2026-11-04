#!/bin/bash

# Setup script for Solace broker in GitHub Codespaces
# This script assumes Docker is properly configured via devcontainer features

echo "Setting up Solace broker..."

# Check if Docker is working
echo "Checking if Docker is accessible..."
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not accessible. Please rebuild your codespace with the updated devcontainer.json"
  echo "To rebuild: Command Palette (F1) -> Codespaces: Rebuild Container"
  exit 1
fi

echo "Docker is running and accessible!"

# Check if Solace container is already running
if docker ps | grep -q solace; then
  echo "Solace broker is already running!"
else
  # Check if Solace container exists but is stopped
  existing=$(docker ps -a --filter ancestor=solace/solace-pubsub-standard:10.8.1 --format '{{.Names}}' | head -1)
  if [ -n "$existing" ]; then
    echo "Starting existing Solace container ($existing)..."
    docker start "$existing"
  else
    # Install the Solace broker
    echo "Installing Solace broker..."
    docker run -d -p 8080:8080 -p 55555:55555 -p 1443:1443 -p 8008:8008 \
      -p 1883:1883 -p 5672:5672 -p 9000:9000 -p 2223:2222 \
      --shm-size=2g \
      --env username_admin_globalaccesslevel=admin \
      --env username_admin_password=admin \
      --name=solace_10.8.1 solace/solace-pubsub-standard:10.8.1
  fi

  # Verify Solace container is running
  echo "Verifying Solace broker is running..."
  if docker ps | grep -q solace; then
    echo "Solace broker is running!"
  else
    echo "Error: Solace broker failed to start"
    echo "Docker logs:"
    docker logs solace
    exit 1
  fi
fi

# The container's ports accept connections long before the broker inside is
# ready (clients get "Connection reset by peer"), and SAM exits if it cannot
# connect. Wait until the default Message VPN reports up before returning.
echo "Waiting for Solace broker to accept connections..."
for _ in $(seq 1 90); do
  if curl -sf -u admin:admin http://localhost:8080/SEMP/v2/monitor/msgVpns/default \
      | grep -qE '"state" *: *"up"'; then
    echo "Solace broker is accepting connections."
    break
  fi
  sleep 2
done
if ! curl -sf -u admin:admin http://localhost:8080/SEMP/v2/monitor/msgVpns/default \
    | grep -qE '"state" *: *"up"'; then
  echo "Error: Solace broker did not become ready within 3 minutes"
  exit 1
fi

# Print access information
echo ""
echo "Solace PubSub+ broker is ready!"
echo "Management UI: http://localhost:8080"
echo "Username: admin"
echo "Password: admin"
echo ""
echo "SEMP port: 8080"
echo "SMF port: 55555"
echo "Web Messaging port: 8008"
echo "MQTT port: 1883"
echo "REST port: 9000"
echo "AMQP port: 5672"
echo ""
