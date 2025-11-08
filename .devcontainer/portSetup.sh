#!/bin/bash

# Array of ports to expose with their labels
declare -A PORTS=(
    [8080]="Solace"
    [1443]="TLS"
    [55555]="Messaging"
    [8008]="Web"
    [1883]="MQTT"
    [8000]="HTTP"
    [5672]="AMQP"
    [9000]="Management"
    [2223]="SSH"
    [5002]="SAMAgentBuilder"
)

# Function to set port visibility and label
set_port_visibility() {
    local port=$1
    local label=$2
    
    echo "Exposing port $port with label: $label"
    gh codespace ports visibility "$port":public -c "$CODESPACE_NAME"
}

# Loop through ports and set visibility
for port in "${!PORTS[@]}"; do
    set_port_visibility "$port" "${PORTS[$port]}"
done
