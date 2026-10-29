#!/usr/bin/env bash
# Installs the latest Strapi Enterprise plugins in the given directory, for the
# enterprise-plugins e2e domain. Their code is private: keep the directory outside the
# repository, so no cache or artifact can include it.
set -euo pipefail

enterprise_plugin_packages=(
  @strapi-enterprise/plugin-byok
)

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <install directory outside the repository>" >&2
  exit 1
fi

if [[ -z "${STRAPI_LICENSE:-}" ]]; then
  echo "STRAPI_LICENSE is required. It must include the features of the Enterprise plugins." >&2
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

# A temporary npm cache keeps the plugins out of the npm cache that CI saves.
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
  "${enterprise_plugin_packages[@]/%/@latest}"

for package_json_path in "$install_directory"/node_modules/@strapi-enterprise/*/package.json; do
  node --print 'const { name, version } = require(process.argv[1]); `${name}@${version}`' \
    "$package_json_path"
done
