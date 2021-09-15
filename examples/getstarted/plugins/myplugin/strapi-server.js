'use strict';

const config = require('./server/config');
const contentTypes = require('./server/content-types');
const controllers = require('./server/controllers');
const register = require('./server/register');

module.exports = () => {
  return {
    register,
    config,
    controllers,
    contentTypes,
  };
};
