# simple strapi command tests

These are the CLI tests for the simple strapi commands that aren't covered by another test domain

## Update OpenAPI snapshots (`openapi-generate.test.cli.ts`)

The `openapi:generate` test compares the generated OpenAPI document to a **Jest snapshot** (`strapi/__snapshots__/openapi-generate.test.cli.ts.snap`). Volatile datetime `default` values are normalized in the test, but any intentional change to the CLI test app template, plugins, content-types, or to the OpenAPI generator will usually require **regenerating that snapshot**.

### When you need to update

- You changed `tests/app-template` (or anything that affects how `test-apps/cli/test-app-0` is built).
- You intentionally changed `@strapi/openapi` or the `strapi openapi generate` command and expect different JSON output.

### Steps (from the repository root)

1. **Recreate the CLI test app** if the template or setup inputs changed (otherwise the on-disk app may not match what CI uses):

   ```bash
   yarn test:cli:clean
   yarn test:cli --setup
   ```

   You can omit `test:cli:clean` if you only need to refresh snapshots and the test app is already up to date.

2. **Regenerate the snapshot** with Jest’s update flag. The CLI runner sets `TEST_APPS` and `JWT_SECRET`; you must pass the same when running Jest alone:

   ```bash
   TEST_APPS="$PWD/test-apps/cli/test-app-0" JWT_SECRET=test-jwt-secret \
     npx jest \
       --config jest.config.cli.js \
       --rootDir tests/cli/tests/strapi \
       tests/cli/tests/strapi/strapi/openapi-generate.test.cli.ts \
       -u
   ```

3. **Review the diff** in `tests/cli/tests/strapi/strapi/__snapshots__/openapi-generate.test.cli.ts.snap` and commit it with your intentional product or template change.

If you skip step 1 after a template edit, you may update the snapshot against a stale `test-app-0` and get a surprise failure in CI.

## Update list snapshots

To update the \*:list command snapshots:

- go to `cd test-apps/cli/test-app-0`
- run `yarn install` to add project to workspace; do not commit any changes to yarn.lock
- run the command this test is for (for example, `yarn strapi routes:list`)
- if output looks as expected, copy and paste it to the test string
  - backslashes (\\) must be manually escaped with another backslash (\\)
  - comparison only checks for the existence of each trimmed line that contains alphanumeric characters, so order and whitespace _outside_ of the boxes will not matter. Whitespace _within_ the boxes may be compared.
- you may need to run `yarn test:clean` before tests can run again
