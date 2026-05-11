## disable EE if options not set
if [[ -z "$RUN_EE" ]]; then
  export STRAPI_DISABLE_EE=true
else
  export STRAPI_DISABLE_LICENSE_PING=true
fi

export ENV_PATH="$(pwd)/test-apps/api/.env"
export JWT_SECRET="aSecret"

opts=($DB_OPTIONS)
jestOptions=($JEST_OPTIONS)

perfArgs=()
if [[ "${RUN_PERF_ARTIFACTS:-}" == "1" ]]; then
  perfArgs+=(--perf-artifacts)
  if [[ -n "${PERF_ARTIFACT_SUFFIX:-}" ]]; then
    perfArgs+=(--perf-artifact-suffix "${PERF_ARTIFACT_SUFFIX}")
  fi
fi

yarn run test:generate-app:no-build --appPath=test-apps/api "${opts[@]}"
yarn run test:api --no-generate-app "${perfArgs[@]}" "${jestOptions[@]}"
