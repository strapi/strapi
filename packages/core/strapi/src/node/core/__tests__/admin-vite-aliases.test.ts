/* eslint-disable @typescript-eslint/no-var-requires */
import readPkgUp from 'read-pkg-up';

import {
  ADMIN_PINNED_ALIAS_MODULES,
  ADMIN_VITE_ALIAS_MODULES,
  ADMIN_VITE_DEDUPE_MODULES,
  ADMIN_VITE_DEDUPE_ONLY_MODULES,
  ADMIN_VITE_SINGLETON_MODULES,
} from '../admin-vite-alias-modules';
import { buildAdminViteResolveAliases } from '../admin-vite-aliases';
import { getModulePath, getModulePathFrom } from '../resolve-module';

const adminDeps = require('@strapi/admin/package.json').dependencies as Record<string, string>;

/** CJS/UMD deps on optimizeDeps.include must stay aliased for pnpm (#27014). */
const PNPM_OPTIMIZE_ALIAS_MODULES = ['invariant', 'prismjs', 'lodash'] as const;

/**
 * react-dnd keeps its DndContext in module scope and is declared by both @strapi/admin and
 * @strapi/content-manager, so it must be deduped rather than left to npm hoisting — otherwise
 * the Content Manager mounts against a second, empty context (#22392, #22792).
 */
const DND_SINGLETON_MODULES = ['react-dnd', 'react-dnd-html5-backend'] as const;

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

  it('dedupes react-dnd so the admin DndProvider and content-manager share one context (#22392)', () => {
    for (const mod of DND_SINGLETON_MODULES) {
      expect(ADMIN_VITE_DEDUPE_MODULES).toContain(mod);
    }
  });
});

/**
 * A local plugin is imported by relative path, so Rollup resolves the bare specifiers in its
 * built output from the plugin's own node_modules. Without dedupe, each local plugin drags a
 * second copy of the admin application into the build graph and `strapi build` OOMs (#22946).
 */
describe('ADMIN_VITE_DEDUPE_ONLY_MODULES contract (#22946)', () => {
  it.each(ADMIN_VITE_DEDUPE_ONLY_MODULES)('dedupes %s for local plugin resolution', (mod) => {
    expect(ADMIN_VITE_DEDUPE_MODULES).toContain(mod);
  });

  it('dedupes @strapi/strapi, the head of the local-plugin dependency chain', () => {
    // @strapi/admin and the core plugins are reached *through* @strapi/strapi, so deduping it
    // collapses them too — deduping @strapi/admin alone leaves most of the duplication behind.
    expect(ADMIN_VITE_DEDUPE_ONLY_MODULES).toContain('@strapi/strapi');
  });

  it.each(ADMIN_VITE_DEDUPE_ONLY_MODULES)(
    'keeps %s out of the alias list — aliasing bypasses its exports map and breaks the build',
    (mod) => {
      expect(ADMIN_VITE_ALIAS_MODULES).not.toContain(mod);
    }
  );

  it('does not overlap the singleton modules', () => {
    for (const mod of ADMIN_VITE_DEDUPE_ONLY_MODULES) {
      expect(ADMIN_VITE_SINGLETON_MODULES).not.toContain(mod);
    }
  });

  it('produces a dedupe list with no duplicate entries', () => {
    expect([...new Set(ADMIN_VITE_DEDUPE_MODULES)]).toHaveLength(ADMIN_VITE_DEDUPE_MODULES.length);
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

  it.each(ADMIN_VITE_DEDUPE_ONLY_MODULES)(
    'never aliases %s — resolve.alias would bypass its exports map (#22946)',
    (mod) => {
      const alias = buildAdminViteResolveAliases();

      expect(alias).not.toHaveProperty(mod);
    }
  );

  it.each(ADMIN_PINNED_ALIAS_MODULES)(
    'aliases %s to the version pinned by @strapi/admin',
    (mod) => {
      const alias = buildAdminViteResolveAliases();
      const pkg = readPkgUp.sync({ cwd: alias[mod] });

      expect(pkg?.packageJson?.version).toBe(adminDeps[mod]);
    }
  );
});
