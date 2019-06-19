#!/usr/bin/env node

'use strict';

/**
 * `$ strapi new`
 *
 * Generate a new Strapi application.
 */

module.exports = function(...args) {
  return require('strapi-generate-new')(...args).catch(err => {
    console.error(err);
    process.exit(1);
  });
};
