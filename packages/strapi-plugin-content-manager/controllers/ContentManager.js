'use strict';

/**
 * A set of functions called "actions" for `ContentManager`
 */

module.exports = {
  models: async ctx => {
    ctx.body = _.mapValues(strapi.models, model =>
      _.pick(model, [
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
    const model = strapi.models[ctx.params.model];
    const orm = _.get(strapi.plugins, ['content-manager', 'config', 'admin', 'schema', ctx.params.model, 'orm']) || model.orm;
    const queries = _.get(strapi.plugins, ['content-manager', 'config', 'queries', orm]);
    const primaryKey = model.primaryKey;
    const {limit, skip = 0, sort = primaryKey, query, queryAttribute} = ctx.request.query;

    // Find entries using `queries` system
    const entries = await queries
      .find({
        model,
        limit,
        skip,
        sort,
        query,
        queryAttribute
      });

    ctx.body = entries;
  },

  count: async ctx => {
    const model = strapi.models[ctx.params.model];
    const orm = _.get(strapi.plugins, ['content-manager', 'config', 'admin', 'schema', ctx.params.model, 'orm']) || model.orm;
    const queries = _.get(strapi.plugins, ['content-manager', 'config', 'queries', orm]);

    // Count using `queries` system
    const count = await queries.count({model});

    ctx.body = {
      count,
    };
  },

  findOne: async ctx => {
    const model = strapi.models[ctx.params.model];
    const orm = _.get(strapi.plugins, ['content-manager', 'config', 'admin', 'schema', ctx.params.model, 'orm']) || model.orm;
    const queries = _.get(strapi.plugins, ['content-manager', 'config', 'queries', orm]);
    const primaryKey = model.primaryKey;
    const id = ctx.params.id;

    // Find an entry using `queries` system
    const entry = await queries.findOne({
      model,
      primaryKey,
      id
    });

    // Entry not found
    if (!entry) {
      return (ctx.notFound('Entry not found'));
    }

    ctx.body = entry;
  },

  create: async ctx => {
    const model = strapi.models[ctx.params.model];
    const orm = _.get(strapi.plugins, ['content-manager', 'config', 'admin', 'schema', ctx.params.model, 'orm']) || model.orm;
    const queries = _.get(strapi.plugins, ['content-manager', 'config', 'queries', orm]);
    const values = ctx.request.body;

    // Create an entry using `queries` system
    const entryCreated = await queries.create({
      model,
      values
    });

    ctx.body = entryCreated;
  },

  update: async ctx => {
    const model = strapi.models[ctx.params.model];
    const orm = _.get(strapi.plugins, ['content-manager', 'config', 'admin', 'schema', ctx.params.model, 'orm']) || model.orm;
    const queries = _.get(strapi.plugins, ['content-manager', 'config', 'queries', orm]);
    const primaryKey = model.primaryKey;
    const id = ctx.params.id;
    const values = ctx.request.body;

    // Update an entry using `queries` system
    const entryUpdated = await queries.update({
      model,
      primaryKey,
      id,
      values
    });

    ctx.body = entryUpdated;
  },

  delete: async ctx => {
    const model = strapi.models[ctx.params.model];
    const orm = _.get(strapi.plugins, ['content-manager', 'config', 'admin', 'schema', ctx.params.model, 'orm']) || model.orm;
    const queries = _.get(strapi.plugins, ['content-manager', 'config', 'queries', orm]);
    const primaryKey = model.primaryKey;
    const id = ctx.params.id;

    // Delete an entry using `queries` system
    const entryDeleted = await queries.delete({
      model,
      primaryKey,
      id
    });

    ctx.body = entryDeleted;
  },
};
