'use strict';

const config = require('./server/config');
const contentTypes = require('./server/content-types');
const controllers = require('./server/controllers');
const register = require('./server/register');
const routes = require('./server/routes');

module.exports = () => {
  return {
    register,
    config,
    controllers,
    contentTypes,
    routes,
  };
};
