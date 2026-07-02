#!/usr/bin/env bash
set -euo pipefail

## disable EE if options not set
if [[ -z "${RUN_EE:-}" ]]; then
  export STRAPI_DISABLE_EE=true
else
  export STRAPI_DISABLE_LICENSE_PING=true
fi

export ENV_PATH="$(pwd)/test-apps/api/.env"
export JWT_SECRET="aSecret"

opts=($DB_OPTIONS)

if [[ "${SCOPE:-full}" == 'selective' && -n "${TEST_FILES:-}" ]]; then
  jestOptions=($TEST_FILES)
  echo "Running selective API tests: ${TEST_FILES}"
else
  jestOptions=($JEST_OPTIONS)
fi

if [[ "${SCOPE:-full}" == 'selective' && ${#jestOptions[@]} -eq 0 ]]; then
  echo 'Selective API scope requested but no test files were provided.'
  exit 1
fi

yarn run test:generate-app:no-build --appPath=test-apps/api "${opts[@]}"
yarn run test:api --no-generate-app "${jestOptions[@]}"
