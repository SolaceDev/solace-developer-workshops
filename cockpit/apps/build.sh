#!/bin/bash
#
# Build the single workshop binary that backs every scenario app.
#
# The output goes to the cockpit's state directory rather than into the source
# tree, so resetting an attendee's environment stays a directory delete and the
# repo stays clean for the next person.

set -euo pipefail

APPS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COCKPIT_DIR="$(dirname "$APPS_DIR")"
BIN_DIR="${COCKPIT_BIN_DIR:-$COCKPIT_DIR/.state/bin}"

mkdir -p "$BIN_DIR"
cd "$APPS_DIR"

echo "Building the workshop apps..."
# CGO is required: the Solace Go API wraps the native client library. Stated
# explicitly so a container missing a C toolchain fails with a clear reason.
CGO_ENABLED=1 go build -o "$BIN_DIR/workshop" ./cmd/workshop
echo "Built $BIN_DIR/workshop"
