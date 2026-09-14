import fs from 'node:fs';
import path from 'node:path';

import { exports as resolveExports, type Package } from 'resolve.exports';

import { ADMIN_VITE_ALIAS_MODULES, ADMIN_VITE_SINGLETON_MODULES } from './admin-vite-alias-modules';
import { getModulePath, getModulePathFrom } from './resolve-module';

/**
 * Vite resolve.alias entries for the admin bundle.
 *
 * Admin alias modules resolve from @strapi/admin's closure. CodeMirror singletons resolve
 * from @strapi/design-system's closure (the real consumer), tolerantly: optional/transitive
 * CodeMirror packages that cannot be resolved are skipped rather than crashing the build
 *
 * @internal
 */
export const buildAdminViteResolveAliases = (): Record<string, string> =>
  Object.fromEntries([
    // Longest key first, so no key sits behind a prefix of itself
    ...ADMIN_VITE_ALIAS_MODULES.flatMap(getSubpathEntries).sort(([a], [b]) => b.length - a.length),
    ...ADMIN_VITE_ALIAS_MODULES.map((mod) => [mod, getModulePath(mod)] as const),
    ...buildSingletonAliasEntries(),
  ]);

/**
 * Alias key and absolute target for each exports subpath of an aliased module that a browser
 * build can import
 *
 * The bare module key rewrites to a directory and bypasses the exports map, so each subpath needs
 * its own exact key. Wildcard subpaths and `./package.json` get no key and keep resolving through
 * the bare key
 *
 * @internal
 */
export const getSubpathEntries = (mod: string): Array<readonly [string, string]> => {
  const root = getModulePath(mod);
  const entries: Array<readonly [string, string]> = [];
  let pkg: Package | null;

  try {
    // JSON.parse returns any, and resolve.exports reads the Package fields
    pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as Package | null;
  } catch {
    return entries;
  }

  if (!pkg?.exports) {
    return entries;
  }

  for (const subpath of Object.keys(pkg.exports)) {
    if (!subpath.startsWith('./') || subpath.includes('*') || subpath === './package.json') {
      continue;
    }

    try {
      const [target] = resolveExports(pkg, subpath, { browser: true }) ?? [];

      if (target) {
        entries.push([`${mod}${subpath.slice(1)}`, path.join(root, target)] as const);
      }
    } catch {
      // A subpath resolve.exports refuses gets no key
    }
  }

  return entries;
};

/**
 * Resolve the CodeMirror singleton aliases from @strapi/design-system's closure, skipping any
 * package that cannot be resolved (e.g. optional or transitive CodeMirror packages not installed).
 *
 * @internal
 */
export const buildSingletonAliasEntries = (): Array<readonly [string, string]> => {
  const entries: Array<readonly [string, string]> = [];

  for (const mod of ADMIN_VITE_SINGLETON_MODULES) {
    try {
      entries.push([mod, getModulePathFrom('@strapi/design-system', mod)] as const);
    } catch {
      // Optional/transitive CodeMirror package not resolvable here — skip it rather than
      // throwing, so a missing singleton never breaks the admin build.
    }
  }

  return entries;
};

/**
 * Names of the CodeMirror singletons that actually resolve from @strapi/design-system's closure.
 *
 * Mirrors buildSingletonAliasEntries so optimizeDeps.include stays in lockstep with resolve.alias:
 * a singleton that cannot be aliased must not be forced into pre-bundling either, or Vite chokes
 * on an unresolvable optimizeDeps.include entry.
 *
 * @internal
 */
export const getResolvableSingletonModules = (): string[] =>
  buildSingletonAliasEntries().map(([mod]) => mod);
