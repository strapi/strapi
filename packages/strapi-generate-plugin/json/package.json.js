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
      'icon': 'ion-document-text',
      'description': `Description of ${scope.id} plugin.`
    },
    'scripts': {
      'analyze:clean': 'node_modules/strapi-helper-plugin/node_modules/rimraf/bin.js stats.json',
      'preanalyze': 'npm run analyze:clean',
      'analyze': 'node node_modules/strapi-helper-plugin/lib/internals/scripts/analyze.js',
      'postinstall': 'npm run build:dll',
      'prebuild': 'npm run build:clean && npm run test',
      'build': 'node_modules/strapi-helper-plugin/node_modules/cross-env/bin/cross-env.js NODE_ENV=production node_modules/strapi-helper-plugin/node_modules/webpack/bin/webpack.js --config node_modules/strapi-helper-plugin/lib/internals/webpack/webpack.prod.babel.js --color -p --progress',
      'build:clean': 'node_modules/strapi-helper-plugin/node_modules/rimraf/bin.js admin/build',
      'build:dll': 'node node_modules/strapi-helper-plugin/lib/internals/scripts/dependencies.js',
      'start': 'node_modules/strapi-helper-plugin/node_modules/cross-env/bin/cross-env.js NODE_ENV=development node node_modules/strapi-helper-plugin/lib/server',
      'generate': 'node_modules/strapi-helper-plugin/node_modules/plop/plop.js --plopfile node_modules/strapi-helper-plugin/lib/internals/generators/index.js',
      'lint': 'node_modules/strapi-helper-plugin/node_modules/eslint/bin/eslint.js --ignore-path .gitignore --config node_modules/strapi-helper-plugin/lib/internals/eslint/.eslintrc.json admin',
      'pretest': 'npm run lint',
      'prettier': 'node_modules/strapi-helper-plugin/node_modules/prettier/bin/prettier.js --single-quote --trailing-comma es5 --write \'{admin,__{tests,mocks}__}/**/*.js\'',
      'test': 'echo Tests are not implemented.',
      'prepublish': 'npm run build'
    },
    'dependencies': {},
    'devDependencies': {
      'strapi-helper-plugin': '3.0.0-alpha.4'
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
