'use strict';

const path = require('path');
const fs = require('fs');
const { templateConfiguration, env } = require('@strapi/utils');

/**
 * @param {string} file
 */
const loadJsFile = file => {
  try {
    const jsModule = require(file);

    // call if function
    if (typeof jsModule === 'function') {
      return jsModule({ env });
    }

    return jsModule;
  } catch (/** @type {any} **/ error) {
    throw new Error(`Could not load js config file ${file}: ${error.message}`);
  }
};

/**
 * @param {string} file
 */
const loadJSONFile = file => {
  try {
    return templateConfiguration(JSON.parse(fs.readFileSync(file).toString()));
  } catch (/** @type {any} **/ error) {
    throw new Error(`Could not load json config file ${file}: ${error.message}`);
  }
};

/**
 * @param {string} file
 */
const loadFile = file => {
  const ext = path.extname(file);

  switch (ext) {
    case '.js':
      return loadJsFile(file);
    case '.json':
      return loadJSONFile(file);
    default:
      return {};
  }
};

module.exports = loadFile;
