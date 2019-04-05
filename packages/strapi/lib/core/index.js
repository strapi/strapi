'use strict';

const { loadConfigs, app } = require('./configurations');
const loadApis = require('./apis');
const loadMiddlewares = require('./middlewares');
const loadHooks = require('./hooks');
const plugins = require('./plugins');
const admin = require('./admin');
const store = require('./store');

module.exports = {
  loadConfigs,
  loadMiddlewares,
  loadHooks,
  loadApis,
  appConfigurations: app,
  plugins,
  admin,
  store,
};
