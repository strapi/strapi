#!/bin/bash

# Set up nvm
export NVM_DIR=/Users/ben/.nvm
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Use Node.js 20
nvm use 20 >/dev/null 2>&1

# Change to the project directory
cd /Users/ben/dev/strapi/strapi-v5/examples/getstarted

# Start the MCP server
/Users/ben/.yarn/bin/yarn strapi mcp --endpoint http://localhost:4001/mcp 