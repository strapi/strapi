/** @import { Core } from '@strapi/strapi' */

/**
 * @param {Core.Config.Shared.ConfigParams} param0
 * @returns {Core.Config.Features}
 */
module.exports = ({ env }) => ({
  future: {
    unstableMediaLibrary: env.bool('UNSTABLE_MEDIA_LIBRARY', false),
  },
});
