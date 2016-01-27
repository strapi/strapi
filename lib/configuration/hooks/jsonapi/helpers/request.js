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

  parse: function (ctx, cb) {
    switch (ctx.method.toUpperCase()) {
      case 'GET':
        console.log('GET');
        break;
      case 'PUT':
      case 'POST':
        this.fetchSchema(ctx, function (err) {
          cb(err);
        });
        console.log('POST|PUT');
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

  fetchSchema : function (ctx, cb) {
    const attributes = ctx.request.body;

    if (!attributes.hasOwnProperty('data')) {
      ctx.response.status = 404;
      ctx.response.body = 'Missing `data` member';
    } else if (!attributes.data.hasOwnProperty('type')) {
      ctx.response.status = 404;
      ctx.response.body = 'Missing `type` member';
    } else if (!strapi.models.hasOwnProperty(attributes.data.type)) {
      ctx.response.status = 404;
      ctx.response.body = 'Unknow `type` ' + attributes.data.type;
    } else {
      // Extract required attributes
      const requiredAttributes = _.filter(strapi.models[attributes.data.type].attributes, {required:true});
      // Identify required relationships
      const relationships = _.indexBy(strapi.models[attributes.data.type].associations, 'alias');
      // Extract required relationships
      const requiredRelationships = _.intersection(_.keys(requiredAttributes), _.keys(relationships));

      console.log(requiredAttributes);
      console.log(requiredRelationships);

      if (_.size(requiredAttributes) > 0 && _.isEmpty(attributes.data.attributes)) {
        ctx.response.status = 404;
        ctx.response.body = 'Missing required attributes';
      } else if (!_.isEmpty(_.difference(_.keys(requiredRelationships), _.keys(attributes.data.relationships)))) {
        ctx.response.status = 404;
        ctx.response.body = 'Missing required relationships';
      } else {
        cb();
        console.log("coucou");
        // Looks good
      }
    }
  }
};
