'use strict';

const createContentAPIGenerator = require('./generators/content-api');

module.exports = strapi => ({
  generateContentAPISchema: createContentAPIGenerator(strapi),
});
