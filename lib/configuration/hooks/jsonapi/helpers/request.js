'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/**
 * JSON API helper
 */

module.exports = {

  default: {},

  /**
   * Parse request
   */

  parse: function * (ctx, cb) {
    switch (ctx.method.toUpperCase()) {
      case 'GET':
        console.log('GET');
        break;
      case 'PUT':
      case 'POST':
        yield this.fetchSchema(ctx, function * (err) {
          yield cb(err);
        });
        break;
      case 'DELETE':
        console.log('DELETE');
        break;
      default:
    }
  },

  /**
   * Fetch attributes schema
   */

  fetchSchema: function * (ctx, cb) {
    const attributes = ctx.request.body;

    if (!attributes.hasOwnProperty('data')) {
      return yield cb({
        status: 403,
        body: 'Missing `data` member'
      });
    } else if (!attributes.data.hasOwnProperty('type')) {
      return yield cb({
        status: 403,
        body: 'Missing `type` member'
      });
    } else if (!strapi.models.hasOwnProperty(attributes.data.type)) {
      return yield cb({
        status: 403,
        body: 'Unknow `type` ' + attributes.data.type
      });
    }

    // Extract required attributes
    const requiredAttributes = _.omit(_.mapValues(strapi.models[attributes.data.type].attributes, function (attr) {
      return attr.required ? attr : undefined;
    }), _.isUndefined);
    // Identify missing attributes
    const missingAttributes = _.difference(_.keys(requiredAttributes), _.keys(attributes.data.attributes));

    if (!_.isEmpty(missingAttributes)) {
      return yield cb({
        status: 403,
        body: 'Missing required attributes (' + missingAttributes.toString() + ')'
      });
    }

    // Identify required relationships
    const relationships = _.indexBy(strapi.models[attributes.data.type].associations, 'alias');
    // Extract required relationships
    const requiredRelationships = _.intersection(_.keys(requiredAttributes), _.keys(relationships));
    // Identify missing relationships
    const missingRelationships = _.difference(_.keys(requiredRelationships), _.keys(attributes.data.relationships));

    if (!_.isEmpty(missingRelationships)) {
      return yield cb({
        status: 403,
        body: 'Missing required relationships (' + missingRelationships.toString() + ')'
      });
    }

    // Looks good
    yield cb();

  }
};
