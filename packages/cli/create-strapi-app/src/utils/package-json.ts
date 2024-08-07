import { join } from 'path';
import { kebabCase, merge } from 'lodash';
import fse from 'fs-extra';

import { engines } from './engines';
import type { Scope } from '../types';

export async function createPackageJSON(scope: Scope) {
  const { sortPackageJson } = await import('sort-package-json');

  const pkgJSONPath = join(scope.rootPath, 'package.json');

  const existingPkg = await fse.readJSON(pkgJSONPath).catch(() => ({}));

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
    },
    engines,
  };

  // copy templates
  await fse.writeJSON(pkgJSONPath, sortPackageJson(merge(existingPkg, pkg)), {
    spaces: 2,
  });
}
