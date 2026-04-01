# simple strapi command tests

These are the CLI tests for simple `strapi` commands that are not covered by another test domain.

## Jest snapshots

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

The CLI runner sets `TEST_APPS` and `JWT_SECRET`; pass the same when running Jest alone from the **repository root**:

```bash
TEST_APPS="$PWD/test-apps/cli/test-app-0" JWT_SECRET=test-jwt-secret \
  npx jest \
    --config jest.config.cli.js \
    --rootDir tests/cli/tests/strapi \
    -u
```

Limit to one file or pattern if you prefer, for example `--testPathPattern='openapi-generate'` or `--testPathPattern='list\\.test\\.cli\\.js'`.

Always review `.snap` diffs with your change.
