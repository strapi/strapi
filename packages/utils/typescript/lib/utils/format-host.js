'use strict';

const ts = require('typescript');
const { identity } = require('lodash/fp');

/**
 * @type {ts.FormatDiagnosticsHost}
 */
const formatHost = {
  getCanonicalFileName: identity,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => ts.sys.newLine,
};

module.exports = formatHost;
