import os from 'os';
import ts from 'typescript';
import type { Logger } from './logger';

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
  const configPath = ts.findConfigFile(cwd, ts.sys.fileExists, path);

  if (!configPath) {
    return undefined;
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, cwd);

  logger.debug(`Loaded user TS config:`, os.EOL, parsedConfig);

  return {
    config: parsedConfig,
    path: configPath,
  };
};

export { loadTsConfig };
export type { TsConfig };
