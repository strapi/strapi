'use strict';

const { nested, app } = require('./configurations');
const apis = require('./apis');
const plugins = require('./plugins');
const admin = require('./admin');
const middlewares = require('./middlewares');
const hooks = require('./hooks');

module.exports = {
  nestedConfigurations: nested,
  appConfigurations: app,
  apis,
  plugins,
  admin,
  middlewares,
  hooks
};
