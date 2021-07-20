'use strict';

const contenttypes = require('../../services/ContentTypes');
const components = require('../../services/Components');
const componentcategories = require('../../services/ComponentCategories');
const builder = require('../../services/Builder');
const apiHandler = require('../../services/api-handler');

module.exports = {
  contenttypes,
  components,
  componentcategories,
  builder,
  'api-handler': apiHandler,
};
