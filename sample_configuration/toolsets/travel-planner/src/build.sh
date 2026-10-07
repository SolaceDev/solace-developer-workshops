#!/usr/bin/env bash
# Builds the tool binary into dist/. Invoked by sam config apply via the
# configapply build pipeline. SAM_TOOL_BUILD_OUT and SAM_TOOL_NAME come
# from the pipeline; SAM_TOOL_SDK_VERSION is informational.
#
# Cross-compile to the STR runtime target. The arch is a property of the
# deployment, not this toolset, so we never default it: a wrong guess
# ships a binary the STR rejects with "exec format error" at discovery.
# sam config apply discovers the target from the platform the manifest
# points at and exports SAM_TOOL_TARGET_OS / SAM_TOOL_TARGET_ARCH; for a
# manual build, export both (e.g. SAM_TOOL_TARGET_OS=linux
# SAM_TOOL_TARGET_ARCH=amd64 ./build.sh).
set -euo pipefail

OUT_DIR="${SAM_TOOL_BUILD_OUT:-dist}"
NAME="${SAM_TOOL_NAME:-travel-planner}"
: "${SAM_TOOL_TARGET_OS:?must be set by sam config apply, or exported for a manual build (e.g. linux)}"
: "${SAM_TOOL_TARGET_ARCH:?must be set by sam config apply, or exported for a manual build (e.g. amd64)}"
TARGET_OS="$SAM_TOOL_TARGET_OS"
TARGET_ARCH="$SAM_TOOL_TARGET_ARCH"

mkdir -p "$OUT_DIR"

CGO_ENABLED=0 GOOS="$TARGET_OS" GOARCH="$TARGET_ARCH" \
  go build -o "$OUT_DIR/$NAME" .

# Drop the manifest into dist/ so the STR can discover the tools.
cp manifest.yaml "$OUT_DIR/manifest.yaml"
