#!/usr/bin/env bash
# Installs the latest @strapi-enterprise/plugin-byok in the given directory, for the
# enterprise-plugins e2e domain. The plugin code is private: keep the directory outside the
# repository, so no cache or artifact can include it.
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <install directory outside the repository>" >&2
  exit 1
fi

if [[ -z "${STRAPI_LICENSE:-}" ]]; then
  echo "STRAPI_LICENSE is required. It must include the cms-byok-ai feature." >&2
  exit 1
fi

install_directory="$1"
npm_temporary_directory="$(mktemp -d)"
trap 'rm -rf "$npm_temporary_directory"' EXIT

# npm reads the license from the environment, so its value is never written to disk.
# shellcheck disable=SC2016 # npm expands the reference, not the shell
printf '%s\n' \
  '@strapi-enterprise:registry=https://packages.strapi.io/' \
  '//packages.strapi.io/:_authToken=${STRAPI_LICENSE}' \
  > "$npm_temporary_directory/.npmrc"

# A temporary npm cache keeps the plugin out of the npm cache that CI saves.
# Peer dependencies are skipped: Strapi comes from the test app.
npm install \
  --prefix "$install_directory" \
  --userconfig "$npm_temporary_directory/.npmrc" \
  --cache "$npm_temporary_directory/cache" \
  --no-package-lock \
  --legacy-peer-deps \
  --no-audit \
  --no-fund \
  --no-update-notifier \
  @strapi-enterprise/plugin-byok@latest

npm ls --prefix "$install_directory" --all \
  @strapi-enterprise/plugin-byok \
  @strapi-enterprise/ai-workflows
