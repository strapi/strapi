'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const JSONAPISerializer = require('jsonapi-serializer');
const utils = require('../utils/utils');

/**
 * JSON API helper
 */

module.exports = {

  default: {},

  /**
   * Set response
   */

  set: function (ctx, matchedRoute, actionRoute) {
    const object = utils.getObject(matchedRoute);
    const type = utils.getType(ctx, actionRoute.controller);

    // Fetch a relationship that does not exist
    // Reject related request with `include` parameter
    if (_.isUndefined(type) || (type === 'related' && ctx.params.hasOwnProperty('include'))) {
      ctx.response.status = 404;
      ctx.response.body = '';

      return false;
    } else if (ctx.method === 'DELETE') {
      // Request successful and responds with only top-level meta data or nothing.
      ctx.response.body = '';

      return false;
    }

    // Fetch and format value
    const value = this.fetchValue(ctx, object);

    ctx.response.body = this.serialize(ctx, type, object, value);
  },

  /**
   * Serialize response with JSON API specification
   */

  serialize: function (ctx, type, object, value) {

    // TODO:
    // - Handle configuration with a file to improve flexibility of JSON API support
    const toSerialize = {
      topLevelLinks: {self: ctx.request.origin + ctx.request.url},
      keyForAttribute: 'camelCase',
      pluralizeType: false,
      typeForAttribute: function (currentType) {
        if (strapi.models.hasOwnProperty(type)) {
          return _.first(_.reject(_.map(strapi.models[type].associations, function (relation) {
            return (relation.alias === currentType) ? relation.model || relation.collection : undefined;
          }), _.isUndefined)) || currentType;
        }
      }
    };

    const PK = utils.getPK(type);

    if (_.isArray(value) && !_.isEmpty(value)) {
      // Array
      if (!_.isNull(PK)) {
        _.forEach(value, function (record) {
            if (record.hasOwnProperty(PK)) {
              record[PK] = record[PK].toString();
            }
        });
      }

      toSerialize.dataLinks = {
        self: function (record) {
          if (record.hasOwnProperty(PK)) {
            return ctx.request.origin + ctx.request.url + '/' + record[PK];
          }
        }
      };

      toSerialize.attributes = _.keys(_.last(value));
    } else if (_.isObject(value) && !_.isEmpty(value)) {
      // Object
      if (!_.isNull(PK) && value.hasOwnProperty(PK)) {
        value[PK] = value[PK].toString();
      }

      toSerialize.attributes = _.keys(value);
    }

    switch (object) {
      case 'collection':
        this.includedRelationShips(ctx, toSerialize, type);
        break;
      case 'ressource':
        this.includedRelationShips(ctx, toSerialize, type);
        break;
      case 'relationships':
        // Remove data key
        delete toSerialize.dataLinks;
        delete toSerialize.attributes;

        // Dirty way to set related URL
        toSerialize.topLevelLinks.related = toSerialize.topLevelLinks.self.replace('relationships/', '');
        break;
      case 'related':
        this.includedRelationShips(ctx, toSerialize, type);
        break;
      default:
        break;
    }

    return new JSONAPISerializer(type, value, toSerialize);
  },

  /**
   * Include relationships values to the object
   */

  includedRelationShips: function (ctx, toSerialize, type) {
    const self = this;

    if (strapi.models.hasOwnProperty(type)) {
      _.forEach(strapi.models[type].associations, function (relation) {
        let PK = utils.getPK(relation.model) || utils.getPK(relation.collection);

        switch (relation.nature) {
          case 'oneToOne':
          case 'manyToOne':
            // Object
            toSerialize[relation.alias] = {
              ref: PK,
              attributes: _.keys(strapi.models[type].attributes),
              relationshipLinks: {
                self: function (record) {
                  if (record.hasOwnProperty(PK)) {
                    return ctx.request.origin + '/' + type + '/' + record[PK] + '/relationships/' + relation.alias;
                  }
                },
                related: function (record) {
                  if (record.hasOwnProperty(PK)) {
                    return ctx.request.origin + '/' + type + '/' + record[PK];
                  }
                }
              },
              includedLinks: {
                self: function (data, record) {
                  if (!_.isUndefined(record) && record.hasOwnProperty(PK)) {
                    return ctx.request.origin + '/' + relation.model + '/' + record[PK];
                  }
                }
              }
            };
            break;
          case 'oneToMany':
          case 'manyToMany':
            // Array
            toSerialize[relation.alias] = {
              ref: PK,
              typeForAttribute: relation.collection,
              attributes: _.keys(strapi.models[type].attributes),
              relationshipLinks: {
                self: function (record) {
                  if (record.hasOwnProperty(PK)) {
                    return ctx.request.origin + '/' + type + '/' + record[PK] + '/relationships/' + relation.alias;
                  }
                },
                related: function (record) {
                  if (record.hasOwnProperty(PK)) {
                    return ctx.request.origin + '/' + type + '/' + record[PK];
                  }
                }
              },
              includedLinks: {
                self: function (data, record) {
                  if (record.hasOwnProperty(PK)) {
                    return ctx.request.origin + '/' + relation.collection + '/' + record[PK];
                  }
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
   * Fetch and format value
   */

  fetchValue: function (ctx, object) {
    const data = ctx.body;

    switch (object) {
      case 'collection':
        if ((_.isArray(data) && _.size(data) > 1) || _.isObject(data)) {
          return data;
        } else if (_.isArray(data) && (_.size(data) === 1 || _.size(data) === 0)) {
          return _.isObject(_.first(data)) ? _.first(data[0]) : [];
        }

        return null;
      case 'ressource':
        if (_.isObject(data)) {
          return data;
        }

        return null;
      case 'related':
      case 'relationships':
        // TODO:
        // - Detect object of relation
        //   - MtM, OtM: array
        //   - OtO, MtO: object

        if (_.isObject(data) || _.isArray(data) && data.hasOwnProperty(ctx.params.relation)) {
          if (_.isArray(data[ctx.params.relation]) && _.size(data[ctx.params.relation]) > 1) {
            return data[ctx.params.relation];
          }

          return _.first(data[ctx.params.relation]) || data[ctx.params.relation];
        }

        return null;
      default:
        return 'collection';
    }
  }
};
