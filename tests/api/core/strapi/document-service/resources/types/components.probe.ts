/**
 * Compile-time probe for ./components.d.ts.
 *
 * Type-only: there is no runtime here and nothing imports this module. Its job is to fail
 * `tsc` if the hand-written component declarations stop being enforceable.
 *
 * Why this exists: the declarations previously used the legacy `Schema.Component` +
 * top-level `Attribute` form, which no longer resolves against `@strapi/types`. Under
 * `skipLibCheck` (the default for `.d.ts`) those errors were dropped and every interface
 * degraded to `any`, so `Required` markers were inert — TypeScript happily accepted values
 * the runtime fixture rejects. Nothing caught that on its own: `tests/api` runs through SWC
 * (transpile-only) and is not part of any Nx `test:ts*` project.
 *
 * The assertions below go through `Schema.RequiredAttributeNames`, which resolves a UID via
 * the `ComponentSchemas` augmentation and then reads the `Required` markers. That single
 * path covers all three ways this fixture has drifted: a broken import/extends clause
 * (attributes degrade to `any`), a UID key that does not match the `<category>.<filename>`
 * the loader derives, and a missing or spurious `Required` marker.
 *
 * CI runs this: the `typescript` job's "TSC for test fixtures" step invokes
 * `yarn test:ts:fixtures` (`tests/scripts/typecheck-fixtures.js`), which compiles this file
 * with `--skipLibCheck false` and fails on any diagnostic in this directory. That flag is
 * required — the degradation above shows up as TS2312/TS2305 *inside the `.d.ts`*, which
 * `skipLibCheck` drops by design — and the runner filters out the unrelated pre-existing
 * errors that the same flag surfaces inside `@strapi/types`' own `dist`.
 *
 * To run it directly:
 *   yarn test:ts:fixtures
 */
import type { Schema } from '@strapi/types';

import type {} from './components';

/** Fails to compile unless `Actual` and `Expected` are the same type. */
type Exact<Actual, Expected> = [Actual] extends [Expected]
  ? [Expected] extends [Actual]
    ? true
    : { error: 'type mismatch'; actual: Actual; expected: Expected }
  : { error: 'type mismatch'; actual: Actual; expected: Expected };

const assertExact = <Actual, Expected>(_check: Exact<Actual, Expected> & true): void => {};

// `article.comp` declares exactly one required leaf: `text` (note is optional).
// This is the marker component-replacement.test.api.ts relies on when it asserts that an
// id-less component on update is a create rather than a patch.
assertExact<Schema.RequiredAttributeNames<'article.comp'>, 'text'>(true);

// `article.dz-comp` declares exactly one required leaf: `name` (media is optional).
// Same role for the dynamic-zone replacement case.
assertExact<Schema.RequiredAttributeNames<'article.dz-comp'>, 'name'>(true);

// A component with no required leaves must resolve to `never`, not `any`/`string`. Without
// this, a fixture degraded to `any` would still satisfy the two assertions above.
assertExact<Schema.RequiredAttributeNames<'article.dz-other-comp'>, never>(true);
