/**
 * @param {import('@strapi/strapi').Core.Config.Shared.ConfigParams} param0
 * @returns {import('@strapi/strapi').Core.Config.Features}
 */
module.exports = ({ env }) => ({
  future: {
    unstableMediaLibrary: env.bool('UNSTABLE_MEDIA_LIBRARY', false),
  },
});
