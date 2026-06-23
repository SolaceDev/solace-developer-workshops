#!/bin/bash
# Start SAM and seed prompts once the gateway is ready.
#
# Used as the devcontainer postAttachCommand. Launches SAM in the background,
# waits for the gateway health endpoint to respond, seeds prompts, then tails
# the SAM log so the terminal stays open and shows live output.

set -euo pipefail

SAM_URL="http://localhost:8800"
HEALTH_PATH="/health"
POLL_INTERVAL=2
TIMEOUT=120
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_FILE="/tmp/sam.log"

echo "============================================"
echo "Starting Solace Agent Mesh..."
echo "============================================"

# Launch SAM in the background, capturing output to a log file
sam run --embedded "${WORKSPACE_DIR}/configs" > "$LOG_FILE" 2>&1 &
SAM_PID=$!

echo "SAM started (pid: ${SAM_PID}), waiting for gateway on ${SAM_URL}${HEALTH_PATH}..."

# Poll until healthy or timeout
elapsed=0
until curl -sf "${SAM_URL}${HEALTH_PATH}" > /dev/null 2>&1; do
  if ! kill -0 "$SAM_PID" 2>/dev/null; then
    echo ""
    echo "ERROR: SAM process exited unexpectedly. Last log output:"
    tail -20 "$LOG_FILE"
    exit 1
  fi
  if [[ $elapsed -ge $TIMEOUT ]]; then
    echo ""
    echo "ERROR: Timed out after ${TIMEOUT}s waiting for SAM to become ready."
    tail -20 "$LOG_FILE"
    exit 1
  fi
  printf "."
  sleep $POLL_INTERVAL
  elapsed=$((elapsed + POLL_INTERVAL))
done

echo ""
echo "SAM is ready (${elapsed}s)."
echo ""

# Seed prompts
echo "============================================"
echo "Seeding prompts..."
echo "============================================"
bash "${SCRIPT_DIR}/prompts/populate_prompts.sh" --url "$SAM_URL" || {
  echo "Warning: prompt seeding failed — SAM is still running."
}

echo ""
echo "============================================"
echo "Setup complete. Tailing SAM logs (Ctrl+C to stop)..."
echo "============================================"
echo ""

# Keep the terminal open with live SAM output
tail -f "$LOG_FILE"
