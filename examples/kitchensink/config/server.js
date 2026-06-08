/**
 * @param {import('@strapi/strapi').Core.Config.Shared.ConfigParams} param0
 * @returns {import('@strapi/strapi').Core.Config.Server}
 */
module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS', ['toBeModified1', 'toBeModified2']),
  },
});
