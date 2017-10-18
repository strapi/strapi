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

  // Finally, return the JSON.
  return _.merge(scope.appPackageJSON || {}, {
    'name': `strapi-plugin-${scope.id}`,
    'version': '0.0.0',
    'description': 'This is the description of the plugin.',
    'strapi': {
      'name': scope.id,
      'icon': 'plug',
      'description': `Description of ${scope.id} plugin.`
    },
    'scripts': {
      'analyze:clean': 'rimraf stats.json',
      'preanalyze': 'npm run analyze:clean',
      'analyze': 'node node_modules/strapi-helper-plugin/lib/internals/scripts/analyze.js',
      'prebuild': 'npm run build:clean && npm run test',
      'build': 'cross-env NODE_ENV=production webpack --config node_modules/strapi-helper-plugin/lib/internals/webpack/webpack.prod.babel.js --color -p --progress',
      'build:clean': 'rimraf admin/build',
      'start': 'cross-env NODE_ENV=development node node_modules/strapi-helper-plugin/lib/server',
      'generate': 'plop --plopfile node_modules/strapi-helper-plugin/lib/internals/generators/index.js',
      'lint': 'eslint --ignore-path .gitignore --config node_modules/strapi-helper-plugin/lib/internals/eslint/.eslintrc.json admin',
      'pretest': 'npm run lint',
      'prettier': 'prettier --single-quote --trailing-comma es5 --write \"{admin,__{tests,mocks}__}/**/*.js\"',
      'test': 'echo Tests are not implemented.',
      'prepublish': 'npm run build',
      'postinstall': 'node node_modules/strapi-helper-plugin/lib/internals/scripts/postinstall.js'
    },
    'dependencies': {},
    'devDependencies': {
      'strapi-helper-plugin': '3.0.0-alpha.4.8'
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
      'node': '>= 7.0.0',
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
