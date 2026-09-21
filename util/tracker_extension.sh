#!/bin/bash
# # Install Node.js LTS
echo "Installing Node.js LTS..."
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
NODE_MAJOR=20  # Current LTS version as of 2025
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt-get update
sudo apt-get install -y nodejs
echo "Node.js LTS installation complete"
node --version
npm --version
# Resolve the repo root from this script's own location rather than hardcoding
# a workspace path: the folder name follows the repository, so a hardcoded one
# breaks the moment the repo is renamed or forked.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT_DIR="$REPO_ROOT/.devcontainer/extensions"
TRACKER_DIR="$REPO_ROOT/util/workshop-participation-tracking"

mkdir -p "$EXT_DIR"

# Idempotent: a rebuild reuses the existing checkout instead of failing on clone.
if [ -d "$TRACKER_DIR/.git" ]; then
  git -C "$TRACKER_DIR" fetch origin
else
  rm -rf "$TRACKER_DIR"
  git clone https://github.com/Chaymee/workshop-participation-tracking.git "$TRACKER_DIR"
fi

cd "$TRACKER_DIR"
git checkout origin/auto-tracking
npm i
npm run compile
yes | npx @vscode/vsce package --allow-missing-repository
mv ./workshop-tracker-*.vsix "$EXT_DIR/workshop-tracker.vsix"