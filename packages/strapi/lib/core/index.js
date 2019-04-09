'use strict';

const loadConfigs = require('./load-configs');
const loadApis = require('./load-apis');
const loadMiddlewares = require('./load-middlewares');
const loadHooks = require('./load-hooks');
const bootstrap = require('./bootstrap');
const plugins = require('./plugins');
const admin = require('./admin');
const store = require('./store');

module.exports = {
  loadConfigs,
  loadMiddlewares,
  loadHooks,
  loadApis,
  bootstrap,
  plugins,
  admin,
  store,
};
