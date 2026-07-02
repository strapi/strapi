#!/usr/bin/env bash
set -euo pipefail

## Align with `tests/utils/e2e-edition.ts`: explicit CE vs EE for the whole e2e run.
if [[ "${RUN_EE:-}" == "true" ]]; then
  export STRAPI_E2E_EDITION=ee
  export STRAPI_DISABLE_LICENSE_PING=true
else
  export STRAPI_E2E_EDITION=ce
fi

if [[ "${SCOPE:-full}" == 'selective' && -n "${TEST_FILES:-}" ]]; then
  jestOptions=(--project=chromium)

  if [[ -n "${E2E_DOMAINS:-}" ]]; then
    for domain in $E2E_DOMAINS; do
      jestOptions+=(-d "$domain")
    done
  fi

  # shellcheck disable=SC2206
  fileArgs=($TEST_FILES)
  jestOptions+=("${fileArgs[@]}")
  echo "Running selective E2E tests: ${TEST_FILES}"
elif [[ "${SCOPE:-full}" == 'selective' ]]; then
  echo 'Selective E2E scope requested but no test files were provided.'
  exit 1
else
  jestOptions=($JEST_OPTIONS)
fi

yarn test:e2e --setup --concurrency=1 -- "${jestOptions[@]}"
