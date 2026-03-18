#!/bin/bash

# Registration script with SecG

IP_ADDR=$(curl -s ifconfig.me)
curl -s "https://u1odlsl6d9.execute-api.us-east-2.amazonaws.com/default/CodespacesOnboarding?IP_ADDR=${IP_ADDR}&GITHUB_USER=${GITHUB_USER}"
echo ""