'use strict';

const config = require('./server/config');
const contentTypes = require('./server/content-types');
const controllers = require('./server/controllers');

module.exports = () => {
  return {
    config,
    controllers,
    contentTypes,
  };
};
