'use strict';


const logDiagnostics = require('./report-diagnostics');

module.exports = (configPath) => {
  const ts = require('typescript');

  // Parse the tsconfig.json file and resolve every file name & compiler options
  const { errors, ...configOptions } = ts.getParsedCommandLineOfConfigFile(
    configPath,
    undefined,
    ts.sys
  );

  // If there are errors in the tsconfig.json
  // file, report them and exit early
  if (errors.length > 0) {
    logDiagnostics(errors);
    process.exit(1);
  }

  return configOptions;
};
