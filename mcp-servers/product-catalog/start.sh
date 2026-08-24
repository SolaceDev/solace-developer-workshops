#!/usr/bin/env bash
# Start the Meridian product catalog MCP server.
#
# Backgrounded by the devcontainer, so it must not block. Logs to
# /tmp/product-catalog.log; readiness is the /health endpoint, not this script.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${CATALOG_PORT:-9100}"
LOG="${CATALOG_LOG:-/tmp/product-catalog.log}"

if curl -sf "http://localhost:${PORT}/health" >/dev/null 2>&1; then
  echo "Product catalog already healthy on ${PORT}."
  exit 0
fi

python3 -m pip install --quiet --disable-pip-version-check -r "${HERE}/requirements.txt"

echo "Starting product catalog MCP server on ${PORT} (logging to ${LOG})..."
nohup python3 "${HERE}/server.py" > "${LOG}" 2>&1 &

# Bounded wait. The catalog reports unhealthy until postgres answers, so this
# also covers the database still coming up.
for _ in $(seq 1 30); do
  if curl -sf "http://localhost:${PORT}/health" >/dev/null 2>&1; then
    echo "Product catalog ready: http://localhost:${PORT}/mcp"
    exit 0
  fi
  sleep 1
done

echo "Product catalog did not become healthy within 30s. Last log lines:" >&2
tail -20 "${LOG}" >&2
exit 1
