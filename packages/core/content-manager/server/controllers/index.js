'use strict';

const collectionTypes = require('./collection-types');
const components = require('./components');
const contentTypes = require('./content-types');
const init = require('./init');
const relations = require('./relations');
const singleTypes = require('./single-types');
const uid = require('./uid');

module.exports = {
  'collection-types': collectionTypes,
  components,
  'content-types': contentTypes,
  init,
  relations,
  'single-types': singleTypes,
  uid,
};
