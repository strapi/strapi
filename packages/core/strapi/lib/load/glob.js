'use strict';

const glob = require('glob');

/**
 * Promise based glob
 *
 * @param {string[]} args
 */
module.exports = (...args) => {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    glob(...args, (err, files) => {
      if (err) return reject(err);
      resolve(files);
    });
  });
};
