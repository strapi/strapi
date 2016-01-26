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
    const object = this.getObject(matchedRoute);
    const type = this.getType(ctx, actionRoute.controller);

    // Fetch a relationship that does not exist
    // Reject related request with `include` parameter
    if (_.isUndefined(type) || (type === 'related' && ctx.params.hasOwnProperty('include'))) {
      ctx.response.status = 404;
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
        switch (relation.nature) {
          case 'oneToOne':
          case 'manyToOne':
            // Object
            toSerialize[relation.alias] = {
              ref: self.getPK(relation.model),
              attributes: _.keys(strapi.models[type].attributes),
              relationshipLinks: {
                self: function (record) {
                  return ctx.request.origin + '/' + type + '/' + record.id + '/relationships/' + relation.alias;
                },
                related: function (record) {
                  return ctx.request.origin + '/' + type + '/' + record.id;
                }
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
                self: function (record) {
                  return ctx.request.origin + '/' + type + '/' + record.id + '/relationships/' + relation.alias;
                },
                related: function (record) {
                  return ctx.request.origin + '/' + type + '/' + record.id;
                }
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
   * Fetch and format value
   */

  fetchValue: function (ctx, object) {
    const data = ctx.body;

    switch (object) {
      case 'collection':
        if (_.isArray(data) && _.size(data) > 1) {
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
