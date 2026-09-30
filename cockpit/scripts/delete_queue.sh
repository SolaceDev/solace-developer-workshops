#!/bin/bash
#
# Delete one queue over SEMP, behind terraform's back.
#
#   delete_queue.sh <queue-name>
#
# Used by the "Someone deletes a queue by hand" failure mode: the broker loses
# the queue, terraform's state still says it exists, and the next plan shows
# the drift.

set -euo pipefail

QUEUE="${1:-}"
if [ -z "$QUEUE" ]; then
  echo "usage: delete_queue.sh <queue-name>" >&2
  exit 2
fi

URL="${SOLACE_SEMP_URL:-http://localhost:8080}/SEMP/v2/config/msgVpns/${SOLACE_MSG_VPN:-default}/queues/$QUEUE"
echo "DELETE $URL"
curl -sS -u "${SOLACE_SEMP_USER:-admin}:${SOLACE_SEMP_PASSWORD:-admin}" -X DELETE "$URL"
echo
