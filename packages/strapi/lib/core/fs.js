const path = require('path');
const fs = require('fs-extra');

/**
 * create strapi fs layer
 */
module.exports = strapi => {
  /**
   * Writes a file in a strapi app
   * @param {Array|string} optPath - file path
   * @param {string} data - content
   */
  const writeFile = (optPath, data) => {
    const filePath = Array.isArray(optPath) ? optPath.join('/') : optPath;

    const normalizedPath = path.normalize(filePath).replace(/^(\/?\.\.?)+/, '');

    const writePath = path.join(strapi.config.appPath, normalizedPath);

    return fs.ensureFile(writePath).then(() => fs.writeFile(writePath, data));
  };

  /**
   * Writes a file in a plugin extensions folder
   * @param {string} plugin - plugin name
   * @param {Array|string} optPath - path to file
   * @param {string} data - content
   */
  const writePluginFile = (plugin, optPath, data) => {
    const newPath = ['extensions', plugin].concat(optPath).join('/');
    return writeFile(newPath, data);
  };

  return {
    writeFile,
    writePluginFile,
  };
};
