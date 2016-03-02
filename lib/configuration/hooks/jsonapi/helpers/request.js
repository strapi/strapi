'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

// Local Strapi dependencies.
const utils = require('../utils/utils');

/**
 * JSON API helper
 */

module.exports = {

  default: {},

  /**
   * Parse request
   */

  parse: function * (ctx) {
    // Assign used method
    this.default.method = ctx.method.toUpperCase();

    // Detect X-HTTP-Method-Override for some clients
    // which don't support PATCH method
    if (ctx.header.hasOwnProperty('x-http-method-override') && ctx.header['x-http-method-override'] === 'PATCH') {
      this.default.method = 'POST';
    }

    // HTTP methods allowed
    switch (this.default.method) {
      case 'GET':
        try {
          yield this.fetchQuery(ctx);
        } catch (err) {
          throw err;
        }
        break;
      case 'PATCH':
      case 'POST':
        try {
          if (utils.getObject(utils.matchedRoute(ctx)) === 'relationships') {
            yield this.fetchRelationRequest(ctx);
            yield this.formatRelationBody(ctx);
          } else {
            yield this.fetchSchema(ctx);
            yield this.formatBody(ctx);
          }
        } catch (err) {
          throw err;
        }
        break;
      case 'DELETE':
        if (utils.getObject(utils.matchedRoute(ctx)) === 'relationships') {
          try {
            yield this.fetchRelationRequest(ctx);
            yield this.formatRelationBody(ctx);
          } catch (err) {
            throw err;
          }
        }
        break;
      default:
        throw {
          status: 403,
          body: {
            message: 'Invalid HTTP method'
          }
        };
    }
  },

  /**
   * Format attributes for relationships request to get more simple API
   */

  formatRelationBody: function * (ctx) {
    ctx.request.body = _.map(ctx.request.body.data, 'id');
  },

  /**
   * Fetch request for relationships
   */

  fetchRelationRequest: function * (ctx) {
    const body = ctx.request.body;

    if (!body.hasOwnProperty('data')) {
      throw {
        status: 403,
        body: {
          message: 'Missing `data` member'
        }
      };
    } else if (_.isPlainObject(body.data) && !utils.isRessourceObject(body.data)) {
      throw {
        status: 403,
        body: {
          message: 'Invalid ressource object'
        }
      };
    } else if (_.isArray(body.data)) {
      const errors = _.remove(_.map(body.data, function (n, position) {
        if (!utils.isRessourceObject(n) || _.isUndefined(utils.getType(ctx, _.get(n, 'type')))) {
          return {
            position: position,
            message: 'Invalid ressource object or unknow type'
          };
        }
      }), function (n) {
        return !_.isUndefined(n);
      });

      if (!_.isEmpty(errors)) {
        throw {
          status: 403,
          body: {
            message: errors
          }
        };
      }
    }
  },

  /**
   * Format attributes for more simple API
   */

  formatBody: function * (ctx) {
    const body = ctx.request.body;
    const values = _.assign({}, body.data.attributes, _.mapValues(body.data.relationships, function (relation) {
      return _.isArray(relation.data) ? _.map(relation.data, 'id') : relation.data.id;
    }));

    ctx.request.body = values;
  },

  /**
   * Fetch query parameters
   */

  fetchQuery: function * (ctx) {
    // Use context namespace for passing information throug middleware
    ctx.state.filter = {
      fields: {}
    };

    ctx.state.url = ctx.request.url.replace(ctx.request.search, '');
    ctx.state.query = ctx.request.query;

    _.forEach(ctx.query, function (value, key) {
      if (_.includes(['include', 'sort', 'filter'], key)) {
        throw {
          status: 400,
          body: {
            message: 'Parameter `' + key + '` is not supported yet'
          }
        };
      } else if (key.indexOf('fields') !== -1) {
        const alias = key.match(/\[(.*?)\]/)[1];
        const type = utils.getType(ctx, alias);

        if (_.isUndefined(type)) {
          throw {
            status: 403,
            body: {
              message: 'Wrong `type` in fields parameters'
            }
          };
        }

        ctx.state.filter.fields[type] = value.split(',');
      } else if (key === 'page[number]' && _.isPlainObject(strapi.config.jsonapi) && strapi.config.jsonapi.hasOwnProperty('paginate') && strapi.config.jsonapi.paginate === parseInt(strapi.config.jsonapi.paginate, 10)) {
        _.set(ctx.request.query, 'limit', strapi.config.jsonapi.paginate);
        _.set(ctx.request.query, 'offset', strapi.config.jsonapi.paginate * (value - 1));

        // Remove JSON API page strategy
        ctx.request.query = _.omit(ctx.request.query, 'page[number]');
      }
    });
  },

  /**
   * Fetch attributes schema
   */

  fetchSchema: function * (ctx) {
    const body = ctx.request.body;

    if (!body.hasOwnProperty('data')) {
      throw {
        status: 403,
        body: {
          message: 'Missing `data` member'
        }
      };
    } else if (!utils.isRessourceObject(body.data) && this.default.method !== 'POST') {
      throw {
        status: 403,
        body: {
          message: 'Invalid ressource object'
        }
      };
    } else if (!body.data.hasOwnProperty('type') && this.default.method === 'POST') {
      throw {
        status: 403,
        body: {
          message: 'Invalid ressource object'
        }
      };
    } else if (!strapi.models.hasOwnProperty(body.data.type)) {
      throw {
        status: 403,
        body: {
          message: 'Unknow `type` ' + body.data.type
        }
      };
    }

    // Extract required attributes
    const requiredAttributes = _.omit(_.mapValues(strapi.models[body.data.type].attributes, function (attr) {
      return (attr.required && attr.type) ? attr : undefined;
    }), _.isUndefined);
    // Identify missing attributes
    const missingAttributes = body.data.hasOwnProperty('attributes') ? _.difference(_.keys(requiredAttributes), _.keys(body.data.attributes)) : null;

    if (!_.isEmpty(missingAttributes)) {
      throw {
        status: 403,
        body: {
          message: 'Missing required attributes (' + missingAttributes.toString() + ')'
        }
      };
    }

    // Extract required relationships
    const requiredRelationships = _.omit(_.mapValues(strapi.models[body.data.type].attributes, function (attr) {
      return (attr.required && (attr.model || attr.collection)) ? attr : undefined;
    }), _.isUndefined);
    // Identify missing relationships
    const missingRelationships = body.data.hasOwnProperty('relationships') ? _.difference(_.keys(requiredRelationships), _.keys(body.data.relationships)) : null;

    if (!_.isEmpty(missingRelationships)) {
      throw {
        status: 403,
        body: {
          message: 'Missing required relationships (' + missingRelationships.toString() + ')'
        }
      };
    }

    // Build array of errors
    if (_.size(requiredRelationships)) {
      const errors = _.remove(_.flattenDeep(_.map(body.data.relationships, function (relation, key) {
        if (!relation.hasOwnProperty('data')) {
          return {
            message: 'Missing `data` member for relationships ' + relation
          };
        } else if (_.isArray(relation.data)) {
          return _.map(relation.data, function (ressource, position) {
            if (!utils.isRessourceObject(ressource)) {
              return {
                position: position,
                message: 'Invalid ressource object in relationships ' + key
              };
            }
          });
        } else if (!utils.isRessourceObject(relation.data)) {
          return {
            message: 'Invalid ressource object for relationships ' + key
          };
        }
      })), function (n) {
        return !_.isUndefined(n);
      });

      if (!_.isEmpty(errors)) {
        throw {
          status: 403,
          body: errors
        };
      }
    }
  }
};
