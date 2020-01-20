#!/bin/bash

# Force start from root folder
cd "$(dirname "$0")/.."

set -e

version=""

echo "Please enter the version you want to publish"
read -r version

# publish packages
./node_modules/.bin/lerna publish --no-push --dist-tag beta --exact "$version"

# push master branch
git push origin master

# push tag
git push origin v"$version"

# set latest dist-tag on npm
lerna exec --stream --no-bail --no-private -- npm dist-tag add '${LERNA_PACKAGE_NAME}'@"$version" latest

# run changelog cli
npx @sclt/program-changelog
