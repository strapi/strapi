'use strict';

const { identity } = require('lodash/fp');
const os = require('os');

/**
 * @type {ts.FormatDiagnosticsHost}
 */
const formatHost = {
  getCanonicalFileName: identity,
  getCurrentDirectory: () => process.cwd,
  getNewLine: () => os.EOL,
};

module.exports = formatHost;
