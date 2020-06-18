const { sanitizeEntity } = require('strapi-utils');

module.exports = {
  index: async ctx => {
    ctx.body = [];
  },
  find: async ctx => {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.plugins['menu'].services.state.search(ctx.query);
    } else {
      entities = await strapi.plugins['menu'].services.state.find(ctx.query);
    }

    return entities.map(entity => sanitizeEntity(entity, { model: strapi.plugins['menu'].models.state }));
  },
  findOne: async ctx => {
    ctx.body = {};
  },

  /**
   * Update a record.
   *
   * @return {Object}
   */

  async update(ctx) {
    const { id } = ctx.params;

    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.plugins['menu'].services.state.update({ id }, data, {
        files,
      });
    } else {
      entity = await strapi.plugins['menu'].services.state.update({ id }, ctx.request.body);
    }

    return sanitizeEntity(entity, { model: strapi.plugins['menu'].models.state });
  },
};
