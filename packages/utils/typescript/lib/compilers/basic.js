'use strict';

const ts = require('typescript');
const { merge } = require('lodash');

const reportDiagnostics = require('../utils/report-diagnostics');
const resolveConfigOptions = require('../utils/resolve-config-options');

module.exports = {
  /**
   * Default TS -> JS Compilation for Strapi
   * @param {string} tsConfigPath
   * @param {Object} configOptions
   * @param {Array.<string>} configOptions.fileNames
   * @param {Object} configOptions.options
   */
  run(tsConfigPath, configOptions = {}) {
    // Parse the tsconfig.json file & resolve the configuration options
    const { fileNames, options, projectReferences } = resolveConfigOptions(tsConfigPath);

    const program = ts.createProgram({
      rootNames: configOptions.fileNames ? configOptions.fileNames : fileNames,
      projectReferences,
      options: merge(options, configOptions.options),
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
