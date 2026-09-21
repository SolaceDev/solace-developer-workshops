#!/bin/bash
#
# Adopt broker objects that already exist back into a scenario's terraform state.
#
#   reconcile.sh <scenario-id>
#
# Terraform only knows what it created. If its state file is lost while the
# broker keeps the objects -- a fresh Codespace against an already-configured
# broker, or a reset without a destroy -- the next apply fails with
# ALREADY_EXISTS. Importing the strays fixes state without touching the broker.
#
# Every scenario lists what it owns in tf/imports.tsv, two tab-separated
# columns: the terraform address, and the import id with {vpn} standing in for
# the message VPN. Keeping the list as data means one script serves every
# scenario and a new scenario only adds a file.
#
# Safe to run repeatedly: an object already in state is skipped.

set -uo pipefail

SCENARIO_ID="${1:-}"
if [ -z "$SCENARIO_ID" ]; then
  echo "usage: reconcile.sh <scenario-id>" >&2
  exit 2
fi

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COCKPIT_DIR="$(dirname "$SCRIPTS_DIR")"
SCENARIO_DIR="$COCKPIT_DIR/scenarios/$SCENARIO_ID"
TF_DIR="$SCENARIO_DIR/tf"
IMPORTS="$TF_DIR/imports.tsv"
STATE_DIR="${COCKPIT_STATE_DIR:-$COCKPIT_DIR/.state}/$SCENARIO_ID"
STATE="$STATE_DIR/tf.tfstate"
VPN="${SOLACE_MSG_VPN:-default}"

if [ ! -f "$IMPORTS" ]; then
  echo "No import list at $IMPORTS." >&2
  echo "This scenario has nothing to reconcile, or the list has not been written yet." >&2
  exit 1
fi

mkdir -p "$STATE_DIR"

echo "Reconciling terraform state with the broker"
echo "  scenario: $SCENARIO_ID"
echo "  state:    $STATE"
echo "  vpn:      $VPN"
echo ""

imported=0
skipped=0
failed=0

tf_import() {
  local addr="$1" id="$2"

  if terraform -chdir="$TF_DIR" state show -state="$STATE" "$addr" >/dev/null 2>&1; then
    skipped=$((skipped + 1))
    return
  fi

  local out
  if out=$(terraform -chdir="$TF_DIR" import -no-color -input=false \
             -state="$STATE" "$addr" "$id" 2>&1); then
    echo "  imported  $addr"
    imported=$((imported + 1))
  elif grep -qiE "not found|does not exist|NOT_FOUND" <<<"$out"; then
    echo "  absent    $addr (apply will create it)"
  else
    echo "  FAILED    $addr"
    sed 's/^/              /' <<<"$out" | tail -3
    failed=$((failed + 1))
  fi
}

# Blank lines and # comments are skipped so the list can be annotated.
while IFS=$'\t' read -r addr id; do
  [ -z "${addr// }" ] && continue
  case "$addr" in \#*) continue ;; esac
  tf_import "$addr" "${id//\{vpn\}/$VPN}"
done < "$IMPORTS"

echo ""
echo "Imported $imported, already tracked $skipped, failed $failed."
if [ "$failed" -gt 0 ]; then
  echo "Some imports failed. Run Cleanup, then Play, for a clean slate."
  exit 1
fi
echo "State is reconciled. Play should now succeed."
