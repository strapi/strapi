'use strict';

const contentTypes = require('./content-types');
const components = require('./components');
const componentCategories = require('./component-categories');
const builder = require('./builder');
const apiHandler = require('./api-handler');

module.exports = {
  'content-types': contentTypes,
  components,
  'component-categories': componentCategories,
  builder,
  'api-handler': apiHandler,
};
