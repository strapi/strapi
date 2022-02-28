'use strict';

const builder = require('./builder');
const componentCategories = require('./component-categories');
const components = require('./components');
const contentTypes = require('./content-types');

module.exports = {
  builder,
  'component-categories': componentCategories,
  components,
  'content-types': contentTypes,
};
