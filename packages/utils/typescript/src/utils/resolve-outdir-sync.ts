import path from 'node:path';
import { resolveConfigOptions } from './resolve-config-options';
import { isUsingTypeScriptSync } from './is-using-typescript-sync';

const DEFAULT_TS_CONFIG_FILENAME = 'tsconfig.json';
/**
 * Gets the outDir value from config file (tsconfig)
 */
export const resolveOutDirSync = (
  dir: string,
  configFilename: string = DEFAULT_TS_CONFIG_FILENAME
): string | undefined => {
  return isUsingTypeScriptSync(dir)
    ? resolveConfigOptions(path.join(dir, configFilename)).options.outDir
    : undefined;
};
