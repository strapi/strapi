import { join } from 'path';
import { kebabCase, mergeWith } from 'lodash';
import fse from 'fs-extra';

import { engines } from './engines';
import { getPnpmOnlyBuiltDependencies, shouldUsePackageJsonPnpmConfig } from './pnpm-config';
import type { Scope } from '../types';

type PnpmPackageConfig = {
  onlyBuiltDependencies?: string[];
  [key: string]: unknown;
};

type PackageJson = {
  pnpm?: PnpmPackageConfig;
  [key: string]: unknown;
};

const mergePackageJson = (existingPkg: PackageJson, pkg: PackageJson) =>
  mergeWith({}, existingPkg, pkg, (_objValue, srcValue) => {
    if (Array.isArray(srcValue)) {
      return srcValue;
    }

    return undefined;
  });

const getPnpmPackageJsonConfig = (scope: Scope, existingPkg: PackageJson) => {
  if (scope.packageManager !== 'pnpm' || !shouldUsePackageJsonPnpmConfig(scope.pnpmVersion)) {
    return {};
  }

  const existingOnlyBuiltDependencies = Array.isArray(existingPkg.pnpm?.onlyBuiltDependencies)
    ? existingPkg.pnpm.onlyBuiltDependencies.filter((dep): dep is string => typeof dep === 'string')
    : [];

  return {
    pnpm: {
      ...(existingPkg.pnpm ?? {}),
      onlyBuiltDependencies: getPnpmOnlyBuiltDependencies(scope, existingOnlyBuiltDependencies),
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
    ...getPnpmPackageJsonConfig(scope, existingPkg),
  };

  // copy templates
  await fse.writeJSON(pkgJSONPath, sortPackageJson(mergePackageJson(existingPkg, pkg)), {
    spaces: 2,
  });
}
