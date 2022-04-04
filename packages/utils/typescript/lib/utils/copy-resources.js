'use strict';

const path = require('path');
const fse = require('fs-extra');

const DEFAULT_RESOURCES_PATHS = ['favicon.ico'];

module.exports = async (dir, resources = DEFAULT_RESOURCES_PATHS) => {
  await Promise.all(
    resources.map(resourceName => fse.copy(resourceName, path.join(dir, 'dist', resourceName)))
  );
};
