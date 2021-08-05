'use strict';

const loadApis = require('./load-apis');
const loadPlugins = require('./load-plugins');
const loadMiddlewares = require('./load-middlewares');
const loadExtensions = require('./load-extensions');
const loadHooks = require('./load-hooks');
const bootstrap = require('./bootstrap');
const loadComponents = require('./load-components');

module.exports = {
  loadApis,
  loadPlugins,
  loadMiddlewares,
  loadHooks,
  loadExtensions,
  loadComponents,
  bootstrap,
};
