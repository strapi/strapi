import { join } from 'path';
import { kebabCase, merge } from 'lodash';
import fse from 'fs-extra';

import { engines } from './engines';
import type { Scope } from '../types';

type PnpmPackageConfig = {
  onlyBuiltDependencies?: unknown;
  [key: string]: unknown;
};

type PackageJson = {
  pnpm?: PnpmPackageConfig;
  [key: string]: unknown;
};

const getPnpmOnlyBuiltDependencies = (scope: Scope, existingPkg: PackageJson) => {
  if (scope.packageManager !== 'pnpm' || scope.database.client !== 'sqlite') {
    return {};
  }

  const existingOnlyBuiltDependencies = Array.isArray(existingPkg.pnpm?.onlyBuiltDependencies)
    ? existingPkg.pnpm.onlyBuiltDependencies.filter((dep): dep is string => typeof dep === 'string')
    : [];

  return {
    pnpm: {
      ...(existingPkg.pnpm ?? {}),
      onlyBuiltDependencies: Array.from(
        new Set([...existingOnlyBuiltDependencies, 'better-sqlite3'])
      ).sort(),
    },
  };
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
      ...(scope.packageJsonStrapi ?? {}),
      uuid: scope.uuid,
      installId: scope.installId,
    },
    engines,
    ...getPnpmOnlyBuiltDependencies(scope, existingPkg),
  };

  // copy templates
  await fse.writeJSON(pkgJSONPath, sortPackageJson(merge(existingPkg, pkg)), {
    spaces: 2,
  });
}
