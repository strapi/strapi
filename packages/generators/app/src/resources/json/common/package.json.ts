import { join } from 'path';
import { kebabCase } from 'lodash';
import fse from 'fs-extra';

import engines from './engines';
import type { Scope } from '../../../types';

export default async (scope: Scope) => {
  const pkg = {
    name: kebabCase(scope.name),
    private: true,
    version: '0.1.0',
    description: 'A Strapi application',
    scripts: {
      develop: 'strapi develop',
      start: 'strapi start',
      build: 'strapi build',
      strapi: 'strapi',
      deploy: 'strapi deploy',
    },
    devDependencies: scope.devDependencies,
    dependencies: scope.dependencies,
    author: {
      name: 'A Strapi developer',
    },
    strapi: {
      ...scope.packageJsonStrapi,
      uuid: scope.uuid,
    },
    engines,
    license: 'MIT',
  };

  // copy templates
  await fse.writeJSON(join(scope.rootPath, 'package.json'), pkg, {
    spaces: 2,
  });
};
