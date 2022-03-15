'use strict';

const ts = require('typescript');

const reportDiagnostics = require('../utils/report-diagnostics');
const formatHost = require('../utils/format-host');
const resolveConfigOptions = require('../utils/resolve-config-options');

/**
 * Prints a diagnostic every time the watch status changes.
 * This is mainly for messages like "Starting compilation" or "Compilation completed".
 */
const reportWatchStatusChanged = diagnostic => {
  console.info(ts.formatDiagnostic(diagnostic, formatHost));
};

module.exports = {
  run(configPath) {
    const createProgram = ts.createSemanticDiagnosticsBuilderProgram;

    const { fileNames, options, projectReferences, watchOptions } = resolveConfigOptions(
      configPath
    );
    const host = ts.createWatchCompilerHost(
      fileNames,
      options,
      ts.sys,
      createProgram,
      reportDiagnostics,
      reportWatchStatusChanged,
      projectReferences,
      watchOptions
    );

    ts.createWatchProgram(host);
  },
};
