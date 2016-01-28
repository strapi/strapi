'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/**
 * JSON API utils
 */

module.exports = {

  /**
   * Verify ressource object
   */

  isRessourceObject: function (object) {
    return _.isObject(object) && object.hasOwnProperty('id') && object.hasOwnProperty('type');
  }

};
