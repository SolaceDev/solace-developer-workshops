#!/bin/bash
#
# Run one workshop app, building it first if needed.
#
#   run.sh build
#   run.sh <scenario> <role> [flags]
#
# Scenarios invoke this from their own directory, so the path back here is
# fixed: ../../apps/run.sh. Keeping the build behind the same entry point means
# a scenario.yaml never has to know where the binary lives.

set -euo pipefail

APPS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COCKPIT_DIR="$(dirname "$APPS_DIR")"
BIN_DIR="${COCKPIT_BIN_DIR:-$COCKPIT_DIR/.state/bin}"
BIN="$BIN_DIR/workshop"

# Rebuild when the binary is missing or older than any source file. Attendees
# who edit an app get their change on the next run without having to remember
# the build step, and everyone else pays nothing.
needs_build() {
  [ ! -x "$BIN" ] && return 0
  [ -n "$(find "$APPS_DIR" -name '*.go' -newer "$BIN" -print -quit)" ] && return 0
  return 1
}

if [ "${1:-}" = "build" ]; then
  exec bash "$APPS_DIR/build.sh"
fi

if needs_build; then
  bash "$APPS_DIR/build.sh"
  echo ""
fi

exec "$BIN" "$@"
