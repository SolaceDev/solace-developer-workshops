#!/bin/bash

# Start timer
START_TIME=$(date +%s)
echo "============================================"
echo "Starting environment configuration..."
echo "============================================"

# Download and extract Python 3.12
sudo apt update
sudo apt install --reinstall -y software-properties-common python3-apt
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install -y python3.12 python3.12-venv

# Install latest Go version
echo "Installing latest Go version..."
# Get the latest version
LATEST_GO_VERSION=$(curl -s https://go.dev/VERSION?m=text | head -n 1)
echo "Latest Go version: $LATEST_GO_VERSION"
wget "https://go.dev/dl/${LATEST_GO_VERSION}.linux-amd64.tar.gz"
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf "${LATEST_GO_VERSION}.linux-amd64.tar.gz"
rm "${LATEST_GO_VERSION}.linux-amd64.tar.gz"
echo "export PATH=\$PATH:/usr/local/go/bin" >> ~/.bashrc
echo "export GOPATH=\$HOME/go" >> ~/.bashrc
echo "export PATH=\$PATH:\$GOPATH/bin" >> ~/.bashrc
mkdir -p "$HOME/go/bin" "$HOME/go/src" "$HOME/go/pkg"
echo "Go installation complete"
go version

# Install the SAM cli executable
echo "Installing SAM CLI..."
curl -L https://g2jfozjqkgk2panxywclpovlha0glkqu.lambda-url.us-east-2.on.aws/ -o "$HOME/go/bin/sam" && chmod +x "$HOME/go/bin/sam"

# Run registration script
bash util/register.sh

# Run broker setup script
echo "Setting up Solace broker..."
bash setup_broker.sh

# End timer and calculate duration
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo "============================================"
echo "Environment configuration complete!"
echo "Total execution time: ${DURATION} seconds"
echo "============================================"

