/**
 * @type {import('@strapi/strapi').Core.Config.Api}
 */
module.exports = {
  rest: {
    defaultLimit: 25,
    maxLimit: 100,
    withCount: true,
  },
};
