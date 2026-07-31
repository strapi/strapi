/* eslint-disable @typescript-eslint/no-var-requires */
import readPkgUp from 'read-pkg-up';

import {
  ADMIN_PINNED_ALIAS_MODULES,
  ADMIN_VITE_ALIAS_MODULES,
  ADMIN_VITE_DEDUPE_MODULES,
  ADMIN_VITE_SINGLETON_MODULES,
} from '../admin-vite-alias-modules';
import { buildAdminViteResolveAliases } from '../admin-vite-aliases';
import { getModulePath, getModulePathFrom } from '../resolve-module';

const adminDeps = require('@strapi/admin/package.json').dependencies as Record<string, string>;

/** CJS/UMD deps on optimizeDeps.include must stay aliased for pnpm (#27014). */
const PNPM_OPTIMIZE_ALIAS_MODULES = ['invariant', 'prismjs', 'lodash'] as const;

describe('ADMIN_VITE_ALIAS_MODULES contract', () => {
  it.each(PNPM_OPTIMIZE_ALIAS_MODULES)(
    'includes %s for pnpm optimizeDeps.include resolution (#27014)',
    (mod) => {
      expect(ADMIN_VITE_ALIAS_MODULES).toContain(mod);
    }
  );

  it('pins invariant alongside other @strapi/admin dependency versions', () => {
    expect(ADMIN_PINNED_ALIAS_MODULES).toContain('invariant');
  });
});

describe('buildAdminViteResolveAliases', () => {
  it('sets an alias for every admin vite alias module via getModulePath', () => {
    const alias = buildAdminViteResolveAliases();

    for (const mod of ADMIN_VITE_ALIAS_MODULES) {
      expect(alias[mod]).toBe(getModulePath(mod));
    }
  });

  it('aliases every CodeMirror singleton from @strapi/design-system', () => {
    const alias = buildAdminViteResolveAliases();

    for (const mod of ADMIN_VITE_SINGLETON_MODULES) {
      expect(alias[mod]).toBe(getModulePathFrom('@strapi/design-system', mod));
    }
  });

  it('includes both alias and singleton modules in vite resolve.dedupe', () => {
    for (const mod of ADMIN_VITE_ALIAS_MODULES) {
      expect(ADMIN_VITE_DEDUPE_MODULES).toContain(mod);
    }

    for (const mod of ADMIN_VITE_SINGLETON_MODULES) {
      expect(ADMIN_VITE_DEDUPE_MODULES).toContain(mod);
    }
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
