'use strict';

const _ = require('lodash');

module.exports = {
  async find(ctx) {
    const method = _.has(ctx.query, '_q') ? 'search' : 'fetchAll';

    ctx.body = await strapi.plugins.upload.services.upload[method](ctx.query);
  },

  async findOne(ctx) {
    const {
      params: { id },
    } = ctx;

    const data = await strapi.plugins.upload.services.upload.fetch({ id });

    if (!data) {
      return ctx.notFound('file.notFound');
    }

    ctx.body = data;
  },

  async count(ctx) {
    const method = _.has(ctx.query, '_q') ? 'countSearch' : 'count';

    ctx.body = await strapi.plugins.upload.services.upload[method](ctx.query);
  },

  async destroy(ctx) {
    const {
      params: { id },
    } = ctx;

    const file = await strapi.plugins['upload'].services.upload.fetch({ id });

    if (!file) {
      return ctx.notFound('file.notFound');
    }

    await strapi.plugins['upload'].services.upload.remove(file);

    ctx.body = file;
  },
};
