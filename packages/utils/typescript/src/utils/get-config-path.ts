import path from 'node:path';
import * as ts from 'typescript';

const DEFAULT_TS_CONFIG_FILENAME = 'tsconfig.json';

interface GetConfigPathOptions {
  filename?: string;
  ancestorsLookup?: boolean;
}

/**
 * Get the path of the typescript config file for a given directory
 */
export const getConfigPath = (
  dir: string,
  { filename = DEFAULT_TS_CONFIG_FILENAME, ancestorsLookup = false }: GetConfigPathOptions = {}
): string | undefined => {
  const dirAbsolutePath = path.resolve(dir);
  let configFilePath = ts.findConfigFile(dirAbsolutePath, ts.sys.fileExists, filename);

  if (configFilePath) configFilePath = path.resolve(configFilePath);

  if (!configFilePath || ancestorsLookup) {
    return configFilePath;
  }

  const relativePath = path.relative(dirAbsolutePath, configFilePath);
  const isOutsideDirectory =
    relativePath === '..' ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath);

  return isOutsideDirectory ? undefined : configFilePath;
};
