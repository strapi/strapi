'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

module.exports = dir => {
  if (!fs.existsSync(dir)) return {};

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(file => file.isFile())
    .reduce((acc, file) => {
      const key = path.basename(file.name, path.extname(file.name));

      acc[key] = loadPolicy(path.resolve(dir, file.name));

      return acc;
    }, {});
};

const loadPolicy = file => {
  try {
    const policy = require(file);

    assert(typeof policy === 'function', 'Policy must be a function.');

    return policy;
  } catch (error) {
    throw `Could not load policy ${file}: ${error.message}`;
  }
};
