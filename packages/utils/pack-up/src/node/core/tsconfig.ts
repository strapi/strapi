import os from 'os';
import nodePath from 'path';
import ts from 'typescript';

import { Logger } from './logger';

/**
 * @description Load a tsconfig.json file and return the parsed config
 * after injecting some required defaults for producing types.
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
}):
  | {
      config: ts.ParsedCommandLine;
      path: string;
    }
  | undefined => {
  const providedPath = path.split(nodePath.sep);
  const [configFileName] = providedPath.slice(-1);
  const pathToConfig = nodePath.join(cwd, providedPath.slice(0, -1).join(nodePath.sep));

  const configPath = ts.findConfigFile(pathToConfig, ts.sys.fileExists, configFileName);

  if (!configPath) {
    return undefined;
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, pathToConfig);

  logger.debug(`Loaded user TS config:`, os.EOL, parsedConfig);

  const { outDir } = parsedConfig.raw.compilerOptions;

  if (!outDir) {
    throw new Error("tsconfig.json is missing 'compilerOptions.outDir'");
  }

  parsedConfig.options = {
    ...parsedConfig.options,
    declaration: true,
    declarationDir: outDir,
    emitDeclarationOnly: true,
    noEmit: false,
    outDir,
  };

  logger.debug(`Using TS config:`, os.EOL, parsedConfig);

  return {
    config: parsedConfig,
    path: configPath,
  };
};

export { loadTsConfig };
