#!/bin/bash

# Array of ports to make public
PORTS=(8080 1443 8008 55555 1883 8000 5672 9000 2223)

# Function to set port visibility
set_port_visibility() {
    echo "Exposing port $1"
    gh codespace ports visibility "$1":public -c "$CODESPACE_NAME"
}

# Loop through ports and set visibility
for port in "${PORTS[@]}"; do
    set_port_visibility "$port"
done