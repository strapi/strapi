'use strict';

const pluralize = require('pluralize');

const generateApi = require('./plops/api');
const generateController = require('./plops/controller');
const generateContentType = require('./plops/content-type');
const generatePlugin = require('./plops/plugin');
const generatePolicy = require('./plops/policy');
const generateMiddleware = require('./plops/middleware');
const generateMigration = require('./plops/migration');
const generateService = require('./plops/service');

module.exports = (plop) => {
  // Plop config
  plop.setWelcomeMessage('Strapi Generators');
  plop.addHelper('pluralize', (text) => pluralize(text));

  // Generators
  generateApi(plop);
  generateController(plop);
  generateContentType(plop);
  generatePlugin(plop);
  generatePolicy(plop);
  generateMiddleware(plop);
  generateMigration(plop);
  generateService(plop);
};
