import fse from 'fs-extra';

import { getConfigPath } from './get-config-path';

/**
 * Checks if `dir` is a using TypeScript (whether there is a tsconfig file or not)
 */
export const isUsingTypeScript = (
  dir: string,
  filename: string | undefined = undefined
): Promise<boolean> => {
  const filePath = getConfigPath(dir, { filename });

  return fse.pathExists(filePath as string);
};
