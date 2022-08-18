#!/bin/bash

# Force start from root folder
cd "$(dirname "$0")/.."

set -e

version=""

echo "Please enter the version you want to publish"
read -r version

# publish packages
./node_modules/.bin/lerna publish --no-push --force-publish --dist-tag latest --exact "$version"

# push main branch
git push origin main

# push tag
git push origin v"$version"

# run changelog cli
npx @sclt/program-changelog
