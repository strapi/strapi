'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/**
 * Expose main package JSON of the application
 * with basic info, dependencies, etc.
 */

module.exports = scope => {
  const cliPkg = scope.strapiPackageJSON || {};

  // Let us install additional dependencies on a specific version.
  // Ex: it allows us to install the right version of knex.
  const additionalsDependencies = _.isArray(scope.additionalsDependencies) ?
    scope.additionalsDependencies.reduce((acc, current) => {
      const pkg = current.split('@');
      const name = pkg[0];
      const version = pkg[1] || 'latest';

      acc[name] = name.indexOf('strapi') !== -1 ? getDependencyVersion(cliPkg, 'strapi') : version;

      return acc;
    }, {}) : {};

  // Finally, return the JSON.
  return _.merge(scope.appPackageJSON || {}, {
    'name': scope.name,
    'private': true,
    'version': '0.1.0',
    'description': 'A Strapi application.',
    'scripts': {
      'develop': 'strapi develop',
      'start': 'strapi start',
      'build': 'strapi build',
      'strapi': 'strapi', // Allow to use `npm run strapi` CLI,
      'lint': 'eslint api/**/*.js config/**/*.js plugins/**/*.js'
    },
    'devDependencies': {
      'babel-eslint': '^7.1.1',
      'eslint': '^4.19.1',
      'eslint-config-airbnb': '^13.0.0',
      'eslint-plugin-import': '^2.11.0',
      'eslint-plugin-react': '^7.7.0'
    },
    'dependencies': Object.assign({}, {
      'lodash': '^4.17.5',
      'strapi': getDependencyVersion(cliPkg, 'strapi'),
      'strapi-admin': getDependencyVersion(cliPkg, 'strapi'),
      'strapi-utils': getDependencyVersion(cliPkg, 'strapi'),
      [scope.client.connector]: getDependencyVersion(cliPkg, 'strapi'),
    }, additionalsDependencies, {
      [scope.client.module]: scope.client.version
    }),
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
    'strapi': {
      'uuid': scope.uuid
    },
    'engines': {
      "node": "^10.0.0",
      "npm": ">= 6.0.0"
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
