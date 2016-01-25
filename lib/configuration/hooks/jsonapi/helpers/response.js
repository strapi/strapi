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

    ctx.response.body = this.serialize(ctx, type, value);
  },

  /**
   * Serialize response with JSON API specification
   */

  serialize: function (ctx, type, value) {
    // TODO:
    // - Handle configuration with a file to improve flexibility of JSON API support
    const toSerialize = {
      topLevelLinks: {self: ctx.request.origin + ctx.request.url},
      keyForAttribute: 'camelCase',
      pluralizeType: false,
      typeForAttribute: function (currentType) {
        if (strapi.models.hasOwnProperty(type)) {
          const tryFindType = _.first(_.reject(_.map(strapi.models[type].associations, function (relation) {
            return (relation.alias === currentType) ? relation.model || relation.collection : undefined;
          }), _.isUndefined));

          return _.isUndefined(tryFindType) ? currentType : tryFindType;
        }
      }
    };

    const PK = this.getPK(type);

    if (_.isArray(value) && !_.isEmpty(value)) {
      // Array
      if (!_.isNull(PK)) {
        _.forEach(value, function (record) {
          record[PK] = record[PK].toString();
        });
      }

      toSerialize.dataLinks = {
        self: function (record) {
          return ctx.request.origin + ctx.request.url + '/' + record.id;
        }
      };

      toSerialize.attributes = _.keys(value[0]);
    } else if (_.isObject(value) && !_.isEmpty(value)) {
      // Object
      if (!_.isNull(PK)) {
        value[PK] = value[PK].toString();
      }

      toSerialize.attributes = _.keys(value);
    }

    this.includedRelationShips(ctx, toSerialize, type);

    return new JSONAPISerializer(type, value, toSerialize);
  },

  /**
   * Include relationships values to the object
   */

  includedRelationShips: function (ctx, toSerialize, type) {
    const self = this;

    if (strapi.models.hasOwnProperty(type)) {
      _.forEach(strapi.models[type].associations, function (relation) {
        switch (relation.nature) {
          case 'oneToOne':
          case 'manyToOne':
            // Object
            toSerialize[relation.alias] = {
              ref: self.getPK(relation.model),
              attributes: _.keys(strapi.models[type].attributes),
              relationshipLinks: {
                self: ctx.request.origin + ctx.request.url + '/relationships/' + relation.alias,
                related: ctx.request.origin + ctx.request.url
              },
              includedLinks: {
                self: function (data, record) {
                  return ctx.request.origin + '/' + relation.model + '/' + record.id;
                }
              }
            };
            break;
          case 'oneToMany':
          case 'manyToMany':
            // Array
            toSerialize[relation.alias] = {
              ref: self.getPK(relation.collection),
              typeForAttribute: relation.collection,
              attributes: _.keys(strapi.models[type].attributes),
              relationshipLinks: {
                self: ctx.request.origin + ctx.request.url + '/relationships/' + relation.alias,
                related: ctx.request.origin + ctx.request.url
              },
              includedLinks: {
                self: function (data, record) {
                  return ctx.request.origin + '/' + relation.collection + '/' + record.id;
                }
              }
            };
            break;
          default:
        }
      });
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
    // TODO:
    // - Improve way to detect collection/ressource/relationships/related

    switch (_.size(matchedRoute.regexp.keys)) {
      case 0:
        return 'collection';
      case 1:
        return 'ressource';
      case 2:
        return (matchedRoute.path.indexOf('relationships')) ? 'relationships' : 'related';
      default:
        return 'collection';
    }
  },

  /**
   * Find data type
   */

  getType: function (supposedType) {
    // TODO:
    // - Parse the URL and try to extract useful information to find the type

    if (strapi.models.hasOwnProperty(supposedType.toLowerCase())) {
      return supposedType.toLowerCase();
    } else {
      return null;
    }
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
