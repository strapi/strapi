'use strict';

const ts = require('typescript');

const formatHost = require('./format-host');

/**
 * Report one or several diagnostic to the console
 * @param {ts.Diagnostic[] | ts.Diagnostic} diagnostics
 */
module.exports = diagnostics => {
  const formattedDiagnostics = ts.formatDiagnosticsWithColorAndContext(
    Array.isArray(diagnostics) ? diagnostics : [diagnostics],
    formatHost
  );

  console.error(formattedDiagnostics);
  console.info(`Found ${diagnostics.length} error(s).${ts.sys.newLine}`);
};
