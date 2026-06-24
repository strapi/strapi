#!/usr/bin/env bash
# Localhost-only curl wrapper for AI issue reproduction.
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: repro-curl.sh <url> [curl args...]" >&2
  exit 1
fi

url="$1"
shift

case "$url" in
  http://localhost:* | http://127.0.0.1:*)
    exec curl -sf "$url" "$@"
    ;;
  *)
    echo "blocked: only http://localhost and http://127.0.0.1 URLs are allowed" >&2
    exit 1
    ;;
esac
