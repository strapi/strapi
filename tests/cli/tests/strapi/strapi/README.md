# simple strapi command tests

These are the CLI tests for simple `strapi` commands that are not covered by another test domain.

## Jest snapshots

### OpenAPI (`openapi-generate.test.cli.ts`)

The `openapi:generate` test compares the generated OpenAPI document to a **Jest snapshot** (`strapi/__snapshots__/openapi-generate.test.cli.ts.snap`). Volatile datetime `default` values are normalized in the test, but any intentional change to the CLI test app template, plugins, content-types, or to the OpenAPI generator will usually require **regenerating that snapshot**.

#### When you need to update

- You changed `tests/app-template` (or anything that affects how `test-apps/cli/test-app-0` is built).
- You intentionally changed `@strapi/openapi` or the `strapi openapi generate` command and expect different JSON output.

#### Steps (from the repository root)

1. **Recreate the CLI test app** if the template or setup inputs changed (otherwise the on-disk app may not match what CI uses):

   ```bash
   yarn test:cli:clean
   yarn test:cli --setup
   ```

   You can omit `test:cli:clean` if you only need to refresh snapshots and the test app is already up to date.

2. **Regenerate the snapshot** with Jest’s update flag.

   **Using the CLI test runner** (recommended; it sets `TEST_APPS`, `JWT_SECRET`, and yalc like a normal run):

   ```bash
   yarn test:cli -d strapi -u -- --testPathPattern=openapi-generate
   ```

   Or run all snapshot tests in every domain: `yarn test:cli:update` (same as `yarn test:cli -u`).

   **Using Jest alone:** the runner sets `TEST_APPS` and `JWT_SECRET`; you must pass the same when running Jest directly:

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

### Other snapshot tests

Several tests in this folder commit **Jest snapshot** files under `__snapshots__/`. Treat a snapshot failure after an intentional change like a failing assertion: either fix the product, or regenerate the snapshot with `jest … -u` and review the diff before committing.

**Kinds of output**

- **OpenAPI / JSON** — generated specification documents are snapshotted (with normalization for values that would change on every run, such as certain datetime defaults).
- **CLI table / list output** — tests whose filenames match `*list*.test.cli.js` snap normalized stdout (see `normalizeCliOutputForSnapshot` in `tests/utils/helpers.js`: strip ANSI, trim lines, drop noisy log lines, etc.).

**When to refresh the CLI test app**

If you changed `tests/app-template` or anything else that changes how `test-apps/cli/test-app-0` is produced, recreate the app before updating snapshots, or CI may disagree with your machine:

```bash
yarn test:cli:clean
yarn test:cli --setup
```

You can skip `test:cli:clean` if the app is already current and you only need to refresh snapshots.

**Regenerating snapshots**

From the repo root, `yarn test:cli -u` (or `yarn test:cli:update`) forwards `-u` to Jest. Narrow the run with domains and extra Jest args after `--`:

```bash
yarn test:cli -d strapi -u -- --testPathPattern='openapi-generate'
```

The CLI runner sets `TEST_APPS` and `JWT_SECRET`. If you use **Jest alone** instead, pass the same env vars:

```bash
TEST_APPS="$PWD/test-apps/cli/test-app-0" JWT_SECRET=test-jwt-secret \
  npx jest \
    --config jest.config.cli.js \
    --rootDir tests/cli/tests/strapi \
    -u
```

Limit to one file or pattern if you prefer, for example `--testPathPattern='openapi-generate'` or `--testPathPattern='list\\.test\\.cli\\.js'`.

Always review `.snap` diffs with your change.
