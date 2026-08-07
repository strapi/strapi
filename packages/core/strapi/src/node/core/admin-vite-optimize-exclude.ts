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

/**
 * Thin shared plugin UI kits that are known to break when Vite re-optimizes their pre-built
 * dist (original #26944 victims). Exclude is declare-only: these names, packages that set
 * `strapi.admin.vite.optimizeDepsExclude`, or app `src/admin/vite.config` — never inferred
 * from package shape (#27136 / follow-up to #27264).
 *
 * @internal exported for tests
 */
export const ADMIN_VITE_OPTIMIZE_DEPS_EXCLUDE_ALLOWLIST = new Set<string>([
  'strapi-design-extended',
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
 * Historical UI-kit shape (pre-built ESM + React peer + dist). Kept for tests and debugging —
 * it is **not** used to decide exclude eligibility (declare-only; see
 * {@link isEligibleForOptimizeDepsExclude}).
 *
 * @internal exported for tests
 */
export const shouldExcludeFromOptimizeDeps = (pkg: PackageJson): boolean =>
  hasReactPeerDependency(pkg) && isEsmPackage(pkg) && shipsPreBuiltDist(pkg);

type StrapiAdminViteMeta = {
  optimizeDepsExclude?: unknown;
};

type StrapiPackageMeta = {
  admin?: {
    vite?: StrapiAdminViteMeta;
  };
};

/**
 * Plugin / shared UI kit authors may opt into `optimizeDeps.exclude` via package.json so Vite
 * does not rebundle a pre-built dist that conflicts with Strapi's React / design-system
 * singletons:
 *
 * ```json
 * {
 *   "strapi": {
 *     "admin": {
 *       "vite": {
 *         "optimizeDepsExclude": true
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * Apps can also exclude packages in `src/admin/vite.config` without this flag.
 * Do **not** set this on large plugins (editors, charts, …): excluding the package root
 * orphans transitive CJS/UMD deps (#27136).
 *
 * @internal exported for tests
 */
export const packageOptsIntoOptimizeDepsExclude = (pkg: PackageJson): boolean => {
  const strapi = (pkg as PackageJson & { strapi?: StrapiPackageMeta }).strapi;

  return strapi?.admin?.vite?.optimizeDepsExclude === true;
};

/**
 * Exclude is declare-only: known allowlist name **or** package.json opt-in.
 * Package shape is intentionally ignored so fat plugins are never auto-excluded (#27136).
 *
 * @internal exported for tests
 */
export const isEligibleForOptimizeDepsExclude = (
  name: string,
  pkg: PackageJson | null
): boolean => {
  if (ADMIN_VITE_OPTIMIZE_DEPS_EXCLUDE_ALLOWLIST.has(name)) {
    return true;
  }

  return pkg !== null && packageOptsIntoOptimizeDepsExclude(pkg);
};

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
 * Collects `optimizeDeps.exclude` entries for admin Vite develop.
 *
 * Scans app and plugin dependency trees. A package is excluded only when it is on
 * {@link ADMIN_VITE_OPTIMIZE_DEPS_EXCLUDE_ALLOWLIST} or sets
 * `strapi.admin.vite.optimizeDepsExclude: true` (#27264 follow-up: declare-only, no shape
 * heuristic). Official `@strapi/*` packages and pinned singletons are never auto-excluded
 * (#26944, #27014).
 *
 * Allowlisted names are excluded even when `getModule` cannot read `package.json` (some
 * packages omit `./package.json` from `exports`).
 *
 * Apps can still exclude additional packages via `src/admin/vite.config` optimizeDeps.exclude.
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

  for (const name of candidateNames) {
    if (PINNED_OPTIMIZE_MODULES.has(name) || isOfficialStrapiPackage(name)) {
      continue;
    }

    if (ADMIN_VITE_OPTIMIZE_DEPS_EXCLUDE_ALLOWLIST.has(name)) {
      exclude.push(name);
      continue;
    }

    const pkg = await getModule(name, cwd);

    if (pkg && packageOptsIntoOptimizeDepsExclude(pkg)) {
      exclude.push(name);
    }
  }

  return exclude.sort();
};
