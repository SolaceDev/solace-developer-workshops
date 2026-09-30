#!/bin/bash

# Setup script for Solace broker in GitHub Codespaces
# This script assumes Docker is properly configured via devcontainer features

echo "Setting up Solace broker..."

# Check if Docker is working. On a Codespace that is resuming, this runs while
# the docker-in-docker daemon is still starting, so give it a moment first.
echo "Checking if Docker is accessible..."
for _ in $(seq 1 30); do
  docker info > /dev/null 2>&1 && break
  sleep 2
done
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not accessible. Please rebuild your codespace with the updated devcontainer.json"
  echo "To rebuild: Command Palette (F1) -> Codespaces: Rebuild Container"
  exit 1
fi

echo "Docker is running and accessible!"

# One name, used for every operation. Matching on a substring instead let a
# stopped "solace_10.8.1" satisfy a check that then ran `docker start solace`,
# which is a different container that does not exist.
BROKER_NAME="solace_10.8.1"
BROKER_IMAGE="solace/solace-pubsub-standard:10.8.1"

# --filter/--format matches the name exactly, unlike a grep over ps output.
running() { [ -n "$(docker ps -q -f "name=^${BROKER_NAME}$")" ]; }
exists()  { [ -n "$(docker ps -aq -f "name=^${BROKER_NAME}$")" ]; }

if running; then
  echo "Solace broker is already running!"
else
  if exists; then
    echo "Starting existing Solace container..."
    docker start "$BROKER_NAME"
  else
    echo "Installing Solace broker..."
    docker run -d -p 8080:8080 -p 55555:55555 -p 1443:1443 -p 8008:8008 \
      -p 1883:1883 -p 5672:5672 -p 9000:9000 -p 2223:2222 \
      --shm-size=2g --restart unless-stopped \
      --env username_admin_globalaccesslevel=admin \
      --env username_admin_password=admin \
      --name="$BROKER_NAME" "$BROKER_IMAGE"
  fi

  echo "Verifying Solace broker is running..."
  if running; then
    echo "Solace broker is running!"
  else
    echo "Error: Solace broker failed to start"
    echo "Docker logs:"
    docker logs "$BROKER_NAME" 2>&1 | tail -30
    exit 1
  fi
fi

# The container reports "running" long before SEMP accepts requests, so wait for
# the management interface rather than handing back a broker nothing can talk to.
echo "Waiting for the management interface..."
for _ in $(seq 1 60); do
  if curl -sf -u admin:admin "http://localhost:8080/SEMP/v2/config/msgVpns/default" >/dev/null 2>&1; then
    echo "Management interface is ready."
    break
  fi
  sleep 5
done

# Print access information
echo ""
echo "Solace Broker is ready!"
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
