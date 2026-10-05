import os from 'os';
import type ts from 'typescript';
import type { Logger } from './logger';

// Lazy: defer `typescript` (~115 ms) until a CLI command actually loads tsconfig
let lazyTs: typeof ts | undefined;
const tsLib = (): typeof ts => {
  if (!lazyTs) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    lazyTs = require('typescript');
  }
  return lazyTs as typeof ts;
};

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
  const configPath = tsApi.findConfigFile(cwd, tsApi.sys.fileExists, path);

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
