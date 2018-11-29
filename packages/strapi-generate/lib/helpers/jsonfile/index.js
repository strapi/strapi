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
 * Generate a JSON file
 */

/* eslint-disable prefer-template */
module.exports = function (options, handlers) {

  // Provide default values for handlers.
  handlers = reportback.extend(handlers, {
    alreadyExists: 'error'
  });

  // Provide defaults and validate required options.
  _.defaults(options, {
    force: false
  });

  const missingOpts = _.difference([
    'rootPath',
    'data'
  ], Object.keys(options));

  if (missingOpts.length) {
    return handlers.invalid(missingOpts);
  }

  const rootPath = path.resolve(process.cwd(), options.rootPath);

  // Only override an existing file if `options.force` is true.
  fs.exists(rootPath, exists => {
    if (exists && !options.force) {
      return handlers.alreadyExists('Something else already exists at `' + rootPath + '`.');
    }

    if (exists) {
      fs.remove(rootPath, err => {
        if (err) {
          return handlers.error(err);
        }
        _afterwards_();
      });
    } else {
      _afterwards_();
    }

    function _afterwards_() {
      fs.outputJSON(rootPath, options.data, {spaces: 2}, err => {
        if (err) {
          return handlers.error(err);
        } else {
          handlers.success();
        }
      });
    }
  });
};
