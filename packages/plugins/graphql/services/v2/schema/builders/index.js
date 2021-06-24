'use strict';

const enums = require('./enums');
const dynamicZone = require('./dynamic-zones');

const entity = require('./entity');
const entityMeta = require('./entity-meta');
const type = require('./type');

const response = require('./response');
const responseCollection = require('./response-collection');

const queries = require('./queries');

const args = require('./args');

module.exports = {
  ...enums,
  ...dynamicZone,

  ...entity,
  ...entityMeta,
  ...type,

  ...response,
  ...responseCollection,

  ...queries,

  ...args,
};
