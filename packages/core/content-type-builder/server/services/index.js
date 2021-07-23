'use strict';

const contentTypes = require('../../services/content-types');
const components = require('../../services/components');
const componentCategories = require('../../services/component-categories');
const builder = require('../../services/builder');
const apiHandler = require('../../services/api-handler');

module.exports = {
  'content-types': contentTypes,
  components,
  'component-categories': componentCategories,
  builder,
  'api-handler': apiHandler,
};
