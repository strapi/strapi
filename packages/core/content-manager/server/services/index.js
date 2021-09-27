'use strict';

const components = require('./components');
const contentTypes = require('./content-types');
const dataMapper = require('./data-mapper');
const metrics = require('./metrics');
const permissionChecker = require('./permission-checker');
const permission = require('./permission');
const uid = require('./uid');
const entityManager = require('./entity-manager');

module.exports = {
  components,
  'content-types': contentTypes,
  'data-mapper': dataMapper,
  metrics,
  'permission-checker': permissionChecker,
  permission,
  uid,
  'entity-manager': entityManager,
};
