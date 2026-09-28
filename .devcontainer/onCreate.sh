#!/bin/bash
#
# Container create step: install what the workshop apps need to compile.
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
