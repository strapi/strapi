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
  if (scope.developerMode) {
    return cb();
  }
  
  // Install back-end admin `node_modules`.
  exec('npm install --production --ignore-scripts', {
    cwd: path.resolve(scope.rootPath, 'admin')
  }, (err) => {
    if (err) {
      return cb(err);
    }

    cb();
  });
};
