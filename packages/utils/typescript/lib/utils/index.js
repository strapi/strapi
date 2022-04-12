'use strict';

const isTypeScriptProject = require('./is-typescript-project');
const isTypeScriptProjectSync = require('./is-typescript-project-sync');
const getConfigPath = require('./get-config-path');
const reportDiagnostics = require('./report-diagnostics');
const resolveConfigOptions = require('./resolve-config-options');
const formatHost = require('./format-host');

module.exports = {
  isTypeScriptProject,
  isTypeScriptProjectSync,
  getConfigPath,
  reportDiagnostics,
  resolveConfigOptions,
  formatHost,
};
