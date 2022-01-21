## disable EE if options not set
if [[ -z "$RUN_EE" ]]; then
  export STRAPI_DISABLE_EE=true
fi

export ENV_PATH="$(pwd)/testApp/.env"

opts=($DB_OPTIONS)

yarn run -s test:generate-app "${opts[@]}" $@
yarn run -s test:e2e
