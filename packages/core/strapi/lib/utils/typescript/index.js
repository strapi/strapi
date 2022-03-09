'use strict';

const isTypeScriptProject = require('./is-typescript-project');
const getConfigPath = require('./get-config-path');
const reportDiagnostics = require('./report-diagnostics');
const resolveConfigOptions = require('./resolve-config-options');
const copyResources = require('./copy-resources');
const formatHost = require('./format-host');
const compile = require('./compile');

const compilers = require('./compilers');

module.exports = {
  isTypeScriptProject,
  getConfigPath,
  reportDiagnostics,
  resolveConfigOptions,
  copyResources,
  formatHost,
  compile,

  compilers,
};
