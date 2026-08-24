#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${SAM_TOOL_BUILD_OUT:-dist}"
NAME="${SAM_TOOL_NAME:-substitution-scoring}"

mkdir -p "$OUT_DIR"
CGO_ENABLED=0 go build -o "$OUT_DIR/$NAME" .
cp manifest.yaml "$OUT_DIR/manifest.yaml"
