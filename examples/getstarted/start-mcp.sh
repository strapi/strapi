#!/bin/bash

# Get the directory where this script is located (not where it's called from)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Set up nvm (try common locations)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    . "$NVM_DIR/nvm.sh"
elif [ -s "/usr/local/nvm/nvm.sh" ]; then
    export NVM_DIR="/usr/local/nvm"
    . "$NVM_DIR/nvm.sh"
fi

# Use Node.js 20
nvm use 20 >/dev/null 2>&1

# Change to the project directory (where the script is located)
cd "$SCRIPT_DIR"

# Start the MCP server
yarn strapi mcp --endpoint http://localhost:4001/mcp 