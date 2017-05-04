'use strict';

/**
 * A set of functions called "actions" for `ContentManager`
 */

module.exports = {

  models: async(ctx) => {
    ctx.body = strapi.models;
  },

  find: async(ctx) => {
    const model = ctx.params.model;
    const primaryKey = strapi.models[model].primaryKey;

    const {
      limit = 10,
      skip = 0,
      sort = primaryKey
    } = ctx.request.query;

    const entries = await User
      .find()
      .limit(Number(limit))
      .sort(sort)
      .skip(Number(skip));

    ctx.body = entries;
  },

  count: async(ctx) => {
    const model = ctx.params.model;

    const count = await User
      .count();

    ctx.body = {
      count: Number(count)
    };
  },

  findOne: async(ctx) => {
    const model = ctx.params.model;
    const primaryKey = strapi.models[model].primaryKey;
    const params = {};
    params[primaryKey] = ctx.params.id;

    const entry = await User
      .findOne(params);

    ctx.body = entry;
  },

  update: async(ctx) => {
    const model = ctx.params.model;
    const primaryKey = strapi.models[model].primaryKey;
    const params = {};
    params[primaryKey] = ctx.params.id;

    const entryUpdated = await User
      .update(params, ctx.request.body);

    ctx.body = entryUpdated;
  },

  delete: async(ctx) => {
    const model = ctx.params.model;
    const primaryKey = strapi.models[model].primaryKey;
    const params = {};
    params[primaryKey] = ctx.params.id;

    const entryDeleted = await User
      .remove(params);

    ctx.body = entryDeleted;
  }
};
