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
   * Initialize the hook
   */

  set: function(ctx, matchedRoute, actionRoute) {
    const type = actionRoute.controller.toLowerCase();
    const kind = this.whichKind(matchedRoute);
    const value = this.verifyAndSetValue(ctx, kind);

    ctx.response.body = this.serialize(ctx, type, kind, value);
  },

  /**
   * Verify type of the value
   */

  serialize: function(ctx, type, kind, value) {
    const toSerialize = {
      topLevelLinks: { self: ctx.request.origin + ctx.request.url }
    };

    switch (kind) {
      case 'collection':
        if (!_.isEmpty(value) && _.isArray(value)) {
          toSerialize.dataLinks = {
            self: function (record) {
              return ctx.request.origin + ctx.request.url + '/' + record.id
            }
          };
        }

        if (true) {
          toSerialize.attributes = ['id'];
        }

        return new JSONAPISerializer(type, value, toSerialize);
        break;
      case 'ressource':
        if (true) {
          toSerialize.attributes = ['id'];
        }

        return new JSONAPISerializer(type, value, toSerialize);
        break;
      case 'relationships':

        break;
      case 'related':

        break;
    default:

    }
  },

  /**
   * Verify type of the value
   */

  verifyAndSetValue: function(ctx, kind) {
    const data = ctx.body;

    switch (ctx.response.status) {
      case 404:
        ctx.status = 200;
        ctx.body = null;
        break;
    }

    switch (kind) {
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
        // - Detect kind of relation
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
        // - Detect kind of relation
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
        return 'collection'
    }
  },

  /**
   * Return kind of ressources
   */

  whichKind: function(matchedRoute) {
    // Top level route
    switch (_.size(matchedRoute.regexp.keys)) {
      case 0:
        // Collection
        return 'collection';
        break;
      case 1:
        // Ressource
        return 'ressource';
        break;
      case 2:
        // Relationships or related ressource
        return (matchedRoute.path.indexOf('relationships')) ? 'relationships' : 'related';
        break;
      default:
        return 'collection'
    }
  }
};
