#!/usr/bin/env bash
# Installs the Strapi Enterprise plugins in the given directory, for the enterprise-plugins e2e
# domain: the oldest version of each plugin that we support, or the latest one.
# In CI, keep the directory outside the repository, so no cache or artifact can include it.
set -euo pipefail

# The oldest version of each plugin that we support. Raise it only when we drop support for
# older versions.
oldest_supported_enterprise_plugins=(
  @strapi-enterprise/plugin-byok@1.0.0
)

if [[ $# -ne 2 || ("$1" != "oldest" && "$1" != "latest") ]]; then
  echo "Usage: $0 <oldest|latest> <install directory>" >&2
  exit 1
fi

if [[ -z "${STRAPI_LICENSE:-}" ]]; then
  echo "STRAPI_LICENSE is required. It must include the features of the Enterprise plugins." >&2
  exit 1
fi

plugin_versions="$1"
install_directory="$2"

enterprise_plugin_package_specs=()
for oldest_supported_package_spec in "${oldest_supported_enterprise_plugins[@]}"; do
  if [[ "$plugin_versions" == "latest" ]]; then
    enterprise_plugin_package_specs+=("${oldest_supported_package_spec%@*}@latest")
  else
    enterprise_plugin_package_specs+=("$oldest_supported_package_spec")
  fi
done
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
  "${enterprise_plugin_package_specs[@]}"

for package_json_path in "$install_directory"/node_modules/@strapi-enterprise/*/package.json; do
  node --print 'const { name, version } = require(require("path").resolve(process.argv[1])); `${name}@${version}`' \
    "$package_json_path"
done
