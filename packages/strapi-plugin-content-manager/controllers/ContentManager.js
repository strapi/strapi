'use strict';

/**
 * A set of functions called "actions" for `ContentManager`
 */

module.exports = {

  models: async(ctx) => {
    ctx.body = strapi.models;
  },

  find: async(ctx) => {
    const model = strapi.models[ctx.params.model];
    const collection = global[model.globalName];
    const primaryKey = model.primaryKey;

    const {
      limit = 10,
      skip = 0,
      sort = primaryKey
    } = ctx.request.query;

    const entries = await collection
      .find()
      .limit(Number(limit))
      .sort(sort)
      .skip(Number(skip));

    ctx.body = entries;
  },

  count: async(ctx) => {
    const model = strapi.models[ctx.params.model];
    const collection = global[model.globalName];

    const count = await collection
      .count();

    ctx.body = {
      count: Number(count)
    };
  },

  findOne: async(ctx) => {
    const model = strapi.models[ctx.params.model];
    const collection = global[model.globalName];
    const primaryKey = model.primaryKey;
    const params = {};
    params[primaryKey] = ctx.params.id;

    const entry = await collection
      .findOne(params);

    ctx.body = entry;
  },

  create: async(ctx) => {
    const model = strapi.models[ctx.params.model];
    const collection = global[model.globalName];

    const entryCreated = await collection
      .create(ctx.request.body);

    ctx.body = entryCreated;
  },

  update: async(ctx) => {
    const model = strapi.models[ctx.params.model];
    const collection = global[model.globalName];
    const primaryKey = model.primaryKey;
    const params = {};

    params[primaryKey] = ctx.params.id;

    const entryUpdated = await collection
      .update(params, ctx.request.body);

    ctx.body = entryUpdated;
  },

  delete: async(ctx) => {
    const model = strapi.models[ctx.params.model];
    const collection = global[model.globalName];
    const primaryKey = model.primaryKey;
    const params = {};
    params[primaryKey] = ctx.params.id;

    const entryDeleted = await collection
      .remove(params);

    ctx.body = entryDeleted;
  }
};
