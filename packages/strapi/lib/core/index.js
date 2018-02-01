'use strict';

const { nested, app } = require('./configurations');
const apis = require('./apis');
const middlewares = require('./middlewares');
const hooks = require('./hooks');
const plugins = require('./plugins');
const admin = require('./admin');
const configs = require('./configs');

module.exports = {
  nestedConfigurations: nested,
  appConfigurations: app,
  apis,
  middlewares,
  hooks,
  plugins,
  admin,
  configs
};
