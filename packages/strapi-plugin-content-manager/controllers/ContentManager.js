'use strict';

/**
 * A set of functions called "actions" for `ContentManager`
 */

module.exports = {

  models: async(ctx) => {
    ctx.body = _.mapValues(strapi.models, (model) => (_.pick(model, [
      'connection',
      'collectionName',
      'attributes',
      'identity',
      'globalId',
      'globalName',
      'orm',
      'loadedModel',
      'primaryKey',
    ])));
  },

  find: async(ctx) => {
    const model = strapi.models[ctx.params.model];
    const primaryKey = model.primaryKey;

    const {
      limit = 10,
      skip = 0,
      sort = primaryKey
    } = ctx.request.query;

    const entries = await model
      .find()
      .limit(Number(limit))
      .sort(sort)
      .skip(Number(skip));

    ctx.body = entries;
  },

  count: async(ctx) => {
    const model = strapi.models[ctx.params.model];

    const count = await model
      .count();

    ctx.body = {
      count: Number(count)
    };
  },

  findOne: async(ctx) => {
    const model = strapi.models[ctx.params.model];
    const primaryKey = model.primaryKey;
    const params = {};
    params[primaryKey] = ctx.params.id;

    const entry = await model
      .findOne(params);

    ctx.body = entry;
  },

  create: async(ctx) => {
    const model = strapi.models[ctx.params.model];

    const entryCreated = await model
      .create(ctx.request.body);

    ctx.body = entryCreated;
  },

  update: async(ctx) => {
    const model = strapi.models[ctx.params.model];
    const primaryKey = model.primaryKey;
    const params = {};

    params[primaryKey] = ctx.params.id;

    const entryUpdated = await model
      .update(params, ctx.request.body);

    ctx.body = entryUpdated;
  },

  delete: async(ctx) => {
    const model = strapi.models[ctx.params.model];
    const primaryKey = model.primaryKey;
    const params = {};
    params[primaryKey] = ctx.params.id;

    const entryDeleted = await model
      .remove(params);

    ctx.body = entryDeleted;
  }
};
