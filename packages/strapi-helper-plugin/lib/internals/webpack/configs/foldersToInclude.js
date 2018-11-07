const path = require('path');
const paths = require('./paths');
const plugins = require('./plugins');

const foldersToInclude = [path.join(paths.adminPath, 'admin', 'src')]
  .concat(
    plugins.src.reduce((acc, current) => {
      acc.push(path.resolve(paths.appPath, 'plugins', current, 'admin', 'src'), plugins.folders[current]);
      return acc;
    }, []),
  )
  .concat([path.join(paths.adminPath, 'node_modules', 'strapi-helper-plugin', 'lib', 'src')]);

module.exports = foldersToInclude; 