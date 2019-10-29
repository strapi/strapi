'use strict';

const validateComponentCategory = require('./validation/componentCategory');

module.exports = {
  async editCategory(ctx) {
    const { body } = ctx.request;
    const service =
      strapi.plugins['content-type-builder'].services.componentcategories;

    try {
      await validateComponentCategory(body);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    const { name } = ctx.params;

    strapi.reload.isWatching = false;

    await service.editCategory(name, body);

    strapi.reload();

    ctx.send({ name: body.name });
  },
  async deleteCategory(ctx) {
    const { name } = ctx.params;

    const service =
      strapi.plugins['content-type-builder'].services.componentcategories;
    service;

    strapi.reload.isWatching = false;

    await service.deleteCategory(name);

    strapi.reload();

    ctx.send({ name });
  },
};
