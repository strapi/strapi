/* eslint-disable @typescript-eslint/no-var-requires */
import readPkgUp from 'read-pkg-up';

import {
  ADMIN_PINNED_ALIAS_MODULES,
  ADMIN_VITE_ALIAS_MODULES,
  ADMIN_VITE_DEDUPE_MODULES,
  ADMIN_VITE_SINGLETON_MODULES,
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

  it('includes all alias modules in vite resolve.dedupe', () => {
    expect(ADMIN_VITE_DEDUPE_MODULES).toEqual(
      expect.arrayContaining([...ADMIN_VITE_ALIAS_MODULES])
    );
  });

  it('includes singleton modules in vite resolve.dedupe', () => {
    expect(ADMIN_VITE_DEDUPE_MODULES).toEqual(
      expect.arrayContaining([...ADMIN_VITE_SINGLETON_MODULES])
    );
  });

  it.each(ADMIN_PINNED_ALIAS_MODULES)(
    'aliases %s to the version pinned by @strapi/admin',
    (mod) => {
      const alias = buildAdminViteResolveAliases();
      const pkg = readPkgUp.sync({ cwd: alias[mod] });

      expect(pkg?.packageJson?.version).toBe(adminDeps[mod]);
    }
  );
});
