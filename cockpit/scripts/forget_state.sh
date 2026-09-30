#!/bin/bash
#
# Delete a scenario's terraform state while leaving the broker untouched.
#
#   forget_state.sh <scenario-id>
#
# Used by the "Terraform loses its state" failure mode. The objects terraform
# created stay on the broker, but terraform no longer knows it owns them, so
# the next apply tries to create them again and fails with ALREADY_EXISTS.
# The reconcile action is the way back.

set -euo pipefail

SCENARIO_ID="${1:-}"
if [ -z "$SCENARIO_ID" ]; then
  echo "usage: forget_state.sh <scenario-id>" >&2
  exit 2
fi

STATE_DIR="${COCKPIT_STATE_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.state}/$SCENARIO_ID"

shopt -s nullglob
files=("$STATE_DIR"/*.tfstate "$STATE_DIR"/*.tfstate.backup)
if [ ${#files[@]} -eq 0 ]; then
  echo "No terraform state for $SCENARIO_ID, nothing to forget."
  exit 0
fi

for f in "${files[@]}"; do
  echo "Deleting $(basename "$f")"
  rm -f "$f"
done
echo "Terraform state for $SCENARIO_ID is gone. The broker still has every object it created."
