#!/bin/bash
set -euo pipefail

SAM_URL="http://localhost:8800"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Waiting for SAM to be ready..."
until curl -sf "${SAM_URL}/health" > /dev/null 2>&1; do
  sleep 2
done

echo "============================================"
echo "Seeding prompts..."
echo "============================================"
bash "${SCRIPT_DIR}/prompts/populate_prompts.sh" --url "$SAM_URL" || {
  echo "Warning: prompt seeding failed — SAM is still running."
}