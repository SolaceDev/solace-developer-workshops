#!/bin/bash

# Start timer
START_TIME=$(date +%s)
echo "============================================"
echo "Starting environment configuration..."
echo "============================================"

# Update github submodules recursively
git submodule update --init --recursive

# Run registration script
bash util/register.sh

# Run broker setup script
echo "Setting up Solace broker..."
bash setup_broker.sh

# End timer and calculate duration
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo "============================================"
echo "Environment configuration complete!"
echo "Total execution time: ${DURATION} seconds"
echo "============================================"

