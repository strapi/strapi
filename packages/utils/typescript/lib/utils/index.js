'use strict';

const isUsingTypeScript = require('./is-using-typescript');
const isUsingTypeScriptSync = require('./is-using-typescript-sync');
const getConfigPath = require('./get-config-path');
const reportDiagnostics = require('./report-diagnostics');
const resolveConfigOptions = require('./resolve-config-options');
const formatHost = require('./format-host');
const resolveOutDir = require('./resolve-outdir');

module.exports = {
  isUsingTypeScript,
  isUsingTypeScriptSync,
  getConfigPath,
  reportDiagnostics,
  resolveConfigOptions,
  formatHost,
  resolveOutDir,
};
