'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/**
 * JSON API utils for Waterline
 */

module.exports = {

  /**
   * Find primary key
   */

  getPK: function (type) {
    const PK = _.findKey(strapi.models[type].attributes, {primaryKey: true});

    if (!_.isUndefined(PK)) {
      return PK;
    } else if (strapi.models[type].attributes.hasOwnProperty('id')) {
      return 'id';
    } else if (strapi.models[type].attributes.hasOwnProperty('uuid')) {
      return 'uuid';
    }

    return null;
  }

};
