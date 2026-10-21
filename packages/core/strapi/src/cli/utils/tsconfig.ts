import os from 'os';
import type ts from 'typescript';
import type { Logger } from './logger';
import { lazyInit } from './lazy-init';

// Lazy: defer `typescript` (~115 ms) until a CLI command actually loads tsconfig
const tsLib = lazyInit((): typeof ts => require('typescript'));
const tsUtilsLib = lazyInit((): typeof import('@strapi/typescript-utils') =>
  require('@strapi/typescript-utils')
);

interface TsConfig {
  config: ts.ParsedCommandLine;
  path: string;
}

/**
 * @description Load a tsconfig.json file and return the parsed config.
 *
 * @internal
 */
const loadTsConfig = ({
  cwd,
  path,
  logger,
}: {
  cwd: string;
  path: string;
  logger: Logger;
}): TsConfig | undefined => {
  const tsApi = tsLib();
  // Only accept a tsconfig inside `cwd`, never one inherited from a parent directory
  const configPath = tsUtilsLib().getConfigPath(cwd, { filename: path });

  if (!configPath) {
    return undefined;
  }

  const configFile = tsApi.readConfigFile(configPath, tsApi.sys.readFile);

  const parsedConfig = tsApi.parseJsonConfigFileContent(configFile.config, tsApi.sys, cwd);

  logger.debug(`Loaded user TS config:`, os.EOL, parsedConfig);

  return {
    config: parsedConfig,
    path: configPath,
  };
};

export { loadTsConfig };
export type { TsConfig };
