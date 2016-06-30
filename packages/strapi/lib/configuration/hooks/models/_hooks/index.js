'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public node modules.
const _ = require('lodash');
const async = require('async');

// Strapi utilities.
const dictionary = require('strapi-utils').dictionary;

/**
 * Async module loader to create a
 * dictionary of the external hooks
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      cb();
    }
  };

  return hook;
};
