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
      'analyze:clean': 'node ./node_modules/strapi-helper-plugin/node_modules/.bin/rimraf stats.json',
      'preanalyze': 'npm run analyze:clean',
      'analyze': 'node ./node_modules/strapi-helper-plugin/lib/internals/scripts/analyze.js',
      'prebuild': 'npm run build:clean',
      'build:dev': 'node ./node_modules/strapi-helper-plugin/node_modules/.bin/cross-env NODE_ENV=development node ./node_modules/strapi-helper-plugin/node_modules/.bin/webpack --config node_modules/strapi-helper-plugin/lib/internals/webpack/webpack.prod.babel.js --color -p --progress',
      'build': 'node ./node_modules/strapi-helper-plugin/node_modules/.bin/cross-env NODE_ENV=production node node_modules/strapi-helper-plugin/node_modules/.bin/webpack --config node_modules/strapi-helper-plugin/lib/internals/webpack/webpack.prod.babel.js --color -p --progress',
      'build:clean': 'node ./node_modules/strapi-helper-plugin/node_modules/.bin/rimraf admin/build',
      'start': 'node ./node_modules/strapi-helper-plugin/node_modules/.bin/cross-env NODE_ENV=development node ./node_modules/strapi-helper-plugin/lib/server',
      'generate': 'node ./node_modules/plop/plop.js --plopfile node_modules/strapi-helper-plugin/lib/internals/generators/index.js',
      'lint': 'node ./node_modules/strapi-helper-plugin/node_modules/.bin/eslint --ignore-path .gitignore --ignore-pattern \'/admin/build/\' --config ./node_modules/strapi-helper-plugin/lib/internals/eslint/.eslintrc.json admin',
      'prettier': 'node ./node_modules/strapi-helper-plugin/node_modules/.bin/prettier --single-quote --trailing-comma es5 --write "{admin,__{tests,mocks}__}/**/*.js"',
      'test': 'npm run lint',
      'prepublishOnly': 'npm run build'
    },
    'dependencies': {},
    'devDependencies': {
      'strapi-helper-plugin': getDependencyVersion(cliPkg, 'strapi')
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
      "node": ">= 10.0.0",
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
