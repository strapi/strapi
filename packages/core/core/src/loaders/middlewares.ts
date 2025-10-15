import { join, extname, basename } from 'path';
import fse from 'fs-extra';
import { importDefault } from '@strapi/utils';
import type { Core } from '@strapi/types';
import { middlewares as internalMiddlewares } from '../middlewares';

// TODO:: allow folders with index.js inside for bigger policies
export default async function loadMiddlewares(strapi: Core.Strapi) {
  const localMiddlewares = await loadLocalMiddlewares(strapi);

  strapi.log.debug(
    `loadMiddlewares: adding global middlewares: ${Object.keys(localMiddlewares).join(', ')}`
  );
  strapi.get('middlewares').add(`global::`, localMiddlewares, { force: true });

  strapi.log.debug(
    `loadMiddlewares: adding strapi middlewares: ${Object.keys(internalMiddlewares).join(', ')}`
  );
  strapi.get('middlewares').add(`strapi::`, internalMiddlewares, { force: true });
}

const loadLocalMiddlewares = async (strapi: Core.Strapi) => {
  const dir = strapi.dirs.dist.middlewares;

  if (!(await fse.pathExists(dir))) {
    return {};
  }

  const middlewares: Record<string, Core.MiddlewareFactory> = {};
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
