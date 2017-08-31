'use strict';

const _ = require('lodash');

/**
 * A set of functions called "actions" for `ContentManager`
 */

module.exports = {
  models: async ctx => {
    ctx.body = _.mapValues(strapi.models, model =>
      _.pick(model, [
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
      ])
    );
  },

  find: async ctx => {
    const { limit, skip = 0, sort, query, queryAttribute } = ctx.request.query;

    // Find entries using `queries` system
    const entries = await strapi.query(ctx.params.model).find({
        limit,
        skip,
        sort,
        query,
        queryAttribute
      });

    ctx.body = entries;
  },

  count: async ctx => {
    // Count using `queries` system
    const count = await strapi.query(ctx.params.model).count();

    ctx.body = {
      count,
    };
  },

  findOne: async ctx => {
    // Find an entry using `queries` system
    const entry = await strapi.query(ctx.params.model).findOne({
      id: ctx.params.id
    });

    // Entry not found
    if (!entry) {
      return (ctx.notFound('Entry not found'));
    }

    ctx.body = entry;
  },

  create: async ctx => {
    // Create an entry using `queries` system
    const entryCreated = await strapi.query(ctx.params.model).create({
      values: ctx.request.body
    });

    ctx.body = entryCreated;
  },

  update: async ctx => {
    // Update an entry using `queries` system
    const entryUpdated = await queries.update({
      id: ctx.params.id,
      values: ctx.request.body
    });

    ctx.body = entryUpdated;
  },

  delete: async ctx => {
    // Delete an entry using `queries` system
    const entryDeleted = await queries.delete({
      id: ctx.params.id
    });

    ctx.body = entryDeleted;
  },
};
