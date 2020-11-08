'use strict';

const validateComponentCategory = require('./validation/component-category');

module.exports = {
  async editCategory(ctx) {
    const { body } = ctx.request;

    try {
      await validateComponentCategory(body);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    const { name } = ctx.params;

    strapi.reload.isWatching = false;

    const componentCategoryService =
      strapi.plugins['content-type-builder'].services.componentcategories;

    const newName = await componentCategoryService.editCategory(name, body);

    setImmediate(() => strapi.reload());

    ctx.send({ name: newName });
  },

  async deleteCategory(ctx) {
    const { name } = ctx.params;

    strapi.reload.isWatching = false;

    const componentCategoryService =
      strapi.plugins['content-type-builder'].services.componentcategories;

    await componentCategoryService.deleteCategory(name);

    setImmediate(() => strapi.reload());

    ctx.send({ name });
  },
};
