import { join, extname, basename } from 'path';
import fse from 'fs-extra';
import { importDefault } from '@strapi/utils';
import type { Core } from '@strapi/types';
import { middlewares as internalMiddlewares } from '../middlewares';

// TODO:: allow folders with index.js inside for bigger policies
export default async function loadMiddlewares(strapi: Core.Strapi) {
  const localMiddlewares = await loadLocalMiddlewaresFromDir(strapi, strapi.dirs.dist.middlewares);

  strapi.get('middlewares').add(`global::`, localMiddlewares);
  strapi.get('middlewares').add(`strapi::`, internalMiddlewares);
}

/**
 * Path-parametric core: read `.js` middleware factories from `dir` and return
 * them as a map (registration is left to the caller). Shared by the legacy
 * wrapper (`strapi.dirs.dist.middlewares`) and the programmatic `fromDisk`
 * resolver.
 */
export const loadLocalMiddlewaresFromDir = async (strapi: Core.Strapi, dir: string) => {
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
