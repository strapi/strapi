'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const JSONAPI = require('jsonapi-serializer');

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
      ctx.response.body = this.serialize(ctx, type, object, value, matchedRoute);
    }
  },

  /**
   * Serialize response with JSON API specification
   */

  serialize: function (ctx, type, object, value, matchedRoute) {
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
      _.assign(toSerialize, _.pick(strapi.config.jsonapi, 'keyForAttribute'));
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

      toSerialize.attributes = ctx.state.filter.fields[type] || _.keys(_.last(value));
    } else if (_.isObject(value) && !_.isEmpty(value)) {
      // Object
      if (!_.isNull(PK) && value.hasOwnProperty(PK)) {
        value[PK] = value[PK].toString();
      }

      toSerialize.attributes = ctx.state.filter.fields[type] || _.keys(value);
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

    // Display JSON API pagination
    // TODO:
    // - Only enabled this feature for BookShelf ORM.
    if (_.isPlainObject(strapi.config.jsonapi) && strapi.config.jsonapi.hasOwnProperty('pagination') && strapi.config.jsonapi.pagination === true) {
      this.includePagination(ctx, toSerialize, object, type, matchedRoute);
    }

    const serialized = new JSONAPI.Serializer(type, value, toSerialize);

    // Display JSON API version support
    if (_.isPlainObject(strapi.config.jsonapi) && strapi.config.jsonapi.hasOwnProperty('showVersion') && strapi.config.jsonapi.showVersion === true) {
      _.assign(serialized, {
        jsonapi: {
          version: '1.0'
        }
      });
    }

    return serialized;
  },

  /**
   * Include pagination links to the object
   */

  includePagination: function (ctx, toSerialize, object, type, matchedRoute) {
    const links = {
      first: null,
      last: null,
      prev: null,
      next: null
    };

    let index = 1;
    const currentParameters = ctx.request.url.match(matchedRoute.regexp);
    const data = _.mapValues(_.indexBy(matchedRoute.paramNames, 'name'), function () {
      return currentParameters[index++];
    });

    // TODO:
    // - Call request to get first, latest, previous and next record

    switch (object) {
      default:
        _.assign(toSerialize.topLevelLinks, _.mapValues(links, function () {
          return ctx.request.origin + matchedRoute.path.replace(/(:[a-z]+)/g, function (match, token) {
            return data[token.substr(1)];
          });
        }));
        break;
    }
  },

  /**
   * Include relationships values to the object
   */

  includedRelationShips: function (ctx, toSerialize, type) {
    if (strapi.models.hasOwnProperty(type)) {
      _.forEach(strapi.models[type].associations, function (relation) {
        const PK = utils.getPK(relation.model) || utils.getPK(relation.collection);
        // TODO:
        // - Use matched route
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
              included: strapi.config.jsonapi.included || false,
              ignoreRelationshipData: strapi.config.jsonapi.ignoreRelationshipData || false,
              attributes: ctx.state.filter.fields[relation.model] || _.keys(_.omit(strapi.models[type].attributes, _.isFunction)),
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
              included: strapi.config.jsonapi.included || false,
              ignoreRelationshipData: strapi.config.jsonapi.ignoreRelationshipData || false,
              typeForAttribute: relation.collection,
              attributes: ctx.state.filter.fields[relation.collection] || _.keys(_.omit(strapi.models[type].attributes, _.isFunction)),
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
