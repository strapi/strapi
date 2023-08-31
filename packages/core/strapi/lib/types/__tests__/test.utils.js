'use strict';

const path = require('path');
const { fromFile } = require('ts-zen');

const DEFINITIONS_ROOT = path.join(__dirname, 'definitions');

/**
 *
 * @param {string} filePath
 *
 * @return {import('ts-zen').AssertTypeSelector}
 */
const createTypeSelector = (filePath) => {
  return fromFile(path.join(DEFINITIONS_ROOT, filePath), {
    compilerOptions: { strict: true },
    ignoreProjectOptions: true,
  });
};

module.exports = { createTypeSelector };
