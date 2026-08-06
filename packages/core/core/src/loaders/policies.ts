import { join, extname, basename } from 'path';
import fse from 'fs-extra';
import { importDefault } from '@strapi/utils';

import type { Core } from '@strapi/types';

/**
 * Path-parametric core: load `.js` policies from `dir` and register them under
 * the `global::` namespace. Shared by the legacy wrapper and `fromDisk(path)`.
 */
// TODO:: allow folders with index.js inside for bigger policies
export async function loadPoliciesFromDir(strapi: Core.Strapi, dir: string) {
  if (!(await fse.pathExists(dir))) {
    return;
  }

  const policies: Record<string, Core.Policy> = {};
  const paths = await fse.readdir(dir, { withFileTypes: true });

  for (const fd of paths) {
    const { name } = fd;
    const fullPath = join(dir, name);

    if (fd.isFile() && extname(name) === '.js') {
      const key = basename(name, '.js');
      policies[key] = importDefault(fullPath);
    }
  }

  strapi.get('policies').add(`global::`, policies);
}

export default async function loadPolicies(strapi: Core.Strapi) {
  return loadPoliciesFromDir(strapi, strapi.dirs.dist.policies);
}
