'use strict';

const path = require('path');
const fs = require('fs');
const { templateConfiguration, env } = require('@strapi/utils');
const jiti = require('jiti')(__dirname);

const loadJsFile = file => {
  try {
    const jsModule = require(file);

    // call if function
    if (typeof jsModule === 'function') {
      return jsModule({ env });
    }

    return jsModule;
  } catch (error) {
    throw new Error(`Could not load js config file ${file}: ${error.message}`);
  }
};

const loadESModuleFile = file => {
  try {
    const esModule = jiti(file);

    if (!esModule || !esModule.default) {
      throw new Error(`The file has no default export`);
    }

    // call if function
    if (typeof esModule.default === 'function') {
      return esModule.default({ env });
    }

    return esModule.default;
  } catch (error) {
    throw new Error(`Could not load es/ts module config file ${file}: ${error.message}`);
  }
};

const loadJSONFile = file => {
  try {
    return templateConfiguration(JSON.parse(fs.readFileSync(file)));
  } catch (error) {
    throw new Error(`Could not load json config file ${file}: ${error.message}`);
  }
};

const loadFile = file => {
  const ext = path.extname(file);

  switch (ext) {
    case '.js':
    case '.cjs':
      return loadJsFile(file);
    case '.ts':
    case '.mjs':
      return loadESModuleFile(file);
    case '.json':
      return loadJSONFile(file);
    default:
      return {};
  }
};

module.exports = loadFile;
