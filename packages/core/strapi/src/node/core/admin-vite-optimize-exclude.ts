import path from 'node:path';
import fs from 'node:fs/promises';
import readPkgUp from 'read-pkg-up';

import { ADMIN_VITE_ALIAS_MODULES, ADMIN_VITE_SINGLETON_MODULES } from './admin-vite-alias-modules';
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
 * The CodeMirror singletons (e.g. @uiw/react-codemirror — ESM with a React peer) match the
 * exclude heuristic but must stay pre-bundled so the admin keeps a single instance
 */
const PINNED_OPTIMIZE_MODULES = new Set<string>([
  ...ADMIN_VITE_ALIAS_MODULES,
  ...ADMIN_VITE_SINGLETON_MODULES,
  '@strapi/strapi',
]);

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

/** App / plugin package.json roots: include both runtime and declared-dev deps. */
const collectRootDependencyNames = (pkg: PackageJson): string[] => {
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

/** Transitive expansion: runtime dependencies only (devDeps are not installed for consumers). */
const collectRuntimeDependencyNames = (pkg: PackageJson): string[] =>
  pkg.dependencies ? Object.keys(pkg.dependencies) : [];

/**
 * Max BFS depth from expansion seeds when walking non-`@strapi/*` packages.
 * Depth 0 = seed; depth 2 covers plugin → UI-kit wrapper → pre-built kit.
 */
const MAX_TRANSITIVE_DEPTH = 2;

/**
 * Resolve declared candidates and optionally BFS from expansion seeds.
 *
 * Official `@strapi/*` packages are never expanded. Expansion is also skipped for names that
 * are only static candidates (e.g. server deps listed on official plugins) unless they appear
 * in `expansionSeeds` (non-`@strapi/*` app deps and community/local plugins).
 *
 * @internal exported for tests
 */
export const collectCandidateDependencyNames = async (
  cwd: string,
  candidateNames: Iterable<string>,
  expansionSeeds: Iterable<string> = candidateNames
): Promise<Set<string>> => {
  const packages = await collectCandidatePackages(cwd, candidateNames, expansionSeeds);

  return new Set(packages.keys());
};

const collectCandidatePackages = async (
  cwd: string,
  candidateNames: Iterable<string>,
  expansionSeeds: Iterable<string> = candidateNames
): Promise<Map<string, PackageJson>> => {
  const packages = new Map<string, PackageJson>();
  const seedSet = new Set(expansionSeeds);

  for (const name of candidateNames) {
    if (packages.has(name)) {
      continue;
    }

    const pkg = await getModule(name, cwd);

    if (pkg) {
      packages.set(name, pkg);
    }
  }

  const queue: Array<{ name: string; depth: number }> = [...seedSet].map((name) => ({
    name,
    depth: 0,
  }));
  const expansionVisited = new Set<string>();

  while (queue.length > 0) {
    const { name, depth } = queue.shift()!;

    if (expansionVisited.has(name)) {
      continue;
    }

    expansionVisited.add(name);

    let pkg = packages.get(name);

    if (!pkg) {
      const resolved = await getModule(name, cwd);

      if (!resolved) {
        continue;
      }

      pkg = resolved;
      packages.set(name, pkg);
    }

    if (isOfficialStrapiPackage(name) || depth >= MAX_TRANSITIVE_DEPTH) {
      continue;
    }

    for (const dep of collectRuntimeDependencyNames(pkg)) {
      if (!expansionVisited.has(dep)) {
        queue.push({ name: dep, depth: depth + 1 });
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
 * Scans app and plugin dependency trees (#26944). Direct deps of the app and every plugin are
 * candidates. Transitive discovery is seeded only from non-`@strapi/*` app deps and
 * community/local plugins (depth-capped), so official plugin server graphs are not walked.
 * Official `@strapi/*` packages and pinned singletons are never auto-excluded — `@strapi/strapi`
 * matches the heuristic but must stay on the optimizeDeps.include path (#26944, #27014).
 *
 * @internal
 */
export const collectAdminOptimizeDepsExclude = async (
  cwd: string,
  plugins: PluginMeta[]
): Promise<string[]> => {
  const candidateNames = new Set<string>();
  const expansionSeeds = new Set<string>();
  const appPkg = await loadAppPackageJson(cwd);

  if (appPkg) {
    for (const name of collectRootDependencyNames(appPkg)) {
      candidateNames.add(name);

      if (!isOfficialStrapiPackage(name)) {
        expansionSeeds.add(name);
      }
    }
  }

  for (const plugin of plugins) {
    const pluginPkg = await getPluginPackageJson(plugin, cwd);

    if (pluginPkg) {
      for (const name of collectRootDependencyNames(pluginPkg)) {
        candidateNames.add(name);
      }
    }

    // Community / local plugins: walk their runtime graphs for nested UI kits.
    // Official `@strapi/*` plugins contribute direct deps as candidates only (no expansion).
    if (plugin.type === 'local') {
      const localName = pluginPkg?.name;

      if (typeof localName === 'string' && localName && !isOfficialStrapiPackage(localName)) {
        candidateNames.add(localName);
        expansionSeeds.add(localName);
      }
    } else {
      const moduleName = getPluginPackageName(plugin.modulePath);

      if (!isOfficialStrapiPackage(moduleName)) {
        candidateNames.add(moduleName);
        expansionSeeds.add(moduleName);
      }
    }
  }

  const candidatePackages = await collectCandidatePackages(cwd, candidateNames, expansionSeeds);
  const exclude: string[] = [];

  for (const [name, pkg] of candidatePackages) {
    if (PINNED_OPTIMIZE_MODULES.has(name) || isOfficialStrapiPackage(name)) {
      continue;
    }

    if (shouldExcludeFromOptimizeDeps(pkg)) {
      exclude.push(name);
    }
  }

  return exclude.sort();
};
