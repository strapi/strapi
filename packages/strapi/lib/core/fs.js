'use strict';

const path = require('path');
const fs = require('fs-extra');

/**
 * create strapi fs layer
 */
module.exports = strapi => {
  const strapiFS = {
    /**
     * Writes a file in a strapi app
     * @param {Array|string} optPath - file path
     * @param {string} data - content
     */
    writeAppFile(optPath, data) {
      const filePath = Array.isArray(optPath) ? optPath.join('/') : optPath;

      const normalizedPath = path
        .normalize(filePath)
        .replace(/^(\/?\.\.?)+/, '');

      const writePath = path.join(strapi.dir, normalizedPath);

      return fs.ensureFile(writePath).then(() => fs.writeFile(writePath, data));
    },

    /**
     * Writes a file in a plugin extensions folder
     * @param {string} plugin - plugin name
     * @param {Array|string} optPath - path to file
     * @param {string} data - content
     */
    writePluginFile(plugin, optPath, data) {
      const newPath = ['extensions', plugin].concat(optPath).join('/');
      return strapiFS.writeAppFile(newPath, data);
    },
  };

  return strapiFS;
};
