const { sanitizeEntity } = require('strapi-utils');

module.exports = {
  index: async ctx => {
    ctx.body = [];
  },
  find: async ctx => {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.plugins['menu'].services.type.search(ctx.query);
    } else {
      entities = await strapi.plugins['menu'].services.type.find(ctx.query);
    }

    return entities.map(entity => sanitizeEntity(entity, { model: strapi.plugins['menu'].models.type }));
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
      entity = await strapi.plugins['menu'].services.type.update({ id }, data, {
        files,
      });
    } else {
      entity = await strapi.plugins['menu'].services.type.update({ id }, ctx.request.body);
    }

    return sanitizeEntity(entity, { model: strapi.plugins['menu'].models.type });
  },
};
