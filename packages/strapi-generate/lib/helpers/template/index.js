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
 * Read a dynamic template, compile it using scope.
 * Then use `file` helper to write it to its destination.
 */

module.exports = function (options, cb) {
  cb = reportback.extend(cb, {
    noTemplate: 'error',
    alreadyExists: 'error'
  });

  // Compute the canonical path to a template
  // given its relative path from its source generator's
  // `templates` directory.
  if (_.isFunction(options.templatesDirectory)) {
    options.templatesDirectory = options.templatesDirectory(options);
  }

  const absTemplatePath = path.resolve(options.templatesDirectory, options.templatePath);

  fs.readFile(absTemplatePath, 'utf8', (err, contents) => {
    if (err) {
      err = err instanceof Error ? err : new Error(err);
      err.message = `Template error: ${err.message}`;
      err.path = absTemplatePath;
      if (err.code === 'ENOENT') {
        return cb.noTemplate(err);
      } else {
        return cb(err);
      }
    }

    try {
      const compiled = _.template(contents, {
        interpolate: /<%=([\s\S]+?)%>/g
      });
      contents = compiled(options);

      // With Lodash templates, HTML entities are escaped by default.
      // Default assumption is we don't want that, so we'll reverse it.
      if (!options.escapeHTMLEntities) {
        contents = _.unescape(contents);
      }
    } catch (e) {
      return cb(e);
    }

    return fileHelper(_.merge(options, {
      contents
    }), cb);
  });
};
