'use strict';

const ts = require('typescript');

const { reportDiagnostics } = require('./report-diagnostics');

const resolveConfigOptions = (configPath) => {
  // Parse the tsconfig.json file and resolve every file name & compiler options
  const { errors, ...configOptions } = ts.getParsedCommandLineOfConfigFile(
    configPath,
    undefined,
    ts.sys
  );

  // If there are errors in the tsconfig.json
  // file, report them and exit early
  if (errors.length > 0) {
    reportDiagnostics(errors);
    process.exit(1);
  }

  return configOptions;
};

module.exports = { resolveConfigOptions };
