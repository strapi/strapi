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

    const entries = await User
      .find();

    ctx.body = entries;
  },

  findOne: async(ctx) => {
    const model = ctx.params.model;
    const id = ctx.params.id;

    const entries = await User
      .find({
        id: id
      });

    ctx.body = entries;
  }
};
