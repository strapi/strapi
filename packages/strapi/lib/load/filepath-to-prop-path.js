'use strict';

const path = require('path');
const _ = require('lodash');

/**
 * Returns a path (as an array) from a file path
 * @param {string} filePath - a file path
 * @param {boolean} useFileNameAsKey - wethear to skip the last path key
 */
module.exports = (filePath, useFileNameAsKey = true) => {
  const prop = path
    .normalize(filePath)
    .replace(/(\.settings|\.json|\.js)/g, '')
    .toLowerCase()
    .split('/')
    .map(p => _.trimStart(p, '.'))
    .join('.')
    .split('.');

  return useFileNameAsKey === true ? prop : prop.slice(0, -1);
};
