#!/bin/bash

echo "Codespace Registration..."
curl -s "https://gdvaejkcal6746u3sjettol7xi0xduzq.lambda-url.us-east-2.on.aws/?GITHUB_USER=${GITHUB_USER}"
echo ""

echo "Waiting for access to propagate..."
MAX_ATTEMPTS=20  # 20 × 3s = 60s max
ATTEMPT=0
until curl -sf --max-time 5 "https://2n3yr1kp0h.execute-api.us-east-2.amazonaws.com/prod/litellm-token" > /dev/null 2>&1; do
  ATTEMPT=$((ATTEMPT + 1))
  if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
    echo "Error: API Gateway did not become accessible after 60s. Re-run 'bash util/register.sh' to retry."
    exit 1
  fi
  sleep 3
done
echo "Access confirmed."
