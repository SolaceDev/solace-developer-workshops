#!/bin/bash
git clone https://github.com/Chaymee/workshop-participation-tracking.git
cd workshop-participation-tracking/
git checkout origin/auto-tracking
npm i
npm run compile
yes | npx @vscode/vsce package --allow-missing-repository
code --install-extension workshop-tracker-1.0.0.vsix