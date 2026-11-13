import { join } from 'node:path';
import fse from 'fs-extra';
import semver from 'semver';

import type { Scope } from '../types';
import {
  betterSqlite3NeedsInstallScript,
  getBetterSqlite3Version,
  type BetterSqlite3Host,
} from './database';

/** allowBuilds in pnpm-workspace.yaml (pnpm >= 10.26). */
export const PNPM_WORKSPACE_CONFIG_MIN_VERSION = '10.26.0';

/** pnpm 11 reads project settings from pnpm-workspace.yaml only. */
export const PNPM11_MIN_VERSION = '11.0.0';

/**
 * Native / tooling packages Strapi needs to run postinstall scripts for (admin build, upload, sqlite).
 */
export const PNPM_STRAPI_BUILD_PACKAGES = [
  '@swc/core',
  'core-js-pure',
  'esbuild',
  'sharp',
] as const;

export const PNPM_SQLITE_BUILD_PACKAGE = 'better-sqlite3';

export const shouldUsePnpmWorkspaceConfig = (pnpmVersion: string | null | undefined): boolean => {
  const normalized = pnpmVersion ? semver.coerce(pnpmVersion)?.version : null;

  return normalized ? semver.gte(normalized, PNPM_WORKSPACE_CONFIG_MIN_VERSION) : true;
};

export const shouldUsePackageJsonPnpmConfig = (pnpmVersion: string | null | undefined): boolean => {
  const normalized = pnpmVersion ? semver.coerce(pnpmVersion)?.version : null;

  if (!normalized) {
    return false;
  }

  return semver.lt(normalized, PNPM_WORKSPACE_CONFIG_MIN_VERSION);
};

const sqlitePinNeedsInstallScript = (
  scope: Scope,
  nodeVersion: string,
  host: BetterSqlite3Host
): boolean => {
  return (
    scope.database.client === 'sqlite' &&
    betterSqlite3NeedsInstallScript(getBetterSqlite3Version(nodeVersion, undefined, host))
  );
};

const sortPackageNames = (names: Iterable<string>): string[] => {
  return Array.from(names).sort((left, right) => left.localeCompare(right));
};

export const getPnpmBuildPackageNames = (
  scope: Scope,
  nodeVersion: string = process.versions.node,
  host: BetterSqlite3Host = {}
): string[] => {
  const packages = new Set<string>(PNPM_STRAPI_BUILD_PACKAGES);

  // 13.x ships a prebuild. Allowing its build makes pnpm run node-gyp, which needs a toolchain.
  // 12.x still needs its install script so prebuild-install can fetch a binary.
  if (sqlitePinNeedsInstallScript(scope, nodeVersion, host)) {
    packages.add(PNPM_SQLITE_BUILD_PACKAGE);
  }

  return sortPackageNames(packages);
};

export const getPnpmAllowBuilds = (
  scope: Scope,
  nodeVersion: string = process.versions.node,
  host: BetterSqlite3Host = {}
): Record<string, boolean> => {
  const allowBuilds: Record<string, boolean> = Object.fromEntries(
    getPnpmBuildPackageNames(scope, nodeVersion, host).map((name) => [name, true])
  );

  // pnpm 11 fails the install when a build is neither allowed nor denied.
  // 13.x must be denied so pnpm keeps the prebuild and does not run node-gyp.
  if (
    scope.database.client === 'sqlite' &&
    !sqlitePinNeedsInstallScript(scope, nodeVersion, host)
  ) {
    allowBuilds[PNPM_SQLITE_BUILD_PACKAGE] = false;
  }

  return allowBuilds;
};

export const getPnpmOnlyBuiltDependencies = (
  scope: Scope,
  existing: string[] = [],
  nodeVersion: string = process.versions.node,
  host: BetterSqlite3Host = {}
): string[] => {
  const names = new Set([...existing, ...getPnpmBuildPackageNames(scope, nodeVersion, host)]);

  // A template may already allow better-sqlite3. Leave that entry off for 13.x so
  // `pnpm approve-builds` is not the only thing standing between the prebuild and node-gyp.
  if (
    scope.database.client === 'sqlite' &&
    !sqlitePinNeedsInstallScript(scope, nodeVersion, host)
  ) {
    names.delete(PNPM_SQLITE_BUILD_PACKAGE);
  }

  return sortPackageNames(names);
};

/**
 * pnpm 10.0–10.25 stores build policy in package.json. Omitting 13.x from
 * onlyBuiltDependencies makes install print "Ignored build scripts" and
 * `pnpm approve-builds` can turn the native build back on.
 * `ignoredBuiltDependencies` (pnpm 10.1+) records the deny, skips that message,
 * and keeps the package out of the approval list. pnpm 10.26+ uses allowBuilds: false instead.
 */
export const getPnpmIgnoredBuiltDependencies = (
  scope: Scope,
  existing: string[] = [],
  nodeVersion: string = process.versions.node,
  host: BetterSqlite3Host = {}
): string[] => {
  const names = new Set(existing);

  if (scope.database.client !== 'sqlite') {
    return sortPackageNames(names);
  }

  if (sqlitePinNeedsInstallScript(scope, nodeVersion, host)) {
    names.delete(PNPM_SQLITE_BUILD_PACKAGE);
  } else {
    names.add(PNPM_SQLITE_BUILD_PACKAGE);
  }

  return sortPackageNames(names);
};

const quoteYamlKey = (key: string): string => {
  if (/^[a-z0-9_-]+$/.test(key)) {
    return key;
  }

  return `'${key}'`;
};

export const formatPnpmWorkspaceYaml = (
  scope: Scope,
  pnpmVersion: string | null,
  nodeVersion: string = process.versions.node,
  host: BetterSqlite3Host = {}
): string => {
  const allowBuilds = getPnpmAllowBuilds(scope, nodeVersion, host);
  const normalized = pnpmVersion ? semver.coerce(pnpmVersion)?.version : null;
  const isPnpm11 = normalized ? semver.gte(normalized, PNPM11_MIN_VERSION) : true;

  const lines = ['packages:', "  - '.'", ''];

  if (isPnpm11) {
    lines.push(
      '# Allow day-0 @strapi/* npm publishes while keeping pnpm 11 supply-chain defaults for other deps.',
      'minimumReleaseAgeExclude:',
      "  - '@strapi/*'",
      ''
    );
  }

  lines.push('allowBuilds:');
  for (const name of Object.keys(allowBuilds).sort((left, right) => left.localeCompare(right))) {
    lines.push(`  ${quoteYamlKey(name)}: ${allowBuilds[name]}`);
  }
  lines.push('');

  return lines.join('\n');
};

const hasParentPnpmWorkspace = async (rootPath: string): Promise<boolean> => {
  let dir = join(rootPath, '..');

  while (dir !== join(dir, '..')) {
    if (await fse.pathExists(join(dir, 'pnpm-workspace.yaml'))) {
      return true;
    }

    dir = join(dir, '..');
  }

  return false;
};

export const writePnpmWorkspaceConfig = async (
  scope: Scope,
  pnpmVersion: string | null
): Promise<void> => {
  if (scope.packageManager !== 'pnpm' || !shouldUsePnpmWorkspaceConfig(pnpmVersion)) {
    return;
  }

  const workspaceFile = join(scope.rootPath, 'pnpm-workspace.yaml');

  if (await hasParentPnpmWorkspace(scope.rootPath)) {
    return;
  }

  if (await fse.pathExists(workspaceFile)) {
    return;
  }

  await fse.writeFile(workspaceFile, formatPnpmWorkspaceYaml(scope, pnpmVersion));
};
