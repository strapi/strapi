'use strict';

const path = require('path');
const fs = require('fs');

const loadFunctions = dir => {
  if (!fs.existsSync(dir)) return {};

  return fs.readdirSync(dir, { withFileTypes: true }).reduce((acc, file) => {
    const key = path.basename(file.name, path.extname(file.name));

    if (file.isFile()) {
      acc[key] = loadFunction(path.resolve(dir, file.name));
    } else if (file.isDirectory()) {
      acc[key] = loadFunctions(path.resolve(dir, file.name));
    }

    return acc;
  }, {});
};

const loadFunction = file => {
  try {
    return require(file);
  } catch (error) {
    throw `Could not load function ${file}: ${error.message}`;
  }
};

module.exports = loadFunctions;
