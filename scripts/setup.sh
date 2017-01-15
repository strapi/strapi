#!/bin/sh
set -e

GREEN='\033[0;32m'
NC='\033[0m' # No Color

rm -f /usr/local/bin/strapi.js # Remove existing binary
echo "${GREEN}Installing dependencies..."
npm install
echo "${GREEN}Bootstraping packages and building dashboard...${NC}"
echo "This can take few minutes (2-3)"
node node_modules/lerna/bin/lerna bootstrap
echo "${GREEN}Linking Strapi CLI...${NC}"
cd packages/strapi
npm link
