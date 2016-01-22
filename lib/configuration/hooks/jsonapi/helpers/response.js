'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const JSONAPISerializer = require('jsonapi-serializer');

/**
 * JSON API helper
 */

module.exports = {

  default: {},

  /**
   * Set response
   */

  set: function (ctx, matchedRoute, actionRoute) {
    const type = this.getType(actionRoute.controller);
    const object = this.getObject(matchedRoute);
    const value = this.verifyAndSetValue(ctx, object);

    ctx.response.body = this.serialize(ctx, type, object, value);
  },

  /**
   * Serialize response with JSON API specification
   */

  serialize: function (ctx, type, object, value) {
    const toSerialize = {
      topLevelLinks: {self: ctx.request.origin + ctx.request.url}
    };

    switch (object) {
      case 'collection':
        if (!_.isEmpty(value) && _.isArray(value)) {

          // TODO :
          // - Detect PK and stringify the value
          _.forEach(value, function (value) {
            value.id = value.id.toString();
          });

          toSerialize.dataLinks = {
            self: function (record) {
              return ctx.request.origin + ctx.request.url + '/' + record.id;
            }
          };
        } else if (!_.isEmpty(value) && _.isObject(value)) {
          // TODO :
          // - Detect PK and stringify the value
        }

        // TODO :
        // - Parse the model based on the type value
        // - Displayed attributes but also consider query parameters

        toSerialize.attributes = ['id'];

        return new JSONAPISerializer(type, value, toSerialize);
      case 'ressource':
        toSerialize.attributes = ['id'];

        return new JSONAPISerializer(type, value, toSerialize);
      case 'relationships':
        break;
      case 'related':
        break;
      default:
        return new JSONAPISerializer(type, value, toSerialize);
    }
  },

  /**
   * Verify type of the value
   */

  verifyAndSetValue: function (ctx, object) {
    const data = ctx.body;

    switch (ctx.response.status) {
      case 404:
        ctx.status = 200;
        ctx.body = null;
        break;
      default:
        break;
    }

    switch (object) {
      case 'collection':
        // Collection
        if (_.isArray(data) && _.size(data) > 1) {
          return data;
        } else if (_.isArray(data) && (_.size(data) === 1 || _.size(data) === 0)) {
          return _.isObject(data[0]) ? data[0] : [];
        } else {
          return null;
        }
        break;
      case 'ressource':
        // Ressource
        if (_.isObject(data)) {
          return data;
        } else {
          return null;
        }
        break;
      case 'relationships':
        // TODO:
        // - Detect object of relation
        //   - MtM, OtM: array
        //   - OtO, MtO: object

        // Relationships
        if (_.isObject(data) || _.isArray(data)) {
          return data;
        } else {
          return null;
        }
        break;
      case 'related':
        // TODO:
        // - Detect object of relation
        //   - MtM, OtM: array
        //   - OtO, MtO: object

        // Related
        if (_.isObject(data) || _.isArray(data)) {
          return data;
        } else {
          return null;
        }
        break;
      default:
        return 'collection';
    }
  },

  /**
   * Find data object
   */

  getObject: function (matchedRoute) {
    // Top level route
    switch (_.size(matchedRoute.regexp.keys)) {
      case 0:
        // Collection
        return 'collection';
      case 1:
        // Ressource
        return 'ressource';
      case 2:
        // Relationships or related ressource
        return (matchedRoute.path.indexOf('relationships')) ? 'relationships' : 'related';
      default:
        return 'collection';
    }
  },

  /**
   * Find data type
   */

  getType: function (supposedType) {
    if (strapi.models.hasOwnProperty(supposedType.toLowerCase())) {
      return supposedType.toLowerCase();
    } else {
      return 'Unknow';
    }
  }
};
