#!/usr/bin/env bash
## Align with `tests/utils/e2e-edition.ts`: explicit CE vs EE for the whole e2e run.
if [[ "${RUN_EE:-}" == "true" ]]; then
  export STRAPI_E2E_EDITION=ee
  export STRAPI_DISABLE_LICENSE_PING=true
else
  export STRAPI_E2E_EDITION=ce
fi

jestOptions=($JEST_OPTIONS)

domainArgs=()
if [[ -n "${DOMAINS:-}" ]]; then
  # shellcheck disable=SC2206 # deliberate word splitting: DOMAINS is a space separated list
  domainArgs=(--domains ${DOMAINS})
fi

yarn test:e2e --setup --concurrency=1 "${domainArgs[@]}" -- "${jestOptions[@]}"
