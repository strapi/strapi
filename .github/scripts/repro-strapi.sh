#!/usr/bin/env bash
# Run allowlisted strapi CLI subcommands from the issue-repro test app only.
# Subcommands that reach the network (transfer, login, deploy), open a REPL, or write
# files to arbitrary paths are intentionally excluded.
set -euo pipefail

APP_DIR="${GITHUB_WORKSPACE}/test-apps/issue-repro"

ALLOWED_SUBCOMMANDS=(
  version
  report
  routes:list
  content-types:list
  components:list
  controllers:list
  services:list
  policies:list
  middlewares:list
  hooks:list
  admin:create-user
  admin:reset-user-password
)

if [[ ! -d "$APP_DIR" ]]; then
  echo "issue-repro app not found at ${APP_DIR}" >&2
  exit 1
fi

if [[ "$#" -lt 1 ]]; then
  echo "Usage: repro-strapi.sh <subcommand> [args...]" >&2
  echo "Allowed subcommands: ${ALLOWED_SUBCOMMANDS[*]}" >&2
  exit 1
fi

subcommand="$1"
allowed=false
for candidate in "${ALLOWED_SUBCOMMANDS[@]}"; do
  if [[ "$subcommand" == "$candidate" ]]; then
    allowed=true
    break
  fi
done

if [[ "$allowed" != true ]]; then
  echo "blocked: strapi subcommand not allowed: ${subcommand}" >&2
  echo "Allowed subcommands: ${ALLOWED_SUBCOMMANDS[*]}" >&2
  exit 1
fi

cd "$APP_DIR"
exec yarn strapi "$@"
