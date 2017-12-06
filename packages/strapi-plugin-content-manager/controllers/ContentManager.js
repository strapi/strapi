'use strict';

const _ = require('lodash');

/**
 * A set of functions called "actions" for `ContentManager`
 */

module.exports = {
  models: async ctx => {
    const pickData = (model) => _.pick(model, [
      'info',
      'connection',
      'collectionName',
      'attributes',
      'identity',
      'globalId',
      'globalName',
      'orm',
      'loadedModel',
      'primaryKey',
      'associations'
    ]);

    ctx.body = {
      models: _.mapValues(strapi.models, pickData),
      plugins: Object.keys(strapi.plugins).reduce((acc, current) => {
        acc[current] = {
          models: _.mapValues(strapi.plugins[current].models, pickData)
        };

        return acc;
      }, {})
    };
  },

  find: async ctx => {
    const { limit, skip = 0, sort, query, queryAttribute, source } = ctx.request.query;

    // Find entries using `queries` system
    const entries = await strapi.query(ctx.params.model, source).find({
        limit,
        skip,
        sort,
        query,
        queryAttribute
      });

    ctx.body = entries;
  },

  count: async ctx => {
    const { source } = ctx.request.query;

    // Count using `queries` system
    const count = await strapi.query(ctx.params.model, source).count();

    ctx.body = {
      count: _.isNumber(count) ? count : _.toNumber(count)
    };
  },

  findOne: async ctx => {
    const { source } = ctx.request.query;

    // Find an entry using `queries` system
    const entry = await strapi.query(ctx.params.model, source).findOne({
      id: ctx.params.id
    });

    // Entry not found
    if (!entry) {
      return (ctx.notFound('Entry not found'));
    }

    ctx.body = entry;
  },

  create: async ctx => {
    const { source } = ctx.request.query;
    console.log('bite');
    try {
      console.log('fuck');
      // Create an entry using `queries` system
      const entryCreated = await strapi.query(ctx.params.model, source).create({
        values: ctx.request.body
      });

      ctx.body = entryCreated;
    } catch(error) {
      console.log('ok')
      ctx.badRequest(null, [{ messages: [{ id: error }] }]);
    }
  },

  update: async ctx => {
    const { source } = ctx.request.query;

    try {
      // Add current model to the flow of updates.
      const entry = strapi.query(ctx.params.model, source).update({
        id: ctx.params.id,
        values: ctx.request.body
      });

      // Return the last one which is the current model.
      ctx.body = entry;
    } catch(error) {
      ctx.badRequest(null, [{ messages: [{ id: error }] }]);
    }
  },

  delete: async ctx => {
    const { source } = ctx.request.query;
    const params = ctx.params;

    const response = await strapi.query(params.model, source).findOne({
      id: params.id
    });

    params.values = Object.keys(JSON.parse(JSON.stringify(response))).reduce((acc, current) => {
      const association = (strapi.models[params.model] || strapi.plugins[source].models[params.model]).associations.filter(x => x.alias === current)[0];

      // Remove relationships.
      if (association) {
        acc[current] = _.isArray(response[current]) ? [] : null;
      }

      return acc;
    }, {});

    if (!_.isEmpty(params.values)) {
      // Run update to remove all relationships.
      await strapi.query(params.model, source).update(params);
    }

    // Delete an entry using `queries` system
    const entryDeleted = await strapi.query(params.model, source).delete({
      id: params.id
    });

    ctx.body = entryDeleted;
  },
};
