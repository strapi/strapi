## disable EE if options not set
if [[ -z "$RUN_EE" ]]; then
  export STRAPI_DISABLE_EE=true
else
  export STRAPI_DISABLE_LICENSE_PING=true
fi

jestOptions=($JEST_OPTIONS)
# TODO: this is a temp measure to test the e2e CI failures on webkit
yarn test:e2e --setup --domains=content-manager -- tests/e2e/tests/content-manager/history.spec.ts
