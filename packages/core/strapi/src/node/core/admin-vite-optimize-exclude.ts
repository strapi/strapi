import path from 'node:path';
import fs from 'node:fs/promises';
import readPkgUp from 'read-pkg-up';

import { ADMIN_VITE_ALIAS_MODULES } from './admin-vite-alias-modules';
import { getModule, type PackageJson } from './dependencies';
import type { PluginMeta } from './plugins';

const REACT_PEER_DEPENDENCIES = new Set(['react', 'react-dom']);

/**
 * Packages explicitly pre-bundled or aliased for the admin singleton contract.
 * Never auto-exclude these — they must stay on the include/dedupe path.
 */
const PINNED_OPTIMIZE_MODULES = new Set<string>(ADMIN_VITE_ALIAS_MODULES);

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

/**
 * Walk direct and transitive dependency names from app/plugin roots.
 *
 * @internal exported for tests
 */
export const collectCandidateDependencyNames = async (
  cwd: string,
  rootNames: Iterable<string>
): Promise<Set<string>> => {
  const packages = await collectCandidatePackages(cwd, rootNames);

  return new Set(packages.keys());
};

const collectCandidatePackages = async (
  cwd: string,
  rootNames: Iterable<string>
): Promise<Map<string, PackageJson>> => {
  const packages = new Map<string, PackageJson>();
  const queue = [...rootNames];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const name = queue.shift()!;

    if (visited.has(name)) {
      continue;
    }

    visited.add(name);

    const pkg = await getModule(name, cwd);

    if (pkg) {
      packages.set(name, pkg);

      for (const dep of collectDependencyNames(pkg)) {
        if (!visited.has(dep)) {
          queue.push(dep);
        }
      }
    }
  }

  return packages;
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
 * @internal
 */
export const collectAdminOptimizeDepsExclude = async (
  cwd: string,
  plugins: PluginMeta[]
): Promise<string[]> => {
  const rootNames = new Set<string>();
  const appPkg = await loadAppPackageJson(cwd);

  if (appPkg) {
    for (const name of collectDependencyNames(appPkg)) {
      rootNames.add(name);
    }
  }

  for (const plugin of plugins) {
    const pluginPkg = await getPluginPackageJson(plugin, cwd);

    if (pluginPkg) {
      for (const name of collectDependencyNames(pluginPkg)) {
        rootNames.add(name);
      }
    }
  }

  const candidatePackages = await collectCandidatePackages(cwd, rootNames);
  const exclude: string[] = [];

  for (const [name, pkg] of candidatePackages) {
    if (PINNED_OPTIMIZE_MODULES.has(name)) {
      continue;
    }

    if (shouldExcludeFromOptimizeDeps(pkg)) {
      exclude.push(name);
    }
  }

  return exclude.sort();
};
