#!/bin/bash
#
# Container create step: install what the workshop apps need to compile, then
# build the progress-tracker extension.
#
# Runs before postCreateCommand and is included in Codespaces prebuilds, so
# everything here is paid for once when the image is built rather than by each
# attendee when they open the workspace.

set -uo pipefail

echo "Installing build dependencies..."
# The Solace Go API wraps the native client library through cgo, so a C
# toolchain is required. The devcontainer base image and the Go feature both
# leave it out, so it has to be installed explicitly or every go build fails
# with "cgo: C compiler not found".
sudo apt-get update -qq
sudo apt-get install -y --no-install-recommends build-essential

# Best effort: a failed tracker build should not stop the workshop.
/bin/bash "$(dirname "${BASH_SOURCE[0]}")/../util/tracker_extension.sh" \
  || echo "Tracker extension build failed; continuing without it."
