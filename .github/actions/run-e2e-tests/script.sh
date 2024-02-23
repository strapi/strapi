## disable EE if options not set
if [[ -z "$RUN_EE" ]]; then
  export STRAPI_DISABLE_EE=true
else
  export STRAPI_DISABLE_LICENSE_PING=true
fi

jestOptions=($JEST_OPTIONS)

yarn test:e2e --setup --concurrency=1 "${jestOptions[@]}"
