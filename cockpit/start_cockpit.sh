#!/bin/bash
#
# Start the workshop cockpit.
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
  echo "Cockpit already running at http://localhost:$PORT"
  exit 0
fi

# A venv without pip is worse than no venv: it looks present, so the next run
# skips creation and fails on the missing pip. Treat "no pip" as "not a venv".
# This happens on base images that ship python3 without the python3-venv package
# (ensurepip), where `python3 -m venv` still produces a bin/ directory.
if [ ! -x "$VENV/bin/pip" ]; then
  if [ -d "$VENV" ]; then
    echo "Recreating incomplete cockpit virtualenv..."
    rm -rf "$VENV"
  else
    echo "Creating cockpit virtualenv..."
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
    echo "Could not create a working Python environment for the cockpit." >&2
    echo "Install python3-venv in the container, then run this script again." >&2
    exit 1
  fi
fi

# Quiet unless something is actually missing, so repeated attaches stay fast.
if ! "$VENV/bin/python" -c "import fastapi, uvicorn, httpx, yaml" >/dev/null 2>&1; then
  echo "Installing cockpit dependencies..."
  "$VENV/bin/pip" install --quiet --upgrade pip
  "$VENV/bin/pip" install --quiet -r "$COCKPIT_DIR/requirements.txt"
fi

echo "Starting cockpit on port $PORT..."
cd "$REPO_ROOT"
nohup "$VENV/bin/python" -m uvicorn cockpit.app.main:app \
  --host "${COCKPIT_HOST:-0.0.0.0}" --port "$PORT" \
  >> "$LOG" 2>&1 &

# Give uvicorn a moment, then confirm rather than claiming success blindly.
for _ in $(seq 1 20); do
  if curl -sf "http://localhost:$PORT/api/env" >/dev/null 2>&1; then
    echo ""
    echo "Cockpit is ready:  http://localhost:$PORT"
    echo "Logs:              $LOG"
    exit 0
  fi
  sleep 0.5
done

echo "Cockpit did not come up. Last 20 log lines:" >&2
tail -20 "$LOG" >&2
exit 1
