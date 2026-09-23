import fse from 'fs-extra';

import { getConfigPath } from './get-config-path';

/**
 * Checks if `dir` is a using TypeScript (whether there is a tsconfig file or not)
 */
export const isUsingTypeScriptSync = (
  dir: string,
  filename: string | undefined = undefined
): boolean => {
  const filePath = getConfigPath(dir, { filename });

  return filePath ? fse.pathExistsSync(filePath) : false;
};
