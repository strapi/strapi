import * as fse from 'fs-extra';
import os from 'os';
import pkgUp from 'pkg-up';
import { validatePkg, PackageJson } from '@strapi/utils';
import { Logger } from '../services/logger';

/**
 * @description being a task to load the package.json starting from the current working directory
 * using a shallow find for the package.json and `fs` to read the file. If no package.json is found,
 * the process will throw with an appropriate error message.
 */
const loadPkg = async ({ cwd, logger }: { cwd: string; logger: Logger }): Promise<PackageJson> => {
  const pkgPath = await pkgUp({ cwd });

  if (!pkgPath) {
    throw new Error('Could not find a package.json in the current directory');
  }

  const buffer = await fse.readFile(pkgPath);
  const pkg = JSON.parse(buffer.toString());

  logger.debug('Loaded package.json:', os.EOL, pkg);

  return pkg;
};

export type { PackageJson };
export { loadPkg, validatePkg };
