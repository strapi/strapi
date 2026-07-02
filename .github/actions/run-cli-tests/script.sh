#!/usr/bin/env bash
set -euo pipefail

if [[ "${SCOPE:-full}" == 'selective' && -n "${TEST_FILES:-}" ]]; then
  runnerArgs=(--setup --concurrency=1)

  if [[ -n "${CLI_DOMAINS:-}" ]]; then
    for domain in $CLI_DOMAINS; do
      runnerArgs+=(-d "$domain")
    done
  fi

  # shellcheck disable=SC2206
  fileArgs=($TEST_FILES)
  echo "Running selective CLI tests: ${TEST_FILES}"
  yarn test:cli "${runnerArgs[@]}" -- "${fileArgs[@]}"
elif [[ "${SCOPE:-full}" == 'selective' ]]; then
  echo 'Selective CLI scope requested but no test files were provided.'
  exit 1
else
  yarn test:cli
fi
