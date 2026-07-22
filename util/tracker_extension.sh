#!/bin/bash
# Set dynamic workshop name in workspace settings
WORKSHOP_NAME="$(date +%B)SAMWorkshop$(date +%Y)"
SETTINGS_FILE="/workspaces/solace-developer-workshops/.vscode/settings.json"
jq --arg name "$WORKSHOP_NAME" '. + {"workshopTracker.workshopName": $name}' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
echo "Workshop name set to: ${WORKSHOP_NAME}"
