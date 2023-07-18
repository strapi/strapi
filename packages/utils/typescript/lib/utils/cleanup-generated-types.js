'use strict';

const path = require('path');
const fse = require('fs');

const constants = require('../generators/constants');

/**
 * Delete the "generated" type' directory
 *
 * @param {Object} [options]
 * @param {string} [options.pwd]
 * @param {string} [options.rootDir]
 *
 * @returns {void}
 */
const cleanupGeneratedTypes = async (options = {}) => {
  const { pwd, rootDir = constants.TYPES_ROOT_DIR } = options;

  const registriesDir = path.join(pwd, rootDir, constants.GENERATED_OUT_DIR);

  fse.rmSync(registriesDir, { force: true, recursive: true });
};

module.exports = cleanupGeneratedTypes;
