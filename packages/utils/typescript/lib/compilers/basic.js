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
   * @param {boolean} configOptions.ignoreDiagnostics
   */
  run(tsConfigPath, configOptions = {}) {
    const { ignoreDiagnostics = false } = configOptions;
    // Parse the tsconfig.json file & resolve the configuration options
    const { fileNames, options, projectReferences } = resolveConfigOptions(tsConfigPath);

    const compilerOptions = merge(options, configOptions.options);

    if (ignoreDiagnostics) {
      Object.assign(compilerOptions, { noEmit: false, noEmitOnError: false });
    }

    const program = ts.createProgram({
      rootNames: configOptions.fileNames ? configOptions.fileNames : fileNames,
      projectReferences,
      options: compilerOptions,
    });

    const emitResults = program.emit();

    const diagnostics = ts.sortAndDeduplicateDiagnostics(
      ts.getPreEmitDiagnostics(program).concat(emitResults.diagnostics)
    );

    if (!ignoreDiagnostics && diagnostics.length > 0) {
      reportDiagnostics(diagnostics);
    }

    // If the compilation failed and diagnostics are not ignored, exit early
    if (!ignoreDiagnostics && emitResults.emitSkipped) {
      process.exit(1);
    }
  },
};
