'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/**
 * JSON API utils for BookShelf
 */

module.exports = {

  /**
   * Find primary key
   */

  getPK: function (type) {
    return global[_.capitalize(type)].idAttribute || 'id';
  }

};
