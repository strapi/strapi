'use strict';

const isTypeScriptProject = require('./is-typescript-project');
const getConfigPath = require('./get-config-path');
const reportDiagnostics = require('./report-diagnostics');
const resolveConfigOptions = require('./resolve-config-options');
const copyResources = require('./copy-resources');
const formatHost = require('./format-host');

const compilers = require('./compilers');
const commands = require('./commands');

module.exports = {
  isTypeScriptProject,
  getConfigPath,
  reportDiagnostics,
  resolveConfigOptions,
  copyResources,
  formatHost,

  compilers,
  commands,
};
