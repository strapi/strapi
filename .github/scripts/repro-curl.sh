#!/usr/bin/env bash
# Localhost-only curl wrapper for AI issue reproduction.
# Only an allowlist of curl options is accepted so the agent cannot add extra URLs,
# proxies, config files, output files, or read local files into request bodies.
set -euo pipefail

usage() {
  cat >&2 <<'EOF'
Usage: repro-curl.sh <url> [options...]

<url> must be http://localhost[:port][/path] or http://127.0.0.1[:port][/path]

Allowed options:
  -X, --request <method>
  -H, --header <header>
  -d, --data, --data-raw, --json <body>    (values starting with @ are rejected)
  -G, --get
  -I, --head
  -i, --include
  -v, --verbose
EOF
  exit 1
}

if [[ "$#" -lt 1 ]]; then
  usage
fi

url="$1"
shift

if ! [[ "$url" =~ ^http://(localhost|127\.0\.0\.1)(:[0-9]{1,5})?(/[^[:space:]]*)?$ ]]; then
  echo "blocked: only http://localhost and http://127.0.0.1 URLs are allowed" >&2
  exit 1
fi

args=()
while [[ "$#" -gt 0 ]]; do
  opt="$1"
  shift
  case "$opt" in
    -X | --request | -H | --header)
      [[ "$#" -ge 1 ]] || usage
      if [[ "$1" == @* ]]; then
        echo "blocked: reading option values from files is not allowed" >&2
        exit 1
      fi
      args+=("$opt" "$1")
      shift
      ;;
    -d | --data | --data-raw | --json)
      [[ "$#" -ge 1 ]] || usage
      if [[ "$1" == @* ]]; then
        echo "blocked: reading request bodies from files is not allowed" >&2
        exit 1
      fi
      args+=("--data-raw" "$1")
      if [[ "$opt" == "--json" ]]; then
        args+=("-H" "Content-Type: application/json" "-H" "Accept: application/json")
      fi
      shift
      ;;
    -G | --get | -I | --head | -i | --include | -v | --verbose)
      args+=("$opt")
      ;;
    *)
      echo "blocked: curl option not allowed: $opt" >&2
      usage
      ;;
  esac
done

exec curl --silent --show-error --globoff --noproxy '*' --proto '=http' --max-redirs 0 \
  --max-time 60 "${args[@]}" -- "$url"
