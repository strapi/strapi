'use strict';

/**
 * @typedef {import('@strapi/strapi').Strapi} Strapi
 */

/**
 * @param {{
 *  strapi: Strapi
 * }} ctx
 */
module.exports = ({ strapi }) => {
  if (strapi.plugin('graphql')) {
    require('./graphql')({ strapi });
  }
};
