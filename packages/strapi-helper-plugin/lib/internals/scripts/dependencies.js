/*eslint-disable*/

// No need to build the DLL in production
if (process.env.NODE_ENV === 'production') {
  process.exit(0);
}

require('shelljs/global');

const path = require('path');
const fs = require('fs');
const exists = fs.existsSync;
const writeFile = fs.writeFileSync;

const defaults = require('lodash/defaultsDeep');
const pkg = require(path.join(process.cwd(), 'package.json'));
const config = require('../config');
const dllConfig = defaults(pkg.dllPlugin, config.dllPlugin.defaults);
const outputPath = path.join(process.cwd(), dllConfig.path);
const dllManifestPath = path.join(outputPath, 'package.json');

/**
 * I use node_modules/strapi-plugin-dlls by default just because
 * it isn't going to be version controlled and babel wont try to parse it.
 */
mkdir('-p', outputPath);

echo('Building the Webpack DLL...');

/**
 * Create a manifest so npm install doesnt warn us
 */
if (!exists(dllManifestPath)) {
  writeFile(
    dllManifestPath,
    JSON.stringify(defaults({
      name: 'strapi-plugin-dlls',
      private: true,
      author: pkg.author,
      repository: pkg.repository,
      version: pkg.version
    }), null, 2),

    'utf8'
  )
}

// the BUILDING_DLL env var is set to avoid confusing the development environment
exec('./node_modules/strapi-helper-plugin/node_modules/cross-env/bin/cross-env.js BUILDING_DLL=true ./node_modules/strapi-helper-plugin/node_modules/webpack/bin/webpack.js --display-chunks --color --config ./node_modules/strapi-helper-plugin/lib/internals/webpack/webpack.dll.babel.js');
