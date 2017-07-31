'use strict';

const { nested, app } = require('./configurations');
const apis = require('./apis');
const middlewares = require('./middlewares');
const hooks = require('./hooks');

module.exports = {
  nestedConfigurations: nested,
  appConfigurations: app,
  apis,
  middlewares,
  hooks
};
