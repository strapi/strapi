## disable EE if options not set
if [[ -z "$RUN_EE" ]]; then
  export STRAPI_DISABLE_EE=true
else
  export STRAPI_DISABLE_LICENSE_PING=true
fi

appPath='test-apps/api'
export ENV_PATH="$(pwd)/$appPath/.env"
export JWT_SECRET="aSecret"

opts=($DB_OPTIONS)

yarn run -s build:ts
yarn run -s test:generate-app "${opts[@]}" --appPath "$appPath" --template ''
yarn run -s test:api --no-generate-app
