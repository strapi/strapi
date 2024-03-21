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

pnpm test:generate-app:no-build --appPath=test-apps/api "${opts[@]}"
pnpm test:api --no-generate-app "${jestOptions[@]}"
