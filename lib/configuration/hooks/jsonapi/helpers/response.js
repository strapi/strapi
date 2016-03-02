'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const JSONAPI = require('jsonapi-serializer');

// Local Strapi dependencies.
const utils = require('../utils/utils');
let utilsORM;

/**
 * JSON API helper
 */

module.exports = {

  /**
   * Set response
   */

  set: function * (ctx, matchedRoute, actionRoute) {
    const object = utils.getObject(matchedRoute);
    const type = utils.getType(ctx, actionRoute.controller);

    // Load right ORM utils
    utilsORM = require('../utils/' + strapi.models[type].orm);

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
    const value = this.fetchValue(ctx, object).toJSON() || this.fetchValue(ctx, object);

    if (!_.isEmpty(value)) {
      ctx.response.body = yield this.serialize(ctx, type, object, value, matchedRoute);
    }
  },

  /**
   * Serialize response with JSON API specification
   */

  serialize: function * (ctx, type, object, value) {
    const toSerialize = {
      topLevelLinks: {self: ctx.request.origin + ctx.request.originalUrl},
      keyForAttribute: 'dash-case',
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

    const PK = utilsORM.getPK(type);

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
            return ctx.request.origin + ctx.state.url + '/' + record[PK];
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
    if (_.isPlainObject(strapi.config.jsonapi) && strapi.config.jsonapi.hasOwnProperty('paginate') && strapi.config.jsonapi.paginate === parseInt(strapi.config.jsonapi.paginate, 10) && object === 'collection') {
      yield this.includePagination(ctx, toSerialize, object, type);
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

  includePagination: function * (ctx, toSerialize, object, type) {
    return new Promise(function (resolve, reject) {
      if (strapi.models.hasOwnProperty(type) && strapi.hasOwnProperty(strapi.models[type].orm) && strapi[strapi.models[type].orm].hasOwnProperty('collections')) {
        // We force page-based strategy for now.
        utilsORM.getCount(type).then(function (count) {
          const links = {};
          const pageNumber = Math.ceil(count / strapi.config.jsonapi.paginate);

          // Get current page number
          const value = _.first(_.values(_.pick(ctx.state.query, 'page[number]')));
          const currentPage = _.isEmpty(value) ? 1 : value;

          // Verify integer
          if (currentPage.toString() === parseInt(currentPage, 10).toString()) {
            links.first = ctx.request.origin + ctx.state.url;
            links.prev = ctx.request.origin + ctx.state.url + '?page[number]=' + (parseInt(currentPage, 10) - 1);
            links.next = ctx.request.origin + ctx.state.url + '?page[number]=' + (parseInt(currentPage, 10) + 1);
            links.last = ctx.request.origin + ctx.state.url + '?page[number]=' + pageNumber;

            if ((parseInt(currentPage, 10) - 1) === 0) {
              links.prev = links.first;
            }

            // Last page
            if (ctx.request.url === ctx.state.url + '?page[number]=' + pageNumber) {
              // Don't display useless
              links.last = null;
              links.next = null;
            } else if (ctx.request.url === ctx.state.url) {
              // First page
              links.first = null;
              links.prev = null;
            }
          }

          _.assign(toSerialize.topLevelLinks, _.omit(links, _.isNull));

          resolve();
        })
        .catch(function (err) {
          reject(err);
        });
      } else {
        resolve();
      }
    });
  },

  /**
   * Include relationships values to the object
   */

  includedRelationShips: function (ctx, toSerialize, type) {
    if (strapi.models.hasOwnProperty(type)) {
      _.forEach(strapi.models[type].associations, function (relation) {
        const PK = utilsORM.getPK(relation.model) || utilsORM.getPK(relation.collection);
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
