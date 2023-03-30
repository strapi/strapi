#!/bin/bash

# Force start from root folder
cd "$(dirname "$0")/.."

set -e

distTag=$DIST_TAG

if [[ -z "$distTag" ]]; then
  echo "Please enter the dist-tag you want to remove"
  read -r distTag
fi

# Check if dist tag is latest, beta, alpha or next and reject
if [[ "$distTag" == "latest" || "$distTag" == "beta" || "$distTag" == "alpha" || "$distTag" == "next" ]]; then
  echo "You cannot remove the dist-tag $distTag"
  exit 1
fi

# Get all the packages
packages=$(./node_modules/.bin/lerna ls)

# Loop through the packages
for package in $packages; do
  echo "Removing dist-tag $distTag from $package"
  # Run npm dist-tag rm $distTag
  npm dist-tag rm $package $distTag
done