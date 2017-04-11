'use strict';

const fs = require('fs');
const path = require('path');

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
      sort = 'id'
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
    const id = ctx.params.id;

    const entries = await User
      .find({
        id
      });

    ctx.body = entries;
  }
};
