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

    const {
      limit = 10,
      skip = 0,
      sort = '_id'
    } = ctx.request.query;

    const entries = await User
      .find()
      .limit(limit)
      .sort(sort)
      .limit(skip);

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
    const _id = ctx.params._id;

    const entries = await User
      .find({
        _id
      });

    ctx.body = entries;
  },

  update: async(ctx) => {
    const entryUpdated = await User
      .update({_id: ctx.request.body._id}, ctx.request.body);

    return ctx.body = entryUpdated;
  }
};
