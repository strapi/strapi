'use strict';

const pluralize = require('pluralize');

const generateApi = require('./plops/api');
const generateController = require('./plops/controller');
const generateModel = require('./plops/model');
const generatePlugin = require('./plops/plugin');
const generatePolicy = require('./plops/policy');
const generateService = require('./plops/service');

module.exports = function(plop) {
  const rootDir = process.cwd();
  // Plop config
  plop.setWelcomeMessage('Strapi Generators');
  plop.addHelper('pluralize', text => pluralize(text));
  plop.setPrompt('recursive', require('inquirer-recursive'));

  // Generators
  generateApi(plop, rootDir);
  generateController(plop, rootDir);
  generateModel(plop, rootDir);
  generatePlugin(plop, rootDir);
  generatePolicy(plop, rootDir);
  generateService(plop, rootDir);
};
