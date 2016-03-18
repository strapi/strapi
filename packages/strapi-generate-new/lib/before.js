'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');
const crypto = require('crypto');

// Public node modules.
const _ = require('lodash');
const fs = require('fs-extra');

/**
 * This `before` function is run before generating targets.
 * Validate, configure defaults, get extra dependencies, etc.
 *
 * @param {Object} scope
 * @param {Function} cb
 */

module.exports = function before(scope, cb) {
  let defaultName = scope.args[0];
  if (defaultName === '.' || !defaultName) {
    defaultName = path.basename(process.cwd());
  }

  // Generate random code.
  const studioToken = crypto.randomBytes(32).toString('hex');

  // App info.
  _.defaults(scope, {
    name: defaultName,
    author: process.env.USER || 'A Strapi developer',
    email: process.env.EMAIL || '',
    year: (new Date()).getFullYear(),
    license: 'MIT',
    studioToken: studioToken
  });

  // Make changes to the rootPath where the Strapi project will be created.
  scope.rootPath = path.resolve(process.cwd(), scope.name || '');

  // Ensure we aren't going to inadvertently delete any files.
  try {
    const files = fs.readdirSync(scope.rootPath);
    if (files.length) {
      return cb.error('Error: `$ strapi new` can only be called on an empty directory.');
    }
  } catch (e) {
    // ...
  }

  // Trigger callback with no error to proceed.
  return cb.success();
};
