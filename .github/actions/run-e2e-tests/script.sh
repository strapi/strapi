## disable EE if options not set
if [[ -z "$RUN_EE" ]]; then
  export STRAPI_DISABLE_EE=true
else
  export STRAPI_DISABLE_LICENSE_PING=true
fi

jestOptions=($JEST_OPTIONS)

# TODO: this is a temp measure to test the e2e CI failures on webkit
# Define the test suites to run
declare -a testSuites=(
  "content-manager tests/e2e/tests/content-manager/history.spec.ts"
  "content-type-builder tests/e2e/tests/content-type-builder/single-type/create-single-type.spec.ts"
  "content-type-builder tests/e2e/tests/content-type-builder/collection-type/create-collection-type.spec.ts"
)

# Run each test suite
for suite in "${testSuites[@]}"; do
  IFS=' ' read -r -a suiteParams <<< "$suite"
  domain=${suiteParams[0]}
  testFile=${suiteParams[1]}
  echo "Running test suite: $testFile"
  yarn test:e2e --setup --domains=$domain -- $testFile
done
