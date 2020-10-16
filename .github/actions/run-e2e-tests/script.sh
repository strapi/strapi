## disable EE if options not set
if [[ -z "$RUN_EE" ]]; then
  export STRAPI_DISABLE_EE=true
fi

opts=($DB_OPTIONS)

yarn run -s test:generate-app "${opts[@]}" $@
yarn run -s test:start-app &
wait-on http://localhost:1337
yarn run -s test:e2e
