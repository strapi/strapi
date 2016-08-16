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

module.exports = scope => {
  const cliPkg = scope.strapiPackageJSON || {};

  // To determine the Strapi dependency to inject
  // in the newly created `package.json`.
  const frameworkPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'strapi', 'package.json'))) || {};

  // Finally, return the JSON.
  return _.merge(scope.appPackageJSON || {}, {
    'name': scope.name,
    'private': true,
    'version': '0.1.0',
    'description': 'A Strapi application.',
    'dependencies': {
      'async': getDependencyVersion(frameworkPkg, 'async'),
      'lodash': getDependencyVersion(frameworkPkg, 'lodash'),
      'socket.io': getDependencyVersion(frameworkPkg, 'socket.io'),
      'strapi': getDependencyVersion(cliPkg, 'strapi'),
      'strapi-mongoose': getDependencyVersion(cliPkg, 'strapi-mongoose')
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
  return module === packageJSON.name ? packageJSON.version : packageJSON.dependencies && packageJSON.dependencies[module];
}
