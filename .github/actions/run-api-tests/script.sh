## disable EE if options not set
if [[ -z "$RUN_EE" ]]; then
  export STRAPI_DISABLE_EE=true
else
  export STRAPI_DISABLE_LICENSE_PING=true
fi

export ENV_PATH="$(pwd)/test-apps/api/.env"
export JWT_SECRET="aSecret"

opts=($DB_OPTIONS)

yarn nx run-many --target=build:ts --nx-ignore-cycles --skip-nx-cache
yarn run test:generate-app --appPath=test-apps/api "${opts[@]}"
yarn run test:api --no-generate-app
