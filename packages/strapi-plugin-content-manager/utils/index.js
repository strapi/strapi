'use strict';

const { prop } = require('lodash/fp');
const wrapBadRequest = require('./wrap-bad-request');
const pickWritableAttributes = require('./pick-writable-attributes');

// retrieve a local service
const getService = name => {
  return prop(`content-manager.services.${name}`, strapi.plugins);
};

module.exports = {
  getService,
  wrapBadRequest,
  pickWritableAttributes,
};
