'use strict';

const { prop } = require('lodash/fp');
const parseBody = require('./parse-body');
const wrapBadRequest = require('./wrap-bad-request');

// retrieve a local service
const getService = name => {
  return prop(`content-manager.services.${name}`, strapi.plugins);
};

module.exports = {
  getService,
  parseBody,
  wrapBadRequest,
};
