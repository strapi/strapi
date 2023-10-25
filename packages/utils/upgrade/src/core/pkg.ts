import pkgUp from 'pkg-up';
import fs from 'node:fs/promises';
import os from 'node:os';

import { Logger } from './logger';

// util copied from the packages/utils/pack-up package, without the yup validation

export const loadPkg = async ({
  cwd,
  logger,
}: {
  cwd: string;
  logger: Logger;
}): Promise<object> => {
  const pkgPath = await pkgUp({ cwd });

  if (!pkgPath) {
    throw new Error('Could not find a package.json in the current directory');
  }

  const buffer = await fs.readFile(pkgPath);

  const pkg = JSON.parse(buffer.toString());

  logger.debug('Loaded package.json:', os.EOL, pkg);

  return pkg;
};
