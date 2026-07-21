import path from 'node:path';
import { resolveConfigOptions } from './resolve-config-options';
import { isUsingTypeScript } from './is-using-typescript';

const DEFAULT_TS_CONFIG_FILENAME = 'tsconfig.json';
/**
 * Gets the outDir value from config file (tsconfig)
 */
export const resolveOutDir = async (
  dir: string,
  configFilename: string = DEFAULT_TS_CONFIG_FILENAME
): Promise<string | undefined> => {
  return (await isUsingTypeScript(dir))
    ? resolveConfigOptions(path.join(dir, configFilename)).options.outDir
    : undefined;
};
