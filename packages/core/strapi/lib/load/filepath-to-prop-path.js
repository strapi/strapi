'use strict';

const _ = require('lodash');

/**
 * Returns a path (as an array) from a file path
 * @param {string} filePath - a file path
 * @param {boolean} useFileNameAsKey - whether to skip the last path key
 */
module.exports = (filePath, useFileNameAsKey = true) => {
  let cleanPath = filePath.startsWith('./') ? filePath.slice(2) : filePath;

  const prop = cleanPath
    .replace(/(\.settings|\.json|\.js)/g, '')
    .toLowerCase()
    .split('/')
    .map(p => _.trimStart(p, '.'))
    .join('.')
    .split('.');

  return useFileNameAsKey === true ? prop : prop.slice(0, -1);
};
