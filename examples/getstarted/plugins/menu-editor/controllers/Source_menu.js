module.exports = {
  index: async ctx => {},
  find: async ctx => {
    ctx.body = await strapi.controllers.page.find(ctx);
  },
  findOne: async ctx => {
    ctx.body = await strapi.controllers.page.findOne(ctx);
  },
  editMany: async ctx => {
    ctx.body = await strapi.controllers.page.updateMany(ctx);
  },
};
