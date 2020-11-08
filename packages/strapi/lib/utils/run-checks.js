const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');

const requiredPaths = ['api', 'extensions', 'plugins', 'config', 'public'];
const checkFoldersExist = ({ appPath }) => {
  let missingPaths = [];
  for (let reqPath of requiredPaths) {
    if (!fs.pathExistsSync(path.resolve(appPath, reqPath))) {
      missingPaths.push(reqPath);
    }
  }

  if (missingPaths.length > 0) {
    throw new Error(
      `Missing required folders:\n${missingPaths
        .map(p => `- ./${p}`)
        .join('\n')}`
    );
  }
};

const checkPluginsConflicts = ({ appPath, installedPlugins }) => {
  const localPluginNames = fs.readdirSync(path.resolve(appPath, 'plugins'));
  const pluginsIntersection = _.intersection(
    localPluginNames,
    installedPlugins
  );

  if (pluginsIntersection.length > 0) {
    throw new Error(
      `You have some local plugins with the same name as npm installed plugins:\n${pluginsIntersection
        .map(p => `- ${p}`)
        .join('\n')}`
    );
  }
};

module.exports = config => {
  checkFoldersExist(config);
  checkPluginsConflicts(config);
};
