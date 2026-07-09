/* eslint-disable @typescript-eslint/no-var-requires */
import readPkgUp from 'read-pkg-up';

import {
  ADMIN_PINNED_ALIAS_MODULES,
  ADMIN_VITE_ALIAS_MODULES,
  ADMIN_VITE_DEDUPE_MODULES,
} from '../admin-vite-alias-modules';
import { buildAdminViteResolveAliases } from '../admin-vite-aliases';
import { getModulePath } from '../resolve-module';

const adminDeps = require('@strapi/admin/package.json').dependencies as Record<string, string>;

describe('buildAdminViteResolveAliases', () => {
  it('sets an alias for every admin vite alias module via getModulePath', () => {
    const alias = buildAdminViteResolveAliases();

    for (const mod of ADMIN_VITE_ALIAS_MODULES) {
      expect(alias[mod]).toBe(getModulePath(mod));
    }
  });

  it('uses the same module list for aliases and vite resolve.dedupe', () => {
    expect(ADMIN_VITE_DEDUPE_MODULES).toBe(ADMIN_VITE_ALIAS_MODULES);
  });

  it.each(ADMIN_PINNED_ALIAS_MODULES)(
    'aliases %s to the version pinned by @strapi/admin',
    (mod) => {
      const alias = buildAdminViteResolveAliases();
      const pkg = readPkgUp.sync({ cwd: alias[mod] });

      expect(pkg?.packageJson?.version).toBe(adminDeps[mod]);
    }
  );

  it('resolves path-browserify from @strapi/admin closure for pnpm (#26541)', () => {
    expect(adminDeps['path-browserify']).toBe('1.0.1');
    expect(getModulePath('path-browserify')).toContain('path-browserify');
  });
});
