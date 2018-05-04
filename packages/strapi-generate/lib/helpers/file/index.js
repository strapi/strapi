'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public node modules.
const _ = require('lodash');
const async = require('async');
const fs = require('fs-extra');
const reportback = require('reportback')();

/**
 * Generate a file using the specified string
 */

/* eslint-disable prefer-template */
module.exports = function (options, cb) {

  // Provide default values for switchback.
  cb = reportback.extend(cb, {
    alreadyExists: 'error'
  });

  // Provide defaults and validate required options.
  _.defaults(options, {
    force: false
  });

  const missingOpts = _.difference([
    'contents',
    'rootPath'
  ], Object.keys(options));

  if (missingOpts.length) {
    return cb.invalid(missingOpts);
  }

  // In case we ended up here with a relative path,
  // resolve it using the process's CWD
  const rootPath = path.resolve(process.cwd(), options.rootPath);

  // Only override an existing file if `options.force` is true.
  fs.exists(rootPath, exists => {
    if (exists && !options.force) {
      return cb.alreadyExists('Something else already exists at `' + rootPath + '`.');
    }

    // Don't actually write the file if this is a dry run.
    if (options.dry) {
      return cb.success();
    }

    async.series([
      function deleteExistingFileIfNecessary(cb) {
        if (!exists) {
          return cb();
        }
        return fs.remove(rootPath, cb);
      },
      function writeToDisk(cb) {
        fs.outputFile(rootPath, options.contents, cb);
      }
    ], cb);
  });
};
