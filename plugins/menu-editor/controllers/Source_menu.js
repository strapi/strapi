//FIXME: no-unused-vars
// eslint-disable-next-line no-unused-vars
const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
//FIXME: no-unused-vars
// eslint-disable-next-line no-unused-vars
const Bookshelf = require('bookshelf');

module.exports = {
  //FIXME: no-unused-vars
  // eslint-disable-next-line no-unused-vars
  index: async ctx => {},
  find: async ctx => {
    ctx.body = await strapi.controllers.pages.find(ctx);
  },
  findOne: async ctx => {
    ctx.body = await strapi.controllers.pages.findOne(ctx);
  },
  editMany: async ctx => {
    ctx.body = await strapi.controllers.pages.updateMany(ctx);
  },
};
