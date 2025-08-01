#!/bin/bash

# Force start from root folder
cd "$(dirname "$0")/.."

set -e

version=$VERSION
distTag=$DIST_TAG
preid=$PREID

if [[ -z "$version" ]]; then
  echo "Please enter the version you want to publish"
  read -r version
fi

if [[ -z "$distTag" ]]; then
  echo "Please enter the dist-tag you want to publish with"
  read -r distTag
fi

# Ensure GitHub token is available
if [[ -z "$GITHUB_TOKEN" ]]; then
  echo "Error: GITHUB_TOKEN environment variable is not set."
  exit 1
fi

preid_arg=""
if [[ "$VERSION" == pre* && "$preid" != "latest" && -n "$preid" ]]; then
  preid_arg="--preid $preid"
fi


# Configure Git
git config --global user.name "${GITHUB_ACTOR}"
git config --global user.email "${GITHUB_ACTOR}@users.noreply.github.com"

# publish packages
GITHUB_TOKEN=$GITHUB_TOKEN yarn release --version "$version" --tag "$distTag" --dry-run false $preid_arg "$@"
