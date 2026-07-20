import * as ts from 'typescript';

import { reportDiagnostics } from './report-diagnostics';

export const resolveConfigOptions = (configPath: string) => {
  // Parse the tsconfig.json file and resolve every file name & compiler options
  const { errors, ...configOptions } = ts.getParsedCommandLineOfConfigFile(
    configPath,
    undefined,
    ts.sys as unknown as ts.ParseConfigFileHost
  )!;

  // If there are errors in the tsconfig.json
  // file, report them and exit early
  if (errors.length > 0) {
    reportDiagnostics(errors);
    process.exit(1);
  }

  return configOptions;
};
