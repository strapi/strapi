/* eslint-disable @typescript-eslint/no-var-requires */
import fs from 'node:fs';
import path from 'node:path';

import readPkgUp from 'read-pkg-up';
import type { Alias } from 'vite';

import {
  ADMIN_PINNED_ALIAS_MODULES,
  ADMIN_VITE_ALIAS_MODULES,
  ADMIN_VITE_DEDUPE_MODULES,
  ADMIN_VITE_DEDUPE_ONLY_MODULES,
  ADMIN_VITE_EXACT_ALIAS_MODULES,
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

/**
 * resolve.dedupe forces resolution from the app root, so only packages the app itself declares
 * may be deduped. These two are @strapi/admin dependencies: under pnpm's strict isolation they
 * have no top-level node_modules entry, so deduping them would turn a working (if duplicated)
 * local-plugin import into an unresolved one. Aliasing the package directory is not an option
 * either — resolve.alias bypasses their exports map (@strapi/icons publishes ./symbols).
 */
const PNPM_UNSAFE_DEDUPE_MODULES = ['@strapi/icons', 'react-intl'] as const;

const entryFor = (alias: readonly Alias[], mod: string) =>
  alias.find((entry) => (entry.find instanceof RegExp ? entry.find.test(mod) : entry.find === mod));

const replacementFor = (alias: readonly Alias[], mod: string) => entryFor(alias, mod)?.replacement;

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

  it.each(PNPM_UNSAFE_DEDUPE_MODULES)(
    'keeps %s out of the dedupe list — it is not an app dependency',
    (mod) => {
      expect(ADMIN_VITE_DEDUPE_MODULES).not.toContain(mod);
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
      expect(replacementFor(alias, mod)).toBe(getModulePath(mod));
    }
  });

  it('aliases every CodeMirror singleton from @strapi/design-system', () => {
    const alias = buildAdminViteResolveAliases();

    for (const mod of ADMIN_VITE_SINGLETON_MODULES) {
      expect(replacementFor(alias, mod)).toBe(getModulePathFrom('@strapi/design-system', mod));
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

      expect(replacementFor(alias, mod)).toBeUndefined();
    }
  );

  it.each(ADMIN_PINNED_ALIAS_MODULES)(
    'aliases %s to the version pinned by @strapi/admin',
    (mod) => {
      const alias = buildAdminViteResolveAliases();
      expect(replacementFor(alias, mod)).toBeDefined();

      const pkg = readPkgUp.sync({ cwd: replacementFor(alias, mod) });

      expect(pkg?.packageJson?.version).toBe(adminDeps[mod]);
    }
  );
});

/**
 * A subpath key that resolves to no file at the package root is remapped by the `exports` map, so
 * a prefix alias would rewrite the import to a path that does not exist
 */
const getRemappedSubpathKeys = (mod: string): string[] => {
  const root = getModulePath(mod);
  const { exports: exportsMap }: { exports?: unknown } = require(path.join(root, 'package.json'));

  if (typeof exportsMap !== 'object' || exportsMap === null) {
    return [];
  }

  const subpathKeys = Object.keys(exportsMap).filter(
    (key) => key.startsWith('./') && key !== './package.json' && !key.includes('*')
  );

  return subpathKeys.filter((key) => {
    const target = path.join(root, key);
    const candidates = [
      target,
      `${target}.js`,
      `${target}.mjs`,
      `${target}.cjs`,
      path.join(target, 'index.js'),
      path.join(target, 'index.mjs'),
      path.join(target, 'index.cjs'),
      path.join(target, 'package.json'),
    ];

    return !candidates.some((candidate) => fs.existsSync(candidate));
  });
};

describe('ADMIN_VITE_EXACT_ALIAS_MODULES contract', () => {
  // Two-way on purpose: an exact entry no package needs fails the same as a missing one
  it.each(ADMIN_VITE_ALIAS_MODULES)(
    '%s is exact-matched when its exports map remaps a subpath',
    (mod) => {
      const remappedKeys = getRemappedSubpathKeys(mod);
      const listed = ADMIN_VITE_EXACT_ALIAS_MODULES.some((exact) => exact === mod);

      expect({ mod, remappedKeys, listed }).toEqual({
        mod,
        remappedKeys,
        listed: remappedKeys.length > 0,
      });
    }
  );

  it.each(ADMIN_VITE_EXACT_ALIAS_MODULES)('%s matches the bare name only', (mod) => {
    const find = entryFor(buildAdminViteResolveAliases(), mod)?.find;

    expect(find).toBeInstanceOf(RegExp);
    expect(find instanceof RegExp && find.test(`${mod}/x`)).toBe(false);
  });
});
