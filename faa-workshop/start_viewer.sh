#!/bin/bash

# Start Data Viewer Script
# This script navigates to the data_viewer directory, installs dependencies, and starts the dev server

set -e  # Exit on error

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}FAA Workshop Data Viewer Startup${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DATA_VIEWER_DIR="$SCRIPT_DIR/data_viewer"

# Check if data_viewer directory exists
if [ ! -d "$DATA_VIEWER_DIR" ]; then
    echo -e "${RED}Error: data_viewer directory not found at $DATA_VIEWER_DIR${NC}"
    exit 1
fi

# Navigate to data_viewer directory
echo -e "${BLUE}Navigating to data_viewer directory...${NC}"
cd "$DATA_VIEWER_DIR"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found in $DATA_VIEWER_DIR${NC}"
    exit 1
fi

# Install dependencies
echo ""
echo -e "${GREEN}Installing dependencies...${NC}"
npm install

# Start the dev server
echo ""
echo -e "${GREEN}Starting development server...${NC}"
echo -e "${BLUE}The data viewer will be available at the URL shown below${NC}"
echo ""
npm run dev
