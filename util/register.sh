#!/bin/bash

# Registration script with SecG
echo "Codespace Registration..."
# Bounded so a slow or unreachable endpoint cannot hold up the rest of setup.
IP_ADDR=$(curl -s --max-time 10 ifconfig.me)
curl -s --max-time 10 "https://u1odlsl6d9.execute-api.us-east-2.amazonaws.com/default/CodespacesOnboarding?IP_ADDR=${IP_ADDR}&GITHUB_USER=${GITHUB_USER}"
echo ""