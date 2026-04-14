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
cd util
git clone https://github.com/Chaymee/workshop-participation-tracking.git
cd workshop-participation-tracking/
git checkout origin/auto-tracking
npm i
npm run compile
yes | npx @vscode/vsce package --allow-missing-repository
mv workshop-tracker-*.vsix ../../.devcontainer/extensions/workshop-tracker.vsix