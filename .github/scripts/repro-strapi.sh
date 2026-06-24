#!/usr/bin/env bash
# Run strapi CLI from the issue-repro test app only.
set -euo pipefail

APP_DIR="${GITHUB_WORKSPACE}/test-apps/issue-repro"

if [ ! -d "$APP_DIR" ]; then
  echo "issue-repro app not found at ${APP_DIR}" >&2
  exit 1
fi

if [ "$#" -lt 1 ]; then
  echo "Usage: repro-strapi.sh <strapi subcommand> [args...]" >&2
  exit 1
fi

cd "$APP_DIR"
exec yarn strapi "$@"
