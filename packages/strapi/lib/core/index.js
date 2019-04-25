'use strict';

const loadConfigs = require('./load-configs');
const loadApis = require('./load-apis');
const loadMiddlewares = require('./load-middlewares');
const loadExtensions = require('./load-extensions');
const loadHooks = require('./load-hooks');
const bootstrap = require('./bootstrap');
const admin = require('./admin');
const initCoreStore = require('./init-core-store');

module.exports = {
  loadConfigs,
  loadMiddlewares,
  loadHooks,
  loadApis,
  loadExtensions,
  bootstrap,
  admin,
  initCoreStore,
};
