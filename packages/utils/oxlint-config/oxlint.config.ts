import { defineConfig } from 'oxlint';

import { back } from './back.ts';
import { base } from './base.ts';
import { front } from './front.ts';
import { tests } from './tests.ts';

/**
 * Strapi's shared Oxlint policy.
 *
 * Oxlint runs once over the whole monorepo, so this is a single composed
 * config rather than per-package files. Per-area differences (back/front/tests)
 * are expressed as `overrides`, because oxlint's `extends` merges only
 * rules/plugins/overrides — not env/globals/settings — and nested configs
 * replace instead of merge. Composing the object here in TS sidesteps that
 * limitation entirely.
 *
 * This package declares `"type": "module"`, so loading this file via
 * `oxlint --config ...` avoids the MODULE_TYPELESS_PACKAGE_JSON warning that a
 * root-level config would trigger (the repo root is CommonJS-default). No
 * `cross-env`/`NODE_NO_WARNINGS` workaround needed.
 */
export default defineConfig({
  ...base,
  settings: {
    react: { version: '18' },
  },
  overrides: [back, front, tests],
});

export { back, base, front, tests };
