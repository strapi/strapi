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
  },

  /**
   * Find data object
   */

  getObject: function (matchedRoute) {
    // TODO:
    // - Improve way to detect collection/ressource/relationships/related
    switch (_.size(matchedRoute.regexp.keys)) {
      case 0:
        return 'collection';
      case 1:
        return 'ressource';
      case 2:
        return (matchedRoute.path.indexOf('relationships') !== -1) ? 'relationships' : 'related';
      default:
        return 'collection';
    }
  },

  /**
   * Find data type
   */

  getType: function (ctx, supposedType) {
    // TODO:
    // - Parse the URL and try to extract useful information to find the type

    // Relationships or related ressource
    if (strapi.models.hasOwnProperty(supposedType.toLowerCase()) && ctx.params.hasOwnProperty('relation')) {
      return _.first(_.reject(_.map(strapi.models[supposedType.toLowerCase()].associations, function (relation) {
        return (ctx.params.hasOwnProperty('relation') && ctx.params.relation === relation.alias) ? relation.model || relation.collection : undefined;
      }), _.isUndefined));
    } else if (strapi.models.hasOwnProperty(supposedType.toLowerCase())) {
      return supposedType.toLowerCase();
    }

    return undefined;
  },

  /**
   * Find primary key
   */

  getPK: function (type) {
    if (!strapi.models.hasOwnProperty(type)) {
      return null;
    }

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
