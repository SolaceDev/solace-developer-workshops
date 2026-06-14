#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <api_key>"
  exit 1
fi

SETTINGS_FILE="${CONTAINER_WORKSPACE_FOLDER:-.}/.sam/settings.yaml"

if [ ! -f "$SETTINGS_FILE" ]; then
  echo "Error: $SETTINGS_FILE not found"
  exit 1
fi

sed -i "s|<INSER_API_KEY_HERE>|$1|g" "$SETTINGS_FILE"
echo "API key set in $SETTINGS_FILE"
