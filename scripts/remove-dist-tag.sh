#!/bin/bash

# Force start from root folder
cd "$(dirname "$0")/.."

set -e

distTag=$DIST_TAG

# trim distTag for whitespace at the start and end
distTag=$(echo "$distTag" | xargs)

if [[ -z "$distTag" ]]; then
  echo "Please enter the dist-tag you want to remove"
  read -r distTag
fi

# Check if dist tag is latest, beta, alpha or next and reject
if [[ "$distTag" == "latest" || "$distTag" == "beta" || "$distTag" == "alpha" || "$distTag" == "next" ]]; then
  echo "You cannot remove the dist-tag $distTag"
  exit 1
fi

# Run npm dist-tag rm $distTag on each package
./node_modules/.bin/lerna exec --no-private --stream -- "npm dist-tag rm \$LERNA_PACKAGE_NAME $distTag"
