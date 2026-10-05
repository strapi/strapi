import { join } from 'node:path';
import fse from 'fs-extra';
import semver from 'semver';

import type { Scope } from '../types';

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

export const getPnpmBuildPackageNames = (scope: Scope): string[] => {
  const packages = new Set<string>(PNPM_STRAPI_BUILD_PACKAGES);

  if (scope.database.client === 'sqlite') {
    packages.add(PNPM_SQLITE_BUILD_PACKAGE);
  }

  return Array.from(packages).sort();
};

export const getPnpmAllowBuilds = (scope: Scope): Record<string, true> => {
  return Object.fromEntries(getPnpmBuildPackageNames(scope).map((name) => [name, true])) as Record<
    string,
    true
  >;
};

export const getPnpmOnlyBuiltDependencies = (scope: Scope, existing: string[] = []): string[] => {
  return Array.from(new Set([...existing, ...getPnpmBuildPackageNames(scope)])).sort();
};

const quoteYamlKey = (key: string): string => {
  if (/^[a-z0-9_-]+$/.test(key)) {
    return key;
  }

  return `'${key}'`;
};

export const formatPnpmWorkspaceYaml = (scope: Scope, pnpmVersion: string | null): string => {
  const allowBuilds = getPnpmAllowBuilds(scope);
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
  for (const name of Object.keys(allowBuilds).sort()) {
    lines.push(`  ${quoteYamlKey(name)}: true`);
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
