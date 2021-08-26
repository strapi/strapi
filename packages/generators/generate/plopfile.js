'use strict';

const pluralize = require('pluralize');

const api = require('./plops/api');
const controller = require('./plops/controller');
const model = require('./plops/model');
const plugin = require('./plops/plugin');
const policy = require('./plops/policy');
const service = require('./plops/service');

module.exports = function(plop) {
  const rootDir = process.cwd();
  // Plop config
  plop.setWelcomeMessage('Strapi Generators');
  plop.addHelper('pluralize', text => pluralize(text));
  plop.setPrompt('recursive', require('inquirer-recursive'));

  // Generators
  api(plop, rootDir);
  controller(plop, rootDir);
  model(plop, rootDir);
  plugin(plop, rootDir);
  policy(plop, rootDir);
  service(plop, rootDir);
};
