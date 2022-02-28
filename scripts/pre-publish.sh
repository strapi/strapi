#!/bin/bash

# Force start from root folder
cd "$(dirname "$0")/.."

set -e

version=""
distTag=""

echo "Please enter the version you want to publish"
read -r version


echo "Please enter the dist-tag you want to publish with"
read -r distTag

# publish packages
./node_modules/.bin/lerna publish --no-push --no-git-tag-version --force-publish --exact  "$version" --dist-tag "$distTag"
