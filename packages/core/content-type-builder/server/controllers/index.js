'use strict';

const builder = require('../../controllers/builder');
const componentCategories = require('../../controllers/component-categories');
const components = require('../../controllers/components');
const contentTypes = require('../../controllers/content-types');

module.exports = {
  builder,
  'component-categories': componentCategories,
  components,
  'content-types': contentTypes,
};
