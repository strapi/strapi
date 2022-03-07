'use strict';

const ts = require('typescript');

const reportDiagnostics = require('../report-diagnostics');
const resolveConfigOptions = require('../resolve-config-options');

module.exports = {
  /**
   * Default TS -> JS Compilation for Strapi
   * @param {string} tsConfigPath
   */
  run(tsConfigPath) {
    // Parse the tsconfig.json file & resolve the configuration options
    const { fileNames, options, projectReferences } = resolveConfigOptions(tsConfigPath);

    const program = ts.createProgram({
      rootNames: fileNames,
      projectReferences,
      options,
    });

    const emitResults = program.emit();

    const diagnostics = ts.sortAndDeduplicateDiagnostics(
      ts.getPreEmitDiagnostics(program).concat(emitResults.diagnostics)
    );

    if (diagnostics.length > 0) {
      reportDiagnostics(diagnostics);
    }

    // If the compilation failed, exit early
    if (emitResults.emitSkipped) {
      process.exit(1);
    }
  },
};
