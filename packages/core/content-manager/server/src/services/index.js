'use strict';

const components = require('./components');
const contentTypes = require('./content-types');
const dataMapper = require('./data-mapper');
const entityManager = require('./entity-manager');
const fieldSizes = require('./field-sizes');
const metrics = require('./metrics');
const permissionChecker = require('./permission-checker');
const permission = require('./permission');
const populateBuilder = require('./populate-builder');
const uid = require('./uid');

module.exports = {
  components,
  'content-types': contentTypes,
  'data-mapper': dataMapper,
  'entity-manager': entityManager,
  'field-sizes': fieldSizes,
  metrics,
  'permission-checker': permissionChecker,
  permission,
  'populate-builder': populateBuilder,
  uid,
};
