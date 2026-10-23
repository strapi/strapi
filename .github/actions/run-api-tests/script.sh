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

node --test \
  tests/scripts/__tests__/resolve-database-config.test.js \
  tests/scripts/__tests__/database-assurance.test.js \
  tests/api/utils/__tests__/raw-rows.test.js || exit 1

# Expected client comes from raw DB_OPTIONS (--dbclient), not from the generator or the app.
node tests/scripts/verify-api-database-client.js expected || exit 1
yarn run test:generate-app:no-build --appPath=test-apps/api "${opts[@]}" || exit 1
node tests/scripts/verify-api-database-client.js generated || exit 1
node tests/scripts/verify-api-database-client.js runtime || exit 1
yarn run test:api --no-generate-app "${jestOptions[@]}"
