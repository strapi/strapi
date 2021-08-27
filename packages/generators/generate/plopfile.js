'use strict';

const pluralize = require('pluralize');

const generateApi = require('./plops/api');
const generateController = require('./plops/controller');
const generateModel = require('./plops/model');
const generatePlugin = require('./plops/plugin');
const generatePolicy = require('./plops/policy');
const generateService = require('./plops/service');

module.exports = plop => {
  // Plop config
  plop.setWelcomeMessage('Strapi Generators');
  plop.addHelper('pluralize', text => pluralize(text));

  // Generators
  generateApi(plop);
  generateController(plop);
  generateModel(plop);
  generatePlugin(plop);
  generatePolicy(plop);
  generateService(plop);
};
