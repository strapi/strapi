import path from 'node:path';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { getHostAdminModules } from '../core/host-admin-packages';

/**
 * The derived host list and the hand-written imports in `src/admin.ts` must not drift. Drift is the
 * one way the derived list can miss a package
 */
describe('the host admin packages', () => {
  const manifestPath = require.resolve('@strapi/strapi/package.json');
  const packageRoot = path.dirname(manifestPath);

  const derived = () =>
    getHostAdminModules(createRequire(manifestPath), manifestPath).map(({ modulePath }) =>
      modulePath.replace(/\/strapi-admin$/, '')
    );

  // The file re-exports the same packages, so the matches need a dedupe
  const imported = () => [
    ...new Set(
      [
        ...readFileSync(path.join(packageRoot, 'src', 'admin.ts'), 'utf8').matchAll(
          /from '(.+)\/strapi-admin';/g
        ),
      ].map(([, name]) => name)
    ),
  ];

  test('are the same list that src/admin.ts imports', () => {
    expect(derived().sort()).toEqual(imported().sort());
  });

  test('name a directory each, with no build on disk', () => {
    const dirs = getHostAdminModules(createRequire(manifestPath), manifestPath).map(
      ({ dir }) => dir
    );

    expect(dirs).toHaveLength(imported().length);
    expect(dirs.every((dir) => path.isAbsolute(dir))).toBe(true);
  });
});
