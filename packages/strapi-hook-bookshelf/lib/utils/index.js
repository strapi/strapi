'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/**
 * Utils functions for BookShelf
 */
/* eslint-disable prefer-template */
module.exports = {

  /**
   * Find primary key
   */

  getPK: (collectionIdentity, collection, models) => {
    // This is not a Bookshelf collection, only the name.
    if (_.isString(collectionIdentity) && !_.isUndefined(models)) {
      const PK = _.findKey(_.get(models, collectionIdentity + '.attributes'), o => {
        return o.hasOwnProperty('primary');
      });

      if (!_.isEmpty(PK)) {
        return PK;
      }
    }

    try {
      if (_.isObject(collection)) {
        return collection.forge().idAttribute || 'id';
      }
    } catch (e) {
      // Collection undefined try to get the collection based on collectionIdentity
      if (typeof strapi !== 'undefined') {
        collection = _.get(strapi, `bookshelf.collections.${collectionIdentity}`);
      }

      // Impossible to match collectionIdentity before, try to use idAttribute
      if (_.isObject(collection)) {
        return collection.forge().idAttribute || 'id';
      }
    }

    return 'id';
  },

  /**
   * Find primary key
   */

  getCount: type => {
    return strapi.bookshelf.collections[type].forge().count().then(count => count);
  }
};
