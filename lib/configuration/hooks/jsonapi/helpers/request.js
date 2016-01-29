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

  /**
   * Parse request
   */

  parse: function * (ctx) {
    // HTTP methods allowed
    switch (ctx.method.toUpperCase()) {
      case 'GET':
        // Nothing to do
        break;
      case 'PATCH':
      case 'POST':
        try {
          yield this.fetchSchema(ctx);
          yield this.formatBody(ctx);
        } catch (err) {
          throw err;
        }
        break;
      case 'DELETE':
        // Nothing to do
        break;
      default:
        throw {
          status: 403,
          body: 'Invalid HTTP method'
        };
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
   * Fetch attributes schema
   */

  fetchSchema: function * (ctx) {
    const body = ctx.request.body;

    if (!body.hasOwnProperty('data')) {
      throw {
        status: 403,
        body: 'Missing `data` member'
      };
    } else if (!utils.isRessourceObject(body.data) && ctx.method !== 'POST') {
      throw {
        status: 403,
        body: 'Invalid ressource object'
      };
    } else if (!body.data.hasOwnProperty('type') && ctx.method === 'POST') {
      throw {
        status: 403,
        body: 'Invalid ressource object'
      };
    } else if (!strapi.models.hasOwnProperty(body.data.type)) {
      throw {
        status: 403,
        body: 'Unknow `type` ' + body.data.type
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
        body: 'Missing required attributes (' + missingAttributes.toString() + ')'
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
        body: 'Missing required relationships (' + missingRelationships.toString() + ')'
      };
    }

    // Build array of errors
    if (_.size(requiredRelationships)) {
      const errors = _.remove(_.flattenDeep(_.map(body.data.relationships, function (relation, key) {
        if (!relation.hasOwnProperty('data')) {
          return 'Missing `data` member for relationships ' + relation;
        } else if (_.isArray(relation.data)) {
          return _.map(relation.data, function (ressource) {
            if (!utils.isRessourceObject(ressource)) {
              return 'Invalid ressource object in relationships ' + key;
            }
          });
        } else if (!utils.isRessourceObject(relation.data)) {
          return 'Invalid ressource object for relationships ' + key;
        }
      })), function (n) {
        return !_.isUndefined(n);
      });

      if (!_.isEmpty(errors)) {
        throw {
          status: 403,
          body: errors.toString()
        };
      }
    }
  }
};
