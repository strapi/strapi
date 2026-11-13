import { join } from 'path';
import { kebabCase, mergeWith } from 'lodash';
import fse from 'fs-extra';

import { betterSqlite3NeedsInstallScript } from './database';
import { engines, SQLITE_13_NODE_ENGINE } from './engines';
import {
  getPnpmIgnoredBuiltDependencies,
  getPnpmOnlyBuiltDependencies,
  shouldUsePackageJsonPnpmConfig,
} from './pnpm-config';
import type { Scope } from '../types';

type PnpmPackageConfig = {
  onlyBuiltDependencies?: string[];
  ignoredBuiltDependencies?: string[];
  [key: string]: unknown;
};

type PackageJson = {
  pnpm?: PnpmPackageConfig;
  dependenciesMeta?: Record<string, { built?: boolean }>;
  [key: string]: unknown;
};

/**
 * Yarn 2 through 4.13 run node-gyp for better-sqlite3 13 because it ships binding.gyp.
 * The prebuild is already in the package, so the build must be skipped.
 * Yarn 1 ignores this field. Yarn 4.14+ already skips build scripts unless built is true.
 */
const getYarnDependenciesMeta = (scope: Scope): PackageJson => {
  const version = scope.dependencies?.['better-sqlite3'];

  if (scope.packageManager !== 'yarn' || typeof version !== 'string') {
    return {};
  }

  if (betterSqlite3NeedsInstallScript(version)) {
    return {};
  }

  return {
    dependenciesMeta: {
      'better-sqlite3': { built: false },
    },
  };
};

const mergePackageJson = (existingPkg: PackageJson, pkg: PackageJson) =>
  mergeWith({}, existingPkg, pkg, (_objValue, srcValue) => {
    if (Array.isArray(srcValue)) {
      return srcValue;
    }

    return undefined;
  });

const getAppEngines = (scope: Scope) => {
  const version = scope.dependencies?.['better-sqlite3'];

  if (
    scope.database.client === 'sqlite' &&
    typeof version === 'string' &&
    !betterSqlite3NeedsInstallScript(version)
  ) {
    return { ...engines, node: SQLITE_13_NODE_ENGINE };
  }

  return engines;
};

const getPnpmPackageJsonConfig = (scope: Scope, existingPkg: PackageJson) => {
  if (scope.packageManager !== 'pnpm' || !shouldUsePackageJsonPnpmConfig(scope.pnpmVersion)) {
    return {};
  }

  const packageNames = (value: unknown): string[] => {
    return Array.isArray(value)
      ? value.filter((dep): dep is string => typeof dep === 'string')
      : [];
  };

  const existingOnlyBuiltDependencies = packageNames(existingPkg.pnpm?.onlyBuiltDependencies);
  const ignoredBuiltDependencies = getPnpmIgnoredBuiltDependencies(
    scope,
    packageNames(existingPkg.pnpm?.ignoredBuiltDependencies)
  );

  const pnpm: PnpmPackageConfig = {
    ...existingPkg.pnpm,
    onlyBuiltDependencies: getPnpmOnlyBuiltDependencies(scope, existingOnlyBuiltDependencies),
  };

  if (ignoredBuiltDependencies.length > 0) {
    pnpm.ignoredBuiltDependencies = ignoredBuiltDependencies;
  } else {
    delete pnpm.ignoredBuiltDependencies;
  }

  return { pnpm };
};

export async function createPackageJSON(scope: Scope) {
  const { sortPackageJson } = await import('sort-package-json');

  const pkgJSONPath = join(scope.rootPath, 'package.json');

  const existingPkg = (await fse.readJSON(pkgJSONPath).catch(() => ({}))) as PackageJson;

  const pkg = {
    name: kebabCase(scope.name),
    private: true,
    version: '0.1.0',
    description: 'A Strapi application',
    devDependencies: scope.devDependencies ?? {},
    dependencies: scope.dependencies ?? {},
    strapi: {
      ...scope.packageJsonStrapi,
      uuid: scope.uuid,
      installId: scope.installId,
    },
    engines: getAppEngines(scope),
    ...getYarnDependenciesMeta(scope),
    ...getPnpmPackageJsonConfig(scope, existingPkg),
  };

  // copy templates
  await fse.writeJSON(pkgJSONPath, sortPackageJson(mergePackageJson(existingPkg, pkg)), {
    spaces: 2,
  });
}
