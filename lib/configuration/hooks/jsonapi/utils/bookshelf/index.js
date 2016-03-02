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
  },

  /**
   * Find primary key
   */

  getCount: function (type) {
    return strapi.bookshelf.collections[type].forge().count().then(function (count) {
      return count;
    });
  }
};
