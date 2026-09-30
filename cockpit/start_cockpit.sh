#!/bin/bash
#
# Start the Solace Workshop Dashboard.
#
# Idempotent by design: an attendee can run this as many times as they like,
# and the devcontainer can call it on every attach without stacking processes.

set -euo pipefail

COCKPIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$COCKPIT_DIR")"
VENV="$COCKPIT_DIR/.venv"
PORT="${COCKPIT_PORT:-3000}"
LOG="$COCKPIT_DIR/.state/cockpit.log"

mkdir -p "$COCKPIT_DIR/.state"

# Already listening? Leave it alone.
if curl -sf "http://localhost:$PORT/api/env" >/dev/null 2>&1; then
  echo "Dashboard already running at http://localhost:$PORT"
  exit 0
fi

# A venv without pip is worse than no venv: it looks present, so the next run
# skips creation and fails on the missing pip. Treat "no pip" as "not a venv".
# This happens on base images that ship python3 without the python3-venv package
# (ensurepip), where `python3 -m venv` still produces a bin/ directory.
# The venv also lives in the workspace, so it outlives a container rebuild: one
# made against an interpreter the new image no longer has still looks present
# but cannot run. Treat "interpreter will not start" as "not a venv" too.
if [ ! -x "$VENV/bin/pip" ] || ! "$VENV/bin/python" -c "" >/dev/null 2>&1; then
  if [ -d "$VENV" ]; then
    echo "Recreating incomplete dashboard virtualenv..."
    rm -rf "$VENV"
  else
    echo "Creating dashboard virtualenv..."
  fi

  if ! python3 -m venv "$VENV" 2>/dev/null || [ ! -x "$VENV/bin/pip" ]; then
    # ensurepip is missing. Install it if we can, otherwise bootstrap pip by
    # hand so the cockpit still starts on a container we cannot apt-get on.
    rm -rf "$VENV"
    echo "python3-venv is unavailable; installing it..."
    if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
      sudo apt-get update -qq && sudo apt-get install -y -qq python3-venv python3-pip
    fi

    python3 -m venv "$VENV" 2>/dev/null || python3 -m venv --without-pip "$VENV"

    if [ ! -x "$VENV/bin/pip" ]; then
      echo "Bootstrapping pip via get-pip..."
      curl -fsSL https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py \
        && "$VENV/bin/python" /tmp/get-pip.py --quiet
      rm -f /tmp/get-pip.py
    fi
  fi

  if [ ! -x "$VENV/bin/pip" ]; then
    echo "Could not create a working Python environment for the dashboard." >&2
    echo "Install python3-venv in the container, then run this script again." >&2
    exit 1
  fi
fi

# Quiet unless something is actually missing, so repeated attaches stay fast.
if ! "$VENV/bin/python" -c "import fastapi, uvicorn, httpx, yaml" >/dev/null 2>&1; then
  echo "Installing dashboard dependencies..."
  "$VENV/bin/pip" install --quiet --upgrade pip
  "$VENV/bin/pip" install --quiet -r "$COCKPIT_DIR/requirements.txt"
fi

echo "Starting the Solace Workshop Dashboard on port $PORT..."
cd "$REPO_ROOT"
# The graceful-shutdown timeout matters because the page holds log websockets
# open. Without it a stopped cockpit waits on them forever: it stops listening
# but keeps running, and a browser tab still connected to it can start apps
# the new cockpit never sees.
nohup "$VENV/bin/python" -m uvicorn cockpit.app.main:app \
  --host "${COCKPIT_HOST:-0.0.0.0}" --port "$PORT" \
  --timeout-graceful-shutdown 3 \
  >> "$LOG" 2>&1 &

# Give uvicorn a moment, then confirm rather than claiming success blindly.
for _ in $(seq 1 20); do
  if curl -sf "http://localhost:$PORT/api/env" >/dev/null 2>&1; then
    echo ""
    echo "Dashboard is ready: http://localhost:$PORT"
    echo "Logs:               $LOG"
    exit 0
  fi
  sleep 0.5
done

echo "Dashboard did not come up. Last 20 log lines:" >&2
tail -20 "$LOG" >&2
exit 1
