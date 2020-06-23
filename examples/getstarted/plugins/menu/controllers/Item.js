const { sanitizeEntity } = require('strapi-utils');

module.exports = {
  index: async ctx => {
    ctx.body = [];
  },
  find: async ctx => {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.plugins['menu'].services.item.search(ctx.query);
    } else {
      entities = await strapi.plugins['menu'].services.item.find(ctx.query);
    }

    return entities.map(entity =>
      sanitizeEntity(entity, { model: strapi.plugins['menu'].models.item })
    );
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
      entity = await strapi.plugins['menu'].services.item.update({ id }, data, {
        files,
      });
    } else {
      entity = await strapi.plugins['menu'].services.item.update({ id }, ctx.request.body);
    }

    return sanitizeEntity(entity, { model: strapi.plugins['menu'].models.item });
  },

  /**
   * Create a record.
   *
   * @return {Object}
   */

  async create(ctx) {
    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.plugins['menu'].services.item.create(data, { files });
    } else {
      entity = await strapi.plugins['menu'].services.item.create(ctx.request.body);
    }
    return sanitizeEntity(entity, { model: strapi.plugins['menu'].models.item });
  },

  /**
   * Update or create records.
   *
   * @return {Object}
   */

  async updateMany(ctx) {
    let entity;
    if (ctx.is('multipart')) {
      ctx.body = 'Sending files on updateMany is not Supported';
      return;
    } else {
      entity = await strapi.plugins['menu'].services.item.updateMany(ctx.request.body);
    }
    return sanitizeEntity(entity, { model: strapi.plugins['menu'].models.item });
  },
};
