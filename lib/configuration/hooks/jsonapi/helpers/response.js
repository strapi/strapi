'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const JSONAPISerializer = require('jsonapi-serializer');

// Local Strapi dependencies.
const utils = require('../utils/utils');

/**
 * JSON API helper
 */

module.exports = {

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

      return;
    } else if (ctx.method === 'DELETE') {
      // Request successful and responds with only top-level meta data or nothing.
      ctx.response.body = '';

      return;
    }

    // Fetch and format value
    const value = this.fetchValue(ctx, object);

    if (!_.isEmpty(value)) {
      ctx.response.body = this.serialize(ctx, type, object, value);
    }
  },

  /**
   * Serialize response with JSON API specification
   */

  serialize: function (ctx, type, object, value) {
    const toSerialize = {
      topLevelLinks: {self: ctx.request.origin + ctx.request.url},
      keyForAttribute: 'camelCase',
      pluralizeType: false,
      included: true,
      typeForAttribute: function (currentType) {
        if (strapi.models.hasOwnProperty(type)) {
          return _.first(_.reject(_.map(strapi.models[type].associations, function (relation) {
            return (relation.alias === currentType) ? relation.model || relation.collection : undefined;
          }), _.isUndefined)) || currentType;
        }
      }
    };

    // Assign custom configurations
    if (_.isPlainObject(strapi.config.jsonapi) && !_.isEmpty(strapi.config.jsonapi)) {
      _.assign(toSerialize, _.omit(strapi.config.jsonapi, 'enabled'));
    }

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
    if (strapi.models.hasOwnProperty(type)) {
      _.forEach(strapi.models[type].associations, function (relation) {
        const PK = utils.getPK(relation.model) || utils.getPK(relation.collection);
        const availableRoutes = {
          relSlSelf: utils.isRoute('GET /' + type + '/:' + PK + '/relationships/:relation'),
          relSlRelated: utils.isRoute('GET /' + type + '/:' + PK),
          incSelf: relation.model ? utils.isRoute('GET /' + relation.model + '/:' + PK) : utils.isRoute('GET /' + relation.collection + '/:' + PK)
        };

        switch (relation.nature) {
          case 'oneToOne':
          case 'manyToOne':
            // Object
            toSerialize[relation.alias] = {
              ref: PK,
              attributes: _.keys(_.omit(strapi.models[type].attributes, _.isFunction)),
              relationshipLinks: {
                self: function (record) {
                  if (record.hasOwnProperty(PK) && availableRoutes.relSlSelf) {
                    return ctx.request.origin + '/' + type + '/' + record[PK] + '/relationships/' + relation.alias;
                  }

                  return undefined;
                },
                related: function (record) {
                  if (record.hasOwnProperty(PK) && availableRoutes.relSlRelated) {
                    return ctx.request.origin + '/' + type + '/' + record[PK];
                  }

                  return undefined;
                }
              },
              includedLinks: {
                self: function (data, record) {
                  if (!_.isUndefined(record) && record.hasOwnProperty(PK) && availableRoutes.incSelf) {
                    return ctx.request.origin + '/' + relation.model + '/' + record[PK];
                  }

                  return undefined;
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
              attributes: _.keys(_.omit(strapi.models[type].attributes, _.isFunction)),
              relationshipLinks: {
                self: function (record) {
                  if (record.hasOwnProperty(PK) && availableRoutes.relSlSelf) {
                    return ctx.request.origin + '/' + type + '/' + record[PK] + '/relationships/' + relation.alias;
                  }

                  return undefined;
                },
                related: function (record) {
                  if (record.hasOwnProperty(PK) && availableRoutes.relSlRelated) {
                    return ctx.request.origin + '/' + type + '/' + record[PK];
                  }

                  return undefined;
                }
              },
              includedLinks: {
                self: function (data, record) {
                  if (record.hasOwnProperty(PK) && availableRoutes.incSelf) {
                    return ctx.request.origin + '/' + relation.collection + '/' + record[PK];
                  }

                  return undefined;
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
