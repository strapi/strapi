#!/bin/bash

# Force start from root folder
cd "$(dirname "$0")/.."

set -e

version=$VERSION
distTag=$DIST_TAG

if [[ -z "$version" ]]; then
  echo "Please enter the version you want to publish"
  read -r version
fi

if [[ -z "$distTag" ]]; then
  echo "Please enter the dist-tag you want to publish with"
  read -r distTag
fi

## publish packages
./node_modules/.bin/nx run-many --target=clean --nx-ignore-cycles
./node_modules/.bin/nx run-many --target=build --nx-ignore-cycles --skip-nx-cache
yarn release --version "$version" --tag "$distTag" --git-commit false --git-tag false --changelog false --dry-run false "$@"
