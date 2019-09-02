'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public node modules.
const _ = require('lodash');
const fs = require('fs-extra');
const reportback = require('reportback')();

/**
 * Generate a folder
 */
/* eslint-disable prefer-template */
module.exports = function (options, cb) {

  // Provide default values for cb.
  cb = reportback.extend(cb, {
    alreadyExists: 'error',
    invalid: 'error'
  });

  // Provide defaults and validate required options.
  _.defaults(options, {
    force: false,
    gitkeep: false
  });

  const missingOpts = _.difference([
    'rootPath'
  ], Object.keys(options));

  if (missingOpts.length) {
    return cb.invalid(missingOpts);
  }

  const rootPath = path.resolve(process.cwd(), options.rootPath);

  // Only override an existing folder if `options.force` is true.
  fs.lstat(rootPath, err => {
    const exists = !(err && err.code === 'ENOENT');
    if (exists && err) {
      return cb.error(err);
    }

    if (exists && !options.force) {
      return cb.alreadyExists('Something else already exists at `' + rootPath + '`.');
    }

    if (exists) {
      fs.remove(rootPath, err => {
        if (err) {
          return cb.error(err);
        }
        _afterwards_();
      });
    } else {
      _afterwards_();
    }

    function _afterwards_() {

      // Don't actually write the directory if this is a dry run.
      if (options.dry) {
        return cb.success();
      }

      // Create the directory.
      fs.mkdirs(rootPath, err => {
        if (err) {
          return cb.error(err);
        }
        return cb.success();
      });
    }
  });
};
