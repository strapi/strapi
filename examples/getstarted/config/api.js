/** @import { Core } from '@strapi/strapi' */

/**
 * @type {Core.Config.Api}
 */
module.exports = {
  rest: {
    defaultLimit: 25,
    maxLimit: 30,
    withCount: true,
    strictParams: true,
  },
  documents: {
    strictParams: true,
  },
};
