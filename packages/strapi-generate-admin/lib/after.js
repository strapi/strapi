'use strict';

/**
 * Module dependencies
 */

const { exec } = require('child_process');
const path = require('path');

/**
 * Runs after this generator has finished
 *
 * @param {Object} scope
 * @param {Function} cb
 */

module.exports =  (scope, cb) => {
  exec('npm install', {
    cwd: path.resolve(scope.rootPath, 'admin')
  }, (err, stdout) => {
    if (err) {
      return cb(err);
    }

    cb();
  });
};
