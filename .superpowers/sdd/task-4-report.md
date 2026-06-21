# Task 4 Report: Integration Test — Local TS Plugin Loads and Serves a Route

## Status: DONE

**Commit:** `77f0f21993` — `test(api): local TS-only plugin loads and serves a route`

---

## Harness Findings

The `tests/api` harness generates a **JavaScript** test app at `test-apps/api/` via `createStrapi(scope)` (no TypeScript compilation step). Key observations:

1. **Generated app is JS-only**: `jsconfig.json` only, no `tsconfig.json`. `distDir === appDir` is set explicitly in `packages/utils/api-tests/strapi.js` lines 35-36.

2. **No fixture seeding mechanism for local plugins**: Unlike the E2E/CLI harness which uses `tests/app-template/`, the API harness generates a blank app with `config/plugins.js = module.exports = () => ({})`. There is no pre-seeding mechanism for local plugin fixtures. The precedent for dynamic fixture injection is the `tests/api/plugins/graphql/cors.test.api.js` test, which writes files to the test app dir during `beforeAll` and restores them in `afterAll`.

3. **`distDir === appDir` implication**: Because `distDir = appDir`, the Task 1 fix (use `strapi.dirs.dist.root` instead of `strapi.dirs.app.root`) has no observable difference in the JS harness — both resolve to the same directory. The distDir ≠ appDir distinction (the production TS case) is covered by the unit test added in Task 1.

4. **What the integration test CAN prove**: The test exercises the full Task 1 code path end-to-end: `require.resolve()` fails for a relative path → falls back to `resolve(strapi.dirs.dist.root, declaration.resolve)` → plugin directory found → `strapi-server.js` loaded → routes registered → HTTP 200. This confirms the integration chain works.

5. **Plugin loader requires `package.json`**: `get-enabled-plugins.ts` line 153 calls `require(join(pathToPlugin, 'package.json'))` unconditionally for declared plugins with a `pathToPlugin`. A minimal `package.json` must be included in the fixture.

6. **Route path and plugin prefix**: Plugin route paths are relative to the plugin's auto-prefix `/${pluginName}`. Setting `path: '/ts-fixture/ping'` in the route combined with prefix `/ts-fixture` yields `/ts-fixture/ts-fixture/ping`. Corrected to `path: '/ping'` → mounted at `/ts-fixture/ping` → content-api prefix adds `/api` → final URL `/api/ts-fixture/ping`.

---

## Fixture + Test Added

**Test file:** `tests/api/core/strapi/loaders/local-ts-plugin.test.api.js`

### Approach

The test uses the `beforeAll` / `afterAll` pattern established by the GraphQL CORS test. It:

1. Writes a fixture plugin to `<testAppDir>/src/plugins/ts-fixture/` with:
   - `package.json` (minimal, with `strapi.kind: 'plugin'`)
   - `strapi-server.js` (plain JS, representing `tsc` output from `strapi-server.ts`)
2. Writes `config/plugins.js` registering the plugin with `resolve: './src/plugins/ts-fixture'`
3. Boots Strapi via `createStrapiInstance()` + `createContentAPIRequest()`
4. Asserts `GET /api/ts-fixture/ping` → 200, body `{ ok: true, lang: 'ts' }`
5. Restores original `config/plugins.js` and removes the fixture dir in `afterAll`

---

## Commands Run

### First run (failed — missing `package.json` in fixture):

```
node tests/scripts/run-api-tests.js --no-generate-app tests/api/core/strapi/loaders/local-ts-plugin.test.api.js
→ FAIL: Cannot find module '.../ts-fixture/package.json'
```

**Fix:** Added `PLUGIN_PACKAGE_JSON_CONTENT` and write it to `package.json` in `beforeAll`.

### Second run (failed — 404, wrong route path):

```
→ FAIL: Expected 200, Received 404
```

**Fix:** Changed route path from `/ts-fixture/ping` to `/ping` (route paths are relative to the plugin's auto-prefix).

### Third run (PASS):

```
node tests/scripts/run-api-tests.js --no-generate-app tests/api/core/strapi/loaders/local-ts-plugin.test.api.js

PASS tests/api/core/strapi/loaders/local-ts-plugin.test.api.js
  Local plugin loading (simulates compiled TS-only plugin)
    ✓ GET /api/ts-fixture/ping returns 200 with expected body (16 ms)

Tests: 1 passed, 1 total
Time: 2.822 s
```

---

## Files Changed

- `tests/api/core/strapi/loaders/local-ts-plugin.test.api.js` — new file (169 lines)

---

## Self-Review

**What the test proves:**

- The Task 1 code path (`require.resolve()` fails → `resolve(strapi.dirs.dist.root, declaration.resolve)`) works end-to-end
- A locally-registered plugin with a relative `resolve` path loads and serves a route
- Cleanup is correct: plugins.js restored, fixture dir removed

**What it does NOT prove (and why not):**

- TypeScript source directly: the harness is a JS app with `distDir === appDir`, so we can't run `tsc` compilation as part of the test. The TS-specific path (distDir ≠ appDir) is covered by the unit test in Task 1.
- The tsconfig fix from Task 2: that fix applies to `create-strapi-app` templates, not to the test harness.

**Design choice rationale:**
The brief says "keep the fixture server-only (no admin)" — fulfilled: `strapi-server.js` only, no `strapi-admin` file. The fixture `package.json` is marked `strapi.kind: 'plugin'` to match real-world usage, but since `isStrapiPlugin` only conditionally enriches `info`, this is not load-bearing for the test assertion.

---

## Concerns

1. **Limited TS-path proof**: The integration test proves the end-to-end route-serving, but the critical distDir ≠ appDir distinction is only covered by the unit test (Task 1). A full end-to-end proof would require a TS app + `tsc` compile step in the harness, which doesn't currently exist. This is a harness limitation, not a test limitation.

2. **Leftover `src/plugins/` dir**: The test creates `<appDir>/src/plugins/ts-fixture/` and removes `ts-fixture/` but leaves the parent `src/plugins/` dir (empty). This is harmless for parallel/sequential test runs since the dir is empty and no other test touches it.

3. **Shared test app mutation**: Multiple tests could conflict if they all write to `config/plugins.js` simultaneously. Since Jest runs API tests with `--runInBand`, this is safe. Still, the dynamic file-writing pattern is an antipattern; future tests may want a per-test Strapi instance with a dedicated app dir.

---

## Review Fix Report (applied after initial commit 77f0f21993)

### Changes Applied

1. **File renamed:** `local-ts-plugin.test.api.js` → `local-plugin-resolve.test.api.js` (via `git mv` to preserve history; git shows `RM` rename+modified).

2. **Labeling corrected:** `describe` title changed to `'Local plugin registered via relative resolve path loads and serves a route'`; test title updated to `'GET /api/local-fixture/ping returns 200 with expected body'`. All "TS"/"simulates compiled TS-only plugin" wording removed. File-level JSDoc updated to plainly state the harness is JS-only, what this test guards, and that the TS compile→dist→load path is covered by the Task 1 unit test and manual smoke — not by this test.

3. **Deceptive `lang: 'ts'` removed:** Fixture body and assertion both changed to `lang: 'js'`. Plugin name/identifiers renamed from `ts-fixture` to `local-fixture` for consistency.

4. **Cleanup leak fixed:** Added `srcPluginsDirCreatedByTest` boolean recorded in `beforeAll` (checks if `src/plugins` pre-exists). In `afterAll`, after removing the fixture dir, `src/plugins` is removed only if this test created it AND it is now empty. Since the test app already had `src/plugins/`, the flag is `false` and the parent dir is preserved — confirmed below.

5. **`createContentAPIRequest` awaited:** Changed to `rq = await createContentAPIRequest(...)` matching sibling test pattern (e.g. `single-type.test.api.js` line 32).

### Test Command and Output

```
yarn test:api --no-generate-app --testPathPattern="local-plugin-resolve"

PASS tests/api/core/strapi/loaders/local-plugin-resolve.test.api.js
  Local plugin registered via relative resolve path loads and serves a route
    ✓ GET /api/local-fixture/ping returns 200 with expected body (19 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Time:        3.293 s
```

### Cleanup Verification

After test run, `test-apps/api/src/` contains:

```
admin/  api/  components/  extensions/  plugins/  index.js
```

`src/plugins/` is present (pre-existed, not touched) and empty (no leftover `local-fixture/` dir). Cleanup is clean.

### Concerns

None beyond those noted in the original report. The rename preserves git history via `git mv`.
