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

// Local dependencies.
const fileHelper = require('../file');

/**
 * Copy file from one place to another
 */

module.exports = function (options, cb) {
  cb = reportback.extend(cb, {
    alreadyExists: 'error',
    invalid: 'error'
  });

  // Compute the canonical path to copy from
  // given its relative path from its source generator's
  // `templates` directory.
  const absSrcPath = path.resolve(options.templatesDirectory, options.templatePath);

  fs.readFile(absSrcPath, 'utf8', (err, contents) => {
    if (err) {
      return cb.error(err);
    }

    return fileHelper(_.merge(options, {
      contents
    }), cb);
  });
};
