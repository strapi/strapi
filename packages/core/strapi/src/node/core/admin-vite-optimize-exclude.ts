import path from 'node:path';
import fs from 'node:fs/promises';
import readPkgUp from 'read-pkg-up';

import { ADMIN_VITE_ALIAS_MODULES } from './admin-vite-alias-modules';
import { getResolvableCodemirrorPackages } from './codemirror-packages';
import { getModule, type PackageJson } from './dependencies';
import type { PluginMeta } from './plugins';

const REACT_PEER_DEPENDENCIES = new Set(['react', 'react-dom']);

/**
 * Packages explicitly pre-bundled or aliased for the admin singleton contract.
 * Never auto-exclude these — they must stay on the optimizeDeps.include / dedupe path.
 *
 * The admin entry host (@strapi/strapi) must never land in optimizeDeps.exclude (#26944, #27014).
 * CJS-only deps imported by @strapi/admin (e.g. invariant, lodash) belong in optimizeDeps.include
 * (see vite/config.ts — #26964, #26944, #27014).
 */
const PINNED_OPTIMIZE_MODULES = new Set<string>([...ADMIN_VITE_ALIAS_MODULES, '@strapi/strapi']);

const isOfficialStrapiPackage = (name: string): boolean => name.startsWith('@strapi/');

type PackageExportEntry =
  | string
  | {
      import?: string;
      require?: string;
      default?: string;
    };

const getRootPackageExport = (pkg: PackageJson): PackageExportEntry | undefined => {
  const exportsField = pkg.exports as Record<string, PackageExportEntry> | string | undefined;

  if (!exportsField || typeof exportsField === 'string') {
    return undefined;
  }

  return exportsField['.'];
};

/**
 * @internal exported for tests
 */
export const isEsmPackage = (pkg: PackageJson): boolean => {
  if (pkg.type === 'module') {
    return true;
  }

  const rootExport = getRootPackageExport(pkg);

  return (
    typeof rootExport === 'object' &&
    rootExport !== null &&
    'import' in rootExport &&
    typeof rootExport.import === 'string'
  );
};

/**
 * @internal exported for tests
 */
export const hasReactPeerDependency = (pkg: PackageJson): boolean =>
  Object.keys(pkg.peerDependencies ?? {}).some((name) => REACT_PEER_DEPENDENCIES.has(name));

/**
 * Targets libraries that ship a pre-built dist bundle (e.g. plugin UI kits) rather than
 * source packages like react-intl that still benefit from Vite's dep optimizer.
 *
 * @internal exported for tests
 */
export const shipsPreBuiltDist = (pkg: PackageJson): boolean => {
  const rootExport = getRootPackageExport(pkg);
  const exportImport =
    typeof rootExport === 'object' && rootExport !== null && 'import' in rootExport
      ? rootExport.import
      : undefined;

  const entryPaths = [pkg.module, pkg.main, exportImport].filter(
    (entry): entry is string => typeof entry === 'string'
  );

  if (
    entryPaths.some(
      (entry) =>
        entry.includes('/dist/') || entry.startsWith('./dist/') || entry.startsWith('dist/')
    )
  ) {
    return true;
  }

  return (
    Array.isArray(pkg.files) &&
    pkg.files.some((file) => file === 'dist' || file.startsWith('dist/'))
  );
};

/**
 * @internal exported for tests
 */
export const shouldExcludeFromOptimizeDeps = (pkg: PackageJson): boolean =>
  hasReactPeerDependency(pkg) && isEsmPackage(pkg) && shipsPreBuiltDist(pkg);

/**
 * @internal exported for tests
 */
export const getPluginPackageName = (modulePath: string): string => {
  if (modulePath.startsWith('@')) {
    const [scope, name] = modulePath.split('/');

    return `${scope}/${name}`;
  }

  return modulePath.split('/')[0] ?? modulePath;
};

const collectDependencyNames = (pkg: PackageJson): string[] => {
  const names = new Set<string>();

  for (const section of [pkg.dependencies, pkg.devDependencies] as const) {
    if (section) {
      for (const name of Object.keys(section)) {
        names.add(name);
      }
    }
  }

  return [...names];
};

const getPluginPackageJson = async (
  plugin: PluginMeta,
  cwd: string
): Promise<PackageJson | null> => {
  if (plugin.type === 'local' && plugin.path) {
    try {
      const content = await fs.readFile(path.join(plugin.path, 'package.json'), 'utf8');

      return JSON.parse(content) as PackageJson;
    } catch {
      return null;
    }
  }

  return getModule(getPluginPackageName(plugin.modulePath), cwd);
};

const loadAppPackageJson = async (cwd: string): Promise<PackageJson | null> => {
  const result = await readPkgUp({ cwd });

  return result?.packageJson ?? null;
};

/**
 * Pre-built ESM libraries with React peers (shared plugin UI kits) are incompatible with
 * Strapi's React/design-system pre-bundling. Skip dep optimization so they resolve through
 * the admin resolve aliases instead of being re-bundled by Vite.
 *
 * Scans app and plugin dependency trees (#26944). Official @strapi/* packages and pinned
 * singletons are never auto-excluded — @strapi/strapi matches the heuristic but must stay on
 * the optimizeDeps.include path (#26944, #27014).
 *
 * @internal
 */
export const collectAdminOptimizeDepsExclude = async (
  cwd: string,
  plugins: PluginMeta[]
): Promise<string[]> => {
  const candidateNames = new Set<string>();
  const appPkg = await loadAppPackageJson(cwd);

  if (appPkg) {
    for (const name of collectDependencyNames(appPkg)) {
      candidateNames.add(name);
    }
  }

  for (const plugin of plugins) {
    const pluginPkg = await getPluginPackageJson(plugin, cwd);

    if (pluginPkg) {
      for (const name of collectDependencyNames(pluginPkg)) {
        candidateNames.add(name);
      }
    }
  }

  const exclude: string[] = [];
  // Admin singletons and CodeMirror externals must stay on optimizeDeps include/dedupe path.
  const pinnedSingletons = new Set<string>([
    ...ADMIN_VITE_ALIAS_MODULES,
    ...getResolvableCodemirrorPackages(),
  ]);

  for (const name of candidateNames) {
    if (PINNED_OPTIMIZE_MODULES.has(name) || isOfficialStrapiPackage(name)) {
      continue;
    }

    const pkg = await getModule(name, cwd);

    if (pkg && shouldExcludeFromOptimizeDeps(pkg)) {
      exclude.push(name);
    }
  }

  return exclude.sort();
};
