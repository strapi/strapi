'use strict';

const fs = require('fs');
const { join } = require('path');
const glob = require('glob');

const packagesFolder = join(__dirname, '../../../');

const asyncFilter = async (array, predicate) => {
  const results = await Promise.all(array.map(predicate));
  return array.filter((_, index) => results[index]);
};

const getPluginList = () => {
  return new Promise((resolve, reject) => {
    glob(
      '{core,plugins}/*',
      { ignore: ['**/node_modules'], cwd: packagesFolder },
      async (err, matches) => {
        if (err) {
          reject(err);
        }

        const extendsAdmin = match =>
          fs.promises
            .access(join(packagesFolder, match, 'admin'), fs.constants.W_OK)
            .then(() => true)
            .catch(() => false);

        resolve(await asyncFilter(matches, extendsAdmin));
      }
    );
  });
};

module.exports = getPluginList;
