import { join, extname, basename } from 'path';
import fse from 'fs-extra';
import { importDefault } from '@strapi/utils';
import { Middleware, middlewares as internalMiddlewares } from '../../middlewares';

import type { Strapi } from '../../Strapi';

// TODO:: allow folders with index.js inside for bigger policies
export default async function loadMiddlewares(strapi: Strapi) {
  const localMiddlewares = await loadLocalMiddlewares(strapi);

  strapi.container.get('middlewares').add(`global::`, localMiddlewares);
  strapi.container.get('middlewares').add(`strapi::`, internalMiddlewares);
}

const loadLocalMiddlewares = async (strapi: Strapi) => {
  const dir = strapi.dirs.dist.middlewares;

  if (!(await fse.pathExists(dir))) {
    return {};
  }

  const middlewares: Record<string, Middleware> = {};
  const paths = await fse.readdir(dir, { withFileTypes: true });

  for (const fd of paths) {
    const { name } = fd;
    const fullPath = join(dir, name);

    if (fd.isFile() && extname(name) === '.js') {
      const key = basename(name, '.js');
      middlewares[key] = importDefault(fullPath);
    }
  }

  return middlewares;
};
