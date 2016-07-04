'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');
const path = require('path');

// Public node modules.
const _ = require('lodash');

/**
 * Expose main package JSON of the application
 * with basic info, dependencies, etc.
 */

module.exports = function dataForPackageJSON(scope) {
  const cliPkg = scope.strapiPackageJSON || {};

  // To determine the Strapi dependency to inject
  // in the newly created `package.json`.
  const frameworkPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'strapi', 'package.json'))) || {};
  const knexPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'strapi-knex', 'package.json'))) || {};
  
  // Finally, return the JSON.
  return _.merge(scope.appPackageJSON || {}, {
    'name': scope.name,
    'private': true,
    'version': '0.1.0',
    'description': 'A Strapi application.',
    'dependencies': {
      'async': getDependencyVersion(frameworkPkg, 'async'),
      'lodash': getDependencyVersion(frameworkPkg, 'lodash'),
      'knex': getDependencyVersion(knexPkg, 'knex'),
      'socket.io': getDependencyVersion(frameworkPkg, 'socket.io'),
      'sqlite3': getDependencyVersion(knexPkg, 'sqlite3'),
      'strapi': getDependencyVersion(cliPkg, 'strapi'),
      'strapi-bookshelf': getDependencyVersion(cliPkg, 'strapi-bookshelf'),
      'strapi-knex': getDependencyVersion(cliPkg, 'strapi-knex')
    },
    'main': './server.js',
    'scripts': {
      'start': 'node server.js'
    },
    'author': {
      'name': scope.author || 'A Strapi developer',
      'email': scope.email || '',
      'url': scope.website || ''
    },
    'maintainers': [{
      'name': scope.author || 'A Strapi developer',
      'email': scope.email || '',
      'url': scope.website || ''
    }],
    'engines': {
      'node': '>= 4.0.0',
      'npm': '>= 3.0.0'
    },
    'license': scope.license || 'MIT'
  });
};

/**
 * Get dependencies version
 */

function getDependencyVersion(packageJSON, module) {
  return (
    packageJSON.dependencies && packageJSON.dependencies[module]
  );
}
