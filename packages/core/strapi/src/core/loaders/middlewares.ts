import { join, extname, basename } from 'path';
import fse from 'fs-extra';
import { importDefault } from '@strapi/utils';
import type { Strapi, Common } from '@strapi/types';
import { middlewares as internalMiddlewares } from '../../middlewares';

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

  const middlewares: Record<string, Common.MiddlewareFactory> = {};
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
