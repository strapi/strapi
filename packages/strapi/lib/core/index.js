'use strict';

const { nested, app } = require('./configurations');
const apis = require('./apis');
const middlewares = require('./middlewares');
const hooks = require('./hooks');
const plugins = require('./plugins');

module.exports = {
  nestedConfigurations: nested,
  appConfigurations: app,
  apis,
  middlewares,
  hooks,
  plugins
};
